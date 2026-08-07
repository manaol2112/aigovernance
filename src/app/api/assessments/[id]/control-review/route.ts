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
import {
  buildInitialWorkpaperContent,
  createThreadMessage,
  htmlToPlainText,
  normalizeWorkpaperContent,
  normalizeWorkpaperFieldState,
  type WorkpaperFieldKey,
  type WorkpaperReviewNoteThread,
} from "@/lib/control-review-workpaper";

export const maxDuration = 300;

function documentValidationSummary(explainability: unknown): string {
  if (!explainability || typeof explainability !== "object") return "";
  const payload = explainability as {
    documentationValidation?: { summary?: string };
  };
  return payload.documentationValidation?.summary?.trim() ?? "";
}

function serializeReviewThreads(
  threads: Array<{
    id: string;
    fieldKey: string;
    title: string | null;
    status: "open" | "resolved" | "reopened";
    assignee: string | null;
    createdBy: string;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    messages: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>
): WorkpaperReviewNoteThread[] {
  return threads.map((thread) => ({
    id: thread.id,
    fieldKey: thread.fieldKey as WorkpaperFieldKey,
    title: thread.title,
    status: thread.status,
    assignee: thread.assignee,
    createdBy: thread.createdBy,
    resolvedBy: thread.resolvedBy,
    resolvedAt: thread.resolvedAt?.toISOString() ?? null,
    messages: Array.isArray(thread.messages) ? (thread.messages as WorkpaperReviewNoteThread["messages"]) : [],
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  }));
}

async function countOpenReviewThreads(controlEvaluationIds: string[]) {
  if (controlEvaluationIds.length === 0) return 0;
  return prisma.controlReviewNoteThread.count({
    where: {
      controlEvaluationId: { in: controlEvaluationIds },
      status: { in: ["open", "reopened"] },
    },
  });
}

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
          disagreements: { orderBy: { createdAt: "desc" } },
          reviewNotes: { orderBy: { updatedAt: "desc" } },
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
    const filteredEvaluations = evaluations
      .filter((e) => scopedControlIds.has(e.controlId))
      .map((evaluation) => {
        const initialWorkpaper = buildInitialWorkpaperContent({
          inPlaceFindings: evaluation.inPlaceFindings,
          gapFindings: evaluation.gapFindings,
          recommendations: evaluation.recommendations,
          complianceStatus: evaluation.complianceStatus,
          documentationSummary: documentValidationSummary(evaluation.explainability),
          overallConclusion: evaluation.reviewerNotes,
        });
        return {
          ...evaluation,
          workpaperContent: normalizeWorkpaperContent(evaluation.workpaperContent ?? initialWorkpaper),
          workpaperFieldState: normalizeWorkpaperFieldState(evaluation.workpaperFieldState),
          reviewNotes: serializeReviewThreads(evaluation.reviewNotes),
        };
      });

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
    fieldKey,
    noteThreadId,
    noteTitle,
    noteBody,
    assignee,
    workpaperContent,
    workpaperFieldState,
    resolutionNote,
    createdBy,
    resolvedBy,
    noteQuotedText,
    noteHighlightId,
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
    fieldKey?: WorkpaperFieldKey;
    noteThreadId?: string;
    noteTitle?: string;
    noteBody?: string;
    assignee?: string;
    workpaperContent?: Partial<Record<WorkpaperFieldKey, string>>;
    workpaperFieldState?: Record<string, unknown>;
    resolutionNote?: string;
    createdBy?: string;
    resolvedBy?: string;
    noteQuotedText?: string;
    noteHighlightId?: string;
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
    disagreements: { orderBy: { createdAt: "desc" as const } },
    reviewNotes: { orderBy: { updatedAt: "desc" as const } },
  };

  function mergeWorkpaperState(existing: unknown) {
    return normalizeWorkpaperFieldState(existing);
  }

  function mergeWorkpaperContentFromEvaluation(input: {
    existingContent?: unknown;
    existingFieldState?: unknown;
    existingInPlace?: string | null;
    existingGap?: string | null;
    existingRecommendations?: string | null;
    existingCompliance?: string | null;
    existingReviewerNotes?: string | null;
    existingExplainability?: unknown;
    incoming?: Partial<Record<WorkpaperFieldKey, string>>;
  }) {
    const base =
      input.existingContent ??
      buildInitialWorkpaperContent({
        inPlaceFindings: input.existingInPlace,
        gapFindings: input.existingGap,
        recommendations: input.existingRecommendations,
        complianceStatus: input.existingCompliance,
        documentationSummary: documentValidationSummary(input.existingExplainability),
        overallConclusion: input.existingReviewerNotes,
      });
    return {
      content: {
        ...normalizeWorkpaperContent(base),
        ...(input.incoming ?? {}),
      },
      fieldState: mergeWorkpaperState(input.existingFieldState),
    };
  }

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

    const reviewableEvals = await prisma.controlEvaluation.findMany({
      where: { assessmentId: id, controlId: { in: ids } },
      select: { id: true },
    });
    const openThreadCount = await countOpenReviewThreads(reviewableEvals.map((item) => item.id));
    if (openThreadCount > 0) {
      return NextResponse.json(
        { error: "Resolve or reopen all open workpaper review notes before batch sign-off." },
        { status: 400 }
      );
    }

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

  if (action === "save_workpaper") {
    const existing = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
    });

    const merged = mergeWorkpaperContentFromEvaluation({
      existingContent: existing?.workpaperContent,
      existingFieldState: existing?.workpaperFieldState,
      existingInPlace: existing?.inPlaceFindings,
      existingGap: existing?.gapFindings,
      existingRecommendations: existing?.recommendations,
      existingCompliance: existing?.complianceStatus,
      existingReviewerNotes: existing?.reviewerNotes,
      existingExplainability: existing?.explainability,
      incoming: workpaperContent,
    });

    const nextFieldState = {
      ...merged.fieldState,
      ...(workpaperFieldState ?? {}),
    };

    const projectedCompliance =
      complianceStatus ??
      htmlToPlainText(merged.content.complianceStatus) ??
      existing?.complianceStatus ??
      "not_assessed";

    const updated = await prisma.controlEvaluation.upsert({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      create: {
        assessmentId: id,
        controlId,
        inPlaceFindings: htmlToPlainText(merged.content.inPlaceFindings),
        gapFindings: htmlToPlainText(merged.content.gapFindings),
        recommendations: htmlToPlainText(merged.content.recommendations),
        reviewerNotes: htmlToPlainText(merged.content.overallConclusion) || null,
        complianceStatus: projectedCompliance || "not_assessed",
        status: "ai_draft",
        aiGenerated: true,
        workpaperContent: merged.content,
        workpaperFieldState: nextFieldState,
      },
      update: {
        inPlaceFindings: htmlToPlainText(merged.content.inPlaceFindings),
        gapFindings: htmlToPlainText(merged.content.gapFindings),
        recommendations: htmlToPlainText(merged.content.recommendations),
        reviewerNotes: htmlToPlainText(merged.content.overallConclusion) || null,
        complianceStatus: projectedCompliance || "not_assessed",
        workpaperContent: merged.content,
        workpaperFieldState: nextFieldState,
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

  if (action === "save_findings") {
    const existing = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
    });

    const merged = mergeWorkpaperContentFromEvaluation({
      existingContent: existing?.workpaperContent,
      existingFieldState: existing?.workpaperFieldState,
      existingInPlace: existing?.inPlaceFindings,
      existingGap: existing?.gapFindings,
      existingRecommendations: existing?.recommendations,
      existingCompliance: existing?.complianceStatus,
      existingReviewerNotes: existing?.reviewerNotes,
      existingExplainability: existing?.explainability,
      incoming: {
        ...(typeof inPlaceFindings === "string" ? { inPlaceFindings: buildInitialWorkpaperContent({ inPlaceFindings }).inPlaceFindings } : {}),
        ...(typeof gapFindings === "string" ? { gapFindings: buildInitialWorkpaperContent({ gapFindings }).gapFindings } : {}),
        ...(typeof recommendations === "string"
          ? { recommendations: buildInitialWorkpaperContent({ recommendations }).recommendations }
          : {}),
        ...(typeof complianceStatus === "string"
          ? { complianceStatus: buildInitialWorkpaperContent({ complianceStatus }).complianceStatus }
          : {}),
      },
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
        workpaperContent: merged.content,
        workpaperFieldState: merged.fieldState,
      },
      update: {
        inPlaceFindings: inPlaceFindings ?? undefined,
        gapFindings: gapFindings ?? undefined,
        recommendations: recommendations ?? undefined,
        complianceStatus: complianceStatus ?? undefined,
        workpaperContent: merged.content,
        workpaperFieldState: merged.fieldState,
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

  if (action === "create_review_note") {
    if (!fieldKey || !createdBy?.trim() || !noteBody?.trim()) {
      return NextResponse.json(
        { error: "fieldKey, createdBy, and noteBody are required" },
        { status: 400 }
      );
    }

    const evaluation = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      select: { id: true },
    });
    if (!evaluation) {
      return NextResponse.json({ error: "Control evaluation not found" }, { status: 404 });
    }

    const thread = await prisma.controlReviewNoteThread.create({
      data: {
        assessmentId: id,
        controlEvaluationId: evaluation.id,
        fieldKey,
        title: noteTitle?.trim() || null,
        assignee: assignee?.trim() || null,
        createdBy: createdBy.trim(),
        messages: [
          createThreadMessage({
            author: createdBy,
            body: noteBody,
            quotedText: noteQuotedText,
            highlightId: noteHighlightId,
          }),
        ],
      },
    });
    return NextResponse.json(thread);
  }

  if (action === "reply_review_note") {
    if (!noteThreadId || !createdBy?.trim() || !noteBody?.trim()) {
      return NextResponse.json(
        { error: "noteThreadId, createdBy, and noteBody are required" },
        { status: 400 }
      );
    }
    const existingThread = await prisma.controlReviewNoteThread.findUnique({
      where: { id: noteThreadId },
    });
    if (!existingThread) {
      return NextResponse.json({ error: "Review note thread not found" }, { status: 404 });
    }
    const messages = Array.isArray(existingThread.messages)
      ? [...existingThread.messages]
      : [];
    messages.push(createThreadMessage({ author: createdBy, body: noteBody }));
    const updated = await prisma.controlReviewNoteThread.update({
      where: { id: noteThreadId },
      data: { messages },
    });
    return NextResponse.json(updated);
  }

  if (action === "assign_review_note") {
    if (!noteThreadId || !createdBy?.trim() || !assignee?.trim()) {
      return NextResponse.json(
        { error: "noteThreadId, createdBy, and assignee are required" },
        { status: 400 }
      );
    }
    const existingThread = await prisma.controlReviewNoteThread.findUnique({
      where: { id: noteThreadId },
    });
    if (!existingThread) {
      return NextResponse.json({ error: "Review note thread not found" }, { status: 404 });
    }
    const messages = Array.isArray(existingThread.messages)
      ? [...existingThread.messages]
      : [];
    messages.push(
      createThreadMessage({
        author: createdBy,
        body: `Assigned to ${assignee.trim()}.`,
        kind: "system",
      })
    );
    const updated = await prisma.controlReviewNoteThread.update({
      where: { id: noteThreadId },
      data: {
        assignee: assignee.trim(),
        messages,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "resolve_review_note") {
    if (!noteThreadId || !resolvedBy?.trim()) {
      return NextResponse.json(
        { error: "noteThreadId and resolvedBy are required" },
        { status: 400 }
      );
    }
    const existingThread = await prisma.controlReviewNoteThread.findUnique({
      where: { id: noteThreadId },
    });
    if (!existingThread) {
      return NextResponse.json({ error: "Review note thread not found" }, { status: 404 });
    }
    const messages = Array.isArray(existingThread.messages)
      ? [...existingThread.messages]
      : [];
    messages.push(
      createThreadMessage({
        author: resolvedBy,
        body: resolutionNote?.trim()
          ? `Resolved: ${resolutionNote.trim()}`
          : "Thread resolved.",
        kind: "system",
      })
    );
    const updated = await prisma.controlReviewNoteThread.update({
      where: { id: noteThreadId },
      data: {
        status: "resolved",
        resolvedBy: resolvedBy.trim(),
        resolvedAt: new Date(),
        messages,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "reopen_review_note") {
    if (!noteThreadId || !createdBy?.trim()) {
      return NextResponse.json(
        { error: "noteThreadId and createdBy are required" },
        { status: 400 }
      );
    }
    const existingThread = await prisma.controlReviewNoteThread.findUnique({
      where: { id: noteThreadId },
    });
    if (!existingThread) {
      return NextResponse.json({ error: "Review note thread not found" }, { status: 404 });
    }
    const messages = Array.isArray(existingThread.messages)
      ? [...existingThread.messages]
      : [];
    messages.push(
      createThreadMessage({
        author: createdBy,
        body: resolutionNote?.trim()
          ? `Reopened: ${resolutionNote.trim()}`
          : "Thread reopened.",
        kind: "system",
      })
    );
    const updated = await prisma.controlReviewNoteThread.update({
      where: { id: noteThreadId },
      data: {
        status: "reopened",
        resolvedBy: null,
        resolvedAt: null,
        messages,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "resolve_all_review_notes") {
    if (!controlId || !resolvedBy?.trim()) {
      return NextResponse.json(
        { error: "controlId and resolvedBy are required" },
        { status: 400 }
      );
    }
    const evaluation = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      select: { id: true },
    });
    if (!evaluation) {
      return NextResponse.json({ error: "Control evaluation not found" }, { status: 404 });
    }
    const openThreads = await prisma.controlReviewNoteThread.findMany({
      where: {
        controlEvaluationId: evaluation.id,
        status: { in: ["open", "reopened"] },
      },
    });
    await prisma.$transaction(
      openThreads.map((thread) => {
        const messages = Array.isArray(thread.messages) ? [...thread.messages] : [];
        messages.push(
          createThreadMessage({
            author: resolvedBy,
            body: resolutionNote?.trim()
              ? `Resolved in bulk: ${resolutionNote.trim()}`
              : "Resolved in bulk from workpaper footer.",
            kind: "system",
          })
        );
        return prisma.controlReviewNoteThread.update({
          where: { id: thread.id },
          data: {
            status: "resolved",
            resolvedBy: resolvedBy.trim(),
            resolvedAt: new Date(),
            messages,
          },
        });
      })
    );
    return NextResponse.json({ resolved: openThreads.length });
  }

  if (action === "request_changes") {
    if (!confirmedBy?.trim()) {
      return NextResponse.json({ error: "confirmedBy required" }, { status: 400 });
    }
    const updated = await prisma.controlEvaluation.update({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      data: {
        reviewerComplete: reviewerComplete ?? false,
        reviewerAccurate: reviewerAccurate ?? false,
        reviewerNoHallucination: reviewerNoHallucination ?? false,
        reviewerNotes: reviewerNotes ?? null,
        confirmedBy,
        confirmedAt: signOffTimestamp,
        status: "rejected",
      },
      include: evalInclude,
    });
    await syncDisagreementFromReview(id, updated.id, updated);
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

    const evaluation = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId: id, controlId } },
      select: { id: true },
    });
    if (!evaluation) {
      return NextResponse.json({ error: "Control evaluation not found" }, { status: 404 });
    }
    const openThreadCount = await countOpenReviewThreads([evaluation.id]);
    if (openThreadCount > 0) {
      return NextResponse.json(
        { error: "Resolve all open workpaper review notes before sign-off." },
        { status: 400 }
      );
    }

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
