import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  advanceWorkflowStage,
  approveCheckpoint,
  getCheckpointForStage,
  getNextStage,
  isCheckpointApproved,
  syncCheckpoints,
} from "@/lib/workflow";
import { scopeAllUseCasesForAssessment } from "@/lib/use-case-scoping";
import { initPillarWorkshop } from "@/lib/pillar-workshop";
import { runAssessmentEvaluation } from "@/lib/requirement-evaluator";
import { generateAllDeliverables } from "@/lib/report-generator";
import type { WorkflowStage, CheckpointType } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await syncCheckpoints(id);

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

    case "approve_checkpoint": {
      if (!checkpointType || !confirmedBy) {
        return NextResponse.json({ error: "checkpointType and confirmedBy required" }, { status: 400 });
      }
      await approveCheckpoint(id, checkpointType, confirmedBy, notes);
      await syncCheckpoints(id);
      return NextResponse.json({ approved: true });
    }

    case "scope_requirements": {
      const count = await scopeAllUseCasesForAssessment(id);
      await advanceWorkflowStage(id, "requirement_scoping");
      await syncCheckpoints(id);
      return NextResponse.json({ scopedCount: count, workflowStage: "requirement_scoping" });
    }

    case "init_workshop": {
      const created = await initPillarWorkshop(id);
      await advanceWorkflowStage(id, "workshop");
      return NextResponse.json({ pillarQuestions: created, workflowStage: "workshop" });
    }

    case "run_evaluation": {
      const count = await runAssessmentEvaluation(id);
      await advanceWorkflowStage(id, "human_review");
      await syncCheckpoints(id);
      return NextResponse.json({ evaluatedCount: count, workflowStage: "human_review" });
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
