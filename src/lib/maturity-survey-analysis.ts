import type { MaturityLevel, MaturityDocumentStatus } from "@prisma/client";
import type { PillarMaturityRecord, RoadmapStep } from "@/lib/control-review-reports";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { flattenSurveyControls } from "@/lib/maturity-survey-types";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
import { getFrameworkShortLabel } from "@/lib/framework-library";
import { SURVEY_MODE_META } from "@/lib/maturity-survey-mode";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import {
  buildPillarDocumentationExpectations,
  type PillarDocumentationExpectation,
} from "@/lib/maturity-pillar-documentation";
import {
  MATURITY_LABELS,
  MATURITY_LEVELS,
  MATURITY_SCORE,
} from "@/lib/maturity-survey-constants";
import { summarizeDocumentResponses } from "@/lib/maturity-survey-documents";

export type FindingEngagementGuide = {
  headline: string;
  intro: string;
  actions: Array<{ title: string; description: string }>;
};

export { MATURITY_LABELS, MATURITY_LEVELS, MATURITY_SCORE, MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";

const CRITICALITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

/** Map average control score (0–5) to a maturity level — stays in sync with alignment %. */
function averageScoreToMaturity(avgScore: number, answeredCount: number): MaturityLevel {
  if (answeredCount === 0) return "not_implemented";
  if (avgScore < 0.5) return "not_implemented";
  if (avgScore < 1.5) return "initial";
  if (avgScore < 2.5) return "developing";
  if (avgScore < 3.5) return "defined";
  if (avgScore < 4.5) return "managed";
  return "optimized";
}

function alignmentToMaturity(alignmentPct: number, answeredCount: number): MaturityLevel {
  if (answeredCount === 0) return "not_implemented";
  return averageScoreToMaturity((alignmentPct / 100) * 5, answeredCount);
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
  frameworkCodes: string[];
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
  parentQuickScanId?: string;
  carriedFromQuickScanCount?: number;
  focusPillarIds?: string[];
  focusPillarLabels?: string[];
  pillarLibraryControlCount?: number;
};

export type PillarQuickScanBaseline = {
  controlCode: string;
  controlTitle: string;
  maturity: MaturityLevel;
  maturityLabel: string;
};

export type PillarDeepDiveSummary = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  criticalQuestion: string;
  criticalQuestionSubtitle: string;
  controlsAssessed: number;
  totalControlsInPillar: number;
  pillarCoveragePct: number;
  alignedCount: number;
  partialCount: number;
  gapCount: number;
  maturityLevel: MaturityLevel;
  maturityLabel: string;
  alignmentPct: number;
  nextMaturityTarget: MaturityLevel | null;
  nextMaturityTargetLabel: string | null;
  quickScanBaseline?: PillarQuickScanBaseline & {
    deepDiveMaturity: MaturityLevel;
    deepDiveMaturityLabel: string;
    unchanged: boolean;
  };
  pathForward: {
    headline: string;
    narrative: string;
    leadershipAction: string;
  };
  documentationExpectations: PillarDocumentationExpectation[];
  evidenceSummary?: {
    documented: number;
    draft: number;
    notEstablished: number;
    notApplicable: number;
    missingDocumentation: number;
  };
  controlFindings: Array<{
    controlCode: string;
    controlTitle: string;
    controlDescription: string;
    maturity: MaturityLevel;
    maturityLabel: string;
    compliance: "aligned" | "partial" | "gap";
    ownerRole: string;
    recommendation: string | null;
    frameworkCodes: string[];
    engagementGuide: FindingEngagementGuide | null;
  }>;
};

export type MaturitySurveyReport = {
  generatedAt: string;
  organizationName: string;
  respondentName: string | null;
  respondentRole: string | null;
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
    criticalGapCount: number;
    criticalGapPillarLabels: string[];
    leadingPillarLabels: string[];
    assessmentFrameworkLabels: string[];
    improvementAreaCount: number;
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
  pillarDeepDive?: PillarDeepDiveSummary;
};

export function isPillarFocusedDeepDive(report: MaturitySurveyReport): boolean {
  return report.surveyMode === "deep_dive" && (report.scope.focusPillarIds?.length ?? 0) === 1;
}

function buildPillarDeepDiveSummary(input: {
  pillar: PillarMaturityRecord;
  criticalQuestion: ReturnType<typeof getPillarCriticalQuestion>;
  controlResponses: SurveyControlResponse[];
  gaps: SurveyGapItem[];
  totalControlsInPillar: number;
  quickScanBaseline?: PillarQuickScanBaseline;
  documentResponses?: Array<{
    documentId: string;
    pillarId: string;
    status: MaturityDocumentStatus;
  }>;
}): PillarDeepDiveSummary {
  const { pillar, criticalQuestion, controlResponses, gaps, totalControlsInPillar } = input;
  const nextTarget = nextMaturityTarget(pillar.maturityLevel);
  const pillarCoveragePct =
    totalControlsInPillar > 0
      ? Math.round((pillar.reviewedControls / totalControlsInPillar) * 100)
      : 100;

  const sortedControls = [...controlResponses].sort(
    (a, b) => MATURITY_SCORE[a.maturity] - MATURITY_SCORE[b.maturity]
  );

  const controlFindings = sortedControls.map((control) => {
    const compliance = maturityToCompliance(control.maturity);
    const gap = gaps.find((item) => item.controlCode === control.controlCode);
    return {
      controlCode: control.controlCode,
      controlTitle: control.controlTitle,
      controlDescription: control.controlDescription,
      maturity: control.maturity,
      maturityLabel: MATURITY_LABELS[control.maturity],
      compliance,
      ownerRole: control.ownerRole,
      recommendation: gap?.summary ?? null,
      frameworkCodes: control.frameworkCodes,
      engagementGuide: null,
    };
  });

  const pillarDocumentResponses =
    input.documentResponses?.filter((response) => response.pillarId === pillar.pillarId) ?? [];
  const evidenceSummary = summarizeDocumentResponses(pillarDocumentResponses);

  const topGapTitles = gaps
    .sort(
      (a, b) =>
        (a.severity === "critical" ? 0 : a.severity === "high" ? 1 : 2) -
        (b.severity === "critical" ? 0 : b.severity === "high" ? 1 : 2)
    )
    .slice(0, 3)
    .map((gap) => `${gap.controlTitle} (${gap.maturityLabel})`);

  let quickScanBaseline: PillarDeepDiveSummary["quickScanBaseline"];
  if (input.quickScanBaseline) {
    const flagship = controlResponses.find(
      (control) => control.controlCode === input.quickScanBaseline!.controlCode
    );
    if (flagship) {
      quickScanBaseline = {
        ...input.quickScanBaseline,
        deepDiveMaturity: flagship.maturity,
        deepDiveMaturityLabel: MATURITY_LABELS[flagship.maturity],
        unchanged: flagship.maturity === input.quickScanBaseline.maturity,
      };
    }
  }

  const headline = `${pillar.pillarLabel}: ${pillar.maturityLabel} at control level`;

  const narrative =
    pillar.gapCount > 0
      ? `You assessed ${pillar.reviewedControls} of ${totalControlsInPillar} in-scope controls in ${pillar.pillarLabel}. ${pillar.gapCount} control${pillar.gapCount === 1 ? "" : "s"} sit at initial or not-implemented maturity, ${pillar.partialCount} at developing or defined, and ${pillar.alignedCount} at managed or optimized. Every finding reflects a control you rated directly — scores are rule-based, not AI-generated.`
      : pillar.partialCount > 0
        ? `You assessed ${pillar.reviewedControls} of ${totalControlsInPillar} controls in ${pillar.pillarLabel}. No critical maturity gaps were found; ${pillar.partialCount} control${pillar.partialCount === 1 ? "" : "s"} remain at partial maturity and should be elevated toward managed practice.`
        : `All ${pillar.reviewedControls} assessed controls in ${pillar.pillarLabel} are at managed or optimized maturity. Focus on sustaining assurance and periodic re-validation.`;

  const leadershipAction =
    pillar.gapCount > 0
      ? `Assign a named owner for ${pillar.pillarLabel} to address ${Math.min(pillar.gapCount, 3)} priority control gap${Math.min(pillar.gapCount, 3) === 1 ? "" : "s"} within 90 days, starting with ${topGapTitles[0] ?? "the highest-priority control in the roadmap below"}.`
      : `Confirm operating metrics for ${pillar.pillarLabel} and use this pillar as a reference for strengthening others.`;

  const documentationExpectations = buildPillarDocumentationExpectations(pillar.pillarId, {
    gapCount: pillar.gapCount,
    partialCount: pillar.partialCount,
    maturityLevel: pillar.maturityLevel,
    missingDocumentationCount: evidenceSummary.missingDocumentation,
    documentResponses: new Map(
      pillarDocumentResponses.map((response) => [response.documentId, response.status])
    ),
  });

  return {
    pillarId: pillar.pillarId,
    pillarLabel: pillar.pillarLabel,
    pillarDescription: pillar.pillarDescription,
    criticality: pillar.criticality,
    criticalQuestion: criticalQuestion.prompt,
    criticalQuestionSubtitle: criticalQuestion.subtitle,
    controlsAssessed: pillar.reviewedControls,
    totalControlsInPillar,
    pillarCoveragePct,
    alignedCount: pillar.alignedCount,
    partialCount: pillar.partialCount,
    gapCount: pillar.gapCount,
    maturityLevel: pillar.maturityLevel,
    maturityLabel: pillar.maturityLabel,
    alignmentPct: pillar.alignmentPct,
    nextMaturityTarget: nextTarget,
    nextMaturityTargetLabel: nextTarget ? MATURITY_LABELS[nextTarget] : null,
    quickScanBaseline,
    pathForward: {
      headline,
      narrative,
      leadershipAction,
    },
    documentationExpectations,
    evidenceSummary,
    controlFindings,
  };
}

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

type SurveyResponseInput = {
  controlId: string;
  pillarId: string;
  maturity: MaturityLevel;
  notes: string | null;
};

function buildCatalogControlIndex(catalog: SurveyPillarGroup[]) {
  const controlById = new Map<
    string,
    ReturnType<typeof flattenSurveyControls>[number]
  >();
  const canonicalPillarByControlId = new Map<string, string>();

  for (const group of catalog) {
    for (const control of group.controls) {
      controlById.set(control.id, control);
      if (!canonicalPillarByControlId.has(control.id)) {
        canonicalPillarByControlId.set(control.id, group.pillarId);
      }
    }
  }

  return { controlById, canonicalPillarByControlId };
}

/** One rating per control — legacy rows may share a control across pillars. */
function dedupeSurveyResponses(
  responses: SurveyResponseInput[],
  canonicalPillarByControlId: Map<string, string>
): SurveyResponseInput[] {
  const byControlId = new Map<string, SurveyResponseInput>();

  for (const response of responses) {
    const existing = byControlId.get(response.controlId);
    if (!existing) {
      byControlId.set(response.controlId, response);
      continue;
    }

    const canonicalPillarId = canonicalPillarByControlId.get(response.controlId);
    const existingMatchesCatalog = existing.pillarId === canonicalPillarId;
    const incomingMatchesCatalog = response.pillarId === canonicalPillarId;

    if (incomingMatchesCatalog && !existingMatchesCatalog) {
      byControlId.set(response.controlId, response);
      continue;
    }
    if (existingMatchesCatalog && !incomingMatchesCatalog) continue;

    if (MATURITY_SCORE[response.maturity] < MATURITY_SCORE[existing.maturity]) {
      byControlId.set(response.controlId, response);
    }
  }

  return [...byControlId.values()].map((response) => ({
    ...response,
    pillarId: canonicalPillarByControlId.get(response.controlId) ?? response.pillarId,
  }));
}

const GAP_SEVERITY_ORDER: Record<SurveyGapItem["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

function sortGapsByPriority(gaps: SurveyGapItem[]): SurveyGapItem[] {
  return [...gaps].sort((a, b) => {
    if (GAP_SEVERITY_ORDER[a.severity] !== GAP_SEVERITY_ORDER[b.severity]) {
      return GAP_SEVERITY_ORDER[a.severity] - GAP_SEVERITY_ORDER[b.severity];
    }
    if (MATURITY_SCORE[a.maturity] !== MATURITY_SCORE[b.maturity]) {
      return MATURITY_SCORE[a.maturity] - MATURITY_SCORE[b.maturity];
    }
    return a.controlCode.localeCompare(b.controlCode);
  });
}

function dedupeGapsByControlCode(gaps: SurveyGapItem[]): SurveyGapItem[] {
  const byControlCode = new Map<string, SurveyGapItem>();

  for (const gap of gaps) {
    const existing = byControlCode.get(gap.controlCode);
    if (!existing) {
      byControlCode.set(gap.controlCode, gap);
      continue;
    }

    if (GAP_SEVERITY_ORDER[gap.severity] < GAP_SEVERITY_ORDER[existing.severity]) {
      byControlCode.set(gap.controlCode, gap);
      continue;
    }

    if (
      gap.severity === existing.severity &&
      MATURITY_SCORE[gap.maturity] < MATURITY_SCORE[existing.maturity]
    ) {
      byControlCode.set(gap.controlCode, gap);
    }
  }

  return [...byControlCode.values()];
}

export function buildMaturitySurveyReport(input: {
  surveyTitle: string;
  organizationName: string | null;
  respondentName?: string | null;
  respondentRole?: string | null;
  frameworkCodes: string[];
  surveyMode?: SurveyMode;
  catalog: SurveyPillarGroup[];
  libraryControlCount?: number;
  focusPillarIds?: string[];
  focusPillarLabels?: string[];
  parentQuickScan?: { surveyId: string; carriedControlCount: number };
  quickScanPillarBaseline?: PillarQuickScanBaseline;
  pillarLibraryControlCount?: number;
  responses: Array<{
    controlId: string;
    pillarId: string;
    maturity: MaturityLevel;
    notes: string | null;
  }>;
  documentResponses?: Array<{
    documentId: string;
    pillarId: string;
    status: MaturityDocumentStatus;
  }>;
}): MaturitySurveyReport {
  const mode = input.surveyMode ?? "quick";
  const modeLabel = SURVEY_MODE_META[mode].label;
  const { controlById, canonicalPillarByControlId } = buildCatalogControlIndex(
    input.catalog
  );
  const inScopeIds = new Set(controlById.keys());
  const dedupedResponses = dedupeSurveyResponses(
    input.responses,
    canonicalPillarByControlId
  );

  const catalogControlsByPillar = new Map(
    input.catalog.map((group) => [group.pillarId, group.controls.length])
  );

  const controlResponses: SurveyControlResponse[] = [];
  const assessmentMatrix: AssessmentMatrixRow[] = [];

  for (const response of dedupedResponses) {
    if (!inScopeIds.has(response.controlId)) continue;

    const control = controlById.get(response.controlId)!;
    const catalogPillarId =
      mode === "quick"
        ? response.pillarId
        : (canonicalPillarByControlId.get(response.controlId) ?? response.pillarId);
    const pillar = findPillarMeta(input.catalog, catalogPillarId);

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
      frameworkCodes: control.frameworkCodes,
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

  }

  assessmentMatrix.sort(
    (a, b) =>
      (CRITICALITY_ORDER[a.pillarCriticality] ?? 2) -
      (CRITICALITY_ORDER[b.pillarCriticality] ?? 2)
  );

  const uniqueGaps = sortGapsByPriority(
    dedupeGapsByControlCode(
      controlResponses
        .filter((control) => maturityToCompliance(control.maturity) !== "aligned")
        .map((control) => ({
          controlCode: control.controlCode,
          controlTitle: control.controlTitle,
          pillarLabel: control.pillarLabel,
          pillarId: control.pillarId,
          maturity: control.maturity,
          maturityLabel: MATURITY_LABELS[control.maturity],
          severity: gapSeverity(control.maturity, control.pillarCriticality),
          summary: buildRecommendation(
            control.controlTitle,
            control.controlDescription,
            control.maturity,
            control.ownerRole
          ),
          frameworkCodes: control.frameworkCodes,
        }))
    )
  );

  const pillarIds =
    mode === "quick"
      ? input.catalog.map((group) => group.pillarId)
      : [...new Set(controlResponses.map((c) => c.pillarId))];

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
      const libraryTotal = catalogControlsByPillar.get(pillarId) ?? assessed;
      const avgScore =
        assessed > 0
          ? pillarControls.reduce((sum, c) => sum + MATURITY_SCORE[c.maturity], 0) / assessed
          : 0;
      const alignmentPct = Math.round((avgScore / 5) * 100);
      const maturityLevel = averageScoreToMaturity(avgScore, assessed);
      const reviewProgressPct =
        libraryTotal > 0 ? Math.round((assessed / libraryTotal) * 100) : 100;

      return {
        pillarId: group.pillarId,
        pillarLabel: group.pillarLabel,
        pillarDescription: group.pillarDescription,
        criticality: group.criticality,
        totalControls: libraryTotal,
        reviewedControls: assessed,
        alignedCount,
        partialCount,
        gapCount,
        reviewProgressPct,
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

  const criticalGaps = uniqueGaps.filter((g) => g.severity === "critical").length;
  const strongPillars = pillarMaturity.filter(
    (p) => p.maturityLevel === "managed" || p.maturityLevel === "optimized"
  );
  const partialPillars = pillarMaturity.filter(
    (p) => p.maturityLevel === "defined" || p.maturityLevel === "developing"
  );

  type RoadmapSort = RoadmapStep & { criticalityRank: number; maturityRank: number };

  const controlByCode = new Map(
    controlResponses.map((control) => [control.controlCode, control])
  );

  const roadmap: RoadmapStep[] = uniqueGaps
    .map((g): RoadmapSort | null => {
      const control = controlByCode.get(g.controlCode);
      if (!control) return null;
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
    .filter((step): step is RoadmapSort => step != null)
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
    immediate: roadmap
      .filter((s) => s.phase === "immediate")
      .map((step, index) => ({ ...step, priority: index + 1 })),
    short_term: roadmap
      .filter((s) => s.phase === "short_term")
      .map((step, index) => ({ ...step, priority: index + 1 })),
    medium_term: roadmap
      .filter((s) => s.phase === "medium_term")
      .map((step, index) => ({ ...step, priority: index + 1 })),
  };

  const frameworksReferenced = [
    ...new Set(assessmentMatrix.flatMap((r) => r.frameworkCodes)),
  ].sort();

  const pillarLabelOrder = new Map(
    pillarMaturity.map((pillar, index) => [pillar.pillarLabel, index])
  );
  const criticalGapPillarLabels = [
    ...new Set(
      uniqueGaps
        .filter((gap) => gap.severity === "critical")
        .map((gap) => gap.pillarLabel)
    ),
  ].sort(
    (a, b) => (pillarLabelOrder.get(a) ?? 999) - (pillarLabelOrder.get(b) ?? 999)
  );
  const leadingPillarLabels = strongPillars.map((pillar) => pillar.pillarLabel).slice(0, 3);
  const assessmentFrameworkLabels = input.frameworkCodes.map(getFrameworkShortLabel);
  const improvementAreaCount = uniqueGaps.length;

  const methodologyNote =
    mode === "quick"
      ? `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} representative control${answeredCount === 1 ? "" : "s"} across ${pillarMaturity.length} risk pillar${pillarMaturity.length === 1 ? "" : "s"}. Scores are computed directly from your maturity selections — rule-based scoring, not AI-generated findings.`
      : input.parentQuickScan
        ? input.focusPillarIds?.length === 1 && input.focusPillarLabels?.[0]
          ? `This detailed assessment for ${input.focusPillarLabels[0]} covered ${answeredCount} of ${input.pillarLibraryControlCount ?? answeredCount} in-scope controls. ${input.parentQuickScan.carriedControlCount} baseline rating${input.parentQuickScan.carriedControlCount === 1 ? "" : "s"} carried forward. Scores derive from your maturity selections — rule-based, not AI-generated.`
          : `This assessment continues your completed baseline scan. ${input.parentQuickScan.carriedControlCount} control rating${input.parentQuickScan.carriedControlCount === 1 ? "" : "s"} were carried forward; ${Math.max(0, answeredCount - input.parentQuickScan.carriedControlCount)} additional in-scope control${Math.max(0, answeredCount - input.parentQuickScan.carriedControlCount) === 1 ? "" : "s"} were assessed here. All scores derive from your maturity selections — rule-based, not AI-generated.`
        : input.focusPillarLabels && input.focusPillarLabels.length > 0
          ? `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} in-scope control${answeredCount === 1 ? "" : "s"} across ${input.focusPillarLabels.join(", ")}. Scores are computed directly from your maturity selections — rule-based, not AI-generated.`
          : `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} in-scope control${answeredCount === 1 ? "" : "s"} across ${pillarMaturity.length} pillar${pillarMaturity.length === 1 ? "" : "s"}. Scores are computed directly from your maturity selections — rule-based, not AI-generated.`;

  const org = input.organizationName ?? "Your organization";
  const libraryControlCount = Math.max(
    input.libraryControlCount ?? answeredCount,
    answeredCount
  );
  const coveragePct =
    libraryControlCount > 0 ? Math.round((answeredCount / libraryControlCount) * 100) : 100;

  const isPillarFocus =
    mode === "deep_dive" && (input.focusPillarIds?.length ?? 0) === 1;
  const focusPillarId = input.focusPillarIds?.[0];
  const pillarRecord =
    isPillarFocus && focusPillarId
      ? pillarMaturity.find((pillar) => pillar.pillarId === focusPillarId) ?? null
      : null;
  const totalControlsInPillar = input.pillarLibraryControlCount ?? pillarRecord?.reviewedControls ?? answeredCount;

  const pillarDeepDive =
    pillarRecord && isPillarFocus
      ? buildPillarDeepDiveSummary({
          pillar: pillarRecord,
          criticalQuestion: getPillarCriticalQuestion(pillarRecord.pillarId),
          controlResponses,
          gaps: uniqueGaps,
          totalControlsInPillar,
          quickScanBaseline: input.quickScanPillarBaseline,
          documentResponses: input.documentResponses,
        })
      : undefined;

  const executiveHeadline = pillarDeepDive
    ? pillarDeepDive.pathForward.headline
    : `${org} — ${MATURITY_LABELS[overallMaturity]} AI governance maturity`;

  const executiveNarrative = pillarDeepDive
    ? `${pillarDeepDive.pathForward.narrative}${pillarDeepDive.quickScanBaseline ? (pillarDeepDive.quickScanBaseline.unchanged ? ` Your baseline rating for the flagship control (${pillarDeepDive.quickScanBaseline.controlCode}) remained ${pillarDeepDive.quickScanBaseline.maturityLabel} after assessing additional controls.` : ` The flagship control (${pillarDeepDive.quickScanBaseline.controlCode}) moved from ${pillarDeepDive.quickScanBaseline.maturityLabel} at baseline scan to ${pillarDeepDive.quickScanBaseline.deepDiveMaturityLabel} in context of the full pillar assessment.`) : ""}`
    : `${org} achieved ${MATURITY_LABELS[overallMaturity].toLowerCase()} AI governance maturity across ${pillarMaturity.length} assessed pillar${pillarMaturity.length === 1 ? "" : "s"}, assessed against ${assessmentFrameworkLabels.join(", ")}. ${
        criticalGaps > 0
          ? `${criticalGaps} critical gap${criticalGaps === 1 ? "" : "s"} within the assessed scope need executive attention.${
              criticalGapPillarLabels.length > 0
                ? ` Critical gap pillars: ${criticalGapPillarLabels.join(", ")}.`
                : ""
            }`
          : uniqueGaps.length > 0
            ? `${uniqueGaps.length} improvement area${uniqueGaps.length === 1 ? "" : "s"} were identified within assessed controls.`
            : "No material gaps were identified within the assessed scope."
      } ${
        leadingPillarLabels.length > 0
          ? `Leading pillars: ${leadingPillarLabels.join(", ")}.`
          : partialPillars.length > 0
            ? `Foundational progress in ${partialPillars.map((p) => p.pillarLabel).slice(0, 3).join(", ")} — focus on elevating to managed maturity.`
            : ""
      }${mode === "quick" ? " Continue with a detailed pillar assessment to evaluate the remaining in-scope controls." : input.parentQuickScan ? " Compare with your baseline scan to see how pillar coverage expanded." : ""}`;

  const boardActions = pillarDeepDive
    ? [
        pillarDeepDive.pathForward.leadershipAction,
        uniqueGaps.length > 0
          ? `Sequence remediation using the phased roadmap below — ${roadmapByPhase.immediate.length} immediate, ${roadmapByPhase.short_term.length} near-term, and ${roadmapByPhase.medium_term.length} strategic action${roadmapByPhase.medium_term.length === 1 ? "" : "s"}.`
          : "Publish this pillar as a reference implementation and replicate operating patterns in weaker pillars.",
        input.parentQuickScan
          ? "Return to your baseline results to assess the next priority pillar, or schedule a full client assessment for evidence-backed validation."
          : "Establish quarterly re-assessment for this pillar to track progress over time.",
      ]
    : [
        criticalGaps > 0
          ? "Commission a 90-day remediation sprint for critical assessed gaps with named executive owners."
          : uniqueGaps.length > 0
            ? "Prioritize the assessed improvement areas below with pillar owners and measurable 90-day targets."
            : "Sustain current governance cadence and advance partial pillars toward managed maturity.",
        mode === "quick"
          ? "Schedule a detailed pillar assessment to validate findings across the full control set."
          : "Align remediation roadmap with enterprise risk appetite and regulatory obligations (EU AI Act, ISO 42001).",
        "Establish quarterly maturity re-assessment to track progress and sustain gains.",
      ];

  return {
    generatedAt: new Date().toISOString(),
    organizationName: org,
    respondentName: input.respondentName?.trim() || null,
    respondentRole: input.respondentRole?.trim() || null,
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
      parentQuickScanId: input.parentQuickScan?.surveyId,
      carriedFromQuickScanCount: input.parentQuickScan?.carriedControlCount,
      focusPillarIds: input.focusPillarIds,
      focusPillarLabels: input.focusPillarLabels,
      pillarLibraryControlCount: isPillarFocus ? totalControlsInPillar : undefined,
    },
    overallMaturity,
    overallMaturityLabel: MATURITY_LABELS[overallMaturity],
    overallScorePct,
    nextMaturityTarget: pillarDeepDive?.nextMaturityTarget ?? nextTarget,
    nextMaturityTargetLabel: pillarDeepDive?.nextMaturityTargetLabel ?? (nextTarget ? MATURITY_LABELS[nextTarget] : null),
    answeredCount,
    totalQuestions,
    completionPct,
    executiveSummary: {
      headline: executiveHeadline,
      narrative: executiveNarrative,
      criticalGapCount: criticalGaps,
      criticalGapPillarLabels,
      leadingPillarLabels,
      assessmentFrameworkLabels,
      improvementAreaCount,
      strengths: pillarDeepDive
        ? pillarRecord!.alignedCount > 0
          ? [
              `${pillarRecord!.alignedCount} control${pillarRecord!.alignedCount === 1 ? "" : "s"} at managed or optimized maturity in ${pillarRecord!.pillarLabel}.`,
            ]
          : []
        : strongPillars.map((p) => `${p.pillarLabel}: ${p.maturityLabel}`),
      priorityGaps: uniqueGaps
        .filter((gap) => gap.severity === "critical" || gap.severity === "high")
        .slice(0, 6)
        .map((gap) => `${gap.controlTitle} (${gap.maturityLabel})`),
      boardActions,
    },
    pillarMaturity,
    assessmentMatrix,
    controlResponses,
    gaps: uniqueGaps,
    roadmap,
    roadmapByPhase,
    pillarDeepDive,
  };
}
