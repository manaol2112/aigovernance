import type { RiskSubPillarDef } from "@/lib/risk-sub-pillars";
import type { RequirementRef } from "@/lib/requirement-workshop-questions";
import type { ConsolidatedWorkshopQuestion } from "@/lib/sub-pillar-workshop-questions";
import { WORKSHOP_PHASE_META, type WorkshopQuestionPhase } from "@/lib/workshop-question-bank";
import { resolveProbes } from "@/lib/workshop-probes";

const PHASE_SIGNALS: Record<Exclude<WorkshopQuestionPhase, "requirement">, string[]> = {
  context: [
    "context", "scope", "interested", "stakeholder", "understanding", "organization",
    "4.1", "4.2", "4.3", "4.4", "govern-5", "environment", "boundary",
  ],
  design: [
    "policy", "establish", "define", "plan", "design", "objective", "commitment",
    "5.1", "5.2", "5.3", "govern-1", "govern-2", "aims", "resource", "competence",
  ],
  implementation: [
    "implement", "operate", "process", "procedure", "role", "responsible", "accountab",
    "7.1", "7.2", "7.3", "8.1", "8.2", "8.3", "control", "operational",
  ],
  effectiveness: [
    "monitor", "measure", "review", "audit", "evaluate", "performance", "9.1", "9.2",
    "9.3", "effectiveness", "indicat", "verify", "valid", "test",
  ],
  gaps: [
    "improve", "corrective", "nonconform", "continual", "10.1", "10.2", "10.3",
    "gap", "remediat", "action", "treatment",
  ],
  application: [
    "apply", "use case", "deploy", "specific", "operational", "system", "lifecycle",
  ],
};

function reqSearchText(req: RequirementRef): string {
  return `${req.title} ${req.theme ?? ""} ${req.clauseId} ${req.frameworkCode} ${req.requirementText}`.toLowerCase();
}

function scoreReqForQuestion(
  req: RequirementRef,
  question: ConsolidatedWorkshopQuestion,
  subThemes: string[]
): number {
  const text = reqSearchText(req);
  const qText = `${question.intent} ${question.prompt}`.toLowerCase();
  let score = 0;

  if (question.phase !== "requirement") {
    for (const sig of PHASE_SIGNALS[question.phase]) {
      if (text.includes(sig.toLowerCase())) score += 2;
    }
  }

  for (const theme of subThemes) {
    if (text.includes(theme.toLowerCase())) score += 3;
  }

  for (const word of req.title.toLowerCase().split(/\W+/).filter((w) => w.length > 4)) {
    if (qText.includes(word)) score += 1;
  }

  return score;
}

function buildSupplementQuestion(
  subPillarId: string,
  index: number,
  themeKey: string,
  group: RequirementRef[]
): ConsolidatedWorkshopQuestion {
  const topics = [...new Set(group.map((r) => r.title))];
  const shown = topics.slice(0, 3);
  const rest = topics.length - shown.length;
  const topicPhrase =
    rest > 0
      ? `${shown.join("; ")}; and ${rest} related obligation${rest !== 1 ? "s" : ""}`
      : shown.join("; ");

  return {
    id: `${subPillarId}-supplement-${index + 1}`,
    phase: "effectiveness",
    phaseLabel: WORKSHOP_PHASE_META.effectiveness.label,
    phaseOrder: WORKSHOP_PHASE_META.effectiveness.order,
    intent: `Ensure remaining obligations in this topic area are addressed before closing the session.`,
    prompt: `Before we close this topic, walk through ${themeKey.toLowerCase()} obligations for in-scope AI systems — including ${topicPhrase}. What is in place, who owns it, what evidence exists, and where are the gaps?`,
    probes: resolveProbes("effectiveness"),
    coversRequirements: group.map((r) => ({
      id: r.id,
      frameworkCode: r.frameworkCode,
      clauseId: r.clauseId,
      title: r.title,
    })),
  };
}

/**
 * Map every in-scope requirement to facilitation questions.
 * Core questions (typically 5–6) absorb most requirements; supplements are added
 * only when requirements don't match any core question strongly enough.
 */
export function finalizeFacilitationQuestionCoverage(
  sub: RiskSubPillarDef,
  coreQuestions: ConsolidatedWorkshopQuestion[],
  reqs: RequirementRef[]
): {
  questions: ConsolidatedWorkshopQuestion[];
  allRequirementsCovered: boolean;
  supplementCount: number;
  weakMatchCount: number;
} {
  if (reqs.length === 0) {
    return { questions: coreQuestions, allRequirementsCovered: true, supplementCount: 0, weakMatchCount: 0 };
  }

  const mapped = coreQuestions.map((q) => ({
    ...q,
    coversRequirements: [] as ConsolidatedWorkshopQuestion["coversRequirements"],
  }));

  const weakMatches: RequirementRef[] = [];
  const STRONG_MATCH = 2;

  for (const req of reqs) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < mapped.length; i++) {
      const s = scoreReqForQuestion(req, mapped[i], sub.themes);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }

    mapped[bestIdx].coversRequirements.push({
      id: req.id,
      frameworkCode: req.frameworkCode,
      clauseId: req.clauseId,
      title: req.title,
    });

    if (bestScore < STRONG_MATCH) {
      weakMatches.push(req);
    }
  }

  const supplements: ConsolidatedWorkshopQuestion[] = [];
  if (weakMatches.length > 0) {
    const byTheme = new Map<string, RequirementRef[]>();
    for (const req of weakMatches) {
      const key = req.theme?.trim() || "cross-cutting obligations";
      const list = byTheme.get(key) ?? [];
      list.push(req);
      byTheme.set(key, list);
    }
    let i = 0;
    for (const [themeKey, group] of byTheme) {
      supplements.push(buildSupplementQuestion(sub.id, i, themeKey, group));
      i++;
    }
  }

  const questions = [...mapped, ...supplements];
  const coveredIds = new Set(questions.flatMap((q) => q.coversRequirements.map((r) => r.id)));

  return {
    questions,
    allRequirementsCovered: reqs.every((r) => coveredIds.has(r.id)),
    supplementCount: supplements.length,
    weakMatchCount: weakMatches.length,
  };
}
