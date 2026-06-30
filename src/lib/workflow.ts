import { prisma } from "@/lib/db";
import type { CheckpointType, WorkflowStage } from "@prisma/client";
import { WORKFLOW_STEPS } from "@/lib/use-case-types";

const CHECKPOINT_DEFS: Record<
  CheckpointType,
  { title: string; summaryTemplate: string; producedAtStage: WorkflowStage }
> = {
  scope_confirmation: {
    title: "Confirm Client Scope & Framework Selection",
    summaryTemplate: "Review client name, industry, and selected frameworks before defining use cases.",
    producedAtStage: "client_setup",
  },
  use_case_confirmation: {
    title: "Confirm AI Use Cases",
    summaryTemplate: "Review all AI use cases, types, risk tiers, and descriptions before scoping requirements.",
    producedAtStage: "use_cases",
  },
  requirement_scoping_confirmation: {
    title: "Confirm Scoped Requirements",
    summaryTemplate: "Review auto-scoped requirements per use case before conducting the workshop.",
    producedAtStage: "requirement_scoping",
  },
  evaluation_review: {
    title: "Confirm Control Analysis Results",
    summaryTemplate: "Validate per-control AI analysis, citation traceability, and reviewer sign-off before generating deliverables.",
    producedAtStage: "workshop",
  },
  deliverable_approval: {
    title: "Approve Final Deliverables",
    summaryTemplate: "Review generated reports before client delivery or board presentation.",
    producedAtStage: "deliverables",
  },
};

const STAGE_ORDER: WorkflowStage[] = [
  "client_setup",
  "use_cases",
  "requirement_scoping",
  "workshop",
  "evaluation",
  "human_review",
  "deliverables",
  "finalized",
];

function stageIndex(stage: WorkflowStage): number {
  return STAGE_ORDER.indexOf(stage);
}

type AssessmentSnapshot = NonNullable<Awaited<ReturnType<typeof loadAssessmentForCheckpoints>>>;

async function loadAssessmentForCheckpoints(assessmentId: string) {
  return prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      scope: true,
      useCases: {
        include: { _count: { select: { scopedRequirements: true, pillarWorkshopResponses: true } } },
      },
      requirementEvaluations: true,
      controlEvaluations: true,
      deliverables: true,
    },
  });
}

function isCheckpointReady(type: CheckpointType, assessment: AssessmentSnapshot): boolean {
  switch (type) {
    case "scope_confirmation":
      return !!(assessment.clientName && assessment.scope?.frameworkCodes.length);
    case "use_case_confirmation":
      return assessment.useCases.length > 0;
    case "requirement_scoping_confirmation":
      return assessment.useCases.some((uc) => uc._count.scopedRequirements > 0);
    case "evaluation_review":
      return (
        assessment.controlEvaluations.length > 0 &&
        assessment.controlEvaluations.every((e) => e.status === "human_confirmed")
      );
    case "deliverable_approval":
      return assessment.deliverables.length > 0;
    default:
      return false;
  }
}

async function buildReviewSummary(type: CheckpointType, assessment: AssessmentSnapshot): Promise<string> {
  switch (type) {
    case "scope_confirmation":
      return `Client: ${assessment.clientName ?? "—"} | Industry: ${assessment.clientIndustry ?? "—"} | Frameworks: ${assessment.scope?.frameworkCodes.join(", ") ?? "none"}`;
    case "use_case_confirmation":
      return assessment.useCases
        .map((uc, i) => `${i + 1}. ${uc.name} (${uc.useCaseType}, risk: ${uc.riskTier ?? "default"})`)
        .join("\n");
    case "requirement_scoping_confirmation": {
      const lines = assessment.useCases.map(
        (uc) => `• ${uc.name}: ${uc._count.scopedRequirements} requirements scoped`
      );
      const total = assessment.useCases.reduce((s, uc) => s + uc._count.scopedRequirements, 0);
      return `${total} total requirements scoped across ${assessment.useCases.length} use case(s):\n${lines.join("\n")}`;
    }
    case "evaluation_review": {
      const total = assessment.controlEvaluations.length;
      const confirmed = assessment.controlEvaluations.filter((e) => e.status === "human_confirmed").length;
      const analyzed = assessment.controlEvaluations.filter((e) => e.status !== "pending").length;
      const aligned = assessment.controlEvaluations.filter((e) => e.complianceStatus === "aligned").length;
      const gaps = assessment.controlEvaluations.filter((e) => e.complianceStatus !== "aligned").length;
      return `${total} controls in scope | ${analyzed} analyzed | ${confirmed} reviewer-confirmed | ${aligned} aligned | ${gaps} gaps/partial\nAll controls must be reviewer-confirmed before deliverables.`;
    }
    case "deliverable_approval":
      return assessment.deliverables.map((d) => `• ${d.title} (${d.status})`).join("\n");
    default:
      return "Review required before continuing.";
  }
}

function resolveCheckpointStatus(
  type: CheckpointType,
  assessment: AssessmentSnapshot,
  existingStatus: string | undefined
): "locked" | "pending" | "approved" {
  if (existingStatus === "approved") return "approved";
  if (!isCheckpointReady(type, assessment)) return "locked";

  const currentIdx = stageIndex(assessment.workflowStage);
  const producedIdx = stageIndex(CHECKPOINT_DEFS[type].producedAtStage);

  // Unlock when the assessment has reached or passed the stage that produces reviewable content
  if (currentIdx >= producedIdx) return "pending";
  return "locked";
}

export async function syncCheckpoints(assessmentId: string) {
  const assessment = await loadAssessmentForCheckpoints(assessmentId);
  if (!assessment) return;

  for (const [type, def] of Object.entries(CHECKPOINT_DEFS) as [CheckpointType, typeof CHECKPOINT_DEFS[CheckpointType]][]) {
    const existing = await prisma.humanCheckpoint.findUnique({
      where: { assessmentId_checkpointType: { assessmentId, checkpointType: type } },
    });

    const status = resolveCheckpointStatus(type, assessment, existing?.status);
    const reviewSummary = await buildReviewSummary(type, assessment);

    await prisma.humanCheckpoint.upsert({
      where: { assessmentId_checkpointType: { assessmentId, checkpointType: type } },
      create: {
        assessmentId,
        checkpointType: type,
        title: def.title,
        summary: reviewSummary,
        status,
      },
      update: {
        summary: reviewSummary,
        status: existing?.status === "approved" ? "approved" : status,
      },
    });
  }
}

export async function approveCheckpoint(
  assessmentId: string,
  type: CheckpointType,
  confirmedBy: string,
  notes?: string
) {
  const cp = await prisma.humanCheckpoint.findUnique({
    where: { assessmentId_checkpointType: { assessmentId, checkpointType: type } },
  });
  if (!cp || cp.status === "locked") {
    throw new Error("Checkpoint is not ready for approval yet.");
  }
  if (cp.status === "approved") return cp;

  return prisma.humanCheckpoint.update({
    where: { assessmentId_checkpointType: { assessmentId, checkpointType: type } },
    data: {
      status: "approved",
      confirmedBy,
      confirmedAt: new Date(),
      reviewerNotes: notes,
    },
  });
}

export async function advanceWorkflowStage(assessmentId: string, stage: WorkflowStage) {
  const result = await prisma.assessment.update({
    where: { id: assessmentId },
    data: { workflowStage: stage, status: stage === "finalized" ? "completed" : "in_progress" },
  });
  await syncCheckpoints(assessmentId);
  return result;
}

export function getNextStage(current: WorkflowStage): WorkflowStage | null {
  // Combined analysis path: workshop → deliverables (skip legacy evaluation/human_review)
  if (current === "workshop" || current === "evaluation" || current === "human_review") {
    return "deliverables";
  }
  const idx = WORKFLOW_STEPS.findIndex((s) => s.stage === current);
  if (idx === -1 || idx >= WORKFLOW_STEPS.length - 1) return null;
  const next = WORKFLOW_STEPS[idx + 1].stage as WorkflowStage;
  return next;
}

/** Collapse legacy analysis stages to the combined workshop step for navigation. */
export function normalizeStageForNavigation(stage: string): WorkflowStage {
  if (stage === "evaluation" || stage === "human_review") return "workshop";
  return stage as WorkflowStage;
}

/** Stepper index used for back/forward navigation (matches displayStepIndex). */
export function navigationStageIndex(stage: string): number {
  if (stage === "evaluation" || stage === "human_review") return 3;
  if (stage === "deliverables") return 4;
  if (stage === "finalized") return 5;
  const idx = WORKFLOW_STEPS.findIndex((s) => s.stage === stage);
  return idx >= 0 ? idx : 0;
}

/** Users may revisit any stage at or before their current progress. */
export function canGoToStage(current: string, target: string): boolean {
  return navigationStageIndex(target) <= navigationStageIndex(current);
}

export function getCheckpointForStage(stage: WorkflowStage): CheckpointType | null {
  const map: Partial<Record<WorkflowStage, CheckpointType>> = {
    client_setup: "scope_confirmation",
    use_cases: "use_case_confirmation",
    requirement_scoping: "requirement_scoping_confirmation",
    workshop: "evaluation_review",
    evaluation: "evaluation_review",
    human_review: "evaluation_review",
    deliverables: "deliverable_approval",
  };
  return map[stage] ?? null;
}

export async function isCheckpointApproved(assessmentId: string, type: CheckpointType): Promise<boolean> {
  const cp = await prisma.humanCheckpoint.findUnique({
    where: { assessmentId_checkpointType: { assessmentId, checkpointType: type } },
  });
  return cp?.status === "approved";
}

export async function initializeWorkflowCheckpoints(assessmentId: string) {
  await syncCheckpoints(assessmentId);
}

export { CHECKPOINT_DEFS, STAGE_ORDER };
