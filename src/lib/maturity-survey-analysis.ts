import type { MaturityLevel, MaturityDocumentStatus } from "@prisma/client";
import type { PillarMaturityRecord, RoadmapStep } from "@/lib/control-review-reports";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { flattenSurveyControls } from "@/lib/maturity-survey-types";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
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
    maturity: MaturityLevel;
    maturityLabel: string;
    compliance: "aligned" | "partial" | "gap";
    ownerRole: string;
    recommendation: string | null;
  }>;
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
      maturity: control.maturity,
      maturityLabel: MATURITY_LABELS[control.maturity],
      compliance,
      ownerRole: control.ownerRole,
      recommendation: gap?.summary ?? null,
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
      ? `You assessed ${pillar.reviewedControls} of ${totalControlsInPillar} in-scope controls in ${pillar.pillarLabel}. ${pillar.gapCount} control${pillar.gapCount === 1 ? "" : "s"} sit at initial or not-implemented maturity, ${pillar.partialCount} at developing or defined, and ${pillar.alignedCount} at managed or optimized. Every finding maps to a canonical control you rated — no AI-generated content.`
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

export function buildMaturitySurveyReport(input: {
  surveyTitle: string;
  organizationName: string | null;
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
      ? `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} representative control${answeredCount === 1 ? "" : "s"} across ${pillarMaturity.length} risk pillar${pillarMaturity.length === 1 ? "" : "s"}. Scores are computed deterministically from your maturity selections against the canonical control library — no AI-generated findings.`
      : input.parentQuickScan
        ? input.focusPillarIds?.length === 1 && input.focusPillarLabels?.[0]
          ? `This pillar deep dive for ${input.focusPillarLabels[0]} assessed ${answeredCount} of ${input.pillarLibraryControlCount ?? answeredCount} in-scope canonical controls. ${input.parentQuickScan.carriedControlCount} quick scan rating${input.parentQuickScan.carriedControlCount === 1 ? "" : "s"} carried forward. Scores derive from your maturity selections against seeded controls — no AI-generated findings.`
          : `This deep dive continues your completed quick scan. ${input.parentQuickScan.carriedControlCount} control rating${input.parentQuickScan.carriedControlCount === 1 ? "" : "s"} were carried forward; ${Math.max(0, answeredCount - input.parentQuickScan.carriedControlCount)} additional in-scope control${Math.max(0, answeredCount - input.parentQuickScan.carriedControlCount) === 1 ? "" : "s"} were assessed here. All scores derive from selected maturity levels against seeded canonical controls — no AI-generated findings.`
        : input.focusPillarLabels && input.focusPillarLabels.length > 0
          ? `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} in-scope control${answeredCount === 1 ? "" : "s"} across ${input.focusPillarLabels.join(", ")}. Scores are computed deterministically from your maturity selections — no AI-generated findings.`
          : `This ${modeLabel.toLowerCase()} evaluated ${answeredCount} in-scope control${answeredCount === 1 ? "" : "s"} across ${pillarMaturity.length} pillar${pillarMaturity.length === 1 ? "" : "s"}. Scores are computed deterministically from your maturity selections — no AI-generated findings.`;

  const org = input.organizationName ?? "Your organization";
  const libraryControlCount = Math.max(
    input.libraryControlCount ?? answeredCount,
    answeredCount
  );
  const coveragePct =
    libraryControlCount > 0 ? Math.round((answeredCount / libraryControlCount) * 100) : 100;

  const isPillarFocus =
    mode === "deep_dive" && (input.focusPillarIds?.length ?? 0) === 1 && pillarMaturity.length === 1;
  const pillarRecord = isPillarFocus ? pillarMaturity[0] : null;
  const totalControlsInPillar = input.pillarLibraryControlCount ?? pillarRecord?.reviewedControls ?? answeredCount;

  const pillarDeepDive =
    pillarRecord && isPillarFocus
      ? buildPillarDeepDiveSummary({
          pillar: pillarRecord,
          criticalQuestion: getPillarCriticalQuestion(pillarRecord.pillarId),
          controlResponses,
          gaps,
          totalControlsInPillar,
          quickScanBaseline: input.quickScanPillarBaseline,
          documentResponses: input.documentResponses,
        })
      : undefined;

  const executiveHeadline = pillarDeepDive
    ? pillarDeepDive.pathForward.headline
    : `${org} — ${MATURITY_LABELS[overallMaturity]} AI governance maturity`;

  const executiveNarrative = pillarDeepDive
    ? `${pillarDeepDive.pathForward.narrative}${pillarDeepDive.quickScanBaseline ? (pillarDeepDive.quickScanBaseline.unchanged ? ` Your quick scan baseline for the flagship control (${pillarDeepDive.quickScanBaseline.controlCode}) remained ${pillarDeepDive.quickScanBaseline.maturityLabel} after assessing additional controls.` : ` The flagship control (${pillarDeepDive.quickScanBaseline.controlCode}) moved from ${pillarDeepDive.quickScanBaseline.maturityLabel} at quick scan to ${pillarDeepDive.quickScanBaseline.deepDiveMaturityLabel} in context of the full pillar assessment.`) : ""}`
    : `${methodologyNote} Overall weighted maturity is ${MATURITY_LABELS[overallMaturity].toLowerCase()} (${overallScorePct}%) across assessed pillars mapped to ${frameworksReferenced.length || input.frameworkCodes.length} framework${(frameworksReferenced.length || input.frameworkCodes.length) === 1 ? "" : "s"}. ${
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
      }${mode === "quick" ? " Continue with a deep dive to assess the remaining in-scope controls in the canonical library." : input.parentQuickScan ? " Compare with your quick scan baseline to see how pillar coverage expanded." : ""}`;

  const boardActions = pillarDeepDive
    ? [
        pillarDeepDive.pathForward.leadershipAction,
        gaps.length > 0
          ? `Sequence remediation using the phased roadmap below — ${roadmapByPhase.immediate.length} immediate, ${roadmapByPhase.short_term.length} near-term, and ${roadmapByPhase.medium_term.length} strategic action${roadmapByPhase.medium_term.length === 1 ? "" : "s"}.`
          : "Publish this pillar as a reference implementation and replicate operating patterns in weaker pillars.",
        input.parentQuickScan
          ? "Return to your quick scan results to deep dive the next priority pillar or schedule a full client assessment for evidence-backed validation."
          : "Establish quarterly re-assessment for this pillar using the canonical control library.",
      ]
    : [
        criticalGaps > 0
          ? "Commission a 90-day remediation sprint for critical assessed gaps with named executive owners."
          : gaps.length > 0
            ? "Prioritize the assessed improvement areas below with pillar owners and measurable 90-day targets."
            : "Sustain current governance cadence and advance partial pillars toward managed maturity.",
        mode === "quick"
          ? "Schedule a deep-dive maturity assessment to validate findings across the full control library."
          : "Align remediation roadmap with enterprise risk appetite and regulatory obligations (EU AI Act, ISO 42001).",
        "Establish quarterly maturity re-assessment using the canonical control library.",
      ];

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
      strengths: pillarDeepDive
        ? pillarRecord!.alignedCount > 0
          ? [
              `${pillarRecord!.alignedCount} control${pillarRecord!.alignedCount === 1 ? "" : "s"} at managed or optimized maturity in ${pillarRecord!.pillarLabel}.`,
            ]
          : []
        : strongPillars.map(
            (p) => `${p.pillarLabel}: ${p.maturityLabel} (${p.alignmentPct}% maturity score)`
          ),
      priorityGaps: gaps
        .filter((g) => g.severity === "critical" || g.severity === "high")
        .slice(0, 6)
        .map((g) => `${g.controlTitle} (${g.maturityLabel})`),
      boardActions,
    },
    pillarMaturity,
    assessmentMatrix,
    controlResponses,
    gaps,
    roadmap,
    roadmapByPhase,
    pillarDeepDive,
  };
}
