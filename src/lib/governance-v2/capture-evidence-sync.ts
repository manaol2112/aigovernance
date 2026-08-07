import { prisma } from "@/lib/db";
import { syncAISystemsFromUseCases } from "@/lib/governance-v2/ai-system-registry";
import type { StructuredSignals } from "@/lib/governance-v2/types";
import { citationEvidenceConfidence } from "@/lib/governance-v2/mapping-metrics";

/**
 * Build v2 governance evidence from capture analysis — one row per citation, linked by control ID.
 */
export async function syncGovernanceEvidenceFromCaptureAnalysis(assessmentId: string) {
  await syncAISystemsFromUseCases(assessmentId);

  const evaluations = await prisma.controlEvaluation.findMany({
    where: { assessmentId },
    include: {
      control: { select: { id: true, code: true, title: true } },
      citations: { orderBy: { citationIndex: "asc" } },
    },
  });

  await prisma.governanceEvidence.deleteMany({ where: { assessmentId } });

  const createdEvidence = [];

  for (const evaluation of evaluations) {
    const hasFindings =
      Boolean(evaluation.inPlaceFindings?.trim()) ||
      Boolean(evaluation.gapFindings?.trim()) ||
      Boolean(evaluation.recommendations?.trim());

    if (!hasFindings && evaluation.citations.length === 0) continue;

    if (evaluation.citations.length > 0) {
      for (const citation of evaluation.citations) {
        const rawText = (citation.excerpt || citation.claimText || "").trim();
        if (!rawText) continue;

        const signals: StructuredSignals = {
          linkedControlId: evaluation.controlId,
          controlCode: evaluation.control.code,
          aiUsageDetected: evaluation.complianceStatus !== "not_assessed",
        };

        const row = await prisma.governanceEvidence.create({
          data: {
            assessmentId,
            source: "workshop",
            rawText,
            structuredSignals: signals,
            confidenceScore: citationEvidenceConfidence(
              evaluation.complianceStatus,
              citation.excerpt,
              Boolean(citation.sourceId)
            ),
            sourceEvidenceId: citation.sourceId,
          },
        });
        createdEvidence.push(row);
      }
      continue;
    }

    const rawText = [
      evaluation.inPlaceFindings?.trim(),
      evaluation.gapFindings?.trim(),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);

    if (!rawText) continue;

    const signals: StructuredSignals = {
      linkedControlId: evaluation.controlId,
      controlCode: evaluation.control.code,
      aiUsageDetected: evaluation.complianceStatus !== "not_assessed",
    };

    const row = await prisma.governanceEvidence.create({
      data: {
        assessmentId,
        source: "workshop",
        rawText,
        structuredSignals: signals,
        confidenceScore: citationEvidenceConfidence(evaluation.complianceStatus, rawText, false),
      },
    });
    createdEvidence.push(row);
  }

  return {
    createdEvidence,
    detectedSystems: [],
    model: "capture-sync",
    syncedFromControls: new Set(createdEvidence.map((e) => (e.structuredSignals as StructuredSignals).linkedControlId)).size,
  };
}
