import {
  getPackPillarCatalog,
  resolvePackPillarSet,
  type PackPillarSet,
} from "@/lib/pack-pillar-catalog";
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
import {
  buildPackFindingInsight,
  buildPackKeyInsights,
  topicFromFindingSummary,
} from "@/lib/pack-finding-insights";
import {
  clampPackWeight,
  scoreWeightedAnswers,
  sumWeights,
  weightSharePct,
} from "@/lib/pack-weights";

const CRITICALITY_WEIGHT: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

export type PackPillarScore = {
  pillarId: string;
  pillarLabel: string;
  criticality: "critical" | "high" | "medium";
  /** Admin-assigned pillar weight (1–10), frozen on the session snapshot. */
  weight?: number;
  /** Share of overall pillar-weight mass (0–100). */
  weightSharePct?: number;
  /** Contribution to the overall score: alignment × weight share. */
  contributionPct?: number | null;
  /** True when scored questions in this pillar do not all share the same weight. */
  usesUnequalQuestionWeights?: boolean;
  /** Pillar % if every question counted equally (for explaining question-weight impact). */
  equalWeightAlignmentPct?: number | null;
  questionCount: number;
  answeredCount: number;
  scoredCount: number;
  yesCount: number;
  partialCount: number;
  noCount: number;
  dontKnowCount: number;
  alignmentPct: number | null;
};

export type PackQuestionWeightDriver = {
  prompt: string;
  answer: PillarQuestionAnswer;
  weight: number;
  shareOfPillarPct: number;
};

export type PackPillarRatingExplanation = {
  ratingTitle: string;
  /** Short line for collapsed UI — evidence, not jargon. */
  teaser: string;
  ratingReason: string;
  /** How question importance changed this pillar’s own rating. */
  questionWeightTitle: string | null;
  questionWeightReason: string | null;
  /** How this pillar’s importance shapes the overall result. */
  weightTitle: string | null;
  weightReason: string | null;
  bandLabel: string;
};

export type PackWeightingMethodology = {
  /** Human-readable explanation for report readers. */
  summary: string;
  answerPoints: string;
  pillarFormula: string;
  overallFormula: string;
  questionWeightBlurb: string;
  pillarWeightBlurb: string;
  usesCustomWeights: boolean;
  usesQuestionWeights: boolean;
  overallResultNote: string | null;
  pillars: Array<{
    pillarId: string;
    pillarLabel: string;
    weight: number;
    weightSharePct: number;
    alignmentPct: number | null;
    equalWeightAlignmentPct: number | null;
    contributionPct: number | null;
    usesUnequalQuestionWeights?: boolean;
    questionDrivers: PackQuestionWeightDriver[];
    explanation: PackPillarRatingExplanation;
  }>;
};

export type PackReport = {
  kind: "pillar_questionnaire";
  title: string;
  organizationName: string;
  packName: string | null;
  generatedAt: string;
  overallScorePct: number | null;
  pillarScores: PackPillarScore[];
  weighting?: PackWeightingMethodology;
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
  { tone: "critical", shortLabel: "Early", label: "Early stage", color: "#DA291C" },
  { tone: "developing", shortLabel: "Building", label: "Building foundation", color: "#ED8B00" },
  { tone: "defined", shortLabel: "Established", label: "Established baseline", color: "#53565A" },
  { tone: "leading", shortLabel: "Strong", label: "Strong posture", color: "#86BC25" },
];

export function scoreBandLabel(scorePct: number | null): { label: string; tone: PackPostureTone; shortLabel: string } {
  if (scorePct == null) {
    return { label: "Unresolved", tone: "critical", shortLabel: "Unresolved" };
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
  keyInsights: import("@/lib/pack-finding-insights").PackKeyInsight[];
};

export type PackRoadmapPhase = "immediate" | "short_term" | "medium_term";

export type PackRoadmapStep = {
  priority: number;
  phase: PackRoadmapPhase;
  phaseLabel: string;
  pillarLabel: string;
  prompt: string;
  summary: string;
  insight: string;
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

export function buildPackRoadmap(report: PackReport): PackRoadmapStep[] {
  // Findings are already ranked by severity + weight in buildPackReport.
  const gapSteps = report.gaps.map((item) => ({
    phase: "immediate" as const,
    pillarLabel: item.pillarLabel,
    prompt: item.prompt,
    summary: item.summary,
    insight: item.insight,
    action: item.recommendation,
  }));

  const partialSteps = report.partials.map((item) => ({
    phase: "short_term" as const,
    pillarLabel: item.pillarLabel,
    prompt: item.prompt,
    summary: item.summary,
    insight: item.insight,
    action: item.recommendation,
  }));

  const followSteps = report.followUps.map((item) => ({
    phase: "medium_term" as const,
    pillarLabel: item.pillarLabel,
    prompt: item.prompt,
    summary: item.summary,
    insight: item.insight,
    action: item.recommendation,
  }));

  return [...gapSteps, ...partialSteps, ...followSteps].map((step, index) => ({
    priority: index + 1,
    phase: step.phase,
    phaseLabel: PACK_ROADMAP_PHASE_LABELS[step.phase],
    pillarLabel: step.pillarLabel,
    prompt: step.prompt,
    summary: step.summary,
    insight: step.insight,
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
        ? "Strong governance posture — protect and evidence what works"
        : report.overallScorePct >= 51
          ? "A defined baseline with clear levers to strengthen"
          : report.overallScorePct >= 26
            ? "Foundational priorities that deserve executive attention"
            : "Immediate priorities need ownership in the next 90 days";
  }

  const topGapTopics = report.gaps
    .slice(0, 2)
    .map((gap) => topicFromFindingSummary(gap.summary))
    .filter(Boolean);

  const narrativeParts = [
    `${org} completed a maturity assessment across ${scoredPillars.length} assessed pillar${scoredPillars.length === 1 ? "" : "s"}. ${scoreText}.`,
    report.gaps.length > 0
      ? `${report.gaps.length} priority improvement${report.gaps.length === 1 ? "" : "s"} stand out${
          topGapTopics.length > 0
            ? ` — starting with ${topGapTopics.join(" and ")}`
            : ""
        }. ${report.partials.length} area${report.partials.length === 1 ? "" : "s"} are already underway.`
      : report.partials.length > 0
        ? `${report.partials.length} area${report.partials.length === 1 ? "" : "s"} are underway where finishing delivery can lift posture quickly.`
        : "No material priority improvements were identified in this assessment.",
    report.followUps.length > 0
      ? `${report.followUps.length} item${report.followUps.length === 1 ? "" : "s"} still need confirmation before the baseline is board-ready.`
      : "",
    leadingPillarLabels.length > 0 ? `Leading pillars: ${leadingPillarLabels.join(", ")}.` : "",
    priorityPillarLabels.length > 0 && (report.gaps.length > 0 || (report.overallScorePct ?? 100) < 76)
      ? `Priority focus: ${priorityPillarLabels.join(", ")}.`
      : "",
  ].filter(Boolean);

  const keyInsights = buildPackKeyInsights({
    organizationName: org,
    scoreLabel,
    overallScorePct: report.overallScorePct,
    gapCount: report.gaps.length,
    partialCount: report.partials.length,
    followUpCount: report.followUps.length,
    leadingPillarLabels,
    priorityPillarLabels,
    topGapSummaries: report.gaps.map((gap) => gap.summary),
  });

  return {
    headline,
    narrative: narrativeParts.join(" "),
    scoreLabel,
    scoreTone,
    leadingPillarLabels,
    priorityPillarLabels,
    pillarsAssessed: scoredPillars.length,
    keyInsights,
  };
}

export function scorePillarAnswers(
  answers: PillarQuestionAnswer[],
  weights?: number[]
): number | null {
  if (!weights || weights.length === 0) {
    const scored = answers
      .map((answer) => PILLAR_QUESTION_ANSWER_META[answer].score)
      .filter((score): score is number => score != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
  }

  return scoreWeightedAnswers(
    answers.map((answer, index) => ({
      score: PILLAR_QUESTION_ANSWER_META[answer].score,
      weight: weights[index] ?? 1,
    }))
  );
}

/**
 * Overall assessment % — weighted average of scored pillar alignments by pack pillar weight.
 * Single source of truth for the hero, scoring guide, and maturity web center label.
 */
export function computePackOverallScorePct(
  pillars: Array<Pick<PackPillarScore, "alignmentPct" | "weight">>
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const pillar of pillars) {
    if (pillar.alignmentPct == null) continue;
    const weight = clampPackWeight(pillar.weight ?? 1);
    weightedSum += pillar.alignmentPct * weight;
    weightTotal += weight;
  }
  if (weightTotal <= 0) return null;
  return Math.round(weightedSum / weightTotal);
}

export type PackPillarBriefing = {
  readingTitle: string;
  reading: string;
  ratingTitle: string;
  ratingTeaser: string;
  ratingReason: string;
  questionWeightTitle: string | null;
  questionWeightReason: string | null;
  weightTitle: string | null;
  weightReason: string | null;
  nextLevelLabel: string | null;
  nextLevelGuidance: string;
};

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeAnswerEvidence(
  pillar: Pick<PackPillarScore, "yesCount" | "partialCount" | "noCount" | "dontKnowCount" | "scoredCount">
): { evidence: string; dominant: "gaps" | "mixed" | "mostly_in_place" | "complete" | "none" } {
  const { yesCount, partialCount, noCount, dontKnowCount, scoredCount } = pillar;
  if (scoredCount <= 0) {
    return {
      dominant: "none",
      evidence:
        dontKnowCount > 0
          ? `${countPhrase(dontKnowCount, "answer remains", "answers remain")} Don’t know, so this pillar cannot yet be rated on confirmed evidence.`
          : "No scored answers were recorded for this pillar.",
    };
  }

  const bits: string[] = [];
  if (yesCount > 0) {
    bits.push(
      `${countPhrase(yesCount, "practice is", "practices are")} reported as in place`
    );
  }
  if (partialCount > 0) {
    bits.push(
      `${countPhrase(partialCount, "practice is", "practices are")} only partly in place`
    );
  }
  if (noCount > 0) {
    bits.push(
      `${countPhrase(noCount, "practice is", "practices are")} not in place`
    );
  }

  let evidence = `Of the ${countPhrase(scoredCount, "practice assessed", "practices assessed")}, ${bits.join("; ")}.`;
  if (dontKnowCount > 0) {
    evidence += ` ${countPhrase(dontKnowCount, "Don’t know answer was", "Don’t know answers were")} excluded from scoring so unresolved items do not raise or lower the rating.`;
  }

  if (noCount === scoredCount) return { evidence, dominant: "gaps" };
  if (yesCount === scoredCount) return { evidence, dominant: "complete" };
  if (yesCount + partialCount >= noCount && yesCount >= partialCount && noCount === 0) {
    return { evidence, dominant: "mostly_in_place" };
  }
  if (yesCount + partialCount > noCount && noCount === 0) {
    return { evidence, dominant: "mostly_in_place" };
  }
  if (yesCount > noCount && yesCount >= partialCount) {
    return { evidence, dominant: "mostly_in_place" };
  }
  if (noCount > yesCount && noCount >= partialCount) {
    return { evidence, dominant: "gaps" };
  }
  return { evidence, dominant: "mixed" };
}

/**
 * Evidence-led explanation of why a pillar received its posture label.
 * Written for a report reader, not a scoring engineer.
 */
export function describePackPillarRating(
  pillar: Pick<
    PackPillarScore,
    | "pillarLabel"
    | "alignmentPct"
    | "yesCount"
    | "partialCount"
    | "noCount"
    | "dontKnowCount"
    | "scoredCount"
    | "weight"
    | "weightSharePct"
    | "contributionPct"
    | "usesUnequalQuestionWeights"
    | "equalWeightAlignmentPct"
  >
): PackPillarRatingExplanation {
  const band = scoreBandLabel(pillar.alignmentPct);
  const area = pillar.pillarLabel;
  const { evidence, dominant } = describeAnswerEvidence(pillar);

  if (pillar.alignmentPct == null) {
    const teaser =
      pillar.dontKnowCount > 0
        ? "Not rated yet — key answers remain Don’t know."
        : "Not rated yet — confirmed evidence is insufficient.";
    return {
      bandLabel: "Unresolved",
      ratingTitle: "Why this is Unresolved",
      teaser,
      ratingReason: `${area} does not yet receive an Early, Building, Established, or Strong rating. ${evidence} Once those answers are confirmed, this pillar can be rated on a fair basis.`,
      questionWeightTitle: null,
      questionWeightReason: null,
      weightTitle: null,
      weightReason: null,
    };
  }

  let judgement: string;
  if (band.tone === "critical") {
    judgement =
      dominant === "gaps"
        ? `${area} is rated Early because almost none of the assessed practices are operating yet.`
        : `${area} is rated Early because the confirmed answers show very little of this area operating in practice.`;
  } else if (band.tone === "developing") {
    judgement =
      dominant === "mixed" || dominant === "gaps"
        ? `${area} is rated Building because there is some progress, but the answers remain uneven and do not yet support a dependable baseline.`
        : `${area} is rated Building because practice is underway, but not yet consistently in place across the items assessed.`;
  } else if (band.tone === "defined") {
    judgement =
      dominant === "mostly_in_place" || dominant === "complete"
        ? `${area} is rated Established because most of the assessed practices appear to be operating, with only limited gaps remaining.`
        : `${area} is rated Established because the balance of answers shows this area is largely operating, even if it is not complete.`;
  } else if (pillar.alignmentPct >= 100) {
    judgement = `${area} is rated Strong because every assessed practice in this pillar is reported as in place.`;
  } else {
    judgement = `${area} is rated Strong because nearly all assessed practices are reported as in place, with only limited residual work.`;
  }

  const ratingReason = `${judgement} ${evidence}`;

  const teaser =
    band.tone === "critical"
      ? dominant === "gaps"
        ? "Early — assessed practices are largely not in place yet."
        : "Early — very little of this area is confirmed as operating."
      : band.tone === "developing"
        ? "Building — some progress, but answers remain uneven."
        : band.tone === "defined"
          ? "Established — most assessed practices appear to be operating."
          : pillar.alignmentPct >= 100
            ? "Strong — every assessed practice is reported as in place."
            : "Strong — nearly all assessed practices are reported as in place.";

  let questionWeightTitle: string | null = null;
  let questionWeightReason: string | null = null;
  if (pillar.usesUnequalQuestionWeights) {
    questionWeightTitle = "How question weighting shaped this pillar";
    const equalPct = pillar.equalWeightAlignmentPct;
    if (
      equalPct != null &&
      pillar.alignmentPct != null &&
      equalPct !== pillar.alignmentPct
    ) {
      const direction =
        pillar.alignmentPct > equalPct ? "raised" : "lowered";
      const equalBand = scoreBandLabel(equalPct).shortLabel;
      questionWeightReason =
        equalBand === band.shortLabel
          ? `If every question carried equal weight, this pillar would still be approximately ${equalPct}%. With the assigned question weights, the result is ${pillar.alignmentPct}% — higher-weighted answers ${direction} the outcome while the ${band.shortLabel} rating remains unchanged.`
          : `If every question carried equal weight, this pillar would be approximately ${equalPct}% (${equalBand}). Because some questions carry greater weight, those answers ${direction} the result to ${pillar.alignmentPct}%, which is why the rating is ${band.shortLabel}.`;
    } else {
      questionWeightReason = `Some questions in ${area} carry greater weight than others. Higher-weighted answers contribute more to this ${band.shortLabel} rating than lower-weighted questions.`;
    }
  }

  const share = pillar.weightSharePct ?? 0;
  const weight = pillar.weight ?? 1;
  const contribution = pillar.contributionPct;

  let weightTitle: string | null = "How this pillar contributes to the overall result";
  let weightReason: string;
  if (contribution == null) {
    weightReason = `${area} is included in this assessment, but it does not yet contribute to the overall result because it has no scored rating.`;
  } else if (weight !== 1 || share >= 22 || share <= 12) {
    weightReason =
      share >= 22
        ? `${area} represents approximately ${share}% of the overall weighting (importance ${weight} of 10). At ${pillar.alignmentPct}% for this pillar, it contributes roughly ${contribution} points to the overall result — more than a lower-weighted pillar would.`
        : share <= 12
          ? `${area} represents approximately ${share}% of the overall weighting (importance ${weight} of 10). At ${pillar.alignmentPct}%, it contributes roughly ${contribution} points to the overall result — less than higher-weighted pillars.`
          : `${area} represents approximately ${share}% of the overall weighting (importance ${weight} of 10). At ${pillar.alignmentPct}%, it contributes roughly ${contribution} points to the overall result.`;
  } else {
    weightReason = `${area} currently shares the overall result evenly with the other scored pillars (approximately ${share}% of the weighting). At ${pillar.alignmentPct}%, it contributes roughly ${contribution} points to the overall result.`;
  }

  return {
    bandLabel: band.shortLabel,
    ratingTitle: `Why this is rated ${band.shortLabel}`,
    teaser,
    ratingReason,
    questionWeightTitle,
    questionWeightReason,
    weightTitle,
    weightReason,
  };
}

type PillarPathCopy = {
  /** First credible operating foothold */
  toBuilding: string;
  /** From patchy progress to a dependable baseline */
  toEstablished: string;
  /** From baseline to assurance leadership can rely on */
  toStrong: string;
  /** Protect a mature posture */
  sustain: string;
  /** When answers are mostly unresolved */
  confirm: string;
};

const DEFAULT_PILLAR_PATH: PillarPathCopy = {
  toBuilding:
    "Pick a named owner and the two or three practices that most reduce real exposure — then stand them up where people can see them, even if coverage is still thin. Progress you can point to beats a perfect plan that never lands.",
  toEstablished:
    "Finish what is already underway: close the open gaps, make ownership obvious, and give leadership a way to see evidence without chasing teams. That is what turns patchy progress into something you can rely on.",
  toStrong:
    "Move from “mostly in place” to a rhythm you can trust — recurring review, clear exception handling, and proof that holds when AI scope or vendors change.",
  sustain:
    "Protect what you have built: keep evidence fresh, watch for quiet drift, and re-check when products, partners, or rules shift.",
  confirm:
    "Maturity language only helps once you know what is real today — replace unanswered items with a clear picture of what is operating and who owns it.",
};

/** Domain-specific “how we move up” cues — outcome first, then the move. */
const PILLAR_PATH_BY_ID: Record<string, PillarPathCopy> = {
  governance: {
    toBuilding:
      "Give AI a real decision forum (or extend your risk committee), name who owns risk appetite and escalation, and put a short policy pack in front of the highest-risk use cases. Leaders need a place to decide — not another unread deck.",
    toEstablished:
      "Make oversight something people feel week to week: put AI on the board/exec calendar, give owners real decision rights, and close places where policy looks fine on paper but delivery teams still improvise.",
    toStrong:
      "Prove the loop under pressure — exceptions get escalated, appetite is applied to new use cases, and records show oversight is active, not ceremonial.",
    sustain:
      "Keep the charter, owners, and reporting cadence current as the portfolio grows; refresh appetite when material new use cases or regulations appear.",
    confirm:
      "First answer three questions: does board/exec oversight exist, who owns policy, and how does escalation work? Name the leads before you talk about maturity.",
  },
  compliance: {
    toBuilding:
      "For priority systems, create a minimum pack — purpose, data, model, owners — plus a simple logging expectation, so the next review does not start from a blank page.",
    toEstablished:
      "Bring documentation and traceability up to one consistent standard across active AI systems. Stale, incomplete, or unowned records are the usual reason audits feel painful.",
    toStrong:
      "Tie documentation to how you release change — updates travel with releases, retention is clear, and you can show the trail on demand when someone asks hard questions.",
    sustain:
      "Treat documentation as a living control: re-check after material model or vendor changes, and retire stale packs before they create false comfort.",
    confirm:
      "Separate what already has usable documentation and logs from what is still unknown — that split is the first honest step.",
  },
  "safety-reliability": {
    toBuilding:
      "For your top AI use cases, name the failure modes that matter, put basic testing and monitoring in place, and agree who can pause or roll back when something misbehaves.",
    toEstablished:
      "Stretch robustness checks and live monitoring beyond the pilot set. The goal is evidence for accuracy, security, and resilience — not assumptions that “it seems fine.”",
    toStrong:
      "Show that safety holds in production: issues are spotted early, contained, and learned from, with clear thresholds for when humans step in.",
    sustain:
      "Re-check safety assumptions when models, data, or threats change; keep rollback and incident playbooks practiced, not sitting on a shelf.",
    confirm:
      "Confirm whether testing, monitoring, and stop/rollback authority exist for systems already live — unknowns here are an operating risk, not a paperwork gap.",
  },
  oversight: {
    toBuilding:
      "Decide where a human must review or override, assign trained people to those moments, and make sure there is a practical way to intervene when the system is wrong.",
    toEstablished:
      "Make oversight work across the systems that matter: clear handoffs, eyes on override quality, and coverage when volume spikes or people are offline.",
    toStrong:
      "Show that humans can challenge the system at scale — escalations arrive in time, and incident response has been rehearsed, not invented in the moment.",
    sustain:
      "Keep operator training and playbooks current; revisit human-in-the-loop design whenever automation expands or stakes rise.",
    confirm:
      "Who can intervene today, on which systems, and with what authority? Until that is clear, leadership is flying without a safety net.",
  },
  systemic: {
    toBuilding:
      "Inventory where general-purpose or high-impact AI touches the organization, decide which uses need deeper scrutiny, and name who owns that systemic-risk review.",
    toEstablished:
      "Put a repeatable assessment and monitoring rhythm around those high-impact uses — acknowledging the risk is not enough if nobody governs it.",
    toStrong:
      "Show systemic risk is actively managed: clear thresholds, senior escalation, and evidence that large-scale harm scenarios are considered before you scale further.",
    sustain:
      "Reassess when new foundation models, partners, or deployment patterns change the footprint; keep leadership briefed on material shifts.",
    confirm:
      "Is high-impact / general-purpose AI exposure even known today? Without that inventory, maturity claims in this area are premature.",
  },
  "supply-chain": {
    toBuilding:
      "List the AI vendors and components you cannot afford to lose, add AI-specific diligence questions, and name one owner for third-party AI risk.",
    toEstablished:
      "Bake vendor AI controls into onboarding and renewals — especially where partners touch data or influence decisions without contractual or assurance cover.",
    toStrong:
      "Show continuous third-party assurance: clear tiering, evidence reviews, and a credible exit plan for the dependencies that matter most.",
    sustain:
      "Refresh diligence when vendors change models or subprocessors; watch concentration risk as more of the stack sits outside your walls.",
    confirm:
      "Which AI vendors and components sit on the critical path today, and who owns them? Ambiguity here is a supply-chain blind spot.",
  },
  transparency: {
    toBuilding:
      "For priority AI decisions, decide what users and operators must be told — then ship a first disclosure and explainability standard they can actually use.",
    toEstablished:
      "Apply disclosure and explainability consistently, and close places where people cannot understand or contest an AI-influenced outcome.",
    toStrong:
      "Prove transparency under real use: explanations help, disclosures stay accurate as models change, and contested decisions have a clear path.",
    sustain:
      "Update disclosures when purpose or behavior changes; spot-check that explanations still match how the system decides.",
    confirm:
      "What is disclosed today versus what people assume? Unresolved transparency items usually mean messaging and product reality have drifted apart.",
  },
  fairness: {
    toBuilding:
      "Name the high-stakes uses that affect people, run a first bias and rights impact review, and assign who decides remediation when issues appear.",
    toEstablished:
      "Make fairness review a gate for material launches — especially where disparate impact is possible but still unmeasured or unowned.",
    toStrong:
      "Show ongoing care after launch: metrics, appeal paths, and evidence that rights impacts are revisited once the system is live.",
    sustain:
      "Re-test when populations, features, or models change; keep residual fairness risk visible to leadership even when it cannot be fully eliminated.",
    confirm:
      "Which people-impacting AI uses exist, and has any fairness or rights review been done? Silence here is not a clean bill of health.",
  },
  "privacy-data": {
    toBuilding:
      "Map personal data flowing into priority AI systems, confirm lawful basis and retention, and put a data steward on those pipelines so ownership is not vague.",
    toEstablished:
      "Bring data quality, provenance, and privacy controls to one consistent standard — and close the usual weak spots in consent, minimization, and training or inference data handling.",
    toStrong:
      "Show privacy-by-design in day-to-day operation: thoughtful impact assessment where needed, watched data lineage, and fast response when someone asks for access or deletion.",
    sustain:
      "Refresh data maps when new sources or vendors appear; keep retention and access aligned with how models are actually trained and served.",
    confirm:
      "What personal data do AI systems touch today, and who owns those flows? Until that is clear, privacy maturity is a claim — not a fact.",
  },
  workforce: {
    toBuilding:
      "Name the roles that need AI literacy or specialist skill, give those cohorts a focused enablement path, and clarify when humans decide versus when tools assist.",
    toEstablished:
      "Scale training and role design beyond early adopters — especially where people are accountable for AI outcomes without the skills or mandate to succeed.",
    toStrong:
      "Show a talent model that lasts: competencies mapped to roles, hiring and upskilling pipelines, and managers who can oversee AI-assisted work.",
    sustain:
      "Refresh skill expectations as tools evolve; watch burnout and role fog where AI changes the work but not the accountability.",
    confirm:
      "Who is expected to use, oversee, or challenge AI today — and have they been prepared? Unresolved workforce items are readiness gaps, not HR trivia.",
  },
  "financial-resilience": {
    toBuilding:
      "For critical AI-supported processes, quantify concentration and outage exposure, then put a simple continuity and cost-risk view in front of the owners.",
    toEstablished:
      "Fold AI into operational resilience planning — especially where financial or continuity impact is known informally but not yet controlled.",
    toStrong:
      "Show you can take a hit: tested failover, cost controls, and clear escalation when AI disruption threatens service or financial commitments.",
    sustain:
      "Re-run resilience scenarios when dependencies or volumes change; keep finance and operations aligned on residual AI-related exposure.",
    confirm:
      "Which AI services sit on the critical path for revenue or operations? Without that map, resilience maturity cannot be assessed honestly.",
  },
  "human-capital": {
    toBuilding:
      "Name the roles that need AI literacy, give them a focused enablement path, and clarify when humans decide versus when AI assists.",
    toEstablished:
      "Scale training and role design beyond early adopters — especially where people own AI outcomes without the skills or mandate to succeed.",
    toStrong:
      "Show a talent model that lasts: competencies mapped to roles, upskilling pipelines, and managers who can oversee AI-assisted work.",
    sustain:
      "Refresh skill expectations as tools evolve; watch role fog where AI changes the work but not the accountability.",
    confirm:
      "Who is expected to use, oversee, or challenge AI today — and have they been prepared?",
  },
  "regulatory-financial": {
    toBuilding:
      "Map regulatory and financial exposure for priority AI products, name owners, and put a first-line control view in front of leadership.",
    toEstablished:
      "Bring regulatory reporting and financial-impact controls to one consistent standard across the AI products that matter.",
    toStrong:
      "Show that regulatory and financial risk is actively governed — thresholds, escalation, and evidence that hold when someone scrutinizes them.",
    sustain:
      "Reassess when products, jurisdictions, or capital assumptions change; keep finance and compliance aligned on residual exposure.",
    confirm:
      "Which AI uses create material regulatory or financial exposure today? Without that map, maturity claims are premature.",
  },
  "operational-risk": {
    toBuilding:
      "Find where AI sits on critical operating processes, define basic incident and override paths, and name the process owners.",
    toEstablished:
      "Make controls real across the processes that matter: monitoring, clear handoffs, and coverage when volume spikes or people are offline.",
    toStrong:
      "Show operational controls work at scale — issues are detected, contained, and learned from, with clear thresholds for intervention.",
    sustain:
      "Keep playbooks current; revisit operating design whenever automation expands or service stakes rise.",
    confirm:
      "Who can intervene today, on which processes, and with what authority?",
  },
  "ecosystem-risk": {
    toBuilding:
      "List the partners, platforms, and vendors your AI work depends on, and name who owns third-party AI risk.",
    toEstablished:
      "Bake ecosystem diligence into onboarding and renewals — especially where partners influence decisions without assurance cover.",
    toStrong:
      "Show continuous ecosystem assurance: clear tiering, evidence reviews, and contingency for the dependencies that matter most.",
    sustain:
      "Refresh diligence when partners change models or subprocessors; watch concentration risk as the ecosystem grows.",
    confirm:
      "Which ecosystem dependencies sit on the critical path today, and who owns them?",
  },
  "technology-risk": {
    toBuilding:
      "For top AI systems, name the failure modes that matter, put basic testing and security monitoring in place, and agree who can pause or roll back.",
    toEstablished:
      "Stretch robustness, security, and platform controls beyond pilots — especially where reliability is assumed rather than evidenced.",
    toStrong:
      "Show technology controls hold in production: incidents are detected, contained, and learned from.",
    sustain:
      "Re-validate assumptions when models, data, or threats change; keep rollback playbooks practiced.",
    confirm:
      "Do testing, monitoring, and stop/rollback authority exist for systems already in use?",
  },
  "compliance-risk": {
    toBuilding:
      "For priority systems, create a minimum documentation pack and a simple evidence expectation so the next review does not start from a blank page.",
    toEstablished:
      "Bring documentation and auditability to one consistent standard — incomplete, stale, or unowned records are usually what makes reviews hard.",
    toStrong:
      "Tie compliance evidence to how you release change — updates travel with releases, and you can show the trail when asked.",
    sustain:
      "Treat compliance evidence as a living control; re-check after material model or vendor changes.",
    confirm:
      "Which systems already have usable compliance evidence, and which are still unknown?",
  },
};

function pillarPathCopy(pillarId: string | undefined): PillarPathCopy {
  if (!pillarId) return DEFAULT_PILLAR_PATH;
  return PILLAR_PATH_BY_ID[pillarId] ?? DEFAULT_PILLAR_PATH;
}

/**
 * Stakeholder briefing for a pillar: what the posture means in operating terms,
 * and a concrete path to the next level — without score arithmetic.
 */
export function describePackPillarBriefing(
  pillar: Pick<
    PackPillarScore,
    | "pillarId"
    | "pillarLabel"
    | "alignmentPct"
    | "yesCount"
    | "partialCount"
    | "noCount"
    | "dontKnowCount"
    | "scoredCount"
    | "weight"
    | "weightSharePct"
    | "contributionPct"
    | "usesUnequalQuestionWeights"
    | "equalWeightAlignmentPct"
  >
): PackPillarBriefing {
  const area = pillar.pillarLabel;
  const band = scoreBandLabel(pillar.alignmentPct);
  const path = pillarPathCopy(pillar.pillarId);
  const hasOpenGaps = pillar.noCount + pillar.partialCount > 0;
  const hasUncertainty = pillar.dontKnowCount > 0;
  const rating = describePackPillarRating(pillar);
  const ratingFields = {
    ratingTitle: rating.ratingTitle,
    ratingTeaser: rating.teaser,
    ratingReason: rating.ratingReason,
    questionWeightTitle: rating.questionWeightTitle,
    questionWeightReason: rating.questionWeightReason,
    weightTitle: rating.weightTitle,
    weightReason: rating.weightReason,
  };

  if (pillar.alignmentPct == null) {
    return {
      readingTitle: "Why this matters now",
      reading: `${area} is still too foggy to brief with confidence. Most answers were unresolved, so treat the current state as unconfirmed — not a clean bill of health, and not a proven gap — until owners can say what is actually operating.`,
      ...ratingFields,
      nextLevelLabel: "a confirmed baseline",
      nextLevelGuidance: path.confirm,
    };
  }

  let reading: string;
  if (pillar.alignmentPct < 26) {
    reading = hasOpenGaps
      ? `${area} is still at foundation stage. Core practices look missing or only lightly started, which usually means limited cover if something goes wrong — this is about building the basics, not polishing what already works.`
      : `${area} is still early. Treat it as a starting point until practices are confirmed, owned, and visible in day-to-day work.`;
  } else if (pillar.alignmentPct < 51) {
    reading = `${area} shows real progress, but it is uneven. Some practices are underway while others are incomplete, so you cannot yet assume this area is under control — it needs focused investment to become dependable.`;
  } else if (pillar.alignmentPct < 76) {
    reading = `${area} looks largely in place. The question for leaders shifts from “do we have anything?” to “can we trust this under pressure — with evidence, owners, and a clear response when something breaks?”`;
  } else if (pillar.alignmentPct < 100) {
    reading = `${area} is among the stronger parts of the picture, with only limited residual work. You can lean on it more than most — as long as evidence stays current and the last gaps are closed before you scale further.`;
  } else {
    reading = `${area} is reported as fully operating for the practices assessed here. Protect that baseline: keep evidence fresh and re-check when AI scope, vendors, or regulations change.`;
  }

  if (hasUncertainty && pillar.alignmentPct < 100) {
    reading +=
      pillar.dontKnowCount === 1
        ? " One answer still needs confirmation before you treat this picture as closed."
        : " A few answers still need confirmation before you treat this picture as closed.";
  }

  if (band.tone === "critical") {
    return {
      readingTitle: "Why this matters now",
      reading,
      ...ratingFields,
      nextLevelLabel: "Building",
      nextLevelGuidance: path.toBuilding,
    };
  }

  if (band.tone === "developing") {
    return {
      readingTitle: "Why this matters now",
      reading,
      ...ratingFields,
      nextLevelLabel: "Established",
      nextLevelGuidance: path.toEstablished,
    };
  }

  if (band.tone === "defined") {
    return {
      readingTitle: "Why this matters now",
      reading,
      ...ratingFields,
      nextLevelLabel: "Strong",
      nextLevelGuidance: path.toStrong,
    };
  }

  return {
    readingTitle: "Why this matters now",
    reading,
    ...ratingFields,
    nextLevelLabel: null,
    nextLevelGuidance: path.sustain,
  };
}

function toFinding(snapshot: PackSnapshot, answer: PillarQuestionAnswer): PackFinding {
  const summary = packAnswerFindingSummary(snapshot.prompt, answer, snapshot.helpText);
  const enriched = buildPackFindingInsight({
    pillarId: snapshot.pillarId,
    summary,
    answer,
  });
  return {
    pillarId: snapshot.pillarId,
    pillarLabel: packPillarLabel(snapshot.pillarId),
    prompt: snapshot.prompt,
    summary,
    insight: enriched.insight,
    recommendation: enriched.recommendation,
    severity: enriched.severity,
    weight: clampPackWeight(snapshot.weight ?? 1),
    pillarWeight: clampPackWeight(snapshot.pillarWeight ?? 1),
  };
}

/** Rank findings for leadership reading: severity first, then question/pillar weight. */
export function rankPackFindings<T extends PackFinding>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const severityDelta =
      (CRITICALITY_RANK[left.severity] ?? 2) - (CRITICALITY_RANK[right.severity] ?? 2);
    if (severityDelta !== 0) return severityDelta;
    const questionWeightDelta = (right.weight ?? 1) - (left.weight ?? 1);
    if (questionWeightDelta !== 0) return questionWeightDelta;
    return (right.pillarWeight ?? 1) - (left.pillarWeight ?? 1);
  });
}

/**
 * Preview the highest-stakes / highest-weighted findings; keep the rest for expand.
 * Prefers critical and high severity in the preview window, then fills by rank.
 */
export function splitPackFindingsPreview<T extends PackFinding>(
  items: T[],
  previewLimit = 4
): { preview: T[]; remaining: T[] } {
  const ranked = rankPackFindings(items);
  if (ranked.length <= previewLimit) {
    return { preview: ranked, remaining: [] };
  }

  const priority = ranked.filter(
    (item) => item.severity === "critical" || item.severity === "high"
  );
  const preview =
    priority.length >= previewLimit
      ? priority.slice(0, previewLimit)
      : priority.length > 0
        ? [
            ...priority,
            ...ranked
              .filter((item) => item.severity === "medium")
              .slice(0, previewLimit - priority.length),
          ]
        : ranked.slice(0, previewLimit);

  const previewKeys = new Set(
    preview.map((item) => `${item.pillarId}\0${item.prompt}`)
  );
  const remaining = ranked.filter(
    (item) => !previewKeys.has(`${item.pillarId}\0${item.prompt}`)
  );
  return { preview, remaining };
}

export function buildPackReport(input: {
  title: string;
  organizationName?: string | null;
  packName?: string | null;
  pillarSet?: PackPillarSet | string | null;
  generatedAt?: string;
  snapshots: PackSnapshot[];
  answers: PackAnswerRecord[];
}): PackReport {
  const answersByQuestion = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const progress = computePackProgress(input.snapshots, input.answers);
  const pillarSet = resolvePackPillarSet({
    pillarSet: input.pillarSet,
    packName: input.packName,
    pillarIds: input.snapshots.map((snapshot) => snapshot.pillarId),
  });
  const pillarCatalog = getPackPillarCatalog(pillarSet);

  const usesQuestionWeights = input.snapshots.some(
    (snapshot) => clampPackWeight(snapshot.weight ?? 1) !== 1
  );
  const usesCustomWeights =
    usesQuestionWeights ||
    input.snapshots.some((snapshot) => clampPackWeight(snapshot.pillarWeight ?? 1) !== 1);

  const questionDriversByPillar = new Map<string, PackQuestionWeightDriver[]>();

  const rawPillarScores = pillarCatalog.flatMap((pillar) => {
    const snapshots = input.snapshots.filter((snapshot) => snapshot.pillarId === pillar.id);
    if (snapshots.length === 0) return [];

    const answered = snapshots
      .map((snapshot) => {
        const answer = answersByQuestion.get(snapshot.id)?.answer;
        if (!answer) return null;
        return {
          prompt: snapshot.prompt,
          answer,
          weight: clampPackWeight(snapshot.weight ?? 1),
        };
      })
      .filter(
        (row): row is { prompt: string; answer: PillarQuestionAnswer; weight: number } =>
          row != null
      );

    const answers = answered.map((row) => row.answer);
    const questionWeights = answered.map((row) => row.weight);
    const scoredRows = answered.filter(
      (row) => PILLAR_QUESTION_ANSWER_META[row.answer].score != null
    );
    const scoredQuestionWeights = scoredRows.map((row) => row.weight);
    const scoredWeightTotal = sumWeights(scoredQuestionWeights);
    const pillarWeight =
      snapshots[0]?.pillarWeight != null
        ? clampPackWeight(snapshots[0].pillarWeight)
        : (CRITICALITY_WEIGHT[pillar.criticality] ?? 1);

    questionDriversByPillar.set(
      pillar.id,
      [...scoredRows]
        .sort((left, right) => right.weight - left.weight || left.prompt.localeCompare(right.prompt))
        .slice(0, 4)
        .map((row) => ({
          prompt: row.prompt,
          answer: row.answer,
          weight: row.weight,
          shareOfPillarPct: weightSharePct(row.weight, scoredWeightTotal),
        }))
    );

    return [
      {
        pillarId: pillar.id,
        pillarLabel: pillar.label,
        criticality: pillar.criticality,
        weight: pillarWeight,
        usesUnequalQuestionWeights: new Set(scoredQuestionWeights).size > 1,
        equalWeightAlignmentPct: scorePillarAnswers(answers),
        questionCount: snapshots.length,
        answeredCount: answers.length,
        scoredCount: scoredRows.length,
        yesCount: answers.filter((answer) => answer === "yes").length,
        partialCount: answers.filter((answer) => answer === "partial").length,
        noCount: answers.filter((answer) => answer === "no").length,
        dontKnowCount: answers.filter((answer) => answer === "dont_know").length,
        alignmentPct: scorePillarAnswers(answers, questionWeights),
      },
    ];
  });

  const scoredPillarWeightTotal = sumWeights(
    rawPillarScores.filter((pillar) => pillar.alignmentPct != null).map((pillar) => pillar.weight)
  );
  const allPillarWeightTotal = sumWeights(rawPillarScores.map((pillar) => pillar.weight));

  const pillarScores: PackPillarScore[] = rawPillarScores.map((pillar) => {
    const shareOfAll = weightSharePct(pillar.weight, allPillarWeightTotal);
    const contributionPct =
      pillar.alignmentPct == null || scoredPillarWeightTotal <= 0
        ? null
        : Math.round(((pillar.alignmentPct * pillar.weight) / scoredPillarWeightTotal) * 10) / 10;

    return {
      ...pillar,
      weightSharePct: shareOfAll,
      contributionPct,
    };
  });

  const strengthsRaw: PackReport["strengths"] = [];
  const gapsRaw: PackReport["gaps"] = [];
  const partialsRaw: PackReport["partials"] = [];
  const followUpsRaw: PackReport["followUps"] = [];

  for (const snapshot of input.snapshots) {
    const answer = answersByQuestion.get(snapshot.id)?.answer;
    if (!answer) continue;
    const row = toFinding(snapshot, answer);
    if (answer === "yes") strengthsRaw.push(row);
    if (answer === "no") gapsRaw.push(row);
    if (answer === "partial") partialsRaw.push(row);
    if (answer === "dont_know") followUpsRaw.push(row);
  }

  const strengths = rankPackFindings(strengthsRaw);
  const gaps = rankPackFindings(gapsRaw);
  const partials = rankPackFindings(partialsRaw);
  const followUps = rankPackFindings(followUpsRaw);

  const overallScorePct = computePackOverallScorePct(pillarScores);

  const weighting: PackWeightingMethodology = {
    usesCustomWeights,
    usesQuestionWeights,
    summary:
      "Ratings reflect two layers of weighting: how much each question counts within a pillar, and how much each pillar counts toward the overall result.",
    answerPoints:
      "Yes indicates the practice is in place. Partial indicates it is only partly in place. No indicates it is not in place. Don’t know is excluded from scoring until confirmed, so unresolved items do not raise or lower a rating.",
    questionWeightBlurb: usesQuestionWeights
      ? "Within a pillar, higher-weighted questions contribute more to that pillar’s Early, Building, Established, or Strong rating. A higher-weighted “No” reduces the pillar score more than a lower-weighted “No”; a higher-weighted “Yes” increases it more."
      : "In this assessment, questions currently carry equal weight within each pillar.",
    pillarWeightBlurb: usesCustomWeights
      ? "Across this assessment, higher-weighted pillars have greater influence on the overall percentage. A weaker result on a higher-weighted pillar reduces the overall score more than the same result on a lower-weighted pillar."
      : "In this assessment, scored pillars currently share the overall result evenly.",
    pillarFormula:
      "A pillar’s Early / Building / Established / Strong label reflects how much of that area is operating today. Largely missing practices rate Early; mixed progress rates Building; mostly in place rates Established; nearly everything in place rates Strong.",
    overallFormula:
      "The overall percentage then blends those pillar results, giving more influence to pillars with higher assigned weight.",
    overallResultNote:
      overallScorePct == null ? null : `The overall result is ${overallScorePct}%.`,
    pillars: pillarScores.map((pillar) => ({
      pillarId: pillar.pillarId,
      pillarLabel: pillar.pillarLabel,
      weight: pillar.weight ?? 1,
      weightSharePct: pillar.weightSharePct ?? 0,
      alignmentPct: pillar.alignmentPct,
      equalWeightAlignmentPct: pillar.equalWeightAlignmentPct ?? null,
      contributionPct: pillar.contributionPct ?? null,
      usesUnequalQuestionWeights: pillar.usesUnequalQuestionWeights,
      questionDrivers: questionDriversByPillar.get(pillar.pillarId) ?? [],
      explanation: describePackPillarRating(pillar),
    })),
  };

  return {
    kind: "pillar_questionnaire",
    title: input.title,
    organizationName: input.organizationName?.trim() || "Organization",
    packName: input.packName ?? null,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    overallScorePct,
    pillarScores,
    weighting,
    strengths,
    gaps,
    partials,
    followUps,
    progress,
  };
}

export function packWorkshopPillarSummaries(
  snapshots: PackSnapshot[],
  answers: PackAnswerRecord[],
  options?: { packName?: string | null; pillarSet?: PackPillarSet | string | null }
) {
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const pillarSet = resolvePackPillarSet({
    pillarSet: options?.pillarSet,
    packName: options?.packName,
    pillarIds: snapshots.map((snapshot) => snapshot.pillarId),
  });
  const pillarCatalog = getPackPillarCatalog(pillarSet);
  return pillarCatalog.map((pillar, index) => {
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
