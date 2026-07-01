import { prisma } from "@/lib/db";
import { callOpenAIJson } from "@/lib/openai-client";
import type { CitationDraft } from "@/lib/control-analyzer";
import { findExcerptSpan } from "@/lib/capture-source-corpus";
import {
  coerceFindingItems,
  normalizeFindingItems,
  resolveCaptureSectionFallbacks,
} from "@/lib/capture-finding-format";
import {
  formatLineWithCitation,
  formatNumberedRecommendations,
} from "@/lib/finding-citations";
import { persistControlAssessment } from "@/lib/capture-control-persist";
import {
  CAPTURE_TARGETED_ASSESS_SYSTEM_PROMPT,
  buildCaptureTargetedAssessUserPrompt,
} from "@/lib/transcript-analysis-prompts";
import {
  formatChunksForPrompt,
  retrieveRelevantChunks,
  type SourceChunkRecord,
} from "@/lib/capture-vector-index";
import { runWithConcurrency } from "@/lib/concurrency";
import type { PillarControlGroup } from "@/lib/pillar-control-tree";
import type { PersistedControlAssessment } from "@/lib/capture-analysis-types";

const TARGETED_CONCURRENCY = 4;
const TARGETED_TOP_K = 10;

type ChunkCitation = {
  section: CitationDraft["section"];
  claimText: string;
  chunkId: string;
  excerpt?: string;
};

type TargetedAssessmentRow = {
  controlCode: string;
  complianceStatus?: PersistedControlAssessment["complianceStatus"];
  inPlaceFindings?: string[];
  gapFindings?: string[];
  recommendations?: string[];
  citations?: ChunkCitation[];
};

type TargetedAssessResponse = {
  insufficientEvidence?: boolean;
  assessment?: TargetedAssessmentRow;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function resolveChunk(chunks: SourceChunkRecord[], ref?: string): SourceChunkRecord | null {
  if (!ref?.trim()) return null;
  const trimmed = ref.trim();
  const exact = chunks.find((c) => c.id === trimmed);
  if (exact) return exact;
  const partial = chunks.find((c) => c.id.includes(trimmed) || trimmed.includes(c.id));
  if (partial) return partial;
  const chunkNum = trimmed.match(/(?:chunk\s*)?(\d+)/i);
  if (chunkNum) {
    const idx = parseInt(chunkNum[1], 10) - 1;
    if (idx >= 0 && idx < chunks.length) return chunks[idx];
  }
  return chunks.find((c) => c.evidenceId === trimmed) ?? null;
}

function buildChunkCitation(
  section: CitationDraft["section"],
  claimIndex: number,
  claimText: string,
  chunk: SourceChunkRecord,
  fullText: string,
  excerptInput: string | undefined,
  citationIndex: number
): CitationDraft {
  const span = findExcerptSpan(fullText, excerptInput || chunk.text.slice(0, 120));
  const excerpt = span
    ? fullText.slice(span.startOffset, span.endOffset)
    : excerptInput?.trim() || chunk.text.slice(0, 200);

  return {
    section,
    claimIndex,
    claimText,
    sourceType: "evidence",
    sourceId: chunk.evidenceId,
    sourceLabel: `Transcript: ${chunk.fileName}`,
    excerpt,
    startOffset: span?.startOffset ?? chunk.startOffset,
    endOffset: span?.endOffset ?? chunk.endOffset,
    citationIndex,
  };
}

function formatSectionWithChunkCitations(
  section: CitationDraft["section"],
  items: string[],
  rawCitations: ChunkCitation[] | undefined,
  chunks: SourceChunkRecord[],
  textByEvidenceId: Map<string, string>,
  outCitations: CitationDraft[],
  counter: { value: number },
  numberRecommendations = false
): string {
  if (items.length === 0) return "";

  const displayItems = numberRecommendations ? formatNumberedRecommendations(items) : items;
  const sectionCites = rawCitations?.filter((c) => c.section === section) ?? [];
  const lines: string[] = [];

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i];
    const rawItem = items[i];
    const cite =
      sectionCites.find((c) => normalizeWhitespace(c.claimText) === normalizeWhitespace(rawItem)) ??
      sectionCites.find((c) => normalizeWhitespace(c.claimText) === normalizeWhitespace(item)) ??
      sectionCites[i];

    if (cite?.chunkId) {
      const chunk = resolveChunk(chunks, cite.chunkId);
      if (chunk) {
        const fullText = textByEvidenceId.get(chunk.evidenceId) ?? chunk.text;
        const draft = buildChunkCitation(
          section,
          i,
          rawItem,
          chunk,
          fullText,
          cite.excerpt,
          counter.value
        );
        outCitations.push(draft);
        lines.push(formatLineWithCitation(item, counter.value));
        counter.value++;
        continue;
      }
    }
    lines.push(item);
  }

  return lines.join("\n");
}

function buildPersistedFromTargetedRow(
  row: TargetedAssessmentRow,
  controlId: string,
  chunks: SourceChunkRecord[],
  textByEvidenceId: Map<string, string>
): PersistedControlAssessment {
  const inPlaceRaw = coerceFindingItems(row.inPlaceFindings);
  const gapRaw = coerceFindingItems(row.gapFindings);
  const recRaw = coerceFindingItems(row.recommendations);
  const inPlaceItems = normalizeFindingItems(inPlaceRaw);
  const gapItems = normalizeFindingItems(gapRaw);
  const recItems = normalizeFindingItems(recRaw);

  const citations: CitationDraft[] = [];
  const counter = { value: 1 };

  const inPlace = formatSectionWithChunkCitations(
    "in_place",
    inPlaceItems,
    row.citations,
    chunks,
    textByEvidenceId,
    citations,
    counter
  );
  const gaps = formatSectionWithChunkCitations(
    "gap",
    gapItems,
    row.citations,
    chunks,
    textByEvidenceId,
    citations,
    counter
  );
  const recs = formatSectionWithChunkCitations(
    "recommendation",
    recItems,
    row.citations,
    chunks,
    textByEvidenceId,
    citations,
    counter,
    true
  );

  const citedChunks = new Set(
    (row.citations ?? [])
      .map((c) => resolveChunk(chunks, c.chunkId))
      .filter(Boolean) as SourceChunkRecord[]
  );

  const workshopNotes = [...citedChunks]
    .map((chunk) => {
      const cite = row.citations?.find((c) => resolveChunk(chunks, c.chunkId)?.id === chunk.id);
      const excerpt = cite?.excerpt?.trim() || chunk.text.slice(0, 280);
      return `[${chunk.fileName}] ${excerpt}`;
    })
    .join("\n\n");

  const hasWorkshopCoverage = citations.length > 0 || citedChunks.size > 0;

  const fallbacks = resolveCaptureSectionFallbacks({
    hasWorkshopCoverage,
    gapItems,
    inPlaceItems,
    recommendationItems: recItems,
    complianceStatus: row.complianceStatus,
  });

  return {
    controlId,
    controlCode: row.controlCode,
    inPlaceFindings: inPlace || fallbacks.inPlace,
    gapFindings: gaps || fallbacks.gap,
    recommendations: recs || fallbacks.recommendation,
    complianceStatus: hasWorkshopCoverage
      ? (row.complianceStatus ?? "partial")
      : "not_assessed",
    citations,
    workshopNotes,
  };
}

export async function assessControlFromRetrievedChunks(options: {
  assessmentId: string;
  controlId: string;
  controlCode: string;
  title: string;
  description: string;
  frameworkRequirements?: string[];
  procedureSummary?: string;
}): Promise<{ assessment: PersistedControlAssessment | null; apiCalls: number; model?: string }> {
  const query = [
    options.controlCode,
    options.title,
    options.description.slice(0, 200),
    "workshop governance evidence practices",
  ].join(" ");

  const chunks = await retrieveRelevantChunks(options.assessmentId, query, TARGETED_TOP_K);
  if (chunks.length === 0) {
    return { assessment: null, apiCalls: 0 };
  }

  const evidenceTexts = await prisma.assessmentEvidence.findMany({
    where: { assessmentId: options.assessmentId, id: { in: chunks.map((c) => c.evidenceId) } },
    select: { id: true, extractedText: true },
  });
  const textByEvidenceId = new Map(
    evidenceTexts.map((e) => [e.id, e.extractedText ?? ""])
  );

  const aiResult = await callOpenAIJson<TargetedAssessResponse>({
    system: CAPTURE_TARGETED_ASSESS_SYSTEM_PROMPT,
    user: buildCaptureTargetedAssessUserPrompt({
      controlCode: options.controlCode,
      title: options.title,
      description: options.description,
      frameworkRequirements: options.frameworkRequirements,
      procedureSummary: options.procedureSummary,
      sourceChunks: formatChunksForPrompt(chunks),
    }),
    temperature: 0.1,
    maxTokens: 6_000,
  });

  if (!aiResult.ok || aiResult.data.insufficientEvidence || !aiResult.data.assessment) {
    return { assessment: null, apiCalls: 1, model: aiResult.ok ? aiResult.model : undefined };
  }

  const row = aiResult.data.assessment;
  if (row.controlCode.toUpperCase() !== options.controlCode.toUpperCase()) {
    row.controlCode = options.controlCode;
  }

  const assessment = buildPersistedFromTargetedRow(
    row,
    options.controlId,
    chunks,
    textByEvidenceId
  );

  if (assessment.complianceStatus === "not_assessed" || assessment.citations.length === 0) {
    return { assessment: null, apiCalls: 1, model: aiResult.model };
  }

  return { assessment, apiCalls: 1, model: aiResult.model };
}

export type TargetedPassResult = {
  assessed: PersistedControlAssessment[];
  apiCalls: number;
  skipped: number;
};

export async function runTargetedControlPass(options: {
  assessmentId: string;
  pillarTree: PillarControlGroup[];
  existingAssessments: PersistedControlAssessment[];
  requirementByCode: Map<
    string,
    { frameworkRequirements: string[]; procedureSummary?: string }
  >;
}): Promise<TargetedPassResult> {
  const coveredWell = new Set(
    options.existingAssessments
      .filter(
        (a) =>
          a.complianceStatus !== "not_assessed" &&
          a.citations.length > 0
      )
      .map((a) => a.controlCode.toUpperCase())
  );

  const toAssess: Array<{
    controlId: string;
    code: string;
    title: string;
    description: string;
    frameworkRequirements: string[];
    procedureSummary?: string;
  }> = [];

  for (const pillar of options.pillarTree) {
    for (const control of pillar.controls) {
      if (coveredWell.has(control.code.toUpperCase())) continue;
      const req = options.requirementByCode.get(control.code.toUpperCase());
      toAssess.push({
        controlId: control.id,
        code: control.code,
        title: control.title,
        description: control.description,
        frameworkRequirements: req?.frameworkRequirements ?? [],
        procedureSummary: req?.procedureSummary,
      });
    }
  }

  if (toAssess.length === 0) {
    return { assessed: [], apiCalls: 0, skipped: 0 };
  }

  let apiCalls = 0;
  let model: string | undefined;
  const assessed: PersistedControlAssessment[] = [];

  const results = await runWithConcurrency(toAssess, TARGETED_CONCURRENCY, async (control) => {
    const result = await assessControlFromRetrievedChunks({
      assessmentId: options.assessmentId,
      controlId: control.controlId,
      controlCode: control.code,
      title: control.title,
      description: control.description,
      frameworkRequirements: control.frameworkRequirements,
      procedureSummary: control.procedureSummary,
    });
    return { control, result };
  });

  for (const { control, result } of results) {
    apiCalls += result.apiCalls;
    if (result.model) model = result.model;
    if (!result.assessment) continue;

    await persistControlAssessment(options.assessmentId, control.controlId, {
      workshopNotes: result.assessment.workshopNotes,
      inPlaceFindings: result.assessment.inPlaceFindings,
      gapFindings: result.assessment.gapFindings,
      recommendations: result.assessment.recommendations,
      complianceStatus: result.assessment.complianceStatus,
      citations: result.assessment.citations,
    });
    assessed.push(result.assessment);
  }

  return {
    assessed,
    apiCalls,
    skipped: toAssess.length - assessed.length,
  };
}