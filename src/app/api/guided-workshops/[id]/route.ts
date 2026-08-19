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
    totalQuestions:
      bundle.snapshots.length > 0
        ? bundle.snapshots.length
        : countSurveyQuestions(bundle.catalog),
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertGuidedWorkshopPrismaReady();
  const body = await request.json();
  const { action, currentStepIndex } = body as {
    action?: string;
    currentStepIndex?: number;
  };

  const workshop = await prisma.guidedWorkshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
  }

  if (action === "submit" && workshop.questionCatalogSource === "pack") {
    const [snapshots, packResponses] = await Promise.all([
      prisma.guidedWorkshopPackQuestion.findMany({ where: { workshopId: id } }),
      prisma.guidedWorkshopPackResponse.findMany({ where: { workshopId: id } }),
    ]);
    if (snapshots.length === 0) {
      return NextResponse.json({ error: "This questionnaire has no questions." }, { status: 400 });
    }
    const answered = new Set(packResponses.map((response) => response.questionId));
    const missing = snapshots.filter((snapshot) => !answered.has(snapshot.id)).length;
    if (missing > 0) {
      return NextResponse.json(
        { error: `Complete all questions before submitting. ${missing} remaining.` },
        { status: 400 }
      );
    }
    const pack = workshop.questionPackId
      ? await prisma.questionPack.findUnique({ where: { id: workshop.questionPackId } })
      : null;
    const { hydratePackSnapshots } = await import("@/lib/pillar-questionnaire");
    const { buildPackReport } = await import("@/lib/pillar-questionnaire-scoring");
    const report = buildPackReport({
      title: workshop.title,
      organizationName: workshop.organizationName,
      packName: pack?.name ?? null,
      snapshots: hydratePackSnapshots(snapshots),
      answers: packResponses.map((response) => ({
        questionId: response.questionId,
        answer: response.answer,
        notes: response.facilitatorNotes,
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

  if (action === "save" || typeof currentStepIndex === "number") {
    const data: { currentStepIndex?: number; status?: "in_progress" } = {};
    if (typeof currentStepIndex === "number") {
      data.currentStepIndex = Math.max(0, Math.floor(currentStepIndex));
    }
    if (workshop.status === "draft") {
      data.status = "in_progress";
    }
    const updated = await prisma.guidedWorkshop.update({
      where: { id },
      data,
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
