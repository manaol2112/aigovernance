/**
 * Audit-critical enforcement for the AI System Register risk workflow.
 * Server routes should call these before completing formal risk, entering
 * pilot/production, accepting waivers, or applying manual tiers.
 */

import type { RiskTier } from "@prisma/client";
import {
  isModuleRiskRating,
  isTriggeredAssessmentDone,
  parseAssessmentSuite,
  type AssessmentSuiteState,
  type RegisterAssessmentTypeId,
} from "@/lib/ai-system-register-assessment-triggers";
import { consolidateSuiteForFormalRisk } from "@/lib/ai-system-register-risk-consolidation";
import type { RiskAssessmentFactorScores } from "@/lib/ai-system-register-risk-assessment";
import { requiresRiskAcceptance } from "@/lib/ai-system-register-governance";

export const PRODUCTION_LIKE_STATUSES = new Set(["pilot", "production"]);
export const PRODUCTION_LIKE_STAGES = new Set(["prod"]);

export type SuiteReadiness = {
  ready: boolean;
  requiredTotal: number;
  requiredDone: number;
  requiredOpen: number;
  openRequiredTypes: RegisterAssessmentTypeId[];
  message: string | null;
};

export function getRequiredSuiteReadiness(
  suiteInput: unknown,
  formalRiskStatus: string
): SuiteReadiness {
  const suite = parseAssessmentSuite(suiteInput);
  const required = suite.triggered.filter(
    (item) => item.priority === "required" && item.assessmentType !== "formal_risk"
  );
  const open = required.filter(
    (item) => !isTriggeredAssessmentDone(item, suite, formalRiskStatus)
  );
  const requiredDone = required.length - open.length;
  const ready = open.length === 0;
  return {
    ready,
    requiredTotal: required.length,
    requiredDone,
    requiredOpen: open.length,
    openRequiredTypes: open.map((item) => item.assessmentType),
    message: ready
      ? null
      : `Complete and risk-rate all required detailed assessments first (${requiredDone}/${required.length} done). Open: ${open
          .map((item) => item.shortTitle)
          .join(", ")}.`,
  };
}

/** Block formal assessment complete until required suite modules are rated. */
export function assertFormalCompleteAllowed(
  suiteInput: unknown,
  formalRiskStatus: string
): string | null {
  const readiness = getRequiredSuiteReadiness(suiteInput, formalRiskStatus);
  if (!readiness.ready) return readiness.message;
  const consolidation = consolidateSuiteForFormalRisk(
    parseAssessmentSuite(suiteInput),
    formalRiskStatus
  );
  if (!consolidation.readyForFormal) {
    return "Required detailed assessments must be completed or waived with a risk rating before applying the final rating.";
  }
  return null;
}

export function isProductionLikeLifecycle(input: {
  status?: string | null;
  deploymentStage?: string | null;
}): boolean {
  return (
    PRODUCTION_LIKE_STATUSES.has(input.status ?? "") ||
    PRODUCTION_LIKE_STAGES.has(input.deploymentStage ?? "")
  );
}

export type LifecycleGateInput = {
  status?: string | null;
  deploymentStage?: string | null;
  riskSource?: string | null;
  riskAssessmentStatus?: string | null;
  riskTier?: RiskTier | string | null;
  riskAcceptanceStatus?: string | null;
  assessmentSuite?: unknown;
};

/**
 * Pilot/production (or prod deployment stage) requires an assessed (not stale)
 * formal rating, required suite readiness, and acceptance when the tier needs it.
 */
export function assertLifecycleTransitionAllowed(system: LifecycleGateInput): string | null {
  if (!isProductionLikeLifecycle(system)) return null;

  const readiness = getRequiredSuiteReadiness(
    system.assessmentSuite,
    system.riskAssessmentStatus ?? "not_started"
  );
  if (!readiness.ready) {
    return `Cannot move to pilot/production until required assessments are complete. ${readiness.message}`;
  }

  if (system.riskSource !== "assessed") {
    return "Pilot/production requires a completed formal risk assessment (manual classification alone is not sufficient).";
  }

  if (system.riskAssessmentStatus !== "completed") {
    return system.riskAssessmentStatus === "stale"
      ? "Risk assessment is stale after material changes. Re-run the formal assessment before pilot/production."
      : "Complete the formal risk assessment before moving to pilot/production.";
  }

  if (
    requiresRiskAcceptance(system.riskTier as RiskTier) &&
    system.riskAcceptanceStatus !== "accepted"
  ) {
    if (system.riskAcceptanceStatus === "pending_second_review") {
      return "Second-reviewer approval is still pending before pilot/production.";
    }
    return "Residual risk acceptance is required before pilot/production for this risk tier.";
  }

  return null;
}

/** Manual tiers cannot be used once the system is (or is moving) into production-like use. */
export function assertManualRiskAllowed(input: {
  currentStatus?: string | null;
  currentDeploymentStage?: string | null;
  nextStatus?: string | null;
  nextDeploymentStage?: string | null;
}): string | null {
  const current = isProductionLikeLifecycle({
    status: input.currentStatus,
    deploymentStage: input.currentDeploymentStage,
  });
  const next = isProductionLikeLifecycle({
    status: input.nextStatus ?? input.currentStatus,
    deploymentStage: input.nextDeploymentStage ?? input.currentDeploymentStage,
  });
  if (current || next) {
    return "Manual risk classification cannot be used for pilot/production systems. Complete the assessment suite and formal risk rating instead.";
  }
  return null;
}

const NON_WAIVABLE_WHEN: Partial<
  Record<RegisterAssessmentTypeId, (ctx: WaiverContext) => string | null>
> = {
  privacy_dpia: (ctx) =>
    ctx.specialCategoryData
      ? "Privacy / DPIA cannot be waived when special-category data is processed."
      : null,
  fundamental_rights: (ctx) =>
    ["automated_recommendation", "automated_decision"].includes(ctx.decisionImpact ?? "")
      ? "Fundamental rights assessment cannot be waived for automated people-impacting decisions."
      : null,
  legal_regulatory: (ctx) =>
    ["potential", "confirmed", "legal_review"].includes(ctx.euAnnexIiiRelevance ?? "")
      ? "Legal / regulatory assessment cannot be waived while Annex III relevance is declared."
      : null,
};

export type WaiverContext = {
  assessmentType: RegisterAssessmentTypeId;
  priority: "required" | "recommended";
  riskRatingRationale?: string | null;
  actorRole?: string | null;
  specialCategoryData?: boolean | null;
  decisionImpact?: string | null;
  euAnnexIiiRelevance?: string | null;
};

export function assertWaiverAllowed(ctx: WaiverContext): string | null {
  const rationale = (ctx.riskRatingRationale ?? "").trim();
  if (rationale.length < 20) {
    return "A rating rationale (at least 20 characters) is required when waiving an assessment.";
  }

  if (ctx.priority === "required") {
    const role = ctx.actorRole ?? "";
    if (role !== "admin" && role !== "risk_owner") {
      return "Required assessments can only be waived by a risk owner or admin.";
    }
  }

  const rule = NON_WAIVABLE_WHEN[ctx.assessmentType];
  if (rule) {
    const blocked = rule(ctx);
    if (blocked) return blocked;
  }

  return null;
}

/** Completing a module also requires a rating rationale for auditability. */
export function assertModuleCompleteRatingRationale(
  riskRatingRationale: string | null | undefined
): string | null {
  if ((riskRatingRationale ?? "").trim().length < 20) {
    return "A rating rationale (at least 20 characters) is required when completing an assessment.";
  }
  return null;
}

/** Mark completed/waived module ratings stale so they must be re-affirmed. */
export function invalidateRatedModules(suite: AssessmentSuiteState): AssessmentSuiteState {
  const modules: AssessmentSuiteState["modules"] = { ...suite.modules };
  for (const [type, module] of Object.entries(modules)) {
    if (!module) continue;
    if (module.status === "completed" || module.status === "waived") {
      modules[type as RegisterAssessmentTypeId] = {
        ...module,
        status: "stale",
      };
    }
  }
  return {
    ...suite,
    modules,
    computedAt: new Date().toISOString(),
  };
}

export function extractTreatmentPlanFromScores(
  scores: RiskAssessmentFactorScores
): string | null {
  const treatNotes = scores.answers.treat_notes?.value;
  if (typeof treatNotes === "string" && treatNotes.trim()) return treatNotes.trim();
  const legacy = scores.answers.findings_treatment?.value;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

export function moduleStatusLabel(status: string | undefined): string {
  if (status === "stale") return "Needs re-affirmation";
  return status?.replace(/_/g, " ") ?? "not started";
}

export function hasModuleRiskRating(value: unknown): boolean {
  return isModuleRiskRating(value);
}
