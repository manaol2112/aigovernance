import { prisma } from "@/lib/db";
import type { SystematicAmbiguityReport } from "@/lib/governance-v2/types";

export async function recordReviewerDisagreement(input: {
  assessmentId: string;
  controlEvaluationId: string;
  aiComplianceStatus: string;
  reviewerComplianceStatus?: string;
  reviewerOverride?: string;
  mismatchReason?: string;
  disputedField?: string;
}) {
  const existing = await prisma.reviewerDisagreement.findFirst({
    where: {
      controlEvaluationId: input.controlEvaluationId,
      status: "open",
    },
  });
  if (existing) {
    return prisma.reviewerDisagreement.update({
      where: { id: existing.id },
      data: {
        reviewerComplianceStatus: input.reviewerComplianceStatus,
        reviewerOverride: input.reviewerOverride,
        mismatchReason: input.mismatchReason,
        disputedField: input.disputedField,
      },
    });
  }

  const patternTag = inferPatternTag(input.disputedField, input.mismatchReason);

  return prisma.reviewerDisagreement.create({
    data: {
      assessmentId: input.assessmentId,
      controlEvaluationId: input.controlEvaluationId,
      aiComplianceStatus: input.aiComplianceStatus,
      reviewerComplianceStatus: input.reviewerComplianceStatus,
      reviewerOverride: input.reviewerOverride,
      mismatchReason: input.mismatchReason,
      disputedField: input.disputedField,
      patternTag,
    },
  });
}

function inferPatternTag(field?: string, reason?: string): string | undefined {
  const text = `${field ?? ""} ${reason ?? ""}`.toLowerCase();
  if (text.includes("hallucin")) return "ai_hallucination";
  if (text.includes("partial") || text.includes("aligned")) return "severity_mismatch";
  if (text.includes("evidence")) return "evidence_interpretation";
  if (text.includes("scope")) return "scope_ambiguity";
  return undefined;
}

export async function resolveDisagreement(
  id: string,
  resolution: "accepted_ai" | "accepted_reviewer",
  resolvedBy: string
) {
  return prisma.reviewerDisagreement.update({
    where: { id },
    data: {
      status: resolution,
      resolvedBy,
      resolvedAt: new Date(),
    },
  });
}

export async function buildSystematicAmbiguityReport(
  assessmentId: string
): Promise<SystematicAmbiguityReport> {
  const disagreements = await prisma.reviewerDisagreement.findMany({
    where: { assessmentId },
    include: {
      controlEvaluation: { include: { control: { select: { code: true } } } },
    },
  });

  const open = disagreements.filter((d) => d.status === "open");
  const patternMap = new Map<string, string[]>();

  for (const d of disagreements) {
    const tag = d.patternTag ?? "unclassified";
    const list = patternMap.get(tag) ?? [];
    list.push(d.controlEvaluation.control.code);
    patternMap.set(tag, list);
  }

  const patterns = [...patternMap.entries()].map(([tag, examples]) => ({
    tag,
    count: examples.length,
    examples: examples.slice(0, 5),
  }));

  const fieldCounts = new Map<string, number>();
  for (const d of disagreements) {
    const f = d.disputedField ?? "general";
    fieldCounts.set(f, (fieldCounts.get(f) ?? 0) + 1);
  }

  const topMismatchFields = [...fieldCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f]) => f);

  return {
    openDisagreements: open.length,
    patterns,
    topMismatchFields,
  };
}

export async function listDisagreements(assessmentId: string) {
  return prisma.reviewerDisagreement.findMany({
    where: { assessmentId },
    include: {
      controlEvaluation: {
        include: { control: { select: { code: true, title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Detect disagreement when reviewer flags differ from AI compliance. */
export async function syncDisagreementFromReview(
  assessmentId: string,
  controlEvaluationId: string,
  evaluation: {
    complianceStatus: string;
    reviewerAccurate: boolean | null;
    reviewerNoHallucination: boolean | null;
    reviewerNotes: string | null;
  }
) {
  const reviewerRejected =
    evaluation.reviewerAccurate === false || evaluation.reviewerNoHallucination === false;
  if (!reviewerRejected) return null;

  return recordReviewerDisagreement({
    assessmentId,
    controlEvaluationId,
    aiComplianceStatus: evaluation.complianceStatus,
    reviewerComplianceStatus: evaluation.reviewerAccurate === false ? "disputed" : undefined,
    reviewerOverride: evaluation.reviewerNotes ?? undefined,
    mismatchReason: evaluation.reviewerNoHallucination === false
      ? "Reviewer flagged potential AI hallucination"
      : "Reviewer disputed AI mapping accuracy",
    disputedField: "compliance_status",
  });
}
