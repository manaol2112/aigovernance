import { NextResponse } from "next/server";
import { prisma, assertPrismaReady } from "@/lib/db";
import {
  loadMaturitySurveyBundle,
  resolveParentQuickScanMeta,
  resolveQuickScanPillarBaseline,
} from "@/lib/maturity-survey-service";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import {
  countSurveyQuestions,
  filterCatalogByPillars,
  formatFocusPillarLabels,
} from "@/lib/maturity-survey-types";
import { validateSurveyReadyToSubmit } from "@/lib/maturity-survey-progress";
import {
  buildDocumentationChecklistGroups,
  isDocumentationChecklistComplete,
} from "@/lib/maturity-survey-documents";
import { buildMaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import type { SurveyMode } from "@/lib/maturity-survey-mode";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const bundle = await loadMaturitySurveyBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const { survey, catalog, report, snapshots } = bundle;
  return NextResponse.json({
    survey,
    catalog,
    report,
    totalQuestions: snapshots.length > 0 ? snapshots.length : countSurveyQuestions(catalog),
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

  if (action === "submit" && survey.questionCatalogSource === "pack") {
    const [snapshots, packResponses] = await Promise.all([
      prisma.maturitySurveyPackQuestion.findMany({ where: { surveyId: id } }),
      prisma.maturitySurveyPackResponse.findMany({ where: { surveyId: id } }),
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
    const pack = survey.questionPackId
      ? await prisma.questionPack.findUnique({ where: { id: survey.questionPackId } })
      : null;
    const { hydratePackSnapshots } = await import("@/lib/pillar-questionnaire");
    const { buildPackReport } = await import("@/lib/pillar-questionnaire-scoring");
    const report = buildPackReport({
      title: survey.title,
      organizationName: survey.organizationName,
      packName: pack?.name ?? null,
      snapshots: hydratePackSnapshots(snapshots),
      answers: packResponses.map((response) => ({
        questionId: response.questionId,
        answer: response.answer,
        notes: response.notes,
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

  if (action === "submit") {
    const fullCatalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, mode);
    const catalog = filterCatalogByPillars(fullCatalog, survey.focusPillarIds ?? []);
    const fullLibraryCatalog = await buildMaturitySurveyCatalog(survey.frameworkCodes, "deep_dive");
    const libraryControlCount = countSurveyQuestions(fullLibraryCatalog);
    const focusPillarLabels = formatFocusPillarLabels(
      fullLibraryCatalog,
      survey.focusPillarIds ?? []
    );
    const responses = await prisma.maturitySurveyResponse.findMany({ where: { surveyId: id } });
    const documentResponses = await prisma.maturitySurveyDocumentResponse.findMany({
      where: { surveyId: id },
    });

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

    if (mode === "deep_dive") {
      const focusPillarIds =
        survey.focusPillarIds.length > 0
          ? survey.focusPillarIds
          : catalog.map((group) => group.pillarId);
      const checklistGroups = buildDocumentationChecklistGroups(focusPillarIds);
      const docsComplete = isDocumentationChecklistComplete(checklistGroups, documentResponses);

      if (!docsComplete) {
        return NextResponse.json(
          { error: "Complete the documentation checklist before submitting." },
          { status: 400 }
        );
      }
    }

    const focusPillarIds = survey.focusPillarIds ?? [];
    const pillarLibraryControlCount =
      mode === "deep_dive" && focusPillarIds.length === 1
        ? countSurveyQuestions(filterCatalogByPillars(fullLibraryCatalog, focusPillarIds))
        : undefined;

    const parentQuickScan = await resolveParentQuickScanMeta(
      survey.parentSurveyId,
      responses
    );
    const quickScanPillarBaseline =
      mode === "deep_dive" && focusPillarIds.length === 1
        ? await resolveQuickScanPillarBaseline(survey.parentSurveyId, focusPillarIds[0]!)
        : undefined;

    const report = buildMaturitySurveyReport({
      surveyTitle: survey.title,
      organizationName: survey.organizationName,
      frameworkCodes: survey.frameworkCodes,
      surveyMode: mode,
      catalog,
      libraryControlCount,
      focusPillarIds,
      focusPillarLabels,
      parentQuickScan,
      quickScanPillarBaseline,
      pillarLibraryControlCount,
      responses: responses.map((r) => ({
        controlId: r.controlId,
        pillarId: r.pillarId,
        maturity: r.maturity,
        notes: r.notes,
      })),
      documentResponses: documentResponses.map((r) => ({
        documentId: r.documentId,
        pillarId: r.pillarId,
        status: r.status,
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
