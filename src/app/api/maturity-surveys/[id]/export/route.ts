import { NextResponse } from "next/server";
import {
  loadMaturitySurveyBundle,
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";
import { isQuestionCatalogPack } from "@/lib/pillar-questionnaire";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import {
  buildMaturityExportFilename,
  generateMaturitySurveyPdf,
} from "@/lib/maturity-survey-pdf-generator";
import {
  buildPackExportFilename,
  generatePackMaturityPdf,
} from "@/lib/pack-maturity-pdf-generator";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const bundle = await loadMaturitySurveyBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }
    if (bundle.survey.status !== "completed") {
      return NextResponse.json({ error: "Complete the assessment before exporting." }, { status: 400 });
    }

    if (isQuestionCatalogPack(bundle.survey.questionCatalogSource) && bundle.packReport) {
      const pdf = await generatePackMaturityPdf(bundle.packReport);
      const filename = buildPackExportFilename(bundle.packReport);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const report = bundle.report as MaturitySurveyReport;
    const pdf = await generateMaturitySurveyPdf(report);
    const filename = buildMaturityExportFilename(report);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return NextResponse.json({ error: databaseSetupMessage(error) }, { status: 503 });
    }
    console.error("[maturity-surveys/export GET]", error);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
