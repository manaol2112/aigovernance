import type { MaturityLevel } from "@prisma/client";
import type { PillarMaturityRecord, RoadmapStep } from "@/lib/control-review-reports";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { flattenSurveyControls } from "@/lib/maturity-survey-types";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
import { SURVEY_MODE_META } from "@/lib/maturity-survey-mode";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import {
  MATURITY_LABELS,
  MATURITY_LEVELS,
  MATURITY_SCORE,
} from "@/lib/maturity-survey-constants";

export { MATURITY_LABELS, MATURITY_LEVELS, MATURITY_SCORE, MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";

const CRITICALITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

function alignmentToMaturity(alignmentPct: number, answeredCount: number): MaturityLevel {
  if (answeredCount === 0) return "not_implemented";
  if (alignmentPct >= 91) return "optimized";
  if (alignmentPct >= 76) return "managed";
  if (alignmentPct >= 51) return "defined";
  if (alignmentPct >= 26) return "developing";
  return "initial";
}

function maturityToCompliance(maturity: MaturityLevel): "aligned" | "partial" | "gap" {
  if (maturity === "managed" || maturity === "optimized") return "aligned";
  if (maturity === "defined" || maturity === "developing") return "partial";
  return "gap";
}

function nextMaturityTarget(current: MaturityLevel): MaturityLevel | null {
  const idx = MATURITY_LEVELS.indexOf(current);
  if (idx < 0 || idx >= MATURITY_LEVELS.length - 1) return null;
  return MATURITY_LEVELS[idx + 1];
}

export type SurveyControlResponse = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  ownerRole: string;
  pillarId: string;
  pillarLabel: string;
  pillarCriticality: string;
  maturity: MaturityLevel;
  notes: string | null;
};

export type SurveyGapItem = {
  controlCode: string;
  controlTitle: string;
  pillarLabel: string;
  pillarId: string;
  maturity: MaturityLevel;
  maturityLabel: string;
  severity: "critical" | "high" | "medium";
  summary: string;
  frameworkCodes: string[];
};

export type AssessmentMatrixRow = {
  pillarId: string;
  pillarLabel: string;
  pillarCriticality: string;
  criticalQuestion: string;
  controlCode: string;
  controlTitle: string;
  maturity: MaturityLevel;
  maturityLabel: string;
  notes: string | null;
  frameworkCodes: string[];
};

export type SurveyScopeSummary = {
  mode: SurveyMode;
  modeLabel: string;
  pillarsAssessed: number;
  controlsAssessed: number;
  libraryControlCount: number;
  coveragePct: number;
  frameworksReferenced: string[];
  methodologyNote: string;
  suggestsDeepDive: boolean;
};

export type MaturitySurveyReport = {
  generatedAt: string;
  organizationName: string;
  surveyTitle: string;
  surveyMode: SurveyMode;
  surveyModeLabel: string;
  frameworkCodes: string[];
  scope: SurveyScopeSummary;
  overallMaturity: MaturityLevel;
  overallMaturityLabel: string;
  overallScorePct: number;
  nextMaturityTarget: MaturityLevel | null;
  nextMaturityTargetLabel: string | null;
  answeredCount: number;
  totalQuestions: number;
  completionPct: number;
  executiveSummary: {
    headline: string;
    narrative: string;
    strengths: string[];
    priorityGaps: string[];
    boardActions: string[];
  };
  pillarMaturity: PillarMaturityRecord[];
  assessmentMatrix: AssessmentMatrixRow[];
  controlResponses: SurveyControlResponse[];
  gaps: SurveyGapItem[];
  roadmap: RoadmapStep[];
  roadmapByPhase: Record<RoadmapStep["phase"], RoadmapStep[]>;
};

function buildRecommendation(
  controlTitle: string,
  description: string,
  maturity: MaturityLevel,
  ownerRole: string
): string {
  const action =
    maturity === "not_implemented" || maturity === "initial"
      ? "Establish"
      : maturity === "developing"
        ? "Formalize and scale"
        : "Strengthen measurement and assurance for";

  const detail = description.split(/[.!?]/).find((s) => s.trim().length > 20)?.trim();
  return `${action} ${controlTitle.toLowerCase()}${detail ? ` — ${detail}.` : "."} Assign accountability to ${ownerRole}.`;
}

function gapSeverity(
  maturity: MaturityLevel,
  pillarCriticality: string
): "critical" | "high" | "medium" {
  if (
    (maturity === "not_implemented" || maturity === "initial") &&
    pillarCriticality === "critical"
  ) {
    return "critical";
  }
  if (maturity === "not_implemented" || maturity === "initial") return "high";
  return "medium";
}

function roadmapPhase(maturity: MaturityLevel, pillarCriticality: string): RoadmapStep["phase"] {
  if (
    pillarCriticality === "critical" &&
    (maturity === "not_implemented" || maturity === "initial")
  ) {
    return "immediate";
  }
  if (maturity === "not_implemented" || maturity === "initial" || maturity === "developing") {
    return "short_term";
  }
  return "medium_term";
}

const PHASE_LABELS: Record<RoadmapStep["phase"], string> = {
  immediate: "0–90 days",
  short_term: "3–6 months",
  medium_term: "6–12 months",
};

function findPillarMeta(
  catalog: SurveyPillarGroup[],
  pillarId: string
): SurveyPillarGroup | undefined {
  return catalog.find((g) => g.pillarId === pillarId);
}

export function buildMaturitySurveyReport(input: {
  surveyTitle: string;
  organizationName: string | null;
  frameworkCodes: string[];
  surveyMode?: SurveyMode;
  catalog: SurveyPillarGroup[];
  libraryControlCount?: number;
  responses: Array<{
    controlId: string;
    pillarId: string;
    maturity: MaturityLevel;
    notes: string | null;
  }>;
}): MaturitySurveyReport {
  const mode = input.surveyMode ?? "quick";
  const modeLabel = SURVEY_MODE_META[mode].label;
  const controlById = new Map(flattenSurveyControls(input.catalog).map((c) => [c.id, c]));
  const inScopeIds = new Set(controlById.keys());

  const controlResponses: SurveyControlResponse[] = [];
  const assessmentMatrix: AssessmentMatrixRow[] = [];
  const gaps: SurveyGapItem[] = [];

  for (const response of input.responses) {
    if (!inScopeIds.has(response.controlId)) continue;

    const control = controlById.get(response.controlId)!;
    const pillar =
      findPillarMeta(input.catalog, response.pillarId) ??
      input.catalog.find((g) => g.controls.some((c) => c.id === response.controlId));

    if (!pillar) continue;

    const maturity = response.maturity;
    const criticalQ = getPillarCriticalQuestion(pillar.pillarId);

    controlResponses.push({
      controlId: control.id,
      controlCode: control.code,
      controlTitle: control.title,
      controlDescription: control.description,
      ownerRole: control.ownerRole,
      pillarId: pillar.pillarId,
      pillarLabel: pillar.pillarLabel,
      pillarCriticality: pillar.criticality,
      maturity,
      notes: response.notes,
    });

    assessmentMatrix.push({
      pillarId: pillar.pillarId,
      pillarLabel: pillar.pillarLabel,
      pillarCriticality: pillar.criticality,
      criticalQuestion: criticalQ.prompt,
      controlCode: control.code,
      controlTitle: control.title,
      maturity,
      maturityLabel: MATURITY_LABELS[maturity],
      notes: response.notes,
      frameworkCodes: control.frameworkCodes,
    });

    if (maturityToCompliance(maturity) !== "aligned") {
      gaps.push({
        controlCode: control.code,
        controlTitle: control.title,
        pillarLabel: pillar.pillarLabel,
        pillarId: pillar.pillarId,
        maturity,
        maturityLabel: MATURITY_LABELS[maturity],
        severity: gapSeverity(maturity, pillar.criticality),
        summary: buildRecommendation(
          control.title,
          control.description,
          maturity,
          control.ownerRole
        ),
        frameworkCodes: control.frameworkCodes,
      });
    }
  }

  assessmentMatrix.sort(
    (a, b) =>
      (CRITICALITY_ORDER[a.pillarCriticality] ?? 2) -
      (CRITICALITY_ORDER[b.pillarCriticality] ?? 2)
  );

  const pillarIds = [...new Set(controlResponses.map((c) => c.pillarId))];

  const pillarMaturity: PillarMaturityRecord[] = pillarIds
    .map((pillarId) => {
      const group = findPillarMeta(input.catalog, pillarId);
      if (!group) return null;

      const pillarControls = controlResponses.filter((c) => c.pillarId === pillarId);
      const alignedCount = pillarControls.filter(
        (c) => maturityToCompliance(c.maturity) === "aligned"
      ).length;
      const partialCount = pillarControls.filter(
        (c) => maturityToCompliance(c.maturity) === "partial"
      ).length;
      const gapCount = pillarControls.filter(
        (c) => maturityToCompliance(c.maturity) === "gap"
      ).length;
      const assessed = pillarControls.length;
      const avgScore =
        assessed > 0
          ? pillarControls.reduce((sum, c) => sum + MATURITY_SCORE[c.maturity], 0) / assessed
          : 0;
      const alignmentPct = Math.round((avgScore / 5) * 100);
      const maturityLevel = alignmentToMaturity(alignmentPct, assessed);

      return {
        pillarId: group.pillarId,
        pillarLabel: group.pillarLabel,
        pillarDescription: group.pillarDescription,
        criticality: group.criticality,
        totalControls: assessed,
        reviewedControls: assessed,
        alignedCount,
        partialCount,
        gapCount,
        reviewProgressPct: 100,
        alignmentPct,
        maturityLevel,
        maturityLabel: MATURITY_LABELS[maturityLevel],
      };
    })
    .filter((p): p is PillarMaturityRecord => p != null)
    .sort(
      (a, b) =>
        (CRITICALITY_ORDER[a.criticality] ?? 2) - (CRITICALITY_ORDER[b.criticality] ?? 2)
    );

  const totalQuestions = input.catalog.reduce((s, g) => s + g.controls.length, 0);
  const answeredCount = controlResponses.length;
  const completionPct =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const weightedSum = pillarMaturity.reduce((sum, p) => {
    const weight = p.criticality === "critical" ? 3 : p.criticality === "high" ? 2 : 1;
    return sum + p.alignmentPct * weight;
  }, 0);
  const weightTotal = pillarMaturity.reduce((sum, p) => {
    const weight = p.criticality === "critical" ? 3 : p.criticality === "high" ? 2 : 1;
    return sum + weight;
  }, 0);
  const overallScorePct = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  const overallMaturity = alignmentToMaturity(overallScorePct, answeredCount);
  const nextTarget = nextMaturityTarget(overallMaturity);

  const criticalGaps = gaps.filter((g) => g.severity === "critical").length;
  const strongPillars = pillarMaturity.filter(
    (p) => p.maturityLevel === "managed" || p.maturityLevel === "optimized"
  );
  const partialPillars = pillarMaturity.filter(
    (p) => p.maturityLevel === "defined" || p.maturityLevel === "developing"
  );

  type RoadmapSort = RoadmapStep & { criticalityRank: number; maturityRank: number };

  const roadmap: RoadmapStep[] = gaps
    .map((g): RoadmapSort => {
      const control = controlResponses.find((c) => c.controlCode === g.controlCode)!;
      const phase = roadmapPhase(g.maturity, control.pillarCriticality);
      return {
        priority: 0,
        phase,
        phaseLabel: PHASE_LABELS[phase],
        pillarLabel: g.pillarLabel,
        controlCode: g.controlCode,
        controlTitle: g.controlTitle,
        complianceStatus: maturityToCompliance(g.maturity),
        action: g.summary,
        ownerHint: control.ownerRole,
        criticalityRank: CRITICALITY_ORDER[control.pillarCriticality] ?? 2,
        maturityRank: MATURITY_SCORE[g.maturity],
      };
    })
    .sort((a, b) => {
      if (a.criticalityRank !== b.criticalityRank) return a.criticalityRank - b.criticalityRank;
      if (a.maturityRank !== b.maturityRank) return a.maturityRank - b.maturityRank;
      return a.phase.localeCompare(b.phase);
    })
    .map((step, i) => ({
      priority: i + 1,
      phase: step.phase,
      phaseLabel: step.phaseLabel,
      pillarLabel: step.pillarLabel,
      controlCode: step.controlCode,
      controlTitle: step.controlTitle,
      complianceStatus: step.complianceStatus,
      action: step.action,
      ownerHint: step.ownerHint,
    }));

  const roadmapByPhase: Record<RoadmapStep["phase"], RoadmapStep[]> = {
    immediate: roadmap.filter((s) => s.phase === "immediate"),
    short_term: roadmap.filter((s) => s.phase === "short_term"),
    medium_term: roadmap.filter((s) => s.phase === "medium_term"),
  };

  const frameworksReferenced = [
    ...new Set(assessmentMatrix.flatMap((r) => r.frameworkCodes)),
  ].sort();

  const methodologyNote =
    mode === "quick"
      ? `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} representative control${answeredCount === 1 ? "" : "s"} across ${pillarMaturity.length} risk pillar${pillarMaturity.length === 1 ? "" : "s"}. Scores and gaps reflect only what was assessed — not the full canonical control library.`
      : `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} in-scope control${answeredCount === 1 ? "" : "s"} across ${pillarMaturity.length} pillar${pillarMaturity.length === 1 ? "" : "s"}. Results are limited to assessed areas.`;

  const org = input.organizationName ?? "Your organization";
  const libraryControlCount = Math.max(
    input.libraryControlCount ?? answeredCount,
    answeredCount
  );
  const coveragePct =
    libraryControlCount > 0 ? Math.round((answeredCount / libraryControlCount) * 100) : 100;

  return {
    generatedAt: new Date().toISOString(),
    organizationName: org,
    surveyTitle: input.surveyTitle,
    surveyMode: mode,
    surveyModeLabel: modeLabel,
    frameworkCodes: input.frameworkCodes,
    scope: {
      mode,
      modeLabel,
      pillarsAssessed: pillarMaturity.length,
      controlsAssessed: answeredCount,
      libraryControlCount,
      coveragePct,
      frameworksReferenced,
      methodologyNote,
      suggestsDeepDive: mode === "quick",
    },
    overallMaturity,
    overallMaturityLabel: MATURITY_LABELS[overallMaturity],
    overallScorePct,
    nextMaturityTarget: nextTarget,
    nextMaturityTargetLabel: nextTarget ? MATURITY_LABELS[nextTarget] : null,
    answeredCount,
    totalQuestions,
    completionPct,
    executiveSummary: {
      headline: `${org} — ${MATURITY_LABELS[overallMaturity]} AI governance maturity`,
      narrative: `${methodologyNote} Overall weighted maturity is ${MATURITY_LABELS[overallMaturity].toLowerCase()} (${overallScorePct}%) across assessed pillars mapped to ${frameworksReferenced.length || input.frameworkCodes.length} framework${(frameworksReferenced.length || input.frameworkCodes.length) === 1 ? "" : "s"}. ${
        criticalGaps > 0
          ? `${criticalGaps} critical gap${criticalGaps === 1 ? "" : "s"} within the assessed scope need executive attention.`
          : gaps.length > 0
            ? `${gaps.length} improvement area${gaps.length === 1 ? "" : "s"} were identified within assessed controls.`
            : "No material gaps were identified within the assessed scope."
      } ${
        strongPillars.length > 0
          ? `Leading pillars: ${strongPillars.map((p) => p.pillarLabel).slice(0, 3).join(", ")}.`
          : partialPillars.length > 0
            ? `Foundational progress in ${partialPillars.map((p) => p.pillarLabel).slice(0, 3).join(", ")} — focus on elevating to managed maturity.`
            : ""
      }${mode === "quick" ? " Run a deep-dive assessment for control-level coverage across the full library." : ""}`,
      strengths: strongPillars.map(
        (p) => `${p.pillarLabel}: ${p.maturityLabel} (${p.alignmentPct}% maturity score)`
      ),
      priorityGaps: gaps
        .filter((g) => g.severity === "critical" || g.severity === "high")
        .slice(0, 6)
        .map((g) => `${g.pillarLabel} — ${g.controlTitle} (${g.maturityLabel})`),
      boardActions: [
        criticalGaps > 0
          ? "Commission a 90-day remediation sprint for critical assessed gaps with named executive owners."
          : gaps.length > 0
            ? "Prioritize the assessed improvement areas below with pillar owners and measurable 90-day targets."
            : "Sustain current governance cadence and advance partial pillars toward managed maturity.",
        mode === "quick"
          ? "Schedule a deep-dive maturity assessment to validate findings across the full control library."
          : "Align remediation roadmap with enterprise risk appetite and regulatory obligations (EU AI Act, ISO 42001).",
        "Establish quarterly maturity re-assessment using the canonical control library.",
      ],
    },
    pillarMaturity,
    assessmentMatrix,
    controlResponses,
    gaps,
    roadmap,
    roadmapByPhase,
  };
}
