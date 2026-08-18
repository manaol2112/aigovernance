import { prisma, assertGuidedWorkshopPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import {
  buildGuidedWorkshopReport,
  type GuidedWorkshopReport,
} from "@/lib/guided-workshop-analysis";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";

export { PrismaNotReadyError };

export async function loadGuidedWorkshopBundle(workshopId: string) {
  assertGuidedWorkshopPrismaReady();

  const workshop = await prisma.guidedWorkshop.findUnique({
    where: { id: workshopId },
    include: { responses: true },
  });
  if (!workshop) return null;

  const catalog = await buildMaturitySurveyCatalog(workshop.frameworkCodes, "deep_dive");
  const report =
    workshop.status === "completed" && workshop.reportCache
      ? (workshop.reportCache as GuidedWorkshopReport)
      : buildGuidedWorkshopReport({
          workshopTitle: workshop.title,
          organizationName: workshop.organizationName ?? "",
          clientIndustry: workshop.clientIndustry,
          facilitatorName: workshop.facilitatorName,
          facilitatorRole: workshop.facilitatorRole,
          clientContactName: workshop.clientContactName,
          clientContactRole: workshop.clientContactRole,
          frameworkCodes: workshop.frameworkCodes,
          catalog,
          responses: workshop.responses.map((r) => ({
            controlId: r.controlId,
            pillarId: r.pillarId,
            maturity: r.maturity,
            facilitatorNotes: r.facilitatorNotes,
          })),
        });

  return { workshop, catalog, report };
}

export async function listGuidedWorkshopsForPage() {
  assertGuidedWorkshopPrismaReady();

  const workshops = await prisma.guidedWorkshop.findMany({
    include: { _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    workshops.map(async (w) => {
      const catalog = await buildMaturitySurveyCatalog(w.frameworkCodes, "deep_dive");
      return {
        id: w.id,
        title: w.title,
        organizationName: w.organizationName,
        clientIndustry: w.clientIndustry,
        facilitatorName: w.facilitatorName,
        status: w.status,
        frameworkCodes: w.frameworkCodes,
        responseCount: w._count.responses,
        totalQuestions: countSurveyQuestions(catalog),
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
