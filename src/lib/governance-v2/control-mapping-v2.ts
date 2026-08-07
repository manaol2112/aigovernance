import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import { buildExplainability } from "@/lib/governance-v2/explainability";
import {
  buildAmbiguityFlags,
  buildTraceabilityBreakdown,
  evidenceBelongsToControl,
} from "@/lib/governance-v2/mapping-metrics";
import {
  complianceToImplementationStatus,
  type StructuredSignals,
} from "@/lib/governance-v2/types";

export async function mapEvidenceToControls(assessmentId: string) {
  const [evidence, scopedControls, evaluations] = await Promise.all([
    prisma.governanceEvidence.findMany({ where: { assessmentId } }),
    getScopedControlsForAssessment(assessmentId),
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      include: {
        control: true,
        citations: true,
      },
    }),
  ]);

  const evalByControlId = new Map(evaluations.map((e) => [e.controlId, e]));

  const evidenceByControlId = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const signals = item.structuredSignals as StructuredSignals;
    const control = scopedControls.find((c) => evidenceBelongsToControl(signals, c));
    if (!control) continue;
    const list = evidenceByControlId.get(control.id) ?? [];
    list.push(item);
    evidenceByControlId.set(control.id, list);
  }

  const updates = [];

  for (const control of scopedControls) {
    const existing = evalByControlId.get(control.id);
    const relatedEvidence = evidenceByControlId.get(control.id) ?? [];

    if (!existing) continue;

    const wasAnalyzed =
      existing.aiGenerated ||
      existing.complianceStatus !== "not_assessed" ||
      Boolean(existing.inPlaceFindings?.trim()) ||
      Boolean(existing.gapFindings?.trim()) ||
      existing.citations.length > 0;

    if (!wasAnalyzed) continue;

    if (relatedEvidence.length === 0) {
      await prisma.controlEvaluation.update({
        where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
        data: {
          mappingConfidence: null,
          evidenceStrength: null,
          linkedEvidenceIds: [],
          explainability: Prisma.JsonNull,
          ambiguityFlags: buildAmbiguityFlags({
            complianceStatus: existing.complianceStatus,
            mappingConfidence: null,
            citationCount: existing.citations.length,
            sourcedCitationCount: 0,
            evidenceCount: 0,
            aiGenerated: existing.aiGenerated,
          }),
        },
      });
      continue;
    }

    const citationInputs = existing.citations.map((c) => ({
      sourceId: c.sourceId,
      excerpt: c.excerpt,
    }));

    const scoreBreakdown = buildTraceabilityBreakdown({
      evaluation: existing,
      evidenceItems: relatedEvidence.map((e) => ({
        confidenceScore: e.confidenceScore,
        rawText: e.rawText,
      })),
      citations: citationInputs,
    });

    const mappingConfidence = scoreBreakdown.traceability;
    const evidenceStrength = scoreBreakdown.evidenceStrength;
    const implementationStatus = complianceToImplementationStatus(existing.complianceStatus);
    const ambiguityFlags = buildAmbiguityFlags({
      complianceStatus: existing.complianceStatus,
      mappingConfidence,
      citationCount: existing.citations.length,
      sourcedCitationCount: scoreBreakdown.sourcedCitationCount,
      evidenceCount: relatedEvidence.length,
      aiGenerated: existing.aiGenerated,
    });

    const explainability = buildExplainability({
      controlCode: control.code,
      controlTitle: control.title,
      complianceStatus: existing.complianceStatus,
      inPlaceFindings: existing.inPlaceFindings,
      gapFindings: existing.gapFindings,
      recommendations: existing.recommendations,
      evidence: relatedEvidence.map((e) => ({
        excerpt: e.rawText,
        confidence: e.confidenceScore,
        sourceLabel: null,
      })),
      scoreBreakdown,
    });

    const updated = await prisma.controlEvaluation.update({
      where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
      data: {
        mappingConfidence,
        evidenceStrength,
        linkedEvidenceIds: relatedEvidence.map((e) => e.id),
        implementationStatus,
        ambiguityFlags,
        explainability,
      },
    });
    updates.push(updated);
  }

  return { mappedCount: updates.length, evaluations: updates };
}

export async function getControlMappingView(assessmentId: string) {
  const evaluations = await prisma.controlEvaluation.findMany({
    where: {
      assessmentId,
      OR: [
        { aiGenerated: true },
        { complianceStatus: { not: "not_assessed" } },
        { mappingConfidence: { not: null } },
        { inPlaceFindings: { not: "" } },
        { gapFindings: { not: "" } },
      ],
    },
    include: {
      control: { select: { id: true, code: true, title: true, ownerRole: true } },
      disagreements: { where: { status: "open" } },
      citations: {
        orderBy: { citationIndex: "asc" },
        take: 8,
      },
    },
    orderBy: { control: { code: "asc" } },
  });

  const evidenceIds = [...new Set(evaluations.flatMap((e) => e.linkedEvidenceIds))];
  const evidenceRows =
    evidenceIds.length > 0
      ? await prisma.governanceEvidence.findMany({
          where: { id: { in: evidenceIds } },
          include: { sourceFile: { select: { fileName: true } } },
        })
      : [];
  const evidenceById = new Map(evidenceRows.map((row) => [row.id, row]));

  return evaluations.map((evaluation) => ({
    id: evaluation.id,
    controlId: evaluation.control.id,
    complianceStatus: evaluation.complianceStatus,
    mappingConfidence: evaluation.mappingConfidence,
    evidenceStrength: evaluation.evidenceStrength,
    implementationStatus: evaluation.implementationStatus,
    ambiguityFlags: evaluation.ambiguityFlags,
    explainability: evaluation.explainability,
    inPlaceFindings: evaluation.inPlaceFindings,
    gapFindings: evaluation.gapFindings,
    recommendations: evaluation.recommendations,
    control: evaluation.control,
    disagreements: evaluation.disagreements,
    citations: evaluation.citations.map((c) => ({
      id: c.id,
      citationIndex: c.citationIndex,
      section: c.section,
      claimText: c.claimText,
      excerpt: c.excerpt,
      sourceLabel: c.sourceLabel,
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      startOffset: c.startOffset,
      endOffset: c.endOffset,
    })),
    linkedEvidence: evaluation.linkedEvidenceIds
      .map((id) => {
        const row = evidenceById.get(id);
        if (!row) return null;
        return {
          id: row.id,
          rawText: row.rawText,
          confidenceScore: row.confidenceScore,
          sourceFileName: row.sourceFile?.fileName ?? null,
          sourceEvidenceId: row.sourceEvidenceId,
        };
      })
      .filter(Boolean),
  }));
}
