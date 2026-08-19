import type { MaturityLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import type { PillarMaturityRecord } from "@/lib/control-review-reports";
import { MATURITY_SCORE } from "@/lib/maturity-survey-constants";
import { resolvePillarId } from "@/lib/risk-pillars";
import {
  countPillarFollowUpQuestions,
  filterCatalogByPillars,
  focusPillarIdsMatch,
  formatFocusPillarLabels,
  normalizeFocusPillarIds,
  sumFollowUpQuestionsAcrossPillars,
} from "@/lib/maturity-survey-types";
import { countWizardFollowUpQuestions } from "@/lib/maturity-survey-wizard-state";

const CRITICALITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

export type PillarDeepDiveOption = {
  pillarId: string;
  pillarLabel: string;
  criticality: string;
  maturityLevel: MaturityLevel;
  maturityLabel: string;
  alignmentPct: number;
  libraryControlCount: number;
  additionalControls: number;
  childSurveyId: string | null;
  childStatus: "in_progress" | "completed" | null;
  isPriorityFocus: boolean;
};

export type DeepDiveContinuationState = {
  pillars: PillarDeepDiveOption[];
  /** Pillars with at least one framework-mapped follow-up question after baseline. */
  actionablePillars: PillarDeepDiveOption[];
  priorityFocusPillarId: string | null;
  totalLibraryControls: number;
  canStartAny: boolean;
  pillarsFullyCoveredInBaseline: number;
  fullDeepDive: {
    libraryControlCount: number;
    additionalControls: number;
    childSurveyId: string | null;
    childStatus: "in_progress" | "completed" | null;
  };
};

export async function getParentQuickScanControlIds(
  parentSurveyId: string | null,
  focusPillarIds: string[] = []
) {
  if (!parentSurveyId) return [];

  const parent = await prisma.maturitySurvey.findUnique({
    where: { id: parentSurveyId },
    include: { responses: { select: { controlId: true, pillarId: true } } },
  });

  if (!parent || parent.surveyMode !== "quick") return [];

  const focus = normalizeFocusPillarIds(focusPillarIds);
  const responses =
    focus.length === 0
      ? parent.responses
      : parent.responses.filter((response) => focus.includes(response.pillarId));

  return responses.map((response) => response.controlId);
}

export async function listDeepDiveChildren(parentSurveyId: string) {
  return prisma.maturitySurvey.findMany({
    where: {
      parentSurveyId,
      surveyMode: "deep_dive",
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });
}

function findChildForFocus(
  children: Awaited<ReturnType<typeof listDeepDiveChildren>>,
  focusPillarIds: string[]
) {
  return (
    children.find((child) => focusPillarIdsMatch(child.focusPillarIds, focusPillarIds)) ?? null
  );
}

function pickPriorityFocusPillarId(
  pillars: PillarDeepDiveOption[]
): string | null {
  const actionable = pillars.filter((pillar) => pillar.additionalControls > 0);
  if (actionable.length === 0) return null;

  const sorted = [...actionable].sort((a, b) => {
    const scoreDiff = MATURITY_SCORE[a.maturityLevel] - MATURITY_SCORE[b.maturityLevel];
    if (scoreDiff !== 0) return scoreDiff;
    return (CRITICALITY_ORDER[a.criticality] ?? 2) - (CRITICALITY_ORDER[b.criticality] ?? 2);
  });

  return sorted[0]?.pillarId ?? null;
}

function buildBaselineControlIdByPillar(
  responses: Array<{ controlId: string; pillarId: string }>
): Map<string, string> {
  const byPillar = new Map<string, string>();
  for (const response of responses) {
    const pillarId = resolvePillarId(response.pillarId);
    if (!byPillar.has(pillarId)) {
      byPillar.set(pillarId, response.controlId);
    }
  }
  return byPillar;
}

export async function getDeepDiveContinuationState(
  quickScanSurveyId: string,
  frameworkCodes: string[],
  pillarMaturity: PillarMaturityRecord[]
): Promise<DeepDiveContinuationState> {
  const [quickCatalog, deepCatalog, parent, children] = await Promise.all([
    buildMaturitySurveyCatalog(frameworkCodes, "quick"),
    buildMaturitySurveyCatalog(frameworkCodes, "deep_dive"),
    prisma.maturitySurvey.findUnique({
      where: { id: quickScanSurveyId },
      select: {
        responses: { select: { controlId: true, pillarId: true } },
      },
    }),
    listDeepDiveChildren(quickScanSurveyId),
  ]);

  const baselineControlIdByPillar = buildBaselineControlIdByPillar(parent?.responses ?? []);
  const pillarIds = pillarMaturity.map((pillar) => resolvePillarId(pillar.pillarId));

  const pillars: PillarDeepDiveOption[] = pillarMaturity.map((pillar) => {
    const pillarId = resolvePillarId(pillar.pillarId);
    const { libraryControlCount, followUpCount } = countPillarFollowUpQuestions({
      quickCatalog,
      deepCatalog,
      pillarId,
      frameworkCodes,
      baselineControlId: baselineControlIdByPillar.get(pillarId) ?? null,
    });
    const child = findChildForFocus(children, [pillarId]);

    return {
      pillarId,
      pillarLabel: pillar.pillarLabel,
      criticality: pillar.criticality,
      maturityLevel: pillar.maturityLevel,
      maturityLabel: pillar.maturityLabel,
      alignmentPct: pillar.alignmentPct,
      libraryControlCount,
      additionalControls: followUpCount,
      childSurveyId: child?.id ?? null,
      childStatus: child
        ? child.status === "completed"
          ? "completed"
          : "in_progress"
        : null,
      isPriorityFocus: false,
    };
  });

  const actionablePillars = pillars.filter((pillar) => pillar.additionalControls > 0);
  const priorityFocusPillarId = pickPriorityFocusPillarId(pillars);
  const pillarsWithPriority = pillars.map((pillar) => ({
    ...pillar,
    isPriorityFocus: pillar.pillarId === priorityFocusPillarId,
  }));
  const actionablePillarsWithPriority = pillarsWithPriority.filter(
    (pillar) => pillar.additionalControls > 0
  );

  const fullAdditionalControls = sumFollowUpQuestionsAcrossPillars({
    quickCatalog,
    deepCatalog,
    pillarIds,
    frameworkCodes,
    baselineControlIdByPillar,
  });

  const totalLibraryControls = actionablePillarsWithPriority.reduce(
    (sum, pillar) => sum + pillar.libraryControlCount,
    0
  );

  const fullChild = findChildForFocus(children, []);

  return {
    pillars: pillarsWithPriority,
    actionablePillars: actionablePillarsWithPriority,
    priorityFocusPillarId,
    totalLibraryControls,
    canStartAny: actionablePillarsWithPriority.some((pillar) => pillar.childStatus !== "completed"),
    pillarsFullyCoveredInBaseline: pillars.length - actionablePillarsWithPriority.length,
    fullDeepDive: {
      libraryControlCount: totalLibraryControls,
      additionalControls: fullAdditionalControls,
      childSurveyId: fullChild?.id ?? null,
      childStatus: fullChild
        ? fullChild.status === "completed"
          ? "completed"
          : "in_progress"
        : null,
    },
  };
}

function buildDeepDiveTitle(
  organizationName: string | null,
  focusPillarIds: string[],
  catalog: Awaited<ReturnType<typeof buildMaturitySurveyCatalog>>
) {
  const org = organizationName?.trim() || "Organization";
  const labels = formatFocusPillarLabels(catalog, focusPillarIds);

  if (labels.length === 0 || labels.length === catalog.length) {
    return `${org} — Deep dive (all pillars)`;
  }
  if (labels.length === 1) {
    return `${org} — Deep dive: ${labels[0]}`;
  }
  return `${org} — Deep dive: ${labels.slice(0, 2).join(", ")}${labels.length > 2 ? ` +${labels.length - 2}` : ""}`;
}

export async function createDeepDiveFromQuickScan(
  parentSurveyId: string,
  focusPillarIds: string[] = []
) {
  const normalizedFocus = normalizeFocusPillarIds(focusPillarIds);

  const parent = await prisma.maturitySurvey.findUnique({
    where: { id: parentSurveyId },
    include: { responses: true },
  });

  if (!parent) {
    throw new Error("Quick scan not found.");
  }
  if (parent.questionCatalogSource === "pack") {
    throw new Error("Deep dive is only available for framework-aligned assessments.");
  }
  if (parent.status !== "completed") {
    throw new Error("Complete the quick scan before starting a deep dive.");
  }
  if (parent.surveyMode !== "quick") {
    throw new Error("Deep dive continues from a completed quick scan only.");
  }

  const fullCatalog = await buildMaturitySurveyCatalog(parent.frameworkCodes, "deep_dive");
  const scopedCatalog = filterCatalogByPillars(fullCatalog, normalizedFocus);

  if (scopedCatalog.length === 0) {
    throw new Error("Select at least one pillar to deep dive.");
  }

  const scopedPillarIds = new Set(scopedCatalog.map((group) => group.pillarId));
  const catalogPillarByControlId = new Map<string, string>();
  for (const group of scopedCatalog) {
    for (const control of group.controls) {
      catalogPillarByControlId.set(control.id, group.pillarId);
    }
  }

  const seededResponses = parent.responses
    .filter((response) => scopedPillarIds.has(resolvePillarId(response.pillarId)))
    .map((response) => ({
      controlId: response.controlId,
      pillarId: catalogPillarByControlId.get(response.controlId) ?? resolvePillarId(response.pillarId),
      maturity: response.maturity,
      notes: response.notes,
    }));

  const seededControlIds = seededResponses.map((response) => response.controlId);
  const followUpCount = countWizardFollowUpQuestions(scopedCatalog, seededControlIds);
  if (followUpCount === 0) {
    throw new Error(
      "No framework-mapped follow-up questions remain for the selected pillar(s). Your baseline already covers them for the chosen frameworks."
    );
  }

  const children = await listDeepDiveChildren(parentSurveyId);
  const existing = findChildForFocus(
    children.filter((child) => child.status !== "completed"),
    normalizedFocus
  );

  if (existing) {
    return {
      survey: existing,
      created: false as const,
      prefilledCount: existing._count.responses,
    };
  }

  const title = buildDeepDiveTitle(parent.organizationName, normalizedFocus, fullCatalog);

  const survey = await prisma.maturitySurvey.create({
    data: {
      title,
      organizationName: parent.organizationName,
      respondentName: parent.respondentName,
      respondentRole: parent.respondentRole,
      frameworkCodes: parent.frameworkCodes,
      surveyMode: "deep_dive",
      status: "in_progress",
      focusPillarIds: normalizedFocus,
      parentSurvey: {
        connect: { id: parentSurveyId },
      },
      responses: {
        create: seededResponses.map((response) => ({
          controlId: response.controlId,
          pillarId: response.pillarId,
          maturity: response.maturity,
          notes: response.notes,
        })),
      },
    },
    include: { responses: true },
  });

  return {
    survey,
    created: true as const,
    prefilledCount: seededResponses.length,
  };
}
