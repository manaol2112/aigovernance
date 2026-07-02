import { NextResponse } from "next/server";
import { prisma, assertPrismaReady } from "@/lib/db";
import { loadMaturitySurveyBundle } from "@/lib/maturity-survey-service";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";
import { validateSurveyReadyToSubmit } from "@/lib/maturity-survey-progress";
import { buildMaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import type { SurveyMode } from "@/lib/maturity-survey-mode";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const bundle = await loadMaturitySurveyBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const { survey, catalog, report } = bundle;
  return NextResponse.json({
    survey,
    catalog,
    report,
    totalQuestions: countSurveyQuestions(catalog),
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertPrismaReady();
  const body = await request.json();
  const { action, currentStepIndex, currentPillarIndex } = body;

  const survey = await prisma.maturitySurvey.findUnique({ where: { id } });
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const mode = (survey.surveyMode ?? "quick") as SurveyMode;

  if (action === "submit") {
    const catalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, mode);
    const responses = await prisma.maturitySurveyResponse.findMany({ where: { surveyId: id } });

    const validation = validateSurveyReadyToSubmit(
      catalog,
      responses.map((r) => ({ controlId: r.controlId, pillarId: r.pillarId }))
    );

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: `Complete all questions before submitting. Still needed: ${validation.missingLabels.slice(0, 4).join(", ")}${validation.missingLabels.length > 4 ? "…" : ""}`,
        },
        { status: 400 }
      );
    }

    const report = buildMaturitySurveyReport({
      surveyTitle: survey.title,
      organizationName: survey.organizationName,
      frameworkCodes: survey.frameworkCodes,
      surveyMode: mode,
      catalog,
      responses: responses.map((r) => ({
        controlId: r.controlId,
        pillarId: r.pillarId,
        maturity: r.maturity,
        notes: r.notes,
      })),
    });

    const updated = await prisma.maturitySurvey.update({
      where: { id },
      data: {
        status: "completed",
        submittedAt: new Date(),
        reportCache: report,
      },
    });

    return NextResponse.json({ survey: updated, report });
  }

  const stepIndex =
    typeof currentStepIndex === "number"
      ? currentStepIndex
      : typeof currentPillarIndex === "number"
        ? currentPillarIndex
        : undefined;

  if (typeof stepIndex === "number") {
    const updated = await prisma.maturitySurvey.update({
      where: { id },
      data: { currentStepIndex: stepIndex },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertPrismaReady();
  await prisma.maturitySurvey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
