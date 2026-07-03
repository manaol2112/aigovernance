import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import {
  getPillarControlTreeForAssessment,
  ensureControlReviewInitialized,
} from "@/lib/pillar-control-tree";
import { analyzeAndPersistControl, analyzeAllControls } from "@/lib/control-analyzer";
import { bulkMapNotesToControls } from "@/lib/bulk-note-mapper";
import { processWorkshopTranscripts } from "@/lib/transcript-processor";
import { syncGovernanceEvidenceFromCaptureAnalysis } from "@/lib/governance-v2/capture-evidence-sync";
import { syncDocumentationValidationForAssessment } from "@/lib/governance-v2/assessment-documentation-sync";
import { mapEvidenceToControls } from "@/lib/governance-v2/control-mapping-v2";
import {
  ALL_DEPARTMENTS,
  buildUseCaseWhereForDepartment,
  getDepartmentsForAssessment,
} from "@/lib/workshop-department";
import {
  getSuggestedDepartmentsForAssessment,
  mergeDepartmentOptions,
} from "@/lib/workshop-departments";
import { syncDisagreementFromReview } from "@/lib/governance-v2/reviewer-disagreement";

export const maxDuration = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const departmentParam = searchParams.get("department");
    const department =
      departmentParam && departmentParam !== ALL_DEPARTMENTS ? departmentParam : null;

    await ensureControlReviewInitialized(id);

    const useCaseWhere = buildUseCaseWhereForDepartment(id, department);

    const [pillars, controls, evaluations, scopedReqCount, assignedDepartments, suggestedDepartments, useCases] =
      await Promise.all([
      getPillarControlTreeForAssessment(id, department),
      getScopedControlsForAssessment(id, department),
      prisma.controlEvaluation.findMany({
        where: { assessmentId: id },
        include: {
          control: { select: { code: true, title: true, controlType: true, ownerRole: true } },
          citations: { orderBy: { citationIndex: "asc" } },
        },
        orderBy: { control: { code: "asc" } },
      }),
      prisma.useCaseRequirement.count({
        where: { included: true, useCase: useCaseWhere },
      }),
      getDepartmentsForAssessment(id),
      getSuggestedDepartmentsForAssessment(id),
      prisma.useCase.findMany({
        where: { assessmentId: id },
        select: { department: true },
      }),
    ]);

    const assignedLabels = assignedDepartments.filter((d) => d !== "Unassigned");
    const departmentOptions = mergeDepartmentOptions(suggestedDepartments, assignedLabels);
    const useCaseCountByDepartment = new Map<string, number>();
    for (const uc of useCases) {
      const label = uc.department?.trim() || "Unassigned";
      if (label === "Unassigned") continue;
      useCaseCountByDepartment.set(label, (useCaseCountByDepartment.get(label) ?? 0) + 1);
    }

    const scopedControlIds = new Set(controls.map((c) => c.id));
    const filteredEvaluations = evaluations.filter((e) => scopedControlIds.has(e.controlId));

    const uniqueControlCount = controls.length;

    const stats = {
      total: uniqueControlCount,
      pending: filteredEvaluations.filter((e) => e.status === "pending").length,
      aiDraft: filteredEvaluations.filter((e) => e.status === "ai_draft").length,
      confirmed: filteredEvaluations.filter((e) => e.status === "human_confirmed").length,
      rejected: filteredEvaluations.filter((e) => e.status === "rejected").length,
      pillarCount: pillars.length,
      scopedRequirements: scopedReqCount,
    };

    return NextResponse.json({
      pillars,
      controls,
      evaluations: filteredEvaluations,
      stats,
      departments: assignedDepartments,
      departmentOptions,
      useCaseCountByDepartment: Object.fromEntries(useCaseCountByDepartment),
      activeDepartment: department ?? ALL_DEPARTMENTS,
    });
  } catch (error) {
    console.error("[control-review GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load control review" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, controlId } = body as { action: string; controlId?: string };

    switch (action) {
    case "analyze_one": {
      if (!controlId) {
        return NextResponse.json({ error: "controlId required" }, { status: 400 });
      }
      const result = await analyzeAndPersistControl(id, controlId);
      const evaluation = await prisma.controlEvaluation.findUnique({
        where: { assessmentId_controlId: { assessmentId: id, controlId } },
        include: {
          control: { select: { code: true, title: true } },
          citations: { orderBy: { citationIndex: "asc" } },
        },
      });
      return NextResponse.json({ result, evaluation });
    }

    case "analyze_all": {
      const count = await analyzeAllControls(id);
      return NextResponse.json({ analyzedCount: count });
    }

    case "bulk_map": {
      const result = await bulkMapNotesToControls(id);
      return NextResponse.json(result);
    }

    case "process_transcripts": {
      const { mergeMode, runControlAnalysis, existingWorkshopNotes, existingFacilitatorNotes } = body as {
        mergeMode?: "merge" | "replace";
        runControlAnalysis?: boolean;
        existingWorkshopNotes?: string;
        existingFacilitatorNotes?: string;
      };
      try {
        const result = await processWorkshopTranscripts(id, {
          mergeMode: mergeMode ?? "merge",
          existingWorkshopNotes,
          existingFacilitatorNotes,
        });
        let analyzedCount = 0;
        if (runControlAnalysis) {
          analyzedCount = await analyzeAllControls(id);
        }
        const evidenceSync = await syncGovernanceEvidenceFromCaptureAnalysis(id);
        const mapping = await mapEvidenceToControls(id);
        const docSync = await syncDocumentationValidationForAssessment(id, {
          useAi: true,
          limit: 80,
        });
        return NextResponse.json({
          ...result,
          analyzedCount,
          evidenceSynced: evidenceSync.createdEvidence.length,
          controlsMapped: mapping.mappedCount,
          documentationValidated: docSync.validated,
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Transcript processing failed" },
          { status: 400 }
        );
      }
    }

    case "init": {
      const count = await ensureControlReviewInitialized(id);
      return NextResponse.json({ initialized: count });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[control-review POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Control review action failed" },
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
  const {
    controlId,
    controlIds,
    action,
    workshopNotes,
    facilitatorNotes,
    inPlaceFindings,
    gapFindings,
    recommendations,
    complianceStatus,
    reviewerComplete,
    reviewerAccurate,
    reviewerNoHallucination,
    reviewerNotes,
    confirmedBy,
    confirmedAt: confirmedAtParam,
  } = body as {
    controlId?: string;
    controlIds?: string[];
    action: string;
    workshopNotes?: string;
    facilitatorNotes?: string;
    inPlaceFindings?: string;
    gapFindings?: string;
    recommendations?: string;
    complianceStatus?: string;
    reviewerComplete?: boolean;
    reviewerAccurate?: boolean;
    reviewerNoHallucination?: boolean;
    reviewerNotes?: string;
    confirmedBy?: string;
    confirmedAt?: string;
  };

  function resolveSignOffDate(value?: string): Date {
    if (!value?.trim()) return new Date();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  }

  const signOffTimestamp = resolveSignOffDate(confirmedAtParam);

  const evalInclude = {
    control: { select: { code: true, title: true, controlType: true, ownerRole: true } },
    citations: { orderBy: { citationIndex: "asc" as const } },
  };

  if (action === "batch_review") {
    const ids = controlIds?.length ? controlIds : controlId ? [controlId] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "controlIds required" }, { status: 400 });
    }
    if (!confirmedBy?.trim()) {
      return NextResponse.json({ error: "confirmedBy required" }, { status: 400 });
    }

    const allChecked =
      reviewerComplete === true &&
      reviewerAccurate === true &&
      reviewerNoHallucination === true;

    await prisma.controlEvaluation.updateMany({
      where: { assessmentId: id, controlId: { in: ids } },
      data: {
        reviewerComplete,
        reviewerAccurate,
        reviewerNoHallucination,
        reviewerNotes: reviewerNotes ?? null,
        confirmedBy,
        confirmedAt: signOffTimestamp,
        status: allChecked ? "human_confirmed" : "rejected",
      },
    });

    const updated = await prisma.controlEvaluation.findMany({
      where: { assessmentId: id, controlId: { in: ids } },
      include: evalInclude,
    });

    if (!allChecked) {
      for (const ev of updated) {
        await syncDisagreementFromReview(id, ev.id, ev);
      }
    }

    return NextResponse.json({ updated, count: updated.length });
  }

  if (!controlId) {
    return NextResponse.json({ error: "controlId required" }, { status: 400 });
  }

  if (action === "save_notes") {
    const updated = await prisma.controlEvaluation.upsert({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      create: {
        assessmentId: id,
        controlId,
        workshopNotes: workshopNotes ?? "",
        facilitatorNotes: facilitatorNotes ?? "",
        status: "pending",
      },
      update: {
        workshopNotes: workshopNotes ?? undefined,
        facilitatorNotes: facilitatorNotes ?? undefined,
      },
      include: evalInclude,
    });
    return NextResponse.json(updated);
  }

  if (action === "save_findings") {
    const existing = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
    });

    const updated = await prisma.controlEvaluation.upsert({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      create: {
        assessmentId: id,
        controlId,
        inPlaceFindings: inPlaceFindings ?? "",
        gapFindings: gapFindings ?? "",
        recommendations: recommendations ?? "",
        complianceStatus: complianceStatus ?? "not_assessed",
        status: "ai_draft",
        aiGenerated: true,
      },
      update: {
        inPlaceFindings: inPlaceFindings ?? undefined,
        gapFindings: gapFindings ?? undefined,
        recommendations: recommendations ?? undefined,
        complianceStatus: complianceStatus ?? undefined,
        ...(existing?.status === "human_confirmed"
          ? {
              status: "ai_draft" as const,
              confirmedBy: null,
              confirmedAt: null,
              reviewerComplete: null,
              reviewerAccurate: null,
              reviewerNoHallucination: null,
            }
          : {}),
      },
      include: evalInclude,
    });
    return NextResponse.json(updated);
  }

  if (action === "unconfirm") {
    const updated = await prisma.controlEvaluation.update({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      data: {
        status: "ai_draft",
        confirmedBy: null,
        confirmedAt: null,
        reviewerComplete: null,
        reviewerAccurate: null,
        reviewerNoHallucination: null,
      },
      include: evalInclude,
    });
    return NextResponse.json(updated);
  }

  if (action === "review") {
    if (!confirmedBy?.trim()) {
      return NextResponse.json({ error: "confirmedBy required" }, { status: 400 });
    }

    const allChecked =
      reviewerComplete === true &&
      reviewerAccurate === true &&
      reviewerNoHallucination === true;

    const updated = await prisma.controlEvaluation.update({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      data: {
        reviewerComplete,
        reviewerAccurate,
        reviewerNoHallucination,
        reviewerNotes: reviewerNotes ?? null,
        confirmedBy,
        confirmedAt: signOffTimestamp,
        status: allChecked ? "human_confirmed" : "rejected",
      },
      include: evalInclude,
    });

    if (!allChecked) {
      await syncDisagreementFromReview(id, updated.id, updated);
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
