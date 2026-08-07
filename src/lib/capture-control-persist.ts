import { prisma } from "@/lib/db";
import type { CitationDraft } from "@/lib/control-analyzer";

export type PersistedControlAssessmentPayload = {
  workshopNotes: string;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: "aligned" | "partial" | "gap" | "not_assessed";
  citations: CitationDraft[];
};

export async function persistControlAssessment(
  assessmentId: string,
  controlId: string,
  result: PersistedControlAssessmentPayload
): Promise<void> {
  await prisma.evaluationCitation.deleteMany({
    where: { controlEvaluation: { assessmentId, controlId } },
  });

  const evaluation = await prisma.controlEvaluation.upsert({
    where: { assessmentId_controlId: { assessmentId, controlId } },
    create: {
      assessmentId,
      controlId,
      workshopNotes: result.workshopNotes,
      inPlaceFindings: result.inPlaceFindings,
      gapFindings: result.gapFindings,
      recommendations: result.recommendations,
      complianceStatus: result.complianceStatus,
      status: "ai_draft",
      aiGenerated: true,
      analyzedAt: new Date(),
    },
    update: {
      workshopNotes: result.workshopNotes,
      inPlaceFindings: result.inPlaceFindings,
      gapFindings: result.gapFindings,
      recommendations: result.recommendations,
      complianceStatus: result.complianceStatus,
      status: "ai_draft",
      aiGenerated: true,
      analyzedAt: new Date(),
    },
  });

  if (result.citations.length > 0) {
    await prisma.evaluationCitation.createMany({
      data: result.citations.map((c) => ({
        controlEvaluationId: evaluation.id,
        section: c.section,
        claimIndex: c.claimIndex,
        claimText: c.claimText,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        sourceLabel: c.sourceLabel,
        excerpt: c.excerpt,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        citationIndex: c.citationIndex,
      })),
    });
  }
}
