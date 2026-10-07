import { RISK_PILLARS } from "@/lib/risk-pillars";
import {
  AI_GOVERNANCE_RISK_STEPS,
  type RiskAnswerValue,
  type RiskAssessmentAnswers,
  type RiskAssessmentFactorScores,
  type RiskStepId,
} from "@/lib/ai-system-register-risk-assessment";

export type AssessmentGapSeverity = "elevated" | "significant";

export type AssessmentGap = {
  questionId: string;
  stepId: RiskStepId;
  stepTitle: string;
  pillarId: string;
  pillarLabel: string;
  severity: AssessmentGapSeverity;
  reason: string;
  prompt: string;
};

export type ControlCatalogItem = {
  code: string;
  title: string;
  ownerRole: string;
  description?: string;
  /** Risk statement categories this control mitigates. */
  riskCategories: string[];
};

export type ControlRecommendation = {
  controlCode: string;
  controlTitle: string;
  ownerRole: string;
  description?: string;
  pillarId: string;
  pillarLabel: string;
  reason: string;
  gapQuestionIds: string[];
  priority: number;
};

/** Map formal residual-rating questions → risk pillars used by the control matrix. */
export const QUESTION_PILLAR_MAP: Record<string, string[]> = {
  suite_required_complete: ["governance", "compliance"],
  suite_gaps_accepted: ["governance", "oversight"],
  suite_domain_outcomes_reflected: ["governance", "compliance"],
  suite_register_aligned: ["compliance", "governance"],
  acct_business_owner: ["governance"],
  acct_risk_owner: ["governance", "oversight"],
  acct_escalation_path: ["governance", "oversight"],
  acct_acceptance_authority: ["governance"],
  res_people_impact: ["fairness", "privacy-data", "oversight"],
  res_ops_resilience: ["safety-reliability", "oversight"],
  res_controls_operating: ["oversight", "governance"],
  treat_strategy_defined: ["governance", "compliance"],
  treat_actions_owned: ["governance", "oversight"],
  treat_acceptance_ready: ["governance"],
  treat_review_trigger: ["oversight", "compliance"],
};

function pillarById(pillarId: string) {
  return RISK_PILLARS.find((pillar) => pillar.id === pillarId);
}

function categoriesForPillars(pillarIds: string[]): string[] {
  const cats = new Set<string>();
  for (const id of pillarIds) {
    const pillar = pillarById(id);
    if (!pillar) continue;
    for (const category of pillar.categories) cats.add(category);
  }
  return Array.from(cats);
}

export function detectAssessmentGaps(answers: RiskAssessmentAnswers): AssessmentGap[] {
  const gaps: AssessmentGap[] = [];

  for (const step of AI_GOVERNANCE_RISK_STEPS) {
    for (const question of step.questions) {
      if (question.kind === "text") continue;
      const raw = answers[question.id]?.value;
      if (raw === undefined || raw === null || raw === "") continue;

      let severity: AssessmentGapSeverity | null = null;
      let reason = "";

      if (question.kind === "yes_no_partial" && typeof raw === "string") {
        const value = raw as RiskAnswerValue;
        if (value === "na" || value === "unknown") continue;
        const adverseWhen = question.adverseWhen ?? "no";
        const isAdverse =
          adverseWhen === "no"
            ? value === "no" || value === "partial"
            : value === "yes" || value === "partial";
        if (!isAdverse) continue;
        severity = value === "partial" ? "elevated" : "significant";
        reason =
          value === "partial"
            ? "Only partially addressed — control coverage is recommended."
            : adverseWhen === "yes"
              ? "Affirmative response indicates elevated risk — controls are recommended."
              : "Not addressed — controls are needed to close this gap.";
      }

      if (question.kind === "score_0_4" && typeof raw === "number") {
        if (raw < 2) continue;
        severity = raw >= 3 ? "significant" : "elevated";
        reason =
          raw >= 3
            ? "Elevated concern indicated — prioritize mitigating controls."
            : "Moderate concern indicated — recommended controls can reduce residual risk.";
      }

      if (!severity) continue;
      const pillarIds = QUESTION_PILLAR_MAP[question.id] ?? ["governance"];
      const primaryPillarId = pillarIds[0];
      const pillar = pillarById(primaryPillarId);
      gaps.push({
        questionId: question.id,
        stepId: step.id,
        stepTitle: step.title,
        pillarId: primaryPillarId,
        pillarLabel: pillar?.label ?? primaryPillarId,
        severity,
        reason,
        prompt: question.prompt,
      });
    }
  }

  return gaps;
}

export function recommendControlsForGaps(
  gaps: AssessmentGap[],
  catalog: ControlCatalogItem[],
  options?: { maxPerPillar?: number; maxTotal?: number; alreadySelected?: string[] }
): ControlRecommendation[] {
  if (gaps.length === 0) return [];

  const maxPerPillar = options?.maxPerPillar ?? 3;
  const maxTotal = options?.maxTotal ?? 12;
  const already = new Set(options?.alreadySelected ?? []);

  const gapsByPillar = new Map<string, AssessmentGap[]>();
  for (const gap of gaps) {
    const pillarIds = QUESTION_PILLAR_MAP[gap.questionId] ?? [gap.pillarId];
    for (const pillarId of pillarIds) {
      const list = gapsByPillar.get(pillarId) ?? [];
      list.push(gap);
      gapsByPillar.set(pillarId, list);
    }
  }

  const recommendations: ControlRecommendation[] = [];
  const usedCodes = new Set<string>();

  const pillarOrder = Array.from(gapsByPillar.entries()).sort((a, b) => {
    const sev = (gaps: AssessmentGap[]) =>
      gaps.reduce((sum, g) => sum + (g.severity === "significant" ? 2 : 1), 0);
    return sev(b[1]) - sev(a[1]);
  });

  for (const [pillarId, pillarGaps] of pillarOrder) {
    const pillar = pillarById(pillarId);
    if (!pillar) continue;
    const categories = new Set(categoriesForPillars([pillarId]));
    const gapQuestionIds = Array.from(new Set(pillarGaps.map((g) => g.questionId)));

    const candidates = catalog
      .filter((control) => {
        if (already.has(control.code) || usedCodes.has(control.code)) return false;
        return control.riskCategories.some((category) => categories.has(category));
      })
      .map((control) => {
        const overlap = control.riskCategories.filter((category) => categories.has(category)).length;
        const significantBoost = pillarGaps.some((g) => g.severity === "significant") ? 2 : 0;
        return {
          control,
          priority: overlap * 10 + significantBoost + pillarGaps.length,
        };
      })
      .sort((a, b) => b.priority - a.priority || a.control.code.localeCompare(b.control.code));

    let added = 0;
    for (const candidate of candidates) {
      if (added >= maxPerPillar || recommendations.length >= maxTotal) break;
      usedCodes.add(candidate.control.code);
      const topGap = pillarGaps.find((g) => g.severity === "significant") ?? pillarGaps[0];
      recommendations.push({
        controlCode: candidate.control.code,
        controlTitle: candidate.control.title,
        ownerRole: candidate.control.ownerRole,
        description: candidate.control.description,
        pillarId,
        pillarLabel: pillar.label,
        reason: `${topGap.reason} Mapped from “${topGap.stepTitle}” to ${pillar.label}.`,
        gapQuestionIds,
        priority: candidate.priority,
      });
      added += 1;
    }
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

export function buildControlRecommendations(
  factorScores: RiskAssessmentFactorScores,
  catalog: ControlCatalogItem[],
  alreadySelected?: string[]
): { gaps: AssessmentGap[]; recommendations: ControlRecommendation[] } {
  const gaps = detectAssessmentGaps(factorScores.answers ?? {});
  const recommendations = recommendControlsForGaps(gaps, catalog, {
    alreadySelected,
  });
  return { gaps, recommendations };
}

/** Merge accepted codes uniquely, preserving order. */
export function mergeKeyControlCodes(
  current: string[],
  accepted: string[]
): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const code of [...current, ...accepted]) {
    const trimmed = code.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}
