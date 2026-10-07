/**
 * Consolidates detailed suite assessment outcomes into formal risk rating inputs.
 * Formal risk is the final assessment: inherent / residual rating + treatment.
 */

import type { RiskTier } from "@prisma/client";
import {
  ASSESSMENT_MODULE_QUESTIONS,
  getAssessmentTypeMeta,
  isTriggeredAssessmentDone,
  moduleRiskRatingToConcern,
  type AssessmentSuiteState,
  type ModuleAnswerValue,
  type ModuleRiskRating,
  type RegisterAssessmentTypeId,
} from "@/lib/ai-system-register-assessment-triggers";
import type {
  RiskAnswerValue,
  RiskAssessmentAnswers,
  RiskAssessmentFactorScores,
} from "@/lib/ai-system-register-risk-assessment";

const PEOPLE_MODULES = new Set<RegisterAssessmentTypeId>([
  "privacy_dpia",
  "fundamental_rights",
  "fairness_bias",
  "legal_regulatory",
]);

const OPS_MODULES = new Set<RegisterAssessmentTypeId>([
  "security_threat",
  "safety",
  "data_risk",
  "agent_autonomy",
  "third_party_model",
  "change_model",
]);

export type ConsolidatedModuleFinding = {
  assessmentType: RegisterAssessmentTypeId;
  title: string;
  shortTitle: string;
  priority: "required" | "recommended";
  status: "not_started" | "in_progress" | "completed" | "waived" | "stale";
  answered: number;
  total: number;
  adverseCount: number;
  concernScore: number; // 0–4
  riskRating: ModuleRiskRating | null;
  theme: "people" | "ops" | "other";
  gaps: Array<{ questionId: string; prompt: string; value: ModuleAnswerValue }>;
  notes?: string;
  waivedReason?: string | null;
};

export type RiskTreatmentRequirement = {
  id: string;
  strategy: "mitigate" | "accept" | "complete_assessment" | "monitor";
  title: string;
  detail: string;
  sourceAssessmentType?: RegisterAssessmentTypeId;
  severity: "critical" | "high" | "medium" | "low";
};

export type SuiteRiskConsolidation = {
  computedAt: string;
  moduleFindings: ConsolidatedModuleFinding[];
  requiredTotal: number;
  requiredDone: number;
  requiredOpen: number;
  recommendedOpen: number;
  peopleConcern: number; // 0–4
  opsConcern: number; // 0–4
  controlStrengthPct: number; // 0–40
  overallInherentScore: number;
  overallResidualScore: number;
  overallInherentTier: RiskTier;
  overallResidualTier: RiskTier;
  hardRulesFired: string[];
  treatmentRequirements: RiskTreatmentRequirement[];
  suggestedAnswers: RiskAssessmentAnswers;
  summary: string;
  readyForFormal: boolean;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreToTier(score: number): RiskTier {
  if (score >= 80) return "prohibited";
  if (score >= 60) return "high";
  if (score >= 35) return "limited";
  return "minimal";
}

function tierRank(tier: RiskTier): number {
  switch (tier) {
    case "minimal":
      return 0;
    case "limited":
      return 1;
    case "gpai":
      return 2;
    case "high":
      return 3;
    case "prohibited":
      return 4;
    case "general":
    default:
      return 0;
  }
}

function tierByRank(rank: number): RiskTier {
  if (rank >= 4) return "prohibited";
  if (rank >= 3) return "high";
  if (rank >= 2) return "gpai";
  if (rank >= 1) return "limited";
  return "minimal";
}

function answerConcern(value: ModuleAnswerValue | undefined): number | null {
  if (value == null || value === "" || value === "na") return null;
  if (value === "no") return 4;
  if (value === "partial") return 2;
  if (value === "yes") return 0;
  return null;
}

function concernToScore04(avg: number): number {
  return Math.round(clamp(avg, 0, 4));
}

function moduleTheme(type: RegisterAssessmentTypeId): "people" | "ops" | "other" {
  if (PEOPLE_MODULES.has(type)) return "people";
  if (OPS_MODULES.has(type)) return "ops";
  return "other";
}

export type ConsolidationContext = {
  decisionImpact?: string | null;
  autonomyLevel?: string | null;
  euAnnexIiiRelevance?: string | null;
  personalDataInvolved?: boolean | null;
  specialCategoryData?: boolean | null;
  businessCriticality?: string | null;
};

/** Build consolidation inputs for the final formal risk assessment. */
export function consolidateSuiteForFormalRisk(
  suite: AssessmentSuiteState,
  formalRiskStatus: string,
  context: ConsolidationContext = {}
): SuiteRiskConsolidation {
  const moduleFindings: ConsolidatedModuleFinding[] = [];
  const treatmentRequirements: RiskTreatmentRequirement[] = [];
  const hardRulesFired: string[] = [];

  let requiredTotal = 0;
  let requiredDone = 0;
  let requiredOpen = 0;
  let recommendedOpen = 0;

  let peopleWeighted = 0;
  let peopleWeight = 0;
  let opsWeighted = 0;
  let opsWeight = 0;
  let yesCount = 0;
  let scoredAnswerCount = 0;

  for (const item of suite.triggered) {
    if (item.assessmentType === "formal_risk") continue;

    const questions =
      ASSESSMENT_MODULE_QUESTIONS[
        item.assessmentType as Exclude<RegisterAssessmentTypeId, "formal_risk">
      ] ?? [];
    const module = suite.modules[item.assessmentType];
    const status = module?.status ?? "not_started";
    const done = isTriggeredAssessmentDone(item, suite, formalRiskStatus);
    const weight = item.priority === "required" ? 1.25 : 1;

    if (item.priority === "required") {
      requiredTotal += 1;
      if (done) requiredDone += 1;
      else requiredOpen += 1;
    } else if (!done) {
      recommendedOpen += 1;
    }

    const gaps: ConsolidatedModuleFinding["gaps"] = [];
    let concernSum = 0;
    let concernN = 0;
    let answered = 0;

    for (const question of questions) {
      const value = module?.answers?.[question.id] as ModuleAnswerValue | undefined;
      if (value != null && value !== "") answered += 1;
      const concern = answerConcern(value);
      if (concern === null) continue;
      scoredAnswerCount += 1;
      if (concern === 0) yesCount += 1;
      concernSum += concern;
      concernN += 1;
      if (concern >= 2 && value) {
        gaps.push({ questionId: question.id, prompt: question.prompt, value });
      }
    }

    // Assigned module risk rating is the primary consolidation input; gaps refine treatment.
    const assignedRating = module?.riskRating ?? null;
    let concernScore = assignedRating
      ? moduleRiskRatingToConcern(assignedRating)
      : concernN > 0
        ? concernSum / concernN
        : status === "waived"
          ? 1
          : done
            ? 0.5
            : 3;

    if (!done && item.priority === "required") {
      concernScore = Math.max(concernScore, 3);
      treatmentRequirements.push({
        id: `complete_${item.assessmentType}`,
        strategy: "complete_assessment",
        title: `Complete and rate ${item.shortTitle}`,
        detail: `${item.title} must be completed with a risk rating before the final consolidation.`,
        sourceAssessmentType: item.assessmentType,
        severity: "high",
      });
    } else if (done && assignedRating && (assignedRating === "high" || assignedRating === "prohibited")) {
      treatmentRequirements.push({
        id: `treat_rating_${item.assessmentType}`,
        strategy: "mitigate",
        title: `${item.shortTitle}: ${assignedRating} rating`,
        detail:
          module?.riskRatingRationale?.trim() ||
          `This assessment was rated ${assignedRating} and requires treatment in the final risk plan.`,
        sourceAssessmentType: item.assessmentType,
        severity: assignedRating === "prohibited" ? "critical" : "high",
      });
    } else if (done && assignedRating === "limited") {
      treatmentRequirements.push({
        id: `monitor_rating_${item.assessmentType}`,
        strategy: "monitor",
        title: `${item.shortTitle}: limited residual risk`,
        detail:
          module?.riskRatingRationale?.trim() ||
          "Limited residual risk — monitor and track treatment actions.",
        sourceAssessmentType: item.assessmentType,
        severity: "medium",
      });
    }

    const theme = moduleTheme(item.assessmentType);
    if (theme === "people") {
      peopleWeighted += concernScore * weight;
      peopleWeight += weight;
    } else if (theme === "ops") {
      opsWeighted += concernScore * weight;
      opsWeight += weight;
    } else {
      opsWeighted += concernScore * weight * 0.5;
      opsWeight += weight * 0.5;
    }

    for (const gap of gaps) {
      treatmentRequirements.push({
        id: `mitigate_${item.assessmentType}_${gap.questionId}`,
        strategy: "mitigate",
        title: `${item.shortTitle}: close control gap`,
        detail: `${gap.prompt} → answered “${gap.value}”.`,
        sourceAssessmentType: item.assessmentType,
        severity: gap.value === "no" ? "high" : "medium",
      });
    }

    if (status === "waived" && module?.waivedReason?.trim()) {
      treatmentRequirements.push({
        id: `monitor_waiver_${item.assessmentType}`,
        strategy: "monitor",
        title: `Monitor waived ${item.shortTitle}`,
        detail: module.waivedReason.trim(),
        sourceAssessmentType: item.assessmentType,
        severity: "low",
      });
    }

    moduleFindings.push({
      assessmentType: item.assessmentType,
      title: item.title,
      shortTitle: item.shortTitle,
      priority: item.priority,
      status,
      answered,
      total: questions.length,
      adverseCount: gaps.length,
      concernScore: concernToScore04(concernScore),
      riskRating: assignedRating,
      theme,
      gaps,
      notes: module?.notes,
      waivedReason: module?.waivedReason,
    });
  }

  const peopleConcern = peopleWeight > 0 ? peopleWeighted / peopleWeight : 1;
  const opsConcern = opsWeight > 0 ? opsWeighted / opsWeight : 1;
  const blendedConcern = (peopleConcern * 1.1 + opsConcern) / 2.1;
  let overallInherentScore = Math.round(clamp((blendedConcern / 4) * 100, 0, 100));

  const annex = (context.euAnnexIiiRelevance ?? "").trim();
  if (annex && !/^(none|n\/a|no|false)$/i.test(annex)) {
    hardRulesFired.push("annex_iii_relevance");
    overallInherentScore = Math.max(overallInherentScore, 60);
  }
  if (context.decisionImpact === "automated_decision" && context.autonomyLevel === "high") {
    hardRulesFired.push("automated_high_autonomy");
    overallInherentScore = Math.max(overallInherentScore, 60);
  }
  if (context.specialCategoryData) {
    hardRulesFired.push("special_category_data");
    overallInherentScore = Math.max(overallInherentScore, 35);
  }
  if (
    context.businessCriticality === "high" ||
    context.businessCriticality === "mission_critical"
  ) {
    hardRulesFired.push("business_criticality");
    overallInherentScore = Math.max(overallInherentScore, 45);
  }
  if (requiredOpen > 0) {
    hardRulesFired.push("suite_incomplete");
    overallInherentScore = Math.max(overallInherentScore, 40);
  }

  let overallInherentTier = scoreToTier(overallInherentScore);
  if (hardRulesFired.includes("annex_iii_relevance") || hardRulesFired.includes("automated_high_autonomy")) {
    if (tierRank(overallInherentTier) < tierRank("high")) overallInherentTier = "high";
  }

  const yesRatio = scoredAnswerCount > 0 ? yesCount / scoredAnswerCount : 0;
  const controlStrengthPct = Math.round(clamp(yesRatio * 40, 0, 40));
  let overallResidualScore = Math.round(
    clamp(overallInherentScore * (1 - controlStrengthPct / 100), 0, 100)
  );
  let overallResidualTier = scoreToTier(overallResidualScore);
  if (tierRank(overallInherentTier) - tierRank(overallResidualTier) > 1) {
    overallResidualTier = tierByRank(tierRank(overallInherentTier) - 1);
    overallResidualScore = Math.max(overallResidualScore, overallInherentTier === "high" ? 45 : 30);
  }

  if (["limited", "high", "prohibited", "gpai"].includes(overallResidualTier)) {
    treatmentRequirements.push({
      id: "accept_residual",
      strategy: "accept",
      title: "Prepare residual risk acceptance",
      detail: `Suggested residual tier is ${overallResidualTier}. Elevated tiers require documented acceptance and review cadence.`,
      severity: overallResidualTier === "high" || overallResidualTier === "prohibited" ? "critical" : "high",
    });
  }

  // Deduplicate treatments (prefer first occurrence) and cap list length.
  const seen = new Set<string>();
  const uniqueTreatments = treatmentRequirements.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  const orderedTreatments = [
    ...uniqueTreatments.filter((t) => t.strategy === "complete_assessment"),
    ...uniqueTreatments.filter((t) => t.strategy === "mitigate"),
    ...uniqueTreatments.filter((t) => t.strategy === "accept"),
    ...uniqueTreatments.filter((t) => t.strategy === "monitor"),
  ].slice(0, 12);

  const readyForFormal = requiredOpen === 0;
  const suiteRequiredAnswer: RiskAnswerValue =
    requiredTotal === 0 ? "yes" : requiredOpen === 0 ? "yes" : requiredDone === 0 ? "no" : "partial";

  const people04 = concernToScore04(peopleConcern);
  const ops04 = concernToScore04(opsConcern);
  const controlsOperating: RiskAnswerValue =
    controlStrengthPct >= 28 ? "yes" : controlStrengthPct >= 14 ? "partial" : "no";

  const treatmentNotes = orderedTreatments
    .slice(0, 8)
    .map((item) => `• [${item.strategy}] ${item.title}: ${item.detail}`)
    .join("\n");

  const ratedCount = moduleFindings.filter((m) => m.riskRating).length;
  const summaryParts = [
    `Consolidated ${moduleFindings.length} detailed assessment${moduleFindings.length === 1 ? "" : "s"} (${ratedCount} with assigned risk ratings).`,
    `Required suite progress: ${requiredDone}/${requiredTotal}.`,
    `Suggested overall inherent risk: ${overallInherentTier} (${overallInherentScore}/100).`,
    `Suggested overall residual risk: ${overallResidualTier} (${overallResidualScore}/100) with ${controlStrengthPct}% control strength from suite answers.`,
  ];
  if (orderedTreatments.length > 0) {
    summaryParts.push(
      `${orderedTreatments.length} risk treatment requirement${orderedTreatments.length === 1 ? "" : "s"} identified.`
    );
  }

  const suggestedAnswers: RiskAssessmentAnswers = {
    suite_required_complete: { value: suiteRequiredAnswer },
    suite_gaps_accepted: {
      value: orderedTreatments.some((t) => t.strategy === "mitigate") ? "partial" : "yes",
    },
    suite_domain_outcomes_reflected: {
      value: moduleFindings.some((m) => m.status === "completed" || m.status === "waived")
        ? "yes"
        : "no",
    },
    suite_register_aligned: { value: "yes" },
    res_people_impact: { value: people04 },
    res_ops_resilience: { value: ops04 },
    res_controls_operating: { value: controlsOperating },
    res_cross_cutting_gaps: {
      value: moduleFindings
        .filter((m) => m.riskRating || m.adverseCount > 0)
        .map((m) =>
          m.riskRating
            ? `${m.shortTitle}: ${m.riskRating}${m.adverseCount ? ` (${m.adverseCount} gap(s))` : ""}`
            : `${m.shortTitle}: ${m.adverseCount} open gap(s)`
        )
        .join("; "),
    },
    treat_strategy_defined: {
      value: orderedTreatments.some((t) => t.strategy === "mitigate") ? "partial" : "yes",
    },
    treat_actions_owned: { value: "partial" },
    treat_acceptance_ready: {
      value: orderedTreatments.some((t) => t.strategy === "accept") ? "partial" : "na",
    },
    treat_review_trigger: { value: "partial" },
    treat_notes: { value: treatmentNotes || "No material treatment actions derived from suite modules." },
    findings_summary: {
      value: [
        `Recommended residual rating: ${overallResidualTier} (score ${overallResidualScore}/100).`,
        `Overall inherent risk: ${overallInherentTier} (score ${overallInherentScore}/100).`,
        ...summaryParts,
        hardRulesFired.length
          ? `Elevated factors: ${hardRulesFired.map((r) => r.replace(/_/g, " ")).join("; ")}.`
          : "",
        "Completing this formal assessment applies the residual rating and treatment posture to the register use case.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  };

  return {
    computedAt: new Date().toISOString(),
    moduleFindings,
    requiredTotal,
    requiredDone,
    requiredOpen,
    recommendedOpen,
    peopleConcern: people04,
    opsConcern: ops04,
    controlStrengthPct,
    overallInherentScore,
    overallResidualScore,
    overallInherentTier,
    overallResidualTier,
    hardRulesFired,
    treatmentRequirements: orderedTreatments,
    suggestedAnswers,
    summary: summaryParts.join(" "),
    readyForFormal,
  };
}

/** Merge suite-derived suggestions into formal answers without overwriting user edits. */
export function applySuiteSuggestionsToFactorScores(
  current: RiskAssessmentFactorScores,
  consolidation: SuiteRiskConsolidation,
  opts?: { overwriteEmptyOnly?: boolean; forceControlStrength?: boolean }
): RiskAssessmentFactorScores {
  const overwriteEmptyOnly = opts?.overwriteEmptyOnly ?? true;
  const nextAnswers: RiskAssessmentAnswers = { ...current.answers };

  for (const [key, suggestion] of Object.entries(consolidation.suggestedAnswers)) {
    const existing = nextAnswers[key]?.value;
    const empty =
      existing === undefined || existing === null || String(existing).trim() === "";
    if (!overwriteEmptyOnly || empty) {
      nextAnswers[key] = { ...nextAnswers[key], ...suggestion };
    }
  }

  return {
    ...current,
    answers: nextAnswers,
    controlEffectivenessPct:
      opts?.forceControlStrength || current.controlEffectivenessPct == null
        ? consolidation.controlStrengthPct
        : current.controlEffectivenessPct,
  };
}

export function getFormalRiskMeta() {
  return getAssessmentTypeMeta("formal_risk");
}
