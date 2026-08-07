import { NextResponse } from "next/server";
import {
  listGovernanceEvidence,
  structureEvidenceFromRepository,
  structureEvidenceFromText,
} from "@/lib/governance-v2/evidence-structuring-engine";
import { mapEvidenceToControls } from "@/lib/governance-v2/control-mapping-v2";
import { syncGovernanceEvidenceFromCaptureAnalysis } from "@/lib/governance-v2/capture-evidence-sync";
import { syncDocumentationValidationForAssessment } from "@/lib/governance-v2/assessment-documentation-sync";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const evidence = await listGovernanceEvidence(id);
  return NextResponse.json({ evidence });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    if (body.action === "structure_repository") {
      const result = await structureEvidenceFromRepository(id);
      await mapEvidenceToControls(id);
      return NextResponse.json(result);
    }

    if (body.action === "structure_text" && body.text) {
      const result = await structureEvidenceFromText(id, {
        text: body.text,
        source: body.source,
        sourceEvidenceId: body.sourceEvidenceId,
      });
      return NextResponse.json(result);
    }

    if (body.action === "map_controls") {
      await syncGovernanceEvidenceFromCaptureAnalysis(id);
      const result = await mapEvidenceToControls(id);
      const docSync = await syncDocumentationValidationForAssessment(id, {
        useAi: body.useAi !== false,
        limit: body.docValidationLimit ?? 80,
      });
      return NextResponse.json({ ...result, documentationValidation: docSync });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evidence structuring failed" },
      { status: 500 }
    );
  }
}
