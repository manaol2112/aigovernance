import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  advanceWorkflowStage,
  approveCheckpoint,
  bootstrapAssessmentScoping,
  canGoToStage,
  getCheckpointForStage,
  getNextStage,
  isCheckpointApproved,
  normalizeStageForNavigation,
  syncCheckpoints,
} from "@/lib/workflow";
import { initControlEvaluations } from "@/lib/control-scoping";
import { initPillarWorkshop } from "@/lib/pillar-workshop";
import { analyzeAllControls } from "@/lib/control-analyzer";
import { generateAllDeliverables } from "@/lib/report-generator";
import type { WorkflowStage, CheckpointType } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await syncCheckpoints(id);
    await bootstrapAssessmentScoping(id);

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        scope: true,
        useCases: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { scopedRequirements: true, pillarWorkshopResponses: true } },
          },
        },
        checkpoints: { orderBy: { createdAt: "asc" } },
        requirementEvaluations: {
          include: { requirement: { include: { framework: true } }, useCase: true },
        },
        deliverables: true,
      },
    });
    if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(assessment);
  } catch (error) {
    console.error("[workflow GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workflow" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action, stage, checkpointType, confirmedBy, notes } = body as {
    action: string;
    stage?: WorkflowStage;
    checkpointType?: CheckpointType;
    confirmedBy?: string;
    notes?: string;
  };

  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (action) {
    case "advance": {
      const next = stage ?? getNextStage(assessment.workflowStage);
      if (!next) return NextResponse.json({ error: "No next stage" }, { status: 400 });
      const requiredCheckpoint = getCheckpointForStage(assessment.workflowStage);
      if (requiredCheckpoint) {
        const approved = await isCheckpointApproved(id, requiredCheckpoint);
        if (!approved) {
          return NextResponse.json(
            { error: `Checkpoint "${requiredCheckpoint}" must be approved before advancing.` },
            { status: 403 }
          );
        }
      }
      await advanceWorkflowStage(id, next);
      return NextResponse.json({ workflowStage: next });
    }

    case "go_to_stage": {
      if (!stage) {
        return NextResponse.json({ error: "stage required" }, { status: 400 });
      }
      const target = normalizeStageForNavigation(stage);
      if (!canGoToStage(assessment.workflowStage, target)) {
        return NextResponse.json(
          { error: "Cannot jump ahead to a future stage. Complete checkpoints to advance." },
          { status: 403 }
        );
      }
      await advanceWorkflowStage(id, target);
      return NextResponse.json({ workflowStage: target });
    }

    case "approve_checkpoint": {
      if (!checkpointType || !confirmedBy) {
        return NextResponse.json({ error: "checkpointType and confirmedBy required" }, { status: 400 });
      }
      await approveCheckpoint(id, checkpointType, confirmedBy, notes);
      await syncCheckpoints(id);
      return NextResponse.json({ approved: true });
    }

    case "scope_requirements": {
      const count = await bootstrapAssessmentScoping(id);
      return NextResponse.json({
        scopedCount: count,
        workflowStage: (await prisma.assessment.findUnique({ where: { id }, select: { workflowStage: true } }))
          ?.workflowStage,
      });
    }

    case "init_workshop":
    case "init_control_review": {
      const created = await initControlEvaluations(id);
      await initPillarWorkshop(id);
      await advanceWorkflowStage(id, "workshop");
      return NextResponse.json({ controlCount: created, workflowStage: "workshop" });
    }

    case "run_evaluation": {
      await analyzeAllControls(id);
      await syncCheckpoints(id);
      return NextResponse.json({ workflowStage: "workshop" });
    }

    case "generate_deliverables": {
      const approved = await isCheckpointApproved(id, "evaluation_review");
      if (!approved) {
        return NextResponse.json(
          { error: "Evaluation review checkpoint must be approved first." },
          { status: 403 }
        );
      }
      const deliverables = await generateAllDeliverables(id);
      await advanceWorkflowStage(id, "deliverables");
      return NextResponse.json({ deliverables });
    }

    case "proceed_to_deliverables": {
      const evaluations = await prisma.controlEvaluation.findMany({ where: { assessmentId: id } });
      if (
        evaluations.length === 0 ||
        !evaluations.every((e) => e.status === "human_confirmed")
      ) {
        return NextResponse.json(
          { error: "All controls must be signed off before opening the deliverable package." },
          { status: 403 }
        );
      }

      const evalReviewApproved = await isCheckpointApproved(id, "evaluation_review");
      if (!evalReviewApproved) {
        if (!confirmedBy?.trim()) {
          return NextResponse.json(
            { error: "Reviewer name required to attest the completed assessment review." },
            { status: 400 }
          );
        }
        await approveCheckpoint(id, "evaluation_review", confirmedBy.trim(), notes);
      }

      const deliverables = await generateAllDeliverables(id);
      await advanceWorkflowStage(id, "deliverables");
      await syncCheckpoints(id);
      return NextResponse.json({ workflowStage: "deliverables", deliverables });
    }

    case "finalize": {
      const approved = await isCheckpointApproved(id, "deliverable_approval");
      if (!approved) {
        return NextResponse.json(
          { error: "Deliverable approval checkpoint must be approved first." },
          { status: 403 }
        );
      }
      await advanceWorkflowStage(id, "finalized");
      await prisma.assessment.update({
        where: { id },
        data: { completedAt: new Date(), status: "completed" },
      });
      return NextResponse.json({ finalized: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
