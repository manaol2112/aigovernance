import { NextResponse } from "next/server";
import {
  loadGuidedWorkshopBundle,
  isGuidedWorkshopDbError,
  guidedWorkshopDbMessage,
} from "@/lib/guided-workshop-service";
import { isQuestionCatalogPack } from "@/lib/pillar-questionnaire";
import {
  buildPackExportFilename,
  generatePackMaturityPdf,
} from "@/lib/pack-maturity-pdf-generator";
import { getPackClientCopy } from "@/lib/maturity-client-copy";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const bundle = await loadGuidedWorkshopBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "Workshop not found." }, { status: 404 });
    }
    if (bundle.workshop.status !== "completed") {
      return NextResponse.json({ error: "Complete the workshop before exporting." }, { status: 400 });
    }

    if (isQuestionCatalogPack(bundle.workshop.questionCatalogSource) && bundle.packReport) {
      const copy = getPackClientCopy("workshop");
      const pdf = await generatePackMaturityPdf(bundle.packReport, copy);
      const filename = buildPackExportFilename(bundle.packReport, "workshop-report");
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ error: "Export is only available for custom-question workshops." }, { status: 400 });
  } catch (error) {
    if (isGuidedWorkshopDbError(error)) {
      return NextResponse.json({ error: guidedWorkshopDbMessage(error) }, { status: 503 });
    }
    console.error("[guided-workshops/export GET]", error);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
