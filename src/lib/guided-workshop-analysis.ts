import type { MaturityLevel } from "@prisma/client";
import type { PillarMaturityRecord } from "@/lib/control-review-reports";
import { getFrameworkShortLabel } from "@/lib/framework-library";
import {
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_SCORE,
} from "@/lib/maturity-survey-constants";
import {
  buildMaturitySurveyReport,
  type MaturitySurveyReport,
  type SurveyControlResponse,
} from "@/lib/maturity-survey-analysis";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";
import {
  getWorkshopAnswerOptions,
  maturityToWeightPct,
  weightPctToMaturityBand,
  type WorkshopAnswerOption,
} from "@/lib/guided-workshop-scoring";
function buildPillarInsight(pillar: PillarMaturityRecord): string {
  const segments: string[] = [];
  if (pillar.alignedCount > 0) {
    segments.push(`${pillar.alignedCount} at Managed or Optimized`);
  }
  if (pillar.partialCount > 0) {
    segments.push(`${pillar.partialCount} at Developing or Defined`);
  }
  if (pillar.gapCount > 0) {
    segments.push(`${pillar.gapCount} at Initial or Not Implemented`);
  }
  const mix = segments.length > 0 ? segments.join(" · ") : "see rated controls below";
  return `${pillar.reviewedControls} control${pillar.reviewedControls === 1 ? "" : "s"} rated in this pillar — ${mix}.`;
}

const LEADERSHIP_BRIEF_LIMIT = 3;

export type LeadershipPriority = {
  controlCode: string;
  controlTitle: string;
  pillarLabel: string;
  maturityLabel: string;
  severity: MaturitySurveyReport["gaps"][number]["severity"];
  summary: string;
};

export type LeadershipAsk = {
  controlCode: string;
  controlTitle: string;
  pillarLabel: string;
  action: string;
  ownerHint: string;
  phase: "immediate" | "short_term" | "medium_term";
  phaseLabel: string;
};

/** Strengths only when rated controls exist at Managed or Optimized — no filler copy. */
export function buildFactualStrengths(
  pillarScorecard: Array<PillarMaturityRecord & { band: ReturnType<typeof weightPctToMaturityBand> }>
): string[] {
  return pillarScorecard
    .filter((p) => p.alignedCount > 0)
    .sort((a, b) => b.alignmentPct - a.alignmentPct)
    .slice(0, 3)
    .map(
      (p) =>
        `${p.pillarLabel}: ${p.alignedCount} of ${p.reviewedControls} rated control${p.reviewedControls === 1 ? "" : "s"} at Managed or Optimized`
    );
}

export function selectLeadershipPriorities(
  gaps: MaturitySurveyReport["gaps"]
): LeadershipPriority[] {
  return gaps.slice(0, LEADERSHIP_BRIEF_LIMIT).map((gap) => ({
    controlCode: gap.controlCode,
    controlTitle: gap.controlTitle,
    pillarLabel: gap.pillarLabel,
    maturityLabel: gap.maturityLabel,
    severity: gap.severity,
    summary: gap.summary,
  }));
}

export function selectLeadershipAsks(
  roadmap: MaturitySurveyReport["roadmap"]
): LeadershipAsk[] {
  const immediate = roadmap.filter((step) => step.phase === "immediate");
  const source = immediate.length > 0 ? immediate : roadmap;
  return source.slice(0, LEADERSHIP_BRIEF_LIMIT).map((step) => ({
    controlCode: step.controlCode,
    controlTitle: step.controlTitle,
    pillarLabel: step.pillarLabel,
    action: step.action,
    ownerHint: step.ownerHint,
    phase: step.phase,
    phaseLabel: step.phaseLabel,
  }));
}

export function buildFactualVerdictHeadline(input: {
  overallMaturity: MaturityLevel;
  criticalGapCount: number;
  gapCount: number;
  weakestPillar?: { pillarLabel: string; gapCount: number };
}): string {
  if (input.criticalGapCount > 0 && input.weakestPillar) {
    return `${input.weakestPillar.pillarLabel} needs executive ownership this quarter`;
  }
  if (input.gapCount > 0) {
    return MATURITY_LEVEL_GUIDANCE[input.overallMaturity].headline;
  }
  return "Rated controls already operate at Managed maturity or above";
}

/** Translates the rated maturity band into what it means operationally — no invented risk language. */
export function buildExecutiveImplication(input: {
  org: string;
  overallMaturity: MaturityLevel;
  weakestPillar?: { pillarLabel: string; gapCount: number; maturityLabel: string };
  gapCount: number;
  immediateAskCount: number;
}): string {
  const guidance = MATURITY_LEVEL_GUIDANCE[input.overallMaturity];
  const parts = [
    `${input.org} is at ${guidance.label} maturity: ${guidance.description}`,
  ];

  if (input.weakestPillar && input.weakestPillar.gapCount > 0) {
    parts.push(
      `Risk concentrates in ${input.weakestPillar.pillarLabel} (${input.weakestPillar.maturityLabel} pillar average), where ${input.weakestPillar.gapCount} rated control${input.weakestPillar.gapCount === 1 ? "" : "s"} sit at Initial or Not Implemented.`
    );
  } else if (input.gapCount > 0) {
    parts.push(
      `${input.gapCount} rated control${input.gapCount === 1 ? "" : "s"} sit below Managed maturity.`
    );
  } else {
    parts.push("No rated control currently sits below Managed.");
  }

  if (input.immediateAskCount > 0) {
    parts.push(
      `The ${input.immediateAskCount} action${input.immediateAskCount === 1 ? "" : "s"} below are the 90-day asks tied to those ratings.`
    );
  }

  return parts.join(" ");
}

function buildWorkshopNarrative(
  org: string,
  maturityReport: MaturitySurveyReport,
  frameworkLabels: string[],
  weakestPillar?: { pillarLabel: string }
): string {
  const guidance = MATURITY_LEVEL_GUIDANCE[maturityReport.overallMaturity];
  const frameworkPhrase =
    frameworkLabels.length > 0 ? frameworkLabels.join(", ") : "leading AI governance frameworks";
  const focus =
    weakestPillar && maturityReport.gaps.length > 0
      ? ` The concentration of rated-control gaps is ${weakestPillar.pillarLabel}.`
      : "";

  return `${org} is at ${guidance.label} AI governance maturity — ${guidance.headline.toLowerCase()}.${focus} Scores and gaps are computed from workshop selections and mapped to ${frameworkPhrase}.`;
}

export type GuidedWorkshopReport = {
  generatedAt: string;
  workshopTitle: string;
  organizationName: string;
  clientIndustry: string | null;
  facilitatorName: string | null;
  facilitatorRole: string | null;
  clientContactName: string | null;
  clientContactRole: string | null;
  frameworkCodes: string[];
  frameworkLabels: string[];
  overallScorePct: number;
  overallMaturity: MaturityLevel;
  overallMaturityLabel: string;
  overallBand: ReturnType<typeof weightPctToMaturityBand>;
  answeredCount: number;
  totalQuestions: number;
  completionPct: number;
  weightMethodology: {
    title: string;
    summary: string;
    formula: string;
    answerOptions: WorkshopAnswerOption[];
  };
  executiveSummary: {
    headline: string;
    narrative: string;
    verdictHeadline: string;
    /** What the rated maturity band means operationally. */
    implication: string;
    /** Top rated-control gaps leadership should know by name. */
    leadershipPriorities: LeadershipPriority[];
    /** Immediate (or next-available) actions tied to those ratings. */
    leadershipAsks: LeadershipAsk[];
    asksHorizon: "90 days" | "3–6 months" | "6–12 months" | null;
    /** Non-empty only when rated controls exist at Managed or Optimized. */
    strengths: string[];
    nextMilestone: {
      label: string | null;
      headline: string | null;
      pathForward: string | null;
    };
  };
  scope: {
    controlsRated: number;
    pillarsRated: number;
    methodologyNote: string;
  };
  pillarScorecard: Array<
    PillarMaturityRecord & {
      band: ReturnType<typeof weightPctToMaturityBand>;
      controlCount: number;
      /** Client-facing one-line interpretation of this pillar's posture. */
      insight: string;
    }
  >;
  controlFindings: Array<
    SurveyControlResponse & {
      weightPct: number;
      band: ReturnType<typeof weightPctToMaturityBand>;
    }
  >;
  /** Full maturity report for shared visualizations (roadmap, matrix). */
  maturityReport: MaturitySurveyReport;
};

export function buildGuidedWorkshopReport(input: {
  workshopTitle: string;
  organizationName: string;
  clientIndustry?: string | null;
  facilitatorName?: string | null;
  facilitatorRole?: string | null;
  clientContactName?: string | null;
  clientContactRole?: string | null;
  frameworkCodes: string[];
  catalog: SurveyPillarGroup[];
  generatedAt?: string;
  responses: Array<{
    controlId: string;
    pillarId: string;
    maturity: MaturityLevel;
    facilitatorNotes?: string | null;
  }>;
}): GuidedWorkshopReport {
  const libraryControlCount = countSurveyQuestions(input.catalog);
  const frameworkLabels = input.frameworkCodes.map(getFrameworkShortLabel);
  const org = input.organizationName.trim() || "the organization";

  const maturityReport = buildMaturitySurveyReport({
    surveyTitle: input.workshopTitle,
    organizationName: input.organizationName,
    respondentName: input.clientContactName ?? input.facilitatorName ?? null,
    respondentRole: input.clientContactRole ?? input.facilitatorRole ?? null,
    frameworkCodes: input.frameworkCodes,
    surveyMode: "deep_dive",
    catalog: input.catalog,
    libraryControlCount,
    focusPillarIds: [],
    focusPillarLabels: [],
    responses: input.responses.map((r) => ({
      controlId: r.controlId,
      pillarId: r.pillarId,
      maturity: r.maturity,
      notes: r.facilitatorNotes ?? null,
    })),
    documentResponses: [],
  });

  const controlFindings = maturityReport.controlResponses.map((control) => ({
    ...control,
    weightPct: maturityToWeightPct(control.maturity),
    band: weightPctToMaturityBand(maturityToWeightPct(control.maturity)),
  }));

  const pillarScorecard = maturityReport.pillarMaturity
    .filter((pillar) => pillar.reviewedControls > 0)
    .map((pillar) => {
      const band = weightPctToMaturityBand(pillar.alignmentPct);
      const controlCount =
        input.catalog.find((g) => g.pillarId === pillar.pillarId)?.controls.length ?? 0;
      return {
        ...pillar,
        band,
        controlCount,
        insight: buildPillarInsight(pillar),
      };
    });

  const strengths = buildFactualStrengths(pillarScorecard);
  const pillarsAssessed = pillarScorecard.length;
  const criticalGapCount = maturityReport.gaps.filter((g) => g.severity === "critical").length;
  const weakestPillar = [...pillarScorecard].sort((a, b) => a.alignmentPct - b.alignmentPct)[0];
  const leadershipPriorities = selectLeadershipPriorities(maturityReport.gaps);
  const leadershipAsks = selectLeadershipAsks(maturityReport.roadmap);
  const asksHorizon =
    leadershipAsks[0]?.phase === "immediate"
      ? "90 days"
      : leadershipAsks[0]?.phase === "short_term"
        ? "3–6 months"
        : leadershipAsks[0]?.phase === "medium_term"
          ? "6–12 months"
          : null;

  const weakestForBrief =
    weakestPillar && weakestPillar.gapCount > 0
      ? {
          pillarLabel: weakestPillar.pillarLabel,
          gapCount: weakestPillar.gapCount,
          maturityLabel: weakestPillar.maturityLabel,
        }
      : undefined;

  const verdictHeadline = buildFactualVerdictHeadline({
    overallMaturity: maturityReport.overallMaturity,
    criticalGapCount,
    gapCount: maturityReport.gaps.length,
    weakestPillar: weakestForBrief,
  });

  const implication = buildExecutiveImplication({
    org,
    overallMaturity: maturityReport.overallMaturity,
    weakestPillar: weakestForBrief,
    gapCount: maturityReport.gaps.length,
    immediateAskCount: maturityReport.roadmapByPhase.immediate.length,
  });

  const scopeNote = `This report covers ${maturityReport.answeredCount} control${maturityReport.answeredCount === 1 ? "" : "s"} rated in your workshop across ${pillarsAssessed} pillar${pillarsAssessed === 1 ? "" : "s"}. Unrated pillars and controls are excluded.`;

  const nextTarget = maturityReport.nextMaturityTarget;
  const nextTargetGuidance = nextTarget ? MATURITY_LEVEL_GUIDANCE[nextTarget] : null;

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workshopTitle: input.workshopTitle,
    organizationName: input.organizationName,
    clientIndustry: input.clientIndustry ?? null,
    facilitatorName: input.facilitatorName ?? null,
    facilitatorRole: input.facilitatorRole ?? null,
    clientContactName: input.clientContactName ?? null,
    clientContactRole: input.clientContactRole ?? null,
    frameworkCodes: input.frameworkCodes,
    frameworkLabels,
    overallScorePct: maturityReport.overallScorePct,
    overallMaturity: maturityReport.overallMaturity,
    overallMaturityLabel: maturityReport.overallMaturityLabel,
    overallBand: weightPctToMaturityBand(maturityReport.overallScorePct),
    answeredCount: maturityReport.answeredCount,
    totalQuestions: maturityReport.totalQuestions,
    completionPct: maturityReport.completionPct,
    weightMethodology: {
      title: "How your maturity was measured",
      summary: `Each control was rated against a six-level maturity scale during your workshop. Every rating maps to a transparent weight (0–100%) so results are defensible in board, audit, and regulatory discussions — reflecting your organization's consensus, not automated scoring.`,
      formula:
        "Pillar score = average weight of all rated controls in that pillar. Overall score = criticality-weighted average across pillars, reflecting each domain's importance to enterprise AI risk.",
      answerOptions: getWorkshopAnswerOptions(),
    },
    executiveSummary: {
      headline: `${org} — AI governance assessment`,
      narrative: buildWorkshopNarrative(
        org,
        maturityReport,
        frameworkLabels,
        weakestForBrief
      ),
      verdictHeadline,
      implication,
      leadershipPriorities,
      leadershipAsks,
      asksHorizon,
      strengths,
      nextMilestone: {
        label: maturityReport.nextMaturityTargetLabel,
        headline: nextTargetGuidance?.headline ?? null,
        pathForward: nextTargetGuidance?.goodLooksLike ?? null,
      },
    },
    pillarScorecard,
    controlFindings,
    maturityReport,
    scope: {
      controlsRated: maturityReport.answeredCount,
      pillarsRated: pillarsAssessed,
      methodologyNote: scopeNote,
    },
  };
}

export function averageMaturityScore(levels: MaturityLevel[]): number {
  if (levels.length === 0) return 0;
  return levels.reduce((sum, level) => sum + MATURITY_SCORE[level], 0) / levels.length;
}
