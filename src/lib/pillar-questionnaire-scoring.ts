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
import {
  buildPackFindingInsight,
  buildPackKeyInsights,
  topicFromFindingSummary,
} from "@/lib/pack-finding-insights";

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
  const criticalityByPillar = new Map(
    report.pillarScores.map((pillar) => [pillar.pillarLabel, pillar.criticality])
  );

  const rank = (pillarLabel: string) =>
    CRITICALITY_RANK[criticalityByPillar.get(pillarLabel) ?? "medium"] ?? 2;

  const gapSteps = [...report.gaps]
    .sort((left, right) => {
      const severityDelta =
        (CRITICALITY_RANK[left.severity] ?? 2) - (CRITICALITY_RANK[right.severity] ?? 2);
      if (severityDelta !== 0) return severityDelta;
      return rank(left.pillarLabel) - rank(right.pillarLabel);
    })
    .map((item) => ({
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

export function scorePillarAnswers(answers: PillarQuestionAnswer[]): number | null {
  const scored = answers
    .map((answer) => PILLAR_QUESTION_ANSWER_META[answer].score)
    .filter((score): score is number => score != null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
}

export type PackPillarBriefing = {
  readingTitle: string;
  reading: string;
  nextLevelLabel: string | null;
  nextLevelGuidance: string;
};

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
    "Name an accountable owner, pick the two or three practices that most reduce exposure, and stand them up in a visible pilot — even if coverage is still incomplete.",
  toEstablished:
    "Finish the work already in flight: close the remaining gaps, document who owns each practice, and make sure leadership can see evidence without chasing teams.",
  toStrong:
    "Shift from “mostly in place” to proven rhythm — recurring review, exception handling, and evidence that holds up when AI scope or vendors change.",
  sustain:
    "Protect the operating baseline: keep evidence current, watch for silent drift, and re-test when products, partners, or regulations shift.",
  confirm:
    "Before maturity language is useful, confirm what actually exists today — replace unresolved answers with a clear operating picture and named owners.",
};

/** Domain-specific “how we move up” cues for professional stakeholders. */
const PILLAR_PATH_BY_ID: Record<string, PillarPathCopy> = {
  governance: {
    toBuilding:
      "Stand up a clear AI decision forum (or extend an existing risk committee), publish who owns risk appetite and escalation, and put a lightweight policy set in front of the highest-risk use cases.",
    toEstablished:
      "Make oversight routine: calendar board/exec updates, map roles to real decision rights, and close gaps where policy exists on paper but not in day-to-day delivery.",
    toStrong:
      "Prove the governance loop under pressure — exceptions are escalated, appetite is applied to new use cases, and minutes/evidence show oversight is active, not ceremonial.",
    sustain:
      "Keep the charter, owners, and reporting cadence current as the AI portfolio grows; refresh risk appetite when material new use cases or regulations appear.",
    confirm:
      "Confirm whether board/exec oversight, policy ownership, and escalation paths actually exist today — then name the accountable leads before speaking to maturity.",
  },
  compliance: {
    toBuilding:
      "Create a minimum documentation pack for priority systems (purpose, data, model, owners) and a simple logging expectation so reviews are not starting from a blank page.",
    toEstablished:
      "Bring documentation and traceability up to a consistent standard across the active AI estate; close gaps where records are incomplete, stale, or owned by no one.",
    toStrong:
      "Tie documentation to change control and audit readiness — updates happen with releases, retention is clear, and traceability can be demonstrated on demand.",
    sustain:
      "Treat documentation as a living control: re-check after material model or vendor changes, and retire stale packs before they become a false sense of comfort.",
    confirm:
      "Confirm which systems already have usable documentation and logs versus which are unknown — clarity on the record set is the first step.",
  },
  "safety-reliability": {
    toBuilding:
      "Define the failure modes that matter for your top AI use cases, put basic testing/monitoring in place, and agree who can pause or roll back a system that misbehaves.",
    toEstablished:
      "Extend robustness checks and operational monitoring beyond the pilot set; close gaps where accuracy, security, or resilience are assumed rather than evidenced.",
    toStrong:
      "Demonstrate that safety controls hold in production — incidents are detected, contained, and learned from, with clear thresholds for intervention.",
    sustain:
      "Re-validate safety assumptions when models, data, or threat conditions change; keep rollback and incident playbooks exercised, not shelfware.",
    confirm:
      "Confirm whether safety testing, monitoring, and stop/rollback authority exist for systems already in use — unknowns here are a leadership issue, not a paperwork issue.",
  },
  oversight: {
    toBuilding:
      "Identify where human review or override is required, assign trained operators, and make sure there is a practical way to intervene when the system is wrong.",
    toEstablished:
      "Operationalize oversight across the estate: clear handoffs, monitoring of override rates/quality, and coverage for after-hours or high-volume scenarios.",
    toStrong:
      "Show that oversight works at scale — humans can effectively challenge the system, escalations are timely, and incident response is rehearsed.",
    sustain:
      "Keep operator training and playbooks current; revisit human-in-the-loop design whenever automation expands or decision stakes rise.",
    confirm:
      "Confirm who can intervene today, on which systems, and with what authority — unresolved oversight answers leave leadership without an operational safety net.",
  },
  systemic: {
    toBuilding:
      "Inventory general-purpose / high-impact AI exposure, define which use cases need heightened scrutiny, and assign ownership for systemic-risk review.",
    toEstablished:
      "Put repeatable assessment and monitoring around GPAI and systemic use cases; close gaps where impact is acknowledged but not governed.",
    toStrong:
      "Demonstrate that systemic risk is actively managed — thresholds, escalation to senior leaders, and evidence that large-scale harm scenarios are considered before scale-up.",
    sustain:
      "Reassess when new foundation models, partners, or deployment patterns change the systemic footprint; keep leadership briefed on material shifts.",
    confirm:
      "Confirm whether systemic / GPAI exposure is even known today — without that inventory, maturity claims in this area are premature.",
  },
  "supply-chain": {
    toBuilding:
      "List critical AI vendors and components, add AI-specific diligence questions, and set a clear owner for third-party AI risk.",
    toEstablished:
      "Embed vendor AI controls into onboarding and renewals; close gaps where partners process data or influence decisions without contractual or assurance cover.",
    toStrong:
      "Show continuous third-party assurance — tiering, evidence reviews, and exit/contingency plans for material AI dependencies.",
    sustain:
      "Refresh diligence when vendors change models or subprocessors; watch concentration risk as the ecosystem footprint grows.",
    confirm:
      "Confirm which AI vendors and components are in the critical path today, and who owns them — ambiguity here is a supply-chain blind spot.",
  },
  transparency: {
    toBuilding:
      "Define what users and operators must be told for priority AI decisions, and ship a first disclosure / explainability standard for those use cases.",
    toEstablished:
      "Apply disclosure and explainability consistently; close gaps where people cannot understand or contest AI-influenced outcomes.",
    toStrong:
      "Prove transparency under real use — explanations are usable, disclosures stay accurate as models change, and contested decisions have a clear path.",
    sustain:
      "Update disclosures when model behavior or purpose changes; spot-check that explanations still match how the system actually decides.",
    confirm:
      "Confirm what is disclosed today versus what stakeholders assume — unresolved transparency items usually mean messaging and product reality are out of sync.",
  },
  fairness: {
    toBuilding:
      "Identify high-stakes use cases affecting people, run an initial bias/rights impact review, and assign ownership for remediation decisions.",
    toEstablished:
      "Make fairness review a gate for material launches; close gaps where disparate impact is possible but unmeasured or unowned.",
    toStrong:
      "Demonstrate ongoing monitoring and remediation — metrics, appeal paths, and evidence that rights impacts are revisited after deployment.",
    sustain:
      "Re-test when populations, features, or models change; keep leadership visibility on residual fairness risk that cannot be fully eliminated.",
    confirm:
      "Confirm which people-impacting AI uses exist and whether any fairness or rights review has been done — silence here is not a clean bill of health.",
  },
  "privacy-data": {
    toBuilding:
      "Map personal data flowing into priority AI systems, confirm lawful basis and retention, and assign data-steward ownership for those pipelines.",
    toEstablished:
      "Bring data quality, provenance, and privacy controls to a consistent standard; close gaps in consent, minimization, or training/inference data handling.",
    toStrong:
      "Show privacy-by-design in operation — DPIA-quality thinking where needed, monitored data lineage, and rapid response to access or deletion obligations.",
    sustain:
      "Revisit data maps when new sources or vendors appear; keep retention and access controls aligned with how models are actually trained and served.",
    confirm:
      "Confirm what personal data AI systems touch today and who owns those flows — unresolved privacy answers block any credible maturity claim.",
  },
  workforce: {
    toBuilding:
      "Define the roles that need AI literacy or specialist skill, launch a focused enablement path for those cohorts, and clarify decision rights between humans and tools.",
    toEstablished:
      "Scale training and role design beyond early adopters; close gaps where people are accountable for AI outcomes without the skills or mandate to succeed.",
    toStrong:
      "Show a sustainable talent model — competencies mapped to roles, hiring/upskilling pipelines, and managers who can oversee AI-assisted work.",
    sustain:
      "Refresh skill expectations as tools evolve; watch burnout and role ambiguity where AI changes workload without changing accountability.",
    confirm:
      "Confirm who is expected to use, oversee, or challenge AI today — and whether they have been prepared. Unresolved workforce items are readiness gaps, not HR trivia.",
  },
  "financial-resilience": {
    toBuilding:
      "Quantify concentration and outage exposure for critical AI-supported processes, and put a basic continuity / cost-risk view in front of owners.",
    toEstablished:
      "Integrate AI into operational resilience planning; close gaps where financial or continuity impact is known informally but not controlled.",
    toStrong:
      "Demonstrate resilience under stress — tested failover, cost controls, and clear escalation when AI disruption threatens service or financial commitments.",
    sustain:
      "Re-run resilience scenarios when dependencies or volumes change; keep finance and operations aligned on residual AI-related exposure.",
    confirm:
      "Confirm which AI services sit on the critical path for revenue or operations — without that map, resilience maturity cannot be assessed honestly.",
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
  >
): PackPillarBriefing {
  const area = pillar.pillarLabel;
  const band = scoreBandLabel(pillar.alignmentPct);
  const path = pillarPathCopy(pillar.pillarId);
  const hasOpenGaps = pillar.noCount + pillar.partialCount > 0;
  const hasUncertainty = pillar.dontKnowCount > 0;

  if (pillar.alignmentPct == null) {
    return {
      readingTitle: "What this means",
      reading: `${area} cannot yet be briefed with confidence. Responses in this area were largely unresolved, so leadership should treat the current state as unconfirmed — not as a clean bill of health, and not as a proven gap — until owners can say what is actually operating.`,
      nextLevelLabel: "a confirmed baseline",
      nextLevelGuidance: path.confirm,
    };
  }

  let reading: string;
  if (pillar.alignmentPct < 26) {
    reading = hasOpenGaps
      ? `In ${area}, leadership does not yet have a dependable operating picture. Core practices appear missing or only lightly started, which usually means limited assurance if something goes wrong — this is a foundation issue, not a fine-tuning exercise.`
      : `In ${area}, the assessment does not yet support a confident operating view. Treat the area as early-stage until practices are confirmed and owned.`;
  } else if (pillar.alignmentPct < 51) {
    reading = `In ${area}, progress is visible but uneven. Some practices are underway while others remain incomplete, so assurance is still patchy — suitable for directed investment, not for assuming the area is under control.`;
  } else if (pillar.alignmentPct < 76) {
    reading = `In ${area}, most of the expected practices appear to be operating. Residual gaps remain, so the leadership question shifts from “do we have anything?” to “is this reliable, evidenced, and ready under pressure?”`;
  } else if (pillar.alignmentPct < 100) {
    reading = `In ${area}, the posture looks comparatively mature, with only limited residual work. Leadership can lean on this area more than most — provided evidence stays current and the last gaps are closed before scale increases.`;
  } else {
    reading = `In ${area}, the practices covered here are reported as operating. Treat that as a baseline to protect: keep evidence fresh and re-test when AI scope, vendors, or regulations change.`;
  }

  if (hasUncertainty && pillar.alignmentPct < 100) {
    reading +=
      pillar.dontKnowCount === 1
        ? " One response still needs confirmation before this picture should be treated as closed."
        : " A few responses still need confirmation before this picture should be treated as closed.";
  }

  if (band.tone === "critical") {
    return {
      readingTitle: "What this means",
      reading,
      nextLevelLabel: "Building",
      nextLevelGuidance: path.toBuilding,
    };
  }

  if (band.tone === "developing") {
    return {
      readingTitle: "What this means",
      reading,
      nextLevelLabel: "Established",
      nextLevelGuidance: path.toEstablished,
    };
  }

  if (band.tone === "defined") {
    return {
      readingTitle: "What this means",
      reading,
      nextLevelLabel: "Strong",
      nextLevelGuidance: path.toStrong,
    };
  }

  return {
    readingTitle: "What this means",
    reading,
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
  };
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
    const row = toFinding(snapshot, answer);
    if (answer === "yes") strengths.push(row);
    if (answer === "no") gaps.push(row);
    if (answer === "partial") partials.push(row);
    if (answer === "dont_know") followUps.push(row);
  }

  gaps.sort(
    (left, right) =>
      (CRITICALITY_RANK[left.severity] ?? 2) - (CRITICALITY_RANK[right.severity] ?? 2)
  );

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
