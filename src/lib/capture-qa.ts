import { prisma } from "@/lib/db";
import { callOpenAIJson } from "@/lib/openai-client";
import type { CitationDraft } from "@/lib/control-analyzer";
import { findExcerptSpan } from "@/lib/capture-source-corpus";
import {
  ensureCaptureIndex,
  formatChunksForPrompt,
  retrieveRelevantChunks,
  type SourceChunkRecord,
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

export type CaptureQueryHistoryItem = {
  question: string;
  answer: string;
  citations?: CaptureQueryCitation[];
  askedAt?: string;
};

const CAPTURE_QA_SYSTEM = [
  "You answer questions about AI governance workshop sources using ONLY the provided source chunks.",
  "Never invent facts. If chunks lack evidence, set insufficientEvidence true and leave claims empty.",
  "Every factual statement MUST be a separate claim with chunkId and a verbatim excerpt copied from that chunk.",
  "Return valid JSON only.",
].join("\n");

type QaClaim = {
  text?: string;
  chunkId?: string;
  excerpt?: string;
};

type QaResponse = {
  insufficientEvidence?: boolean;
  summary?: string;
  claims?: QaClaim[];
  /** @deprecated legacy shape */
  answer?: string;
  /** @deprecated legacy shape */
  citations?: Array<{
    claimText?: string;
    chunkId?: string;
    excerpt?: string;
  }>;
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

  const byEvidence = chunks.find((c) => c.evidenceId === trimmed);
  if (byEvidence) return byEvidence;

  const byFile = chunks.find((c) => c.fileName.toLowerCase() === trimmed.toLowerCase());
  return byFile ?? null;
}

function buildCitationRecord(
  claimText: string,
  chunk: SourceChunkRecord,
  excerptInput: string | undefined,
  fullText: string,
  citationIndex: number
): CaptureQueryCitation {
  const span = findExcerptSpan(fullText, excerptInput || chunk.text.slice(0, 120));
  const excerpt = span
    ? fullText.slice(span.startOffset, span.endOffset)
    : excerptInput?.trim() || chunk.text.slice(0, 200);

  return {
    id: `qa-${citationIndex}`,
    citationIndex,
    section: "answer",
    claimText: claimText.trim(),
    sourceType: "evidence",
    sourceId: chunk.evidenceId,
    sourceLabel: `Transcript: ${chunk.fileName}`,
    excerpt,
    startOffset: span?.startOffset ?? chunk.startOffset,
    endOffset: span?.endOffset ?? chunk.endOffset,
  };
}

function formatClaimLine(text: string, citationIndex: number): string {
  const trimmed = text.trim().replace(/\[\{\d+\}\]/g, "").trim();
  const marker = `[{${citationIndex}}]`;
  if (trimmed.includes(marker)) return trimmed;
  return `${trimmed} ${marker}`;
}

/** Ensure every citation index appears as an inline [{n}] marker in the answer text. */
export function embedCitationMarkers(
  answer: string,
  citations: CaptureQueryCitation[]
): string {
  if (citations.length === 0) return answer.trim();

  let result = answer.trim();
  const lines: string[] = [];

  for (const cite of [...citations].sort((a, b) => a.citationIndex - b.citationIndex)) {
    const marker = `[{${cite.citationIndex}}]`;
    if (result.includes(marker)) continue;

    const claim = cite.claimText?.trim();
    if (claim) {
      const normResult = normalizeWhitespace(result);
      const normClaim = normalizeWhitespace(claim);
      if (normResult.includes(normClaim)) {
        const idx = result.indexOf(claim);
        if (idx >= 0) {
          result =
            result.slice(0, idx + claim.length) +
            ` ${marker}` +
            result.slice(idx + claim.length);
          continue;
        }
      }
    }

    lines.push(formatClaimLine(claim || cite.excerpt.slice(0, 120), cite.citationIndex));
  }

  const stillMissing = citations.some((c) => !result.includes(`[{${c.citationIndex}}]`));
  if (stillMissing && lines.length > 0) {
    result = [result, ...lines].filter(Boolean).join("\n");
  }

  return result.trim();
}

function buildFromClaims(
  claims: QaClaim[],
  chunks: SourceChunkRecord[],
  textByEvidenceId: Map<string, string>
): { answer: string; citations: CaptureQueryCitation[] } {
  const lines: string[] = [];
  const citations: CaptureQueryCitation[] = [];
  let citationIndex = 1;

  for (const claim of claims) {
    const text = claim.text?.trim();
    if (!text) continue;

    const chunk = resolveChunk(chunks, claim.chunkId);
    if (!chunk) continue;

    const fullText = textByEvidenceId.get(chunk.evidenceId) ?? chunk.text;
    citations.push(
      buildCitationRecord(text, chunk, claim.excerpt, fullText, citationIndex)
    );
    lines.push(formatClaimLine(text, citationIndex));
    citationIndex++;
  }

  return {
    answer: lines.join("\n"),
    citations,
  };
}

function buildFromLegacyResponse(
  parsed: QaResponse,
  chunks: SourceChunkRecord[],
  textByEvidenceId: Map<string, string>
): { answer: string; citations: CaptureQueryCitation[] } {
  const citations: CaptureQueryCitation[] = [];
  let citationIndex = 1;
  let answer = parsed.answer?.trim() || "";

  for (const cite of parsed.citations ?? []) {
    const claimText = cite.claimText?.trim();
    const chunk = resolveChunk(chunks, cite.chunkId);
    if (!chunk) continue;

    const fullText = textByEvidenceId.get(chunk.evidenceId) ?? chunk.text;
    citations.push(
      buildCitationRecord(
        claimText || answer.slice(0, 120),
        chunk,
        cite.excerpt,
        fullText,
        citationIndex
      )
    );
    citationIndex++;
  }

  if (citations.length === 0 && answer) {
    const top = chunks[0];
    if (top) {
      const fullText = textByEvidenceId.get(top.evidenceId) ?? top.text;
      citations.push(
        buildCitationRecord(answer, top, top.text.slice(0, 120), fullText, 1)
      );
    }
  }

  answer = embedCitationMarkers(answer || citations.map((c) => c.claimText).join("\n"), citations);
  return { answer, citations };
}

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
      "Return JSON using this schema (claims required for every grounded fact):",
      "{",
      '  "insufficientEvidence": false,',
      '  "summary": "optional one-sentence lead (no facts without claims)",',
      '  "claims": [',
      "    {",
      '      "text": "Single factual statement copied from sources only",',
      '      "chunkId": "exact id attribute from CHUNK tag",',
      '      "excerpt": "verbatim 15-120 word quote from that chunk supporting the statement"',
      "    }",
      "  ]",
      "}",
      "",
      "RULES:",
      "- One claim per distinct fact; each claim MUST include chunkId and excerpt.",
      "- Use ONLY chunk ids from the CHUNK tags above.",
      '- If sources cannot answer the question, set insufficientEvidence true, claims [], summary explains gap.',
      "- Do not use legacy answer/citations fields.",
    ].join("\n"),
    temperature: 0.1,
    maxTokens: 4_000,
  });

  if (!aiResult.ok) {
    throw new Error(aiResult.error);
  }

  const parsed = aiResult.data;
  let answer: string;
  let citations: CaptureQueryCitation[];

  if (parsed.insufficientEvidence || (parsed.claims?.length ?? 0) === 0) {
    if (parsed.claims && parsed.claims.length > 0) {
      ({ answer, citations } = buildFromClaims(parsed.claims, chunks, textByEvidenceId));
    } else if (parsed.answer?.trim()) {
      ({ answer, citations } = buildFromLegacyResponse(parsed, chunks, textByEvidenceId));
    } else {
      answer =
        parsed.summary?.trim() ||
        "Insufficient evidence in uploaded sources to answer this question.";
      citations = [];
    }
  } else {
    ({ answer, citations } = buildFromClaims(parsed.claims ?? [], chunks, textByEvidenceId));
    if (parsed.summary?.trim() && citations.length > 0) {
      answer = `${parsed.summary.trim()}\n\n${answer}`;
    }
  }

  answer = embedCitationMarkers(answer, citations);

  if (citations.length === 0 && !parsed.insufficientEvidence) {
    const fallback = chunks[0];
    if (fallback && answer && !answer.toLowerCase().includes("insufficient evidence")) {
      const fullText = textByEvidenceId.get(fallback.evidenceId) ?? fallback.text;
      citations = [
        buildCitationRecord(
          answer.split("\n")[0] ?? answer,
          fallback,
          fallback.text.slice(0, 120),
          fullText,
          1
        ),
      ];
      answer = embedCitationMarkers(answer, citations);
    }
  }

  await appendCaptureQueryHistory(assessmentId, trimmed, answer, citations);

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
  answer: string,
  citations: CaptureQueryCitation[]
): Promise<void> {
  const repo = await prisma.assessmentRepository.findUnique({ where: { assessmentId } });
  const history = Array.isArray(repo?.captureQueries)
    ? [...(repo!.captureQueries as CaptureQueryHistoryItem[])]
    : [];
  history.unshift({
    question,
    answer: answer.slice(0, 2_000),
    citations: citations.map((c) => ({
      ...c,
      excerpt: c.excerpt.slice(0, 500),
    })),
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
