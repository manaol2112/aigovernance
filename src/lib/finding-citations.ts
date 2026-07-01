import type { CitationDraft } from "@/lib/control-analyzer";
import { findExcerptSpan, resolveCaptureSource, type CaptureSourceDoc } from "@/lib/capture-source-corpus";
import { coerceFindingItems, normalizeFindingItems } from "@/lib/capture-finding-format";

export type FindingSection = "in_place" | "gap" | "recommendation";

export type RawFindingCitation = {
  section: FindingSection | string;
  claimText?: string;
  factId?: string;
  sourceLabel?: string;
  sourceType?: string;
  sourceId?: string | null;
  excerpt?: string;
};

export type FactLike = {
  factId: string;
  sourceId: string;
  sourceFile: string;
  excerpt: string;
};

export type SourceDocLike = {
  id: string;
  text: string;
  fileName?: string;
};

export type TextSourceLike = {
  id: string | null;
  type: string;
  label: string;
  text: string;
};

function normalizeText(text: string): string {
  return text.replace(/\[\{\d+\}\]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function lookupFact(factById: Map<string, FactLike>, factId: string): FactLike | undefined {
  const direct = factById.get(factId);
  if (direct) return direct;
  const upper = factId.toUpperCase();
  for (const [key, fact] of factById) {
    if (key.toUpperCase() === upper) return fact;
  }
  return undefined;
}

function resolveSourceDoc(
  fact: FactLike,
  sourceById?: Map<string, CaptureSourceDoc | SourceDocLike>
): SourceDocLike | undefined {
  if (!sourceById) return undefined;
  const captureMap = sourceById as Map<string, CaptureSourceDoc>;
  const resolved = resolveCaptureSource(fact.sourceId, fact.sourceFile, captureMap);
  if (resolved) return resolved;
  return sourceById.get(fact.sourceId);
}

export function hasCitationMarker(text: string): boolean {
  return /\[\{\d+\}\]/.test(text);
}

export function formatLineWithCitation(line: string, citationIndex: number): string {
  const stripped = line.replace(/\[\{\d+\}\]/g, "").trim();
  return `${stripped} [{${citationIndex}}]`;
}

/** Prefix recommendation lines with 1., 2., 3. for enterprise readability. */
export function formatNumberedRecommendations(items: string[]): string[] {
  return items.map((item, i) => {
    const stripped = item.replace(/^\d+\.\s*/, "").replace(/\[\{\d+\}\]/g, "").trim();
    return `${i + 1}. ${stripped}`;
  });
}

export function embedCitationMarkersInText(
  text: string,
  citations: Array<{ citationIndex: number; claimText?: string }>
): string {
  if (citations.length === 0) return text.trim();

  let result = text.trim();
  const extraLines: string[] = [];

  for (const cite of [...citations].sort((a, b) => a.citationIndex - b.citationIndex)) {
    const marker = `[{${cite.citationIndex}}]`;
    if (result.includes(marker)) continue;

    const claim = cite.claimText?.trim();
    if (claim) {
      const normResult = normalizeText(result);
      const normClaim = normalizeText(claim);
      const withoutNumber = normClaim.replace(/^\d+\.\s*/, "");

      if (normResult.includes(normClaim) || normResult.includes(withoutNumber)) {
        const idx = result.toLowerCase().indexOf(claim.toLowerCase().slice(0, 40));
        if (idx >= 0) {
          const end = idx + claim.length;
          result = `${result.slice(0, end)} [{${cite.citationIndex}}]${result.slice(end)}`;
          continue;
        }
      }
    }

    extraLines.push(formatLineWithCitation(claim || `Source reference`, cite.citationIndex));
  }

  const stillMissing = citations.some((c) => !result.includes(`[{${c.citationIndex}}]`));
  if (stillMissing && extraLines.length > 0) {
    result = [result, ...extraLines].filter(Boolean).join("\n");
  }

  return result.trim();
}

function resolveCitationMeta(
  claim: string,
  claimIndex: number,
  section: FindingSection,
  rawCitations: RawFindingCitation[] | undefined
): RawFindingCitation | undefined {
  const sectionCites = rawCitations?.filter((c) => c.section === section) ?? [];
  const normClaim = normalizeText(claim);
  const withoutNum = normClaim.replace(/^\d+\.\s*/, "");

  return (
    sectionCites.find((c) => c.claimText && normalizeText(c.claimText) === normClaim) ??
    sectionCites.find((c) => c.claimText && normalizeText(c.claimText) === withoutNum) ??
    sectionCites.find((c) => c.claimText && normClaim.includes(normalizeText(c.claimText).slice(0, 40))) ??
    sectionCites[claimIndex]
  );
}

function buildCitationFromFact(
  section: FindingSection,
  claimIndex: number,
  claimText: string,
  fact: FactLike,
  source: SourceDocLike,
  citationIndex: number,
  excerptOverride?: string
): CitationDraft {
  const excerptInput = excerptOverride?.trim() || fact.excerpt.trim();
  const span = findExcerptSpan(source.text, excerptInput);
  const excerpt = span
    ? source.text.slice(span.startOffset, span.endOffset)
    : excerptInput.slice(0, 300) || source.text.slice(0, 200);

  return {
    section,
    claimIndex,
    claimText,
    sourceType: "evidence",
    sourceId: source.id,
    sourceLabel: `Transcript: ${fact.sourceFile}`,
    excerpt,
    startOffset: span?.startOffset ?? 0,
    endOffset: span?.endOffset ?? Math.min(source.text.length, excerpt.length),
    citationIndex,
  };
}

function buildCitationFromSource(
  section: FindingSection,
  claimIndex: number,
  claimText: string,
  source: TextSourceLike,
  excerptInput: string | undefined,
  citationIndex: number
): CitationDraft {
  const span = findExcerptSpan(source.text, excerptInput || source.text.slice(0, 120));
  const excerpt = span
    ? source.text.slice(span.startOffset, span.endOffset)
    : excerptInput?.trim() || source.text.slice(0, 200);

  return {
    section,
    claimIndex,
    claimText,
    sourceType: source.type,
    sourceId: source.id,
    sourceLabel: source.label,
    excerpt,
    startOffset: span?.startOffset ?? 0,
    endOffset: span?.endOffset ?? Math.min(source.text.length, 200),
    citationIndex,
  };
}

function tryBuildFromFact(
  section: FindingSection,
  claimIndex: number,
  claim: string,
  fact: FactLike,
  sourceById: Map<string, CaptureSourceDoc | SourceDocLike> | undefined,
  citationIndex: number,
  excerptOverride?: string
): CitationDraft | null {
  const source = resolveSourceDoc(fact, sourceById);
  if (!source) return null;
  return buildCitationFromFact(section, claimIndex, claim, fact, source, citationIndex, excerptOverride);
}

export function formatFindingSectionWithCitations(options: {
  section: FindingSection;
  items: unknown;
  rawCitations?: RawFindingCitation[];
  factById?: Map<string, FactLike>;
  sourceById?: Map<string, CaptureSourceDoc | SourceDocLike>;
  controlFacts?: FactLike[];
  textSources?: TextSourceLike[];
  outCitations: CitationDraft[];
  citationCounter: { value: number };
  numberRecommendations?: boolean;
}): string {
  let items = normalizeFindingItems(coerceFindingItems(options.items));
  if (options.numberRecommendations && options.section === "recommendation") {
    items = formatNumberedRecommendations(items);
  }

  const lines: string[] = [];
  const sectionCitationsBuilt: CitationDraft[] = [];

  items.forEach((claim, claimIndex) => {
    const meta = resolveCitationMeta(claim, claimIndex, options.section, options.rawCitations);
    let built: CitationDraft | null = null;

    if (meta?.factId && options.factById) {
      const fact = lookupFact(options.factById, meta.factId);
      if (fact) {
        built = tryBuildFromFact(
          options.section,
          claimIndex,
          claim,
          fact,
          options.sourceById,
          options.citationCounter.value,
          meta.excerpt
        );
      }
    }

    if (!built && meta && options.textSources?.length) {
      const source =
        options.textSources.find((s) => s.label === meta.sourceLabel || s.type === meta.sourceType) ??
        options.textSources[0];
      if (source) {
        built = buildCitationFromSource(
          options.section,
          claimIndex,
          claim,
          source,
          meta.excerpt,
          options.citationCounter.value
        );
      }
    }

    if (!built && options.controlFacts?.length && options.factById) {
      for (const fact of options.controlFacts) {
        built = tryBuildFromFact(
          options.section,
          claimIndex,
          claim,
          fact,
          options.sourceById,
          options.citationCounter.value
        );
        if (built) break;
      }
    }

    if (!built && meta?.factId && options.factById) {
      const fact = lookupFact(options.factById, meta.factId);
      if (fact) {
        built = tryBuildFromFact(
          options.section,
          claimIndex,
          claim,
          fact,
          options.sourceById,
          options.citationCounter.value,
          meta.excerpt
        );
      }
    }

    if (built) {
      options.outCitations.push(built);
      sectionCitationsBuilt.push(built);
      lines.push(formatLineWithCitation(claim, options.citationCounter.value));
      options.citationCounter.value++;
    } else {
      lines.push(claim);
    }
  });

  // Backfill: attach ledger facts to any finding line still missing a citation
  if (options.controlFacts?.length && options.sourceById) {
    let factCursor = 0;
    for (let i = 0; i < lines.length; i++) {
      if (hasCitationMarker(lines[i]!)) continue;
      if (!lines[i]?.trim()) continue;

      for (let attempt = 0; attempt < options.controlFacts.length; attempt++) {
        const fact = options.controlFacts[(factCursor + attempt) % options.controlFacts.length]!;
        const built = tryBuildFromFact(
          options.section,
          i,
          lines[i]!,
          fact,
          options.sourceById,
          options.citationCounter.value
        );
        if (built) {
          options.outCitations.push(built);
          sectionCitationsBuilt.push(built);
          lines[i] = formatLineWithCitation(lines[i]!, options.citationCounter.value);
          options.citationCounter.value++;
          factCursor = (factCursor + attempt + 1) % options.controlFacts.length;
          break;
        }
      }
    }
  }

  const joined = lines.join("\n");
  return embedCitationMarkersInText(joined, sectionCitationsBuilt);
}

/** Parse facts embedded in persisted workshopNotes blocks. */
export function parseWorkshopNoteFacts(workshopNotes: string): FactLike[] {
  const facts: FactLike[] = [];
  for (const block of workshopNotes.split(/\n\n+/)) {
    const fileMatch = block.match(/^\[([^\]]+)\]/);
    const excerptMatch = block.match(/"([^"]+)"/);
    if (!fileMatch || !excerptMatch) continue;
    facts.push({
      factId: `wn-${facts.length + 1}`,
      sourceId: fileMatch[1]!.trim(),
      sourceFile: fileMatch[1]!.trim(),
      excerpt: excerptMatch[1]!.trim(),
    });
  }
  return facts;
}

/** Rebuild citations + inline markers when DB rows predate citation persistence. */
export function rehydrateEvaluationFindings(options: {
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  workshopNotes: string;
  sourceById: Map<string, CaptureSourceDoc>;
}): {
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  citations: CitationDraft[];
} {
  const controlFacts = parseWorkshopNoteFacts(options.workshopNotes);
  if (controlFacts.length === 0) {
    return {
      inPlaceFindings: options.inPlaceFindings,
      gapFindings: options.gapFindings,
      recommendations: options.recommendations,
      citations: [],
    };
  }

  const citations: CitationDraft[] = [];
  const counter = { value: 1 };

  const inPlaceFindings = formatFindingSectionWithCitations({
    section: "in_place",
    items: options.inPlaceFindings.split("\n").filter(Boolean),
    controlFacts,
    sourceById: options.sourceById,
    outCitations: citations,
    citationCounter: counter,
  });

  const gapFindings = formatFindingSectionWithCitations({
    section: "gap",
    items: options.gapFindings.split("\n").filter(Boolean),
    controlFacts,
    sourceById: options.sourceById,
    outCitations: citations,
    citationCounter: counter,
  });

  const recommendations = formatFindingSectionWithCitations({
    section: "recommendation",
    items: options.recommendations.split("\n").filter(Boolean),
    controlFacts,
    sourceById: options.sourceById,
    outCitations: citations,
    citationCounter: counter,
    numberRecommendations: true,
  });

  return { inPlaceFindings, gapFindings, recommendations, citations };
}
