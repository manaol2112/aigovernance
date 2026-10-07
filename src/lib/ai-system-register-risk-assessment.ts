import type { RiskTier } from "@prisma/client";

/** Structured AI governance risk assessment (client-facing guided review). */
export const RISK_ASSESSMENT_FRAMEWORK_VERSION = 2;

export type RiskStepId =
  | "suite_linkage"
  | "accountability"
  | "residual_rating"
  | "treatment"
  | "findings";

export type RiskAnswerValue = "yes" | "no" | "partial" | "unknown" | "na";
export type FindingSeverity = "critical" | "high" | "medium" | "low";

export type RiskQuestionKind = "yes_no_partial" | "score_0_4" | "text";

export type RiskQuestion = {
  id: string;
  prompt: string;
  help?: string;
  kind: RiskQuestionKind;
  /** Higher = more influence on inherent score (score_0_4 / adverse yes_no). */
  weight?: number;
  /** If answering "no" (or low score) increases risk. Default true for yes_no_partial. */
  adverseWhen?: "no" | "yes";
  evidenceHints?: string[];
  controls?: string[];
};

export type RiskStep = {
  id: RiskStepId;
  stepNumber: number;
  title: string;
  objective: string;
  frameworkAnchors: string[];
  evidenceHints: string[];
  questions: RiskQuestion[];
};

export type RiskQuestionResponse = {
  value?: RiskAnswerValue | number | string | null;
  notes?: string;
};

export type RiskFinding = {
  id: string;
  stepId: RiskStepId;
  severity: FindingSeverity;
  title: string;
  detail: string;
};

export type RiskAssessmentAnswers = Record<string, RiskQuestionResponse>;

export type RiskAssessmentFactorScores = {
  frameworkVersion: number;
  answers: RiskAssessmentAnswers;
  findings: RiskFinding[];
  controlEffectivenessPct?: number;
  completedStepIds?: RiskStepId[];
};

export type RiskScoreResult = {
  inherentScore: number;
  residualScore: number;
  inherentTier: RiskTier;
  residualTier: RiskTier;
  hardRulesFired: string[];
  scoredQuestionCount: number;
  answeredScoredCount: number;
  completionPct: number;
};

export const FINDING_SEVERITY_OPTIONS: Array<{
  value: FindingSeverity;
  label: string;
  description: string;
}> = [
  {
    value: "critical",
    label: "Critical",
    description: "Potential for material harm or regulatory exposure.",
  },
  {
    value: "high",
    label: "High",
    description: "Significant governance or control gap.",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Improvement recommended.",
  },
  {
    value: "low",
    label: "Low",
    description: "Minor documentation or process gap.",
  },
];

export const YES_NO_PARTIAL_OPTIONS: Array<{ value: RiskAnswerValue; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partially" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
  { value: "na", label: "Not applicable" },
];

export const SCORE_0_4_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "0 — Well managed" },
  { value: 1, label: "1 — Low concern" },
  { value: 2, label: "2 — Moderate concern" },
  { value: 3, label: "3 — Elevated concern" },
  { value: 4, label: "4 — Significant concern" },
];

/**
 * Formal AI risk assessment — final consolidation rating.
 * Ingests detailed suite assessment outcomes to set overall inherent / residual risk
 * and identify treatment requirements (not a repeat of domain checklists).
 */
export const AI_GOVERNANCE_RISK_STEPS: RiskStep[] = [
  {
    id: "suite_linkage",
    stepNumber: 1,
    title: "Consolidate suite findings",
    objective:
      "Confirm detailed assessments are complete or waived, and that this final rating is driven by those outcomes.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 42001"],
    evidenceHints: [
      "Assessment suite progress",
      "Module completion / waiver notes",
      "Consolidated gap list from detailed assessments",
    ],
    questions: [
      {
        id: "suite_required_complete",
        prompt:
          "Are all required detailed assessments completed or formally waived with rationale?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
        help: "This final rating consolidates those modules — it should not replace them.",
      },
      {
        id: "suite_gaps_accepted",
        prompt:
          "Are open gaps from detailed assessments documented and accepted (or queued for treatment)?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
      {
        id: "suite_domain_outcomes_reflected",
        prompt:
          "Have the consolidated module findings been used as inputs to overall inherent and residual risk?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
      {
        id: "suite_register_aligned",
        prompt:
          "Does the register profile still match how the system is used (purpose, data, model, impact)?",
        kind: "yes_no_partial",
        weight: 2,
        adverseWhen: "no",
      },
    ],
  },
  {
    id: "accountability",
    stepNumber: 2,
    title: "Ownership & decision rights",
    objective:
      "Confirm who owns the consolidated residual risk posture and who can accept treatment decisions.",
    frameworkAnchors: ["ISO/IEC 42001", "NIST AI RMF", "COSO ERM"],
    evidenceHints: [
      "Roles & responsibilities",
      "Risk ownership model",
      "Escalation path",
      "Acceptance authority",
    ],
    questions: [
      {
        id: "acct_business_owner",
        prompt: "Is there an accountable business owner for outcomes and residual risk on this use case?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
      {
        id: "acct_risk_owner",
        prompt: "Is a risk / compliance owner or oversight forum assigned for this system?",
        kind: "yes_no_partial",
        weight: 2,
        adverseWhen: "no",
      },
      {
        id: "acct_escalation_path",
        prompt: "Is there a clear escalation path for residual risk, incidents, or contested outcomes?",
        kind: "yes_no_partial",
        weight: 2,
        adverseWhen: "no",
      },
      {
        id: "acct_acceptance_authority",
        prompt:
          "Is it clear who can formally accept residual risk when it exceeds appetite?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
    ],
  },
  {
    id: "residual_rating",
    stepNumber: 3,
    title: "Overall inherent & residual risk",
    objective:
      "Set overall inherent and residual risk using consolidated suite findings — not by re-running domain checklists.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 42001", "COSO ERM"],
    evidenceHints: [
      "Suite consolidation summary",
      "Control evidence from detailed assessments",
      "Register risk signals",
    ],
    questions: [
      {
        id: "res_people_impact",
        prompt:
          "Based on suite findings, how concerning is overall residual impact on people or rights?",
        kind: "score_0_4",
        weight: 3,
        help: "Pre-filled from privacy, fairness, fundamental rights, and legal module outcomes where triggered.",
      },
      {
        id: "res_ops_resilience",
        prompt:
          "Based on suite findings, how concerning is overall residual operational / security / safety risk?",
        kind: "score_0_4",
        weight: 3,
        help: "Pre-filled from security, safety, data, change, autonomy, and third-party module outcomes.",
      },
      {
        id: "res_controls_operating",
        prompt:
          "Are key controls evidenced in completed suite assessments operating as intended?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
      {
        id: "res_cross_cutting_gaps",
        prompt: "Cross-cutting gaps from consolidated assessments",
        kind: "text",
        help: "Pre-filled from module gaps. Edit to add anything spanning multiple assessments.",
      },
    ],
  },
  {
    id: "treatment",
    stepNumber: 4,
    title: "Risk treatment requirements",
    objective:
      "Identify and confirm treatment requirements derived from consolidated findings (mitigate, accept, monitor, complete).",
    frameworkAnchors: ["ISO/IEC 42001", "COSO ERM", "NIST AI RMF"],
    evidenceHints: [
      "Treatment requirements from suite consolidation",
      "Acceptance record",
      "Review cadence",
      "Action owners",
    ],
    questions: [
      {
        id: "treat_strategy_defined",
        prompt:
          "Is a primary treatment strategy defined for the consolidated residual risk (mitigate, accept, transfer, or avoid)?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
      {
        id: "treat_actions_owned",
        prompt:
          "Are treatment actions from suite gaps assigned to named owners with due dates?",
        kind: "yes_no_partial",
        weight: 3,
        adverseWhen: "no",
      },
      {
        id: "treat_acceptance_ready",
        prompt:
          "If residual risk exceeds appetite, is formal risk acceptance prepared (or already recorded)?",
        kind: "yes_no_partial",
        weight: 2,
        adverseWhen: "no",
        help: "Minimal / general tiers may not require acceptance — answer N/A when that applies.",
      },
      {
        id: "treat_review_trigger",
        prompt:
          "Is the next review trigger clear (date, material change, or incident-driven reassessment)?",
        kind: "yes_no_partial",
        weight: 2,
        adverseWhen: "no",
      },
      {
        id: "treat_notes",
        prompt: "Treatment requirements / commitments",
        kind: "text",
        help: "Pre-filled from consolidated suite findings. Edit before applying to the register.",
      },
    ],
  },
  {
    id: "findings",
    stepNumber: 5,
    title: "Apply overall rating",
    objective:
      "Confirm overall inherent and residual risk for this use case, finalize the rationale, and apply it to the register.",
    frameworkAnchors: ["NIST AI RMF", "ISO/IEC 42001"],
    evidenceHints: [],
    questions: [
      {
        id: "findings_summary",
        prompt: "Overall rating rationale",
        kind: "text",
        help: "Pre-filled from suite consolidation. Explain the overall inherent / residual rating applied to this use case.",
      },
    ],
  },
];

export function getRiskStep(stepId: RiskStepId): RiskStep | undefined {
  return AI_GOVERNANCE_RISK_STEPS.find((step) => step.id === stepId);
}

export function listScoredQuestions(): RiskQuestion[] {
  return AI_GOVERNANCE_RISK_STEPS.flatMap((step) =>
    step.questions.filter((q) => q.kind === "score_0_4" || q.kind === "yes_no_partial")
  );
}

export function emptyFactorScores(): RiskAssessmentFactorScores {
  return {
    frameworkVersion: RISK_ASSESSMENT_FRAMEWORK_VERSION,
    answers: {},
    findings: [],
    controlEffectivenessPct: 0,
    completedStepIds: [],
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function yesNoToScore(value: RiskAnswerValue, adverseWhen: "no" | "yes" = "no"): number | null {
  if (value === "na" || value === "unknown") return null;
  const adverse =
    adverseWhen === "no"
      ? value === "no"
        ? 4
        : value === "partial"
          ? 2
          : 0
      : value === "yes"
        ? 4
        : value === "partial"
          ? 2
          : 0;
  return adverse;
}

export function scoreRiskAssessment(
  factorScores: RiskAssessmentFactorScores,
  context?: {
    decisionImpact?: string | null;
    autonomyLevel?: string | null;
    euAnnexIiiRelevance?: string | null;
    personalDataInvolved?: boolean;
    specialCategoryData?: boolean;
  }
): RiskScoreResult {
  const answers = factorScores.answers ?? {};
  let weighted = 0;
  let weightSum = 0;
  let scoredQuestionCount = 0;
  let answeredScoredCount = 0;

  for (const question of listScoredQuestions()) {
    const weight = question.weight ?? 1;
    scoredQuestionCount += 1;
    const raw = answers[question.id]?.value;
    if (raw === undefined || raw === null || raw === "") continue;

    let score: number | null = null;
    if (question.kind === "score_0_4" && typeof raw === "number") {
      score = clamp(raw, 0, 4);
    } else if (question.kind === "yes_no_partial" && typeof raw === "string") {
      score = yesNoToScore(raw as RiskAnswerValue, question.adverseWhen ?? "no");
    }
    if (score === null) continue;
    answeredScoredCount += 1;
    weighted += (score / 4) * weight;
    weightSum += weight;
  }

  const inherentScore =
    weightSum > 0 ? Math.round(clamp((weighted / weightSum) * 100, 0, 100)) : 0;

  const hardRulesFired: string[] = [];
  let inherentTier = scoreToTier(inherentScore);

  const annex = (context?.euAnnexIiiRelevance ?? "").trim();
  if (annex && !/^(none|n\/a|no|false)$/i.test(annex)) {
    hardRulesFired.push("annex_iii_relevance");
    if (tierRank(inherentTier) < tierRank("high")) inherentTier = "high";
  }
  if (context?.decisionImpact === "automated_decision" && context.autonomyLevel === "high") {
    hardRulesFired.push("automated_high_autonomy");
    if (tierRank(inherentTier) < tierRank("high")) inherentTier = "high";
  }
  if (context?.specialCategoryData) {
    hardRulesFired.push("special_category_data");
    if (tierRank(inherentTier) < tierRank("limited")) inherentTier = "limited";
  }
  const suiteIncomplete = answers.suite_required_complete?.value;
  if (suiteIncomplete === "no" || suiteIncomplete === "partial") {
    hardRulesFired.push("suite_incomplete");
    if (tierRank(inherentTier) < tierRank("limited")) inherentTier = "limited";
  }

  const criticalFindings = (factorScores.findings ?? []).filter((f) => f.severity === "critical");
  const highFindings = (factorScores.findings ?? []).filter((f) => f.severity === "high");
  if (criticalFindings.length > 0) {
    hardRulesFired.push("critical_finding");
    if (tierRank(inherentTier) < tierRank("high")) inherentTier = "high";
  } else if (highFindings.length >= 2 && tierRank(inherentTier) < tierRank("limited")) {
    hardRulesFired.push("multiple_high_findings");
    inherentTier = "limited";
  }

  const controlPct = clamp(factorScores.controlEffectivenessPct ?? 0, 0, 40);
  const residualScore = Math.round(clamp(inherentScore * (1 - controlPct / 100), 0, 100));
  let residualTier = scoreToTier(residualScore);
  // Residual cannot drop more than one tier without documented acceptance (v1 rule).
  if (tierRank(inherentTier) - tierRank(residualTier) > 1) {
    residualTier = tierByRank(tierRank(inherentTier) - 1);
  }

  const totalQuestions = AI_GOVERNANCE_RISK_STEPS.reduce(
    (sum, step) => sum + step.questions.length,
    0
  );
  const answeredTotal = Object.values(answers).filter(
    (a) => a?.value !== undefined && a?.value !== null && String(a.value).trim() !== ""
  ).length;
  const completionPct = totalQuestions
    ? Math.round((answeredTotal / totalQuestions) * 100)
    : 0;

  return {
    inherentScore,
    residualScore,
    inherentTier,
    residualTier,
    hardRulesFired,
    scoredQuestionCount,
    answeredScoredCount,
    completionPct,
  };
}

function scoreToTier(score: number): RiskTier {
  if (score >= 80) return "prohibited";
  if (score >= 60) return "high";
  if (score >= 35) return "limited";
  return "minimal";
}

/** Human-readable rationale for the computed rating (editable on final step). */
export function buildRatingRationale(
  factorScores: RiskAssessmentFactorScores,
  score: RiskScoreResult
): string {
  const controlPct = factorScores.controlEffectivenessPct ?? 0;
  const parts: string[] = [
    `Recommended residual rating: ${score.residualTier.replace(/_/g, " ")} (score ${score.residualScore}/100).`,
    `Inherent risk before control strength: ${score.inherentTier.replace(/_/g, " ")} (score ${score.inherentScore}/100)${
      controlPct > 0 ? `, with ${controlPct}% control strength applied.` : "."
    }`,
  ];

  if (score.hardRulesFired.length > 0) {
    parts.push(
      `Elevated classification factors: ${score.hardRulesFired
        .map((rule) => rule.replace(/_/g, " "))
        .join("; ")}.`
    );
  }

  const drivers: string[] = [];
  for (const step of AI_GOVERNANCE_RISK_STEPS) {
    if (step.id === "findings") continue;
    for (const question of step.questions) {
      const raw = factorScores.answers[question.id]?.value;
      if (raw === undefined || raw === null || raw === "") continue;
      if (question.kind === "yes_no_partial" && (raw === "no" || raw === "partial")) {
        drivers.push(`${step.title}: ${question.prompt} → ${raw}`);
      }
      if (question.kind === "score_0_4" && typeof raw === "number" && raw >= 2) {
        drivers.push(`${step.title}: ${question.prompt} → concern level ${raw}/4`);
      }
    }
  }

  if (drivers.length > 0) {
    parts.push(
      `Key drivers from the assessment:\n${drivers
        .slice(0, 8)
        .map((line) => `• ${line}`)
        .join("\n")}`
    );
  } else {
    parts.push(
      "No major adverse responses were recorded. The rating reflects the overall scored posture from the assessment."
    );
  }

  parts.push(
    "Completing this step applies the residual rating and rationale to this AI system / use case in the register."
  );

  return parts.join("\n\n");
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

export function parseFactorScores(raw: unknown): RiskAssessmentFactorScores {
  if (!raw || typeof raw !== "object") return emptyFactorScores();
  const obj = raw as Record<string, unknown>;
  const answers =
    obj.answers && typeof obj.answers === "object"
      ? (obj.answers as RiskAssessmentAnswers)
      : {};
  const findings = Array.isArray(obj.findings)
    ? (obj.findings as RiskFinding[]).filter(
        (f) => f && typeof f.id === "string" && typeof f.title === "string"
      )
    : [];
  const completedStepIds = Array.isArray(obj.completedStepIds)
    ? (obj.completedStepIds as RiskStepId[])
    : [];
  return {
    frameworkVersion:
      typeof obj.frameworkVersion === "number"
        ? obj.frameworkVersion
        : RISK_ASSESSMENT_FRAMEWORK_VERSION,
    answers,
    findings,
    controlEffectivenessPct:
      typeof obj.controlEffectivenessPct === "number" ? obj.controlEffectivenessPct : 0,
    completedStepIds,
  };
}

export function stepAnswerProgress(
  step: RiskStep,
  answers: RiskAssessmentAnswers
): { answered: number; total: number } {
  const total = step.questions.length;
  const answered = step.questions.filter((q) => {
    const value = answers[q.id]?.value;
    return value !== undefined && value !== null && String(value).trim() !== "";
  }).length;
  return { answered, total };
}

export function validateFinding(finding: Partial<RiskFinding>): string | null {
  if (!finding.title?.trim()) return "Issue title is required.";
  if (!finding.severity) return "Severity is required.";
  if (!finding.stepId) return "Link the issue to an assessment step.";
  return null;
}
