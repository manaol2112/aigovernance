import type { TranscriptSource } from "@/lib/transcript-processor";

export type CaptureSourceDoc = {
  id: string;
  fileName: string;
  text: string;
};

/** Resolve a source doc by evidence id and/or filename (AI sometimes returns file name as id). */
export function resolveCaptureSource(
  sourceId: string | undefined,
  sourceFile: string | undefined,
  sourceById: Map<string, CaptureSourceDoc>
): CaptureSourceDoc | undefined {
  if (sourceId) {
    const direct = sourceById.get(sourceId);
    if (direct) return direct;
  }

  const fileHint = sourceFile?.trim() || sourceId?.trim();
  if (fileHint) {
    const lower = fileHint.toLowerCase();
    for (const doc of sourceById.values()) {
      if (
        doc.fileName === fileHint ||
        doc.fileName.toLowerCase() === lower ||
        lower.endsWith(doc.fileName.toLowerCase())
      ) {
        return doc;
      }
    }
  }

  return undefined;
}

export function toCaptureSourceDocs(sources: TranscriptSource[]): CaptureSourceDoc[] {
  return sources.map((s) => ({ id: s.id, fileName: s.fileName, text: s.text }));
}

/** Format uploaded files as a stable, citable source corpus for AI prompts. */
export function formatSourceCorpusForPrompt(
  sources: CaptureSourceDoc[],
  maxTotalChars = 90_000
): string {
  if (sources.length === 0) return "";

  const perFileBudget = Math.floor(maxTotalChars / sources.length);
  return sources
    .map((s) => {
      const body = s.text.slice(0, perFileBudget);
      return [
        `[SOURCE id="${s.id}" file="${s.fileName}"]`,
        body,
        "[/SOURCE]",
      ].join("\n");
    })
    .join("\n\n");
}

export function findExcerptSpan(
  sourceText: string,
  excerpt: string
): { startOffset: number; endOffset: number } | null {
  const trimmed = excerpt.trim();
  if (!trimmed) return null;

  let idx = sourceText.indexOf(trimmed);
  if (idx >= 0) return { startOffset: idx, endOffset: idx + trimmed.length };

  const normalized = trimmed.replace(/\s+/g, " ");
  const normalizedSource = sourceText.replace(/\s+/g, " ");
  idx = normalizedSource.indexOf(normalized);
  if (idx >= 0) {
    return { startOffset: idx, endOffset: idx + normalized.length };
  }

  const short = trimmed.slice(0, Math.min(80, trimmed.length));
  idx = sourceText.indexOf(short);
  if (idx >= 0) return { startOffset: idx, endOffset: idx + short.length };

  // Word-sequence fuzzy match — handles lightly edited AI excerpts
  const words = trimmed.split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 4) {
    const pattern = words.slice(0, 6).join(" ");
    idx = sourceText.indexOf(pattern);
    if (idx >= 0) {
      return {
        startOffset: idx,
        endOffset: Math.min(sourceText.length, idx + Math.max(trimmed.length, pattern.length + 40)),
      };
    }
  }

  return null;
}

export function buildEvidenceTextMap(
  sources: CaptureSourceDoc[]
): Record<string, { fileName: string; text: string }> {
  const map: Record<string, { fileName: string; text: string }> = {};
  for (const s of sources) {
    map[s.id] = { fileName: s.fileName, text: s.text };
  }
  return map;
}
