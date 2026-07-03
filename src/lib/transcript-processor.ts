import { prisma } from "@/lib/db";
import { buildCaptureAnalysisSummary } from "@/lib/capture-analysis-summary";
import type { CaptureAnalysisSummary } from "@/lib/capture-analysis-types";
import { runCaptureNotebookAnalysis } from "@/lib/capture-notebook-analyzer";
import { getCaptureSources, type CaptureSource } from "@/lib/capture-sources";

export type TranscriptSource = {
  id: string;
  fileName: string;
  text: string;
};

/** @deprecated Legacy extraction shape — notebook analysis no longer uses per-item extractions. */
export type TranscriptExtractionItem = {
  pillarLabel: string;
  topicLabel: string;
  question: string;
  answer: string;
  complianceTag: "COMPLIANT" | "PARTIAL" | "GAP" | null;
  sourceFile: string;
  sourceExcerpt: string;
  relatedControlCodes: string[];
};

export type TranscriptProcessResult = {
  workshopNotes: string;
  facilitatorNotes: string;
  extractions: TranscriptExtractionItem[];
  topicsNotDiscussed: string[];
  processingWarnings: string[];
  transcriptsProcessed: number;
  controlsUpdated: number;
  pillarsMatched: number;
  controlsAssessed: number;
  factsIndexed: number;
  apiCalls: number;
  model: string;
  analysisSummary: CaptureAnalysisSummary;
};

export async function getTranscriptSources(assessmentId: string): Promise<TranscriptSource[]> {
  const sources = await getCaptureSources(assessmentId);
  return sources.map(({ id, fileName, text }) => ({ id, fileName, text }));
}

function appendFacilitatorAuditTrail(
  base: string,
  sources: TranscriptSource[],
  warnings: string[],
  topicsNotDiscussed: string[],
  meta: { factsIndexed: number; apiCalls: number; controlsAssessed: number; targetedAssessed?: number }
): string {
  const lines = [base.trim()];
  lines.push("");
  lines.push("# Capture Analysis Log");
  lines.push(`Indexed ${sources.length} source file(s): ${sources.map((s) => s.fileName).join(", ")}`);
  lines.push(
    `Notebook pass: ${meta.factsIndexed} facts indexed · ${meta.controlsAssessed} controls assessed · ${meta.apiCalls} API call(s)${
      meta.targetedAssessed ? ` · ${meta.targetedAssessed} via targeted retrieval` : ""
    }`
  );
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  if (warnings.length > 0) {
    lines.push("", "Warnings:", ...warnings.map((w) => `- ${w}`));
  }
  if (topicsNotDiscussed.length > 0) {
    lines.push("", "Topics not covered in uploaded files:", ...topicsNotDiscussed.map((t) => `- ${t}`));
  }
  return lines.join("\n");
}

export async function processWorkshopTranscripts(
  assessmentId: string,
  options: {
    mergeMode?: "merge" | "replace";
    existingWorkshopNotes?: string;
    existingFacilitatorNotes?: string;
  } = {}
): Promise<TranscriptProcessResult> {
  const sources = await getCaptureSources(assessmentId);
  if (sources.length === 0) {
    throw new Error(
      "No readable files found. Upload workshop notes, policies, procedures, or supporting records (PDF, TXT, Word .docx, or images with extractable text), then try again."
    );
  }

  const transcriptSources = sources.map(({ id, fileName, text }) => ({ id, fileName, text }));

  const repo = await prisma.assessmentRepository.findUnique({ where: { assessmentId } });
  const existingFacilitator = options.existingFacilitatorNotes ?? repo?.facilitatorNotes ?? "";

  const notebook = await runCaptureNotebookAnalysis(assessmentId, sources);

  const workshopNotes =
    notebook.assessments
      .map((a) => `## ${a.controlCode}\n${a.workshopNotes}`)
      .join("\n\n") ||
    notebook.summary;

  const facilitatorNotes = appendFacilitatorAuditTrail(
    existingFacilitator,
    transcriptSources,
    notebook.processingWarnings,
    notebook.topicsNotDiscussed,
    {
      factsIndexed: notebook.factsIndexed,
      apiCalls: notebook.apiCalls,
      controlsAssessed: notebook.assessments.length,
      targetedAssessed: notebook.targetedAssessedCount,
    }
  );

  const captureAnalysisMeta = {
    summary: notebook.summary,
    topicsNotDiscussed: notebook.topicsNotDiscussed,
    warnings: notebook.processingWarnings,
    analyzedAt: new Date().toISOString(),
    sourceEvidenceIds: sources.map((s) => s.id),
    fileNames: sources.map((s) => s.fileName),
  };

  await prisma.assessmentRepository.upsert({
    where: { assessmentId },
    create: { assessmentId, workshopNotes, facilitatorNotes, captureAnalysisMeta },
    update: { workshopNotes, facilitatorNotes, captureAnalysisMeta },
  });

  const analysisSummary = await buildCaptureAnalysisSummary(assessmentId, {
    summary: notebook.summary,
    extractions: [],
    fileNames: sources.map((s) => s.fileName),
    topicsNotDiscussed: notebook.topicsNotDiscussed,
    warnings: notebook.processingWarnings,
    unmappedSentences: 0,
  });

  return {
    workshopNotes,
    facilitatorNotes,
    extractions: [],
    topicsNotDiscussed: notebook.topicsNotDiscussed,
    processingWarnings: notebook.processingWarnings,
    transcriptsProcessed: sources.length,
    controlsUpdated: notebook.assessments.length,
    pillarsMatched: analysisSummary.pillarsCovered.length,
    controlsAssessed: notebook.assessments.length,
    factsIndexed: notebook.factsIndexed,
    apiCalls: notebook.apiCalls,
    model: notebook.model,
    analysisSummary,
  };
}
