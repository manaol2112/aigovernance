import { prisma, assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import { buildMaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";

export { PrismaNotReadyError };

export async function loadMaturitySurveyBundle(surveyId: string) {
  assertPrismaReady();

  const survey = await prisma.maturitySurvey.findUnique({
    where: { id: surveyId },
    include: { responses: true },
  });
  if (!survey) return null;

  const mode = (survey.surveyMode ?? "quick") as import("@/lib/maturity-survey-mode").SurveyMode;
  const catalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, mode);
  const fullLibraryCatalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, "deep_dive");
  const libraryControlCount = countSurveyQuestions(fullLibraryCatalog);
  const report = buildMaturitySurveyReport({
    surveyTitle: survey.title,
    organizationName: survey.organizationName,
    frameworkCodes: survey.frameworkCodes,
    surveyMode: mode,
    catalog,
    libraryControlCount,
    responses: survey.responses.map((r) => ({
      controlId: r.controlId,
      pillarId: r.pillarId,
      maturity: r.maturity,
      notes: r.notes,
    })),
  });

  return { survey, catalog, report };
}

export async function listMaturitySurveysForPage() {
  assertPrismaReady();

  const surveys = await prisma.maturitySurvey.findMany({
    include: { _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    surveys.map(async (s) => {
      const mode = (s.surveyMode ?? "quick") as import("@/lib/maturity-survey-mode").SurveyMode;
      const catalog = await buildMaturitySurveyCatalog(s.frameworkCodes, mode);
      return {
        id: s.id,
        title: s.title,
        organizationName: s.organizationName,
        status: s.status,
        surveyMode: mode,
        frameworkCodes: s.frameworkCodes,
        responseCount: s._count.responses,
        totalQuestions: countSurveyQuestions(catalog),
        createdAt: s.createdAt,
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
