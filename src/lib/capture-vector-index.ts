import { prisma } from "@/lib/db";
import { embedQuery, embedTexts } from "@/lib/openai-embeddings";
import { isTranscriptEvidence } from "@/lib/transcript-evidence";

export type SourceChunkRecord = {
  id: string;
  assessmentId: string;
  evidenceId: string;
  chunkIndex: number;
  fileName: string;
  text: string;
  startOffset: number;
  endOffset: number;
  embedding: number[];
  score?: number;
};

export const LARGE_CORPUS_CHAR_THRESHOLD = 40_000;
export const DEFAULT_TOP_K = 12;
const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 150;
const EMBED_BATCH = 64;

export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): Array<{ text: string; startOffset: number; endOffset: number }> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= chunkSize) {
    return [{ text: trimmed, startOffset: 0, endOffset: trimmed.length }];
  }

  const chunks: Array<{ text: string; startOffset: number; endOffset: number }> = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + chunkSize, trimmed.length);
    if (end < trimmed.length) {
      const breakAt = trimmed.lastIndexOf("\n", end);
      if (breakAt > start + chunkSize * 0.5) end = breakAt;
    }
    const slice = trimmed.slice(start, end).trim();
    if (slice) {
      chunks.push({ text: slice, startOffset: start, endOffset: end });
    }
    if (end >= trimmed.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function captureIndexSetupError(cause?: unknown): Error {
  const hint =
    "If you recently updated the schema, restart the dev server: npm run dev";
  const detail = cause instanceof Error ? ` ${cause.message}` : "";
  return new Error(`Capture vector index is not ready.${detail} ${hint}`);
}

function hasChunkDelegate(): boolean {
  return typeof prisma.captureSourceChunk !== "undefined";
}

async function countChunks(assessmentId: string): Promise<number> {
  if (!hasChunkDelegate()) {
    throw captureIndexSetupError();
  }
  try {
    return await prisma.captureSourceChunk.count({ where: { assessmentId } });
  } catch (error) {
    throw captureIndexSetupError(error);
  }
}

function parseEmbedding(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is number => typeof v === "number");
}

export async function getCaptureIndexStats(assessmentId: string): Promise<{
  chunkCount: number;
  sourceCount: number;
  totalChars: number;
  indexReady: boolean;
}> {
  let chunkCount = 0;
  let indexReady = hasChunkDelegate();
  try {
    chunkCount = await countChunks(assessmentId);
  } catch {
    indexReady = false;
    chunkCount = 0;
  }

  const sources = await prisma.assessmentEvidence.findMany({
    where: { assessmentId },
    select: { id: true, description: true, extractedText: true },
  });

  const transcriptSources = sources.filter(
    (s) => isTranscriptEvidence(s.description) && s.extractedText?.trim()
  );

  return {
    chunkCount,
    sourceCount: transcriptSources.length,
    totalChars: transcriptSources.reduce((n, s) => n + (s.extractedText?.length ?? 0), 0),
    indexReady,
  };
}

export async function indexEvidenceFile(
  assessmentId: string,
  evidenceId: string
): Promise<{ chunksIndexed: number }> {
  const evidence = await prisma.assessmentEvidence.findFirst({
    where: { id: evidenceId, assessmentId },
  });
  if (!evidence?.extractedText?.trim()) {
    return { chunksIndexed: 0 };
  }

  await prisma.captureSourceChunk.deleteMany({ where: { evidenceId } });

  const parts = chunkText(evidence.extractedText);
  if (parts.length === 0) return { chunksIndexed: 0 };

  let indexed = 0;
  for (let i = 0; i < parts.length; i += EMBED_BATCH) {
    const batch = parts.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch.map((p) => p.text));

    await prisma.captureSourceChunk.createMany({
      data: batch.map((part, j) => ({
        assessmentId,
        evidenceId,
        chunkIndex: i + j,
        fileName: evidence.fileName,
        text: part.text,
        startOffset: part.startOffset,
        endOffset: part.endOffset,
        embedding: vectors[j],
      })),
    });
    indexed += batch.length;
  }

  return { chunksIndexed: indexed };
}

export async function reindexAllCaptureSources(assessmentId: string): Promise<{
  filesIndexed: number;
  chunksIndexed: number;
}> {
  const files = await prisma.assessmentEvidence.findMany({
    where: { assessmentId },
    orderBy: { uploadedAt: "asc" },
  });

  await prisma.captureSourceChunk.deleteMany({ where: { assessmentId } });

  let filesIndexed = 0;
  let chunksIndexed = 0;

  for (const file of files) {
    if (!isTranscriptEvidence(file.description) || !file.extractedText?.trim()) continue;
    const result = await indexEvidenceFile(assessmentId, file.id);
    if (result.chunksIndexed > 0) {
      filesIndexed++;
      chunksIndexed += result.chunksIndexed;
    }
  }

  return { filesIndexed, chunksIndexed };
}

async function loadChunkRecords(assessmentId: string): Promise<SourceChunkRecord[]> {
  const rows = await prisma.captureSourceChunk.findMany({
    where: { assessmentId },
    orderBy: [{ evidenceId: "asc" }, { chunkIndex: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    assessmentId: r.assessmentId,
    evidenceId: r.evidenceId,
    chunkIndex: r.chunkIndex,
    fileName: r.fileName,
    text: r.text,
    startOffset: r.startOffset,
    endOffset: r.endOffset,
    embedding: parseEmbedding(r.embedding),
  }));
}

export async function retrieveRelevantChunks(
  assessmentId: string,
  query: string,
  topK = DEFAULT_TOP_K
): Promise<SourceChunkRecord[]> {
  const chunks = await loadChunkRecords(assessmentId);
  if (chunks.length === 0) return [];

  const queryVector = await embedQuery(query);
  const scored = chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return scored.slice(0, topK);
}

export function formatChunksForPrompt(chunks: SourceChunkRecord[]): string {
  return chunks
    .map(
      (c, i) =>
        `[CHUNK ${i + 1} id="${c.id}" sourceId="${c.evidenceId}" file="${c.fileName}" score="${c.score?.toFixed(3) ?? "n/a"}"]\n${c.text}\n[/CHUNK]`
    )
    .join("\n\n");
}

export async function ensureCaptureIndex(assessmentId: string): Promise<{
  chunkCount: number;
  reindexed: boolean;
}> {
  const stats = await getCaptureIndexStats(assessmentId);
  if (stats.chunkCount > 0 || stats.sourceCount === 0) {
    return { chunkCount: stats.chunkCount, reindexed: false };
  }
  const result = await reindexAllCaptureSources(assessmentId);
  return { chunkCount: result.chunksIndexed, reindexed: true };
}

export async function getCorpusForAnalysis(
  assessmentId: string,
  query: string,
  fullCorpus: string,
  totalChars: number,
  topK = 24
): Promise<{ corpus: string; usedVectorRetrieval: boolean; chunkCount: number }> {
  if (totalChars <= LARGE_CORPUS_CHAR_THRESHOLD) {
    return { corpus: fullCorpus, usedVectorRetrieval: false, chunkCount: 0 };
  }

  await ensureCaptureIndex(assessmentId);
  const chunks = await retrieveRelevantChunks(assessmentId, query, topK);
  if (chunks.length === 0) {
    return { corpus: fullCorpus.slice(0, LARGE_CORPUS_CHAR_THRESHOLD), usedVectorRetrieval: false, chunkCount: 0 };
  }

  return {
    corpus: formatChunksForPrompt(chunks),
    usedVectorRetrieval: true,
    chunkCount: chunks.length,
  };
}
