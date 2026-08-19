import { prisma, assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import {
  buildMaturitySurveyReport,
  type MaturitySurveyReport,
} from "@/lib/maturity-survey-analysis";
import { buildFindingEngagementGuide } from "@/lib/maturity-finding-engagement-guide";
import { isQuestionCatalogPack, hydratePackSnapshots } from "@/lib/pillar-questionnaire";
import { buildPackReport, type PackReport } from "@/lib/pillar-questionnaire-scoring";

function enrichReportWithEngagementGuides(report: MaturitySurveyReport): MaturitySurveyReport {
  if (!report.pillarDeepDive) return report;

  const pillar = report.pillarDeepDive;
  return {
    ...report,
    pillarDeepDive: {
      ...pillar,
      controlFindings: pillar.controlFindings.map((finding) => ({
        ...finding,
        engagementGuide:
          finding.compliance === "aligned"
            ? null
            : buildFindingEngagementGuide({
                pillarId: pillar.pillarId,
                pillarLabel: pillar.pillarLabel,
                controlCode: finding.controlCode,
                controlTitle: finding.controlTitle,
                controlDescription: finding.controlDescription,
                maturity: finding.maturity,
                compliance: finding.compliance,
                ownerRole: finding.ownerRole,
                frameworkCodes: finding.frameworkCodes,
              }),
      })),
    },
  };
}
import type { PillarQuickScanBaseline } from "@/lib/maturity-survey-analysis";
import { MATURITY_LABELS } from "@/lib/maturity-survey-constants";
import { countSurveyQuestions, filterCatalogByPillars, formatFocusPillarLabels } from "@/lib/maturity-survey-types";

export { PrismaNotReadyError };

export async function resolveParentQuickScanMeta(
  parentSurveyId: string | null,
  responses: Array<{ controlId: string }>
) {
  if (!parentSurveyId) return undefined;

  const parent = await prisma.maturitySurvey.findUnique({
    where: { id: parentSurveyId },
    include: { responses: { select: { controlId: true } } },
  });

  if (!parent || parent.surveyMode !== "quick") return undefined;

  const parentControlIds = new Set(parent.responses.map((response) => response.controlId));
  const carriedControlCount = responses.filter((response) =>
    parentControlIds.has(response.controlId)
  ).length;

  return {
    surveyId: parent.id,
    carriedControlCount,
  };
}

export async function resolveQuickScanPillarBaseline(
  parentSurveyId: string | null,
  pillarId: string
): Promise<PillarQuickScanBaseline | undefined> {
  if (!parentSurveyId) return undefined;

  const parent = await prisma.maturitySurvey.findUnique({
    where: { id: parentSurveyId },
    include: {
      responses: {
        include: { control: { select: { id: true, code: true, title: true } } },
      },
    },
  });

  if (!parent || parent.surveyMode !== "quick") return undefined;

  const catalog = await buildMaturitySurveyCatalog(parent.frameworkCodes, "quick");
  const pillarGroup = catalog.find((group) => group.pillarId === pillarId);
  const flagship = pillarGroup?.controls[0];
  if (!flagship) return undefined;

  const response =
    parent.responses.find(
      (entry) => entry.controlId === flagship.id && entry.pillarId === pillarId
    ) ??
    parent.responses.find((entry) => entry.controlId === flagship.id);

  if (!response) return undefined;

  return {
    controlCode: response.control.code,
    controlTitle: response.control.title,
    maturity: response.maturity,
    maturityLabel: MATURITY_LABELS[response.maturity],
  };
}

export async function loadMaturitySurveyBundle(surveyId: string) {
  assertPrismaReady();

  const survey = await prisma.maturitySurvey.findUnique({
    where: { id: surveyId },
    include: {
      responses: true,
      documentResponses: true,
      packQuestions: true,
      packResponses: true,
      questionPack: { select: { name: true } },
    },
  });
  if (!survey) return null;

  if (isQuestionCatalogPack(survey.questionCatalogSource)) {
    const snapshots = hydratePackSnapshots(survey.packQuestions);
    const packAnswers = survey.packResponses.map((response) => ({
      questionId: response.questionId,
      answer: response.answer,
      notes: response.notes,
    }));
    const packReport = buildPackReport({
      title: survey.title,
      organizationName: survey.organizationName,
      packName: survey.questionPack?.name ?? null,
      generatedAt: (survey.submittedAt ?? survey.updatedAt).toISOString(),
      snapshots,
      answers: packAnswers,
    });
    return { survey, catalog: [], report: null, snapshots, packAnswers, packReport };
  }

  const mode = (survey.surveyMode ?? "quick") as import("@/lib/maturity-survey-mode").SurveyMode;
  const fullCatalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, mode);
  const catalog = filterCatalogByPillars(fullCatalog, survey.focusPillarIds ?? []);
  const fullLibraryCatalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, "deep_dive");
  const libraryControlCount = countSurveyQuestions(fullLibraryCatalog);
  const focusPillarIds = survey.focusPillarIds ?? [];
  const focusPillarLabels = formatFocusPillarLabels(fullLibraryCatalog, focusPillarIds);
  const pillarLibraryControlCount =
    mode === "deep_dive" && focusPillarIds.length === 1
      ? countSurveyQuestions(filterCatalogByPillars(fullLibraryCatalog, focusPillarIds))
      : undefined;
  const parentQuickScan = await resolveParentQuickScanMeta(
    survey.parentSurveyId,
    survey.responses
  );
  const quickScanPillarBaseline =
    mode === "deep_dive" && focusPillarIds.length === 1
      ? await resolveQuickScanPillarBaseline(survey.parentSurveyId, focusPillarIds[0]!)
      : undefined;
  const report = enrichReportWithEngagementGuides(
    buildMaturitySurveyReport({
    surveyTitle: survey.title,
    organizationName: survey.organizationName,
    respondentName: survey.respondentName,
    respondentRole: survey.respondentRole,
    frameworkCodes: survey.frameworkCodes,
    surveyMode: mode,
    catalog,
    libraryControlCount,
    focusPillarIds,
    focusPillarLabels,
    parentQuickScan,
    quickScanPillarBaseline,
    pillarLibraryControlCount,
    responses: survey.responses.map((r) => ({
      controlId: r.controlId,
      pillarId: r.pillarId,
      maturity: r.maturity,
      notes: r.notes,
    })),
    documentResponses: survey.documentResponses.map((r) => ({
      documentId: r.documentId,
      pillarId: r.pillarId,
      status: r.status,
    })),
  })
  );

  return { survey, catalog, report, snapshots: [], packAnswers: [], packReport: null as PackReport | null };
}

export async function listMaturitySurveysForPage() {
  assertPrismaReady();

  const surveys = await prisma.maturitySurvey.findMany({
    include: {
      _count: { select: { responses: true, packResponses: true, packQuestions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    surveys.map(async (s) => {
      const mode = (s.surveyMode ?? "quick") as import("@/lib/maturity-survey-mode").SurveyMode;
      const catalog = isQuestionCatalogPack(s.questionCatalogSource)
        ? []
        : await buildMaturitySurveyCatalog(s.frameworkCodes, mode);
      return {
        id: s.id,
        title: s.title,
        organizationName: s.organizationName,
        status: s.status,
        surveyMode: mode,
        frameworkCodes: s.frameworkCodes,
        responseCount: isQuestionCatalogPack(s.questionCatalogSource)
          ? s._count.packResponses
          : s._count.responses,
        totalQuestions: isQuestionCatalogPack(s.questionCatalogSource)
          ? s._count.packQuestions
          : countSurveyQuestions(catalog),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        submittedAt: s.submittedAt,
      };
    })
  );
}

export function isDatabaseSetupError(error: unknown): boolean {
  if (error instanceof PrismaNotReadyError) return true;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "P2021" || code === "P1010";
  }
  return false;
}

export function databaseSetupMessage(error: unknown): string {
  if (error instanceof PrismaNotReadyError) return error.message;
  return "The maturity survey tables are not available. Apply the latest database schema.";
}
