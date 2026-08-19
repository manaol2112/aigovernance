import { prisma, assertGuidedWorkshopPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import {
  buildGuidedWorkshopReport,
} from "@/lib/guided-workshop-analysis";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";
import { hydratePackSnapshots, isQuestionCatalogPack } from "@/lib/pillar-questionnaire";
import { buildPackReport } from "@/lib/pillar-questionnaire-scoring";

export { PrismaNotReadyError };

export async function loadGuidedWorkshopBundle(workshopId: string) {
  assertGuidedWorkshopPrismaReady();

  const workshop = await prisma.guidedWorkshop.findUnique({
    where: { id: workshopId },
    include: {
      responses: true,
      packQuestions: true,
      packResponses: true,
      questionPack: { select: { name: true } },
    },
  });
  if (!workshop) return null;

  if (isQuestionCatalogPack(workshop.questionCatalogSource)) {
    const snapshots = hydratePackSnapshots(workshop.packQuestions);
    const packAnswers = workshop.packResponses.map((response) => ({
      questionId: response.questionId,
      answer: response.answer,
      notes: response.facilitatorNotes,
    }));
    const packReport = buildPackReport({
      title: workshop.title,
      organizationName: workshop.organizationName,
      packName: workshop.questionPack?.name ?? null,
      generatedAt: (workshop.submittedAt ?? workshop.updatedAt).toISOString(),
      snapshots,
      answers: packAnswers,
    });
    return { workshop, catalog: [], report: null, snapshots, packAnswers, packReport };
  }

  const catalog = await buildMaturitySurveyCatalog(workshop.frameworkCodes, "deep_dive");
  const report = buildGuidedWorkshopReport({
    workshopTitle: workshop.title,
    organizationName: workshop.organizationName ?? "",
    clientIndustry: workshop.clientIndustry,
    facilitatorName: workshop.facilitatorName,
    facilitatorRole: workshop.facilitatorRole,
    clientContactName: workshop.clientContactName,
    clientContactRole: workshop.clientContactRole,
    frameworkCodes: workshop.frameworkCodes,
    generatedAt: (workshop.submittedAt ?? workshop.updatedAt).toISOString(),
    catalog,
    responses: workshop.responses.map((r) => ({
      controlId: r.controlId,
      pillarId: r.pillarId,
      maturity: r.maturity,
      facilitatorNotes: r.facilitatorNotes,
    })),
  });

  return { workshop, catalog, report, snapshots: [], packAnswers: [], packReport: null };
}

export async function listGuidedWorkshopsForPage() {
  assertGuidedWorkshopPrismaReady();

  const workshops = await prisma.guidedWorkshop.findMany({
    include: {
      _count: { select: { responses: true, packResponses: true, packQuestions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    workshops.map(async (w) => {
      const catalog = isQuestionCatalogPack(w.questionCatalogSource)
        ? []
        : await buildMaturitySurveyCatalog(w.frameworkCodes, "deep_dive");
      return {
        id: w.id,
        title: w.title,
        organizationName: w.organizationName,
        clientIndustry: w.clientIndustry,
        facilitatorName: w.facilitatorName,
        status: w.status,
        frameworkCodes: w.frameworkCodes,
        responseCount: isQuestionCatalogPack(w.questionCatalogSource)
          ? w._count.packResponses
          : w._count.responses,
        totalQuestions: isQuestionCatalogPack(w.questionCatalogSource)
          ? w._count.packQuestions
          : countSurveyQuestions(catalog),
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        submittedAt: w.submittedAt,
      };
    })
  );
}

export function isGuidedWorkshopDbError(error: unknown): boolean {
  if (error instanceof PrismaNotReadyError) return true;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "P2021" || code === "P2022" || code === "P1010";
  }
  return false;
}

export function guidedWorkshopDbMessage(error: unknown): string {
  if (error instanceof PrismaNotReadyError) return error.message;
  return "Guided workshop tables are not available. Run `npx prisma db push` and restart the dev server.";
}
