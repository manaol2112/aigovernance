import { RISK_PILLARS } from "@/lib/risk-pillars";
import {
  PILLAR_QUESTION_ANSWER_META,
  computePackProgress,
  packAnswerFindingSummary,
  packCriticality,
  packPillarLabel,
  type PackAnswerRecord,
  type PackFinding,
  type PackSnapshot,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";

const CRITICALITY_WEIGHT: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

export type PackPillarScore = {
  pillarId: string;
  pillarLabel: string;
  criticality: "critical" | "high" | "medium";
  questionCount: number;
  answeredCount: number;
  scoredCount: number;
  yesCount: number;
  partialCount: number;
  noCount: number;
  dontKnowCount: number;
  alignmentPct: number | null;
};

export type PackReport = {
  kind: "pillar_questionnaire";
  title: string;
  organizationName: string;
  packName: string | null;
  generatedAt: string;
  overallScorePct: number | null;
  pillarScores: PackPillarScore[];
  strengths: PackFinding[];
  gaps: PackFinding[];
  partials: PackFinding[];
  followUps: PackFinding[];
  progress: ReturnType<typeof computePackProgress>;
};

export type PackPostureTone = "critical" | "developing" | "defined" | "leading";

export const PACK_POSTURE_STEPS: Array<{
  tone: PackPostureTone;
  shortLabel: string;
  label: string;
  color: string;
}> = [
  { tone: "critical", shortLabel: "Early", label: "Early stage", color: "#f87171" },
  { tone: "developing", shortLabel: "Building", label: "Building foundation", color: "#fb923c" },
  { tone: "defined", shortLabel: "Established", label: "Established baseline", color: "#facc15" },
  { tone: "leading", shortLabel: "Strong", label: "Strong posture", color: "#34d399" },
];

export function scoreBandLabel(scorePct: number | null): { label: string; tone: PackPostureTone; shortLabel: string } {
  if (scorePct == null) {
    return { label: "To confirm", tone: "critical", shortLabel: "To confirm" };
  }
  if (scorePct >= 76) return { label: "Strong posture", tone: "leading", shortLabel: "Strong" };
  if (scorePct >= 51) return { label: "Established baseline", tone: "defined", shortLabel: "Established" };
  if (scorePct >= 26) return { label: "Building foundation", tone: "developing", shortLabel: "Building" };
  return { label: "Early stage", tone: "critical", shortLabel: "Early" };
}

export type PackExecutiveSummary = {
  headline: string;
  narrative: string;
  scoreLabel: string;
  scoreTone: PackPostureTone;
  leadingPillarLabels: string[];
  priorityPillarLabels: string[];
  pillarsAssessed: number;
};

export type PackRoadmapPhase = "immediate" | "short_term" | "medium_term";

export type PackRoadmapStep = {
  priority: number;
  phase: PackRoadmapPhase;
  phaseLabel: string;
  pillarLabel: string;
  prompt: string;
  summary: string;
  action: string;
};

const PACK_ROADMAP_PHASE_LABELS: Record<PackRoadmapPhase, string> = {
  immediate: "0–90 days",
  short_term: "3–6 months",
  medium_term: "6–12 months",
};

const CRITICALITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

function topicFromFindingSummary(summary: string): string {
  return summary
    .replace(/ is not yet in place\.$/i, "")
    .replace(/ is underway but not yet complete\.$/i, "")
    .replace(/ still needs confirmation\.$/i, "")
    .replace(/ is in place\.$/i, "")
    .trim();
}

function packRoadmapAction(kind: "gap" | "partial" | "follow", summary: string): string {
  const label = topicFromFindingSummary(summary);
  const subject = label ? label.charAt(0).toUpperCase() + label.slice(1) : "This area";
  if (kind === "gap") {
    return `${subject}: assign an owner, set a 90-day milestone, and define evidence of completion.`;
  }
  if (kind === "partial") {
    return `${subject}: finish remaining work, document what is in place, and schedule a follow-up review.`;
  }
  return `${subject}: confirm status with the right stakeholders and collect supporting evidence.`;
}

export function buildPackRoadmap(report: PackReport): PackRoadmapStep[] {
  const criticalityByPillar = new Map(
    report.pillarScores.map((pillar) => [pillar.pillarLabel, pillar.criticality])
  );

  const rank = (pillarLabel: string) =>
    CRITICALITY_RANK[criticalityByPillar.get(pillarLabel) ?? "medium"] ?? 2;

  const gapSteps = [...report.gaps]
    .sort((left, right) => rank(left.pillarLabel) - rank(right.pillarLabel))
    .map((item, index) => ({
      phase: "immediate" as const,
      pillarLabel: item.pillarLabel,
      prompt: item.prompt,
      summary: item.summary,
      action: packRoadmapAction("gap", item.summary),
      sortKey: index,
    }));

  const partialSteps = report.partials.map((item, index) => ({
    phase: "short_term" as const,
    pillarLabel: item.pillarLabel,
    prompt: item.prompt,
    summary: item.summary,
    action: packRoadmapAction("partial", item.summary),
    sortKey: index,
  }));

  const followSteps = report.followUps.map((item, index) => ({
    phase: "medium_term" as const,
    pillarLabel: item.pillarLabel,
    prompt: item.prompt,
    summary: item.summary,
    action: packRoadmapAction("follow", item.summary),
    sortKey: index,
  }));

  return [...gapSteps, ...partialSteps, ...followSteps].map((step, index) => ({
    priority: index + 1,
    phase: step.phase,
    phaseLabel: PACK_ROADMAP_PHASE_LABELS[step.phase],
    pillarLabel: step.pillarLabel,
    prompt: step.prompt,
    summary: step.summary,
    action: step.action,
  }));
}

export function groupPackRoadmapByPhase(steps: PackRoadmapStep[]): Record<PackRoadmapPhase, PackRoadmapStep[]> {
  return {
    immediate: steps.filter((step) => step.phase === "immediate"),
    short_term: steps.filter((step) => step.phase === "short_term"),
    medium_term: steps.filter((step) => step.phase === "medium_term"),
  };
}

export function derivePackExecutiveSummary(report: PackReport): PackExecutiveSummary {
  const scoredPillars = report.pillarScores.filter((pillar) => pillar.alignmentPct != null);
  const sorted = [...scoredPillars].sort(
    (left, right) => (left.alignmentPct ?? 0) - (right.alignmentPct ?? 0)
  );
  const leadingPillarLabels = [...scoredPillars]
    .sort((left, right) => (right.alignmentPct ?? 0) - (left.alignmentPct ?? 0))
    .filter((pillar) => (pillar.alignmentPct ?? 0) >= 76)
    .slice(0, 3)
    .map((pillar) => pillar.pillarLabel);
  const priorityPillarLabels = sorted.slice(0, 3).map((pillar) => pillar.pillarLabel);
  const { label: scoreLabel, tone: scoreTone } = scoreBandLabel(report.overallScorePct);
  const org = report.organizationName.trim() || "Your organization";
  const scoreText =
    report.overallScorePct == null
      ? "Overall posture is still to confirm"
      : `Overall posture is ${scoreLabel.toLowerCase()}`;

  let headline = "Your maturity assessment result";
  if (report.overallScorePct != null) {
    headline =
      report.overallScorePct >= 76
        ? "Strong governance posture across your pillars"
        : report.overallScorePct >= 51
          ? "A defined baseline with room to strengthen"
          : report.overallScorePct >= 26
            ? "Foundational priorities to address next"
            : "Immediate priorities need executive attention";
  }

  const narrativeParts = [
    `${org} completed a maturity assessment across ${scoredPillars.length} assessed pillar${scoredPillars.length === 1 ? "" : "s"}. ${scoreText}.`,
    report.gaps.length > 0
      ? `${report.gaps.length} priority improvement${report.gaps.length === 1 ? "" : "s"} and ${report.partials.length} area${report.partials.length === 1 ? "" : "s"} underway were identified for follow-up.`
      : report.partials.length > 0
        ? `${report.partials.length} area${report.partials.length === 1 ? "" : "s"} underway were identified where work has started but is not yet complete.`
        : "No material priority improvements were identified in this assessment.",
    report.followUps.length > 0
      ? `${report.followUps.length} item${report.followUps.length === 1 ? "" : "s"} still need confirmation.`
      : "",
    leadingPillarLabels.length > 0
      ? `Leading pillars: ${leadingPillarLabels.join(", ")}.`
      : "",
    priorityPillarLabels.length > 0 && (report.gaps.length > 0 || (report.overallScorePct ?? 100) < 76)
      ? `Priority focus: ${priorityPillarLabels.join(", ")}.`
      : "",
  ].filter(Boolean);

  return {
    headline,
    narrative: narrativeParts.join(" "),
    scoreLabel,
    scoreTone,
    leadingPillarLabels,
    priorityPillarLabels,
    pillarsAssessed: scoredPillars.length,
  };
}

export function scorePillarAnswers(answers: PillarQuestionAnswer[]): number | null {
  const scored = answers
    .map((answer) => PILLAR_QUESTION_ANSWER_META[answer].score)
    .filter((score): score is number => score != null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
}

export function buildPackReport(input: {
  title: string;
  organizationName?: string | null;
  packName?: string | null;
  generatedAt?: string;
  snapshots: PackSnapshot[];
  answers: PackAnswerRecord[];
}): PackReport {
  const answersByQuestion = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const progress = computePackProgress(input.snapshots, input.answers);

  const pillarScores = RISK_PILLARS.flatMap((pillar): PackPillarScore[] => {
    const snapshots = input.snapshots.filter((snapshot) => snapshot.pillarId === pillar.id);
    if (snapshots.length === 0) return [];

    const answers = snapshots
      .map((snapshot) => answersByQuestion.get(snapshot.id)?.answer)
      .filter((answer): answer is PillarQuestionAnswer => Boolean(answer));

    return [
      {
        pillarId: pillar.id,
        pillarLabel: pillar.label,
        criticality: pillar.criticality,
        questionCount: snapshots.length,
        answeredCount: answers.length,
        scoredCount: answers.filter((answer) => PILLAR_QUESTION_ANSWER_META[answer].score != null)
          .length,
        yesCount: answers.filter((answer) => answer === "yes").length,
        partialCount: answers.filter((answer) => answer === "partial").length,
        noCount: answers.filter((answer) => answer === "no").length,
        dontKnowCount: answers.filter((answer) => answer === "dont_know").length,
        alignmentPct: scorePillarAnswers(answers),
      },
    ];
  });

  let weightedSum = 0;
  let weightTotal = 0;
  for (const pillar of pillarScores) {
    if (pillar.alignmentPct == null) continue;
    const weight = CRITICALITY_WEIGHT[pillar.criticality] ?? 1;
    weightedSum += pillar.alignmentPct * weight;
    weightTotal += weight;
  }

  const strengths: PackReport["strengths"] = [];
  const gaps: PackReport["gaps"] = [];
  const partials: PackReport["partials"] = [];
  const followUps: PackReport["followUps"] = [];

  for (const snapshot of input.snapshots) {
    const answer = answersByQuestion.get(snapshot.id)?.answer;
    if (!answer) continue;
    const row: PackFinding = {
      pillarLabel: packPillarLabel(snapshot.pillarId),
      prompt: snapshot.prompt,
      summary: packAnswerFindingSummary(snapshot.prompt, answer, snapshot.helpText),
    };
    if (answer === "yes") strengths.push(row);
    if (answer === "no") gaps.push(row);
    if (answer === "partial") partials.push(row);
    if (answer === "dont_know") followUps.push(row);
  }

  return {
    kind: "pillar_questionnaire",
    title: input.title,
    organizationName: input.organizationName?.trim() || "Organization",
    packName: input.packName ?? null,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    overallScorePct: weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null,
    pillarScores,
    strengths,
    gaps,
    partials,
    followUps,
    progress,
  };
}

export function packWorkshopPillarSummaries(
  snapshots: PackSnapshot[],
  answers: PackAnswerRecord[]
) {
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  return RISK_PILLARS.map((pillar, index) => {
    const pillarSnapshots = snapshots.filter((snapshot) => snapshot.pillarId === pillar.id);
    if (pillarSnapshots.length === 0) return null;
    const answeredCount = pillarSnapshots.filter((snapshot) => answersByQuestion.has(snapshot.id)).length;
    return {
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      pillarDescription: pillar.description,
      criticality: packCriticality(pillar.id),
      controlCount: pillarSnapshots.length,
      answeredCount,
      progressPct:
        pillarSnapshots.length > 0 ? Math.round((answeredCount / pillarSnapshots.length) * 100) : 0,
      isComplete: answeredCount === pillarSnapshots.length,
      firstStepIndex: snapshots.findIndex((snapshot) => snapshot.pillarId === pillar.id),
      catalogIndex: index,
    };
  }).filter((pillar) => pillar != null);
}
