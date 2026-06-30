import { prisma } from "@/lib/db";
import { CAPTURE_FINDING_FALLBACKS } from "@/lib/capture-finding-format";
import { getPillarControlTreeForAssessment } from "@/lib/pillar-control-tree";
import type { TranscriptExtractionItem } from "@/lib/transcript-processor";
import type { CaptureAnalysisSummary, ControlMappingEntry } from "@/lib/capture-analysis-types";

export type { CaptureAnalysisSummary, ControlMappingEntry };

export async function applyExtractionMappings(
  assessmentId: string,
  extractions: TranscriptExtractionItem[]
): Promise<number> {
  let updated = 0;

  for (const item of extractions) {
    if (!item.relatedControlCodes?.length) continue;

    const narrative = [
      `[${item.sourceFile}] ${item.answer}`,
      item.sourceExcerpt ? `Source excerpt: "${item.sourceExcerpt}"` : null,
    ]
      .filter(Boolean)
      .join("\n");

    for (const code of item.relatedControlCodes) {
      const control = await prisma.canonicalControl.findFirst({
        where: { code: { equals: code, mode: "insensitive" } },
      });
      if (!control) continue;

      const existing = await prisma.controlEvaluation.findUnique({
        where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
      });

      const block = `--- Transcript analysis (${item.sourceFile}) ---\n${narrative}`;
      const fingerprint = item.sourceExcerpt?.slice(0, 40) ?? item.answer.slice(0, 40);
      const merged =
        existing?.workshopNotes?.includes(fingerprint)
          ? existing.workshopNotes
          : existing?.workshopNotes
            ? `${existing.workshopNotes}\n\n${block}`
            : block;

      await prisma.controlEvaluation.upsert({
        where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
        create: {
          assessmentId,
          controlId: control.id,
          workshopNotes: merged,
          status: "pending",
        },
        update: { workshopNotes: merged },
      });
      updated++;
    }
  }

  return updated;
}

export async function buildCaptureAnalysisSummary(
  assessmentId: string,
  options: {
    summary?: string;
    extractions: TranscriptExtractionItem[];
    fileNames: string[];
    topicsNotDiscussed: string[];
    warnings: string[];
    unmappedSentences: number;
  }
): Promise<CaptureAnalysisSummary> {
  const tree = await getPillarControlTreeForAssessment(assessmentId);

  const evaluations = await prisma.controlEvaluation.findMany({
    where: {
      assessmentId,
      OR: [
        { workshopNotes: { not: null } },
        { inPlaceFindings: { not: "" } },
        { gapFindings: { not: "" } },
      ],
    },
    include: {
      control: { select: { id: true, code: true, title: true, description: true } },
      citations: { orderBy: { citationIndex: "asc" } },
    },
  });

  const evalByControlId = new Map(evaluations.map((e) => [e.controlId, e]));

  const extractionByCode = new Map<string, TranscriptExtractionItem[]>();
  for (const ext of options.extractions) {
    for (const code of ext.relatedControlCodes ?? []) {
      const key = code.toUpperCase();
      const list = extractionByCode.get(key) ?? [];
      list.push(ext);
      extractionByCode.set(key, list);
    }
  }

  const mappings: ControlMappingEntry[] = [];

  for (const pillar of tree) {
    for (const control of pillar.controls) {
      const evalRow = evalByControlId.get(control.id);
      const notes = evalRow?.workshopNotes?.trim();
      const aiItems = extractionByCode.get(control.code.toUpperCase()) ?? [];
      const hasAssessment =
        Boolean(evalRow?.inPlaceFindings?.trim()) || Boolean(evalRow?.gapFindings?.trim());
      if (!notes && aiItems.length === 0 && !hasAssessment) continue;

      const citationSourceFiles = (evalRow?.citations ?? [])
        .map((c) => c.sourceLabel.replace(/^Transcript:\s*/i, ""))
        .filter(Boolean);

      mappings.push({
        controlId: control.id,
        controlCode: control.code,
        controlTitle: control.title,
        controlDescription:
          control.description?.trim() ||
          evalRow?.control.description?.trim() ||
          "",
        pillarId: pillar.pillarId,
        pillarLabel: pillar.pillarLabel,
        narrative: notes ?? aiItems.map((i) => i.answer).join("\n\n"),
        inPlaceFindings:
          evalRow?.inPlaceFindings?.trim() ||
          CAPTURE_FINDING_FALLBACKS.inPlace,
        gapFindings:
          evalRow?.gapFindings?.trim() ||
          CAPTURE_FINDING_FALLBACKS.gap,
        recommendations:
          evalRow?.recommendations?.trim() ||
          CAPTURE_FINDING_FALLBACKS.recommendation,
        complianceStatus:
          (evalRow?.complianceStatus as ControlMappingEntry["complianceStatus"]) || "not_assessed",
        sourceFiles: [
          ...new Set([
            ...aiItems.map((i) => i.sourceFile).filter(Boolean),
            ...citationSourceFiles,
          ]),
        ],
        excerpts: aiItems.map((i) => i.sourceExcerpt).filter(Boolean),
        citations: (evalRow?.citations ?? []).map((c) => ({
          id: c.id,
          citationIndex: c.citationIndex,
          section: c.section,
          claimText: c.claimText,
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          sourceLabel: c.sourceLabel,
          excerpt: c.excerpt,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
        })),
      });
    }
  }

  const pillarsCovered = [...new Set(mappings.map((m) => m.pillarLabel))];

  return {
    summary:
      options.summary?.trim() ||
      `Analyzed ${options.fileNames.length} file(s) and assessed ${mappings.length} control(s) across ${pillarsCovered.length} risk pillar(s).`,
    filesProcessed: options.fileNames.length,
    fileNames: options.fileNames,
    controlsMapped: mappings.length,
    pillarsCovered,
    topicsNotDiscussed: options.topicsNotDiscussed,
    unmappedSentences: options.unmappedSentences,
    warnings: options.warnings,
    mappings: mappings.sort(
      (a, b) =>
        a.pillarLabel.localeCompare(b.pillarLabel) || a.controlCode.localeCompare(b.controlCode)
    ),
  };
}
