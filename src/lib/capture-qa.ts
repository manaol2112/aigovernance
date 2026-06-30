import { prisma } from "@/lib/db";
import { callOpenAIJson } from "@/lib/openai-client";
import type { CitationDraft } from "@/lib/control-analyzer";
import { findExcerptSpan } from "@/lib/capture-source-corpus";
import {
  ensureCaptureIndex,
  formatChunksForPrompt,
  retrieveRelevantChunks,
} from "@/lib/capture-vector-index";

export type CaptureQueryCitation = {
  id: string;
  citationIndex: number;
  section: string;
  claimText: string;
  sourceType: string;
  sourceId: string | null;
  sourceLabel: string;
  excerpt: string;
  startOffset: number;
  endOffset: number;
};

export type CaptureQueryResult = {
  question: string;
  answer: string;
  citations: CaptureQueryCitation[];
  chunksUsed: number;
  model: string;
};

const CAPTURE_QA_SYSTEM = [
  "You answer questions about AI governance workshop sources using ONLY the provided source chunks.",
  "Never invent facts. If chunks lack evidence, say so clearly.",
  "Return valid JSON only.",
].join("\n");

type QaResponse = {
  answer?: string;
  citations?: Array<{
    claimText: string;
    chunkId: string;
    excerpt: string;
  }>;
};

export async function answerCaptureQuestion(
  assessmentId: string,
  question: string
): Promise<CaptureQueryResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }

  await ensureCaptureIndex(assessmentId);
  const chunks = await retrieveRelevantChunks(assessmentId, trimmed, 10);
  if (chunks.length === 0) {
    throw new Error("No indexed sources found. Upload readable files first.");
  }

  const evidenceTexts = await prisma.assessmentEvidence.findMany({
    where: { assessmentId, id: { in: chunks.map((c) => c.evidenceId) } },
    select: { id: true, fileName: true, extractedText: true },
  });
  const textByEvidenceId = new Map(
    evidenceTexts.map((e) => [e.id, e.extractedText ?? ""])
  );

  const aiResult = await callOpenAIJson<QaResponse>({
    system: CAPTURE_QA_SYSTEM,
    user: [
      `Question: ${trimmed}`,
      "",
      "--- SOURCE CHUNKS ---",
      formatChunksForPrompt(chunks),
      "--- END CHUNKS ---",
      "",
      "Return JSON:",
      "{",
      '  "answer": "concise answer with [{1}] citation markers referencing citationIndex",',
      '  "citations": [{ "claimText": "sentence in answer", "chunkId": "id from CHUNK tag", "excerpt": "verbatim quote from chunk" }]',
      "}",
    ].join("\n"),
    temperature: 0.1,
    maxTokens: 4_000,
  });

  if (!aiResult.ok) {
    throw new Error(aiResult.error);
  }

  const parsed = aiResult.data;
  let answer = parsed.answer?.trim() || "Insufficient evidence in uploaded sources.";
  const citations: CaptureQueryCitation[] = [];
  let citationIndex = 1;

  for (const cite of parsed.citations ?? []) {
    const chunk = chunks.find((c) => c.id === cite.chunkId);
    if (!chunk) continue;

    const fullText = textByEvidenceId.get(chunk.evidenceId) ?? chunk.text;
    const span = findExcerptSpan(fullText, cite.excerpt || chunk.text.slice(0, 120));
    const excerpt = span
      ? fullText.slice(span.startOffset, span.endOffset)
      : cite.excerpt || chunk.text.slice(0, 200);

    if (!answer.includes(`[{${citationIndex}}]`) && cite.claimText) {
      answer = answer.replace(cite.claimText, `${cite.claimText} [{${citationIndex}}]`);
    }

    citations.push({
      id: `qa-${citationIndex}`,
      citationIndex,
      section: "answer",
      claimText: cite.claimText,
      sourceType: "evidence",
      sourceId: chunk.evidenceId,
      sourceLabel: `Transcript: ${chunk.fileName}`,
      excerpt,
      startOffset: span?.startOffset ?? chunk.startOffset,
      endOffset: span?.endOffset ?? chunk.endOffset,
    });
    citationIndex++;
  }

  await appendCaptureQueryHistory(assessmentId, trimmed, answer);

  return {
    question: trimmed,
    answer,
    citations,
    chunksUsed: chunks.length,
    model: aiResult.model,
  };
}

async function appendCaptureQueryHistory(
  assessmentId: string,
  question: string,
  answer: string
): Promise<void> {
  const repo = await prisma.assessmentRepository.findUnique({ where: { assessmentId } });
  const history = Array.isArray(repo?.captureQueries) ? [...(repo!.captureQueries as object[])] : [];
  history.unshift({
    question,
    answer: answer.slice(0, 2_000),
    askedAt: new Date().toISOString(),
  });

  await prisma.assessmentRepository.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      captureQueries: history.slice(0, 20),
    },
    update: {
      captureQueries: history.slice(0, 20),
    },
  });
}

export function toCitationDrafts(citations: CaptureQueryCitation[]): CitationDraft[] {
  return citations.map((c) => ({
    section: "in_place",
    claimIndex: c.citationIndex,
    claimText: c.claimText,
    sourceType: c.sourceType,
    sourceId: c.sourceId,
    sourceLabel: c.sourceLabel,
    excerpt: c.excerpt,
    startOffset: c.startOffset,
    endOffset: c.endOffset,
    citationIndex: c.citationIndex,
  }));
}
