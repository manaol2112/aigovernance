import { NextResponse } from "next/server";
import { prisma, assertGuidedWorkshopPrismaReady } from "@/lib/db";
import { loadGuidedWorkshopBundle } from "@/lib/guided-workshop-service";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import { buildGuidedWorkshopReport } from "@/lib/guided-workshop-analysis";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";
import { validateSurveyReadyToSubmit } from "@/lib/maturity-survey-progress";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const bundle = await loadGuidedWorkshopBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
  }

  return NextResponse.json({
    workshop: bundle.workshop,
    catalog: bundle.catalog,
    report: bundle.report,
    totalQuestions: countSurveyQuestions(bundle.catalog),
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertGuidedWorkshopPrismaReady();
  const body = await request.json();
  const { action, currentStepIndex } = body;

  const workshop = await prisma.guidedWorkshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
  }

  if (action === "submit") {
    const catalog = await buildMaturitySurveyCatalog(workshop.frameworkCodes, "deep_dive");
    const responses = await prisma.guidedWorkshopResponse.findMany({ where: { workshopId: id } });

    const validation = validateSurveyReadyToSubmit(
      catalog,
      responses.map((r) => ({
        controlId: r.controlId,
        pillarId: r.pillarId,
      }))
    );

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: `Complete all questions before submitting. Still needed: ${validation.missingLabels.slice(0, 4).join(", ")}${validation.missingLabels.length > 4 ? "…" : ""}`,
        },
        { status: 400 }
      );
    }

    const report = buildGuidedWorkshopReport({
      workshopTitle: workshop.title,
      organizationName: workshop.organizationName ?? "",
      clientIndustry: workshop.clientIndustry,
      facilitatorName: workshop.facilitatorName,
      facilitatorRole: workshop.facilitatorRole,
      clientContactName: workshop.clientContactName,
      clientContactRole: workshop.clientContactRole,
      frameworkCodes: workshop.frameworkCodes,
      catalog,
      responses: responses.map((r) => ({
        controlId: r.controlId,
        pillarId: r.pillarId,
        maturity: r.maturity,
        facilitatorNotes: r.facilitatorNotes,
      })),
    });

    const updated = await prisma.guidedWorkshop.update({
      where: { id },
      data: {
        status: "completed",
        submittedAt: new Date(),
        reportCache: report,
      },
    });

    return NextResponse.json({ workshop: updated, report });
  }

  if (typeof currentStepIndex === "number") {
    const updated = await prisma.guidedWorkshop.update({
      where: { id },
      data: { currentStepIndex },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertGuidedWorkshopPrismaReady();
  await prisma.guidedWorkshop.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
