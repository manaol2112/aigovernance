import type { MaturityLevel } from "@prisma/client";
import type { PillarMaturityRecord } from "@/lib/control-review-reports";
import { getFrameworkShortLabel } from "@/lib/framework-library";
import {
  MATURITY_LABELS,
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
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";

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
    strengths: string[];
    priorityAreas: string[];
    clientTalkingPoints: string[];
  };
  pillarScorecard: Array<
    PillarMaturityRecord & {
      band: ReturnType<typeof weightPctToMaturityBand>;
      criticalQuestion: string;
      controlCount: number;
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

  const pillarScorecard = maturityReport.pillarMaturity.map((pillar) => {
    const criticalQuestion = getPillarCriticalQuestion(pillar.pillarId);
    const controlCount = input.catalog.find((g) => g.pillarId === pillar.pillarId)?.controls.length ?? 0;
    return {
      ...pillar,
      band: weightPctToMaturityBand(pillar.alignmentPct),
      criticalQuestion: criticalQuestion.prompt,
      controlCount,
    };
  });

  const strongPillars = pillarScorecard.filter((p) => p.band === "strong");
  const criticalPillars = pillarScorecard.filter((p) => p.band === "critical");

  const strengths =
    strongPillars.length > 0
      ? strongPillars.slice(0, 3).map((p) => `${p.pillarLabel} (${p.alignmentPct}% weighted score)`)
      : ["Workshop established a baseline across all eleven governance pillars."];

  const priorityAreas =
    criticalPillars.length > 0
      ? criticalPillars.slice(0, 4).map((p) => `${p.pillarLabel} — ${p.gapCount} control gap${p.gapCount === 1 ? "" : "s"}`)
      : pillarScorecard
          .filter((p) => p.band !== "strong")
          .slice(0, 4)
          .map((p) => `${p.pillarLabel} (${p.alignmentPct}% — room to advance toward managed practice)`);

  const clientTalkingPoints = [
    `Each control was rated on a six-level maturity scale mapped to a 0–100% weight. Your organization's overall weighted score is ${maturityReport.overallScorePct}%.`,
    `Scores reflect ${maturityReport.answeredCount} framework-mapped controls discussed during the facilitated session — not AI-generated estimates.`,
    strongPillars.length > 0
      ? `Leading areas: ${strongPillars.map((p) => p.pillarLabel).join(", ")}.`
      : "No pillar yet reaches the 'strong' band (67%+ weighted average) — investment in foundational controls will yield the highest return.",
    criticalPillars.length > 0
      ? `Immediate attention: ${criticalPillars.map((p) => p.pillarLabel).join(", ")}.`
      : "Focus next on elevating partial-maturity controls toward documented, managed practice.",
  ];

  return {
    generatedAt: new Date().toISOString(),
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
      title: "How we scored your workshop",
      summary: `${org} rated each in-scope control using a structured maturity scale. Every selection carries a defined weight so results are transparent and defensible in board or regulator discussions.`,
      formula:
        "Pillar score = average weight of all rated controls in that pillar. Overall score = criticality-weighted average across pillars (same weighting as the maturity assessment engine).",
      answerOptions: getWorkshopAnswerOptions(),
    },
    executiveSummary: {
      headline: `${org} — Guided workshop results (${maturityReport.overallScorePct}% overall)`,
      narrative: maturityReport.executiveSummary.narrative.replace(
        /You assessed/g,
        "During the facilitated workshop, your team assessed"
      ),
      strengths,
      priorityAreas,
      clientTalkingPoints,
    },
    pillarScorecard,
    controlFindings,
    maturityReport,
  };
}

export function averageMaturityScore(levels: MaturityLevel[]): number {
  if (levels.length === 0) return 0;
  return levels.reduce((sum, level) => sum + MATURITY_SCORE[level], 0) / levels.length;
}
