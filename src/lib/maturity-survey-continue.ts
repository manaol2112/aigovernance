import type { MaturityLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import type { PillarMaturityRecord } from "@/lib/control-review-reports";
import { MATURITY_SCORE } from "@/lib/maturity-survey-constants";
import {
  countSurveyQuestions,
  filterCatalogByPillars,
  focusPillarIdsMatch,
  formatFocusPillarLabels,
  normalizeFocusPillarIds,
} from "@/lib/maturity-survey-types";

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
  priorityFocusPillarId: string | null;
  totalLibraryControls: number;
  canStartAny: boolean;
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

function pickPriorityFocusPillarId(pillars: PillarMaturityRecord[]): string | null {
  if (pillars.length === 0) return null;

  const sorted = [...pillars].sort((a, b) => {
    const scoreDiff = MATURITY_SCORE[a.maturityLevel] - MATURITY_SCORE[b.maturityLevel];
    if (scoreDiff !== 0) return scoreDiff;
    return (CRITICALITY_ORDER[a.criticality] ?? 2) - (CRITICALITY_ORDER[b.criticality] ?? 2);
  });

  return sorted[0]?.pillarId ?? null;
}

export async function getDeepDiveContinuationState(
  quickScanSurveyId: string,
  frameworkCodes: string[],
  pillarMaturity: PillarMaturityRecord[]
): Promise<DeepDiveContinuationState> {
  const fullLibraryCatalog = await buildMaturitySurveyCatalog(frameworkCodes, "deep_dive");
  const totalLibraryControls = countSurveyQuestions(fullLibraryCatalog);
  const children = await listDeepDiveChildren(quickScanSurveyId);
  const priorityFocusPillarId = pickPriorityFocusPillarId(pillarMaturity);

  const pillars: PillarDeepDiveOption[] = pillarMaturity.map((pillar) => {
    const pillarCatalog = filterCatalogByPillars(fullLibraryCatalog, [pillar.pillarId]);
    const libraryControlCount = countSurveyQuestions(pillarCatalog);
    const additionalControls = Math.max(0, libraryControlCount - 1);
    const child = findChildForFocus(children, [pillar.pillarId]);

    return {
      pillarId: pillar.pillarId,
      pillarLabel: pillar.pillarLabel,
      criticality: pillar.criticality,
      maturityLevel: pillar.maturityLevel,
      maturityLabel: pillar.maturityLabel,
      alignmentPct: pillar.alignmentPct,
      libraryControlCount,
      additionalControls,
      childSurveyId: child?.id ?? null,
      childStatus: child
        ? child.status === "completed"
          ? "completed"
          : "in_progress"
        : null,
      isPriorityFocus: pillar.pillarId === priorityFocusPillarId,
    };
  });

  const fullChild = findChildForFocus(children, []);
  const fullAdditionalControls = Math.max(0, totalLibraryControls - pillarMaturity.length);

  return {
    pillars,
    priorityFocusPillarId,
    totalLibraryControls,
    canStartAny: pillars.some((pillar) => pillar.additionalControls > 0),
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
  const seededResponses = parent.responses.filter((response) =>
    scopedPillarIds.has(response.pillarId)
  );

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
