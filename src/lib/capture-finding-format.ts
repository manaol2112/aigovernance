/** Enterprise-style fallbacks when a section has no grounded content. */
export const CAPTURE_FINDING_FALLBACKS = {
  inPlaceNotDiscussed:
    "This control was not addressed in uploaded workshop materials. No in-place practices were recorded.",
  inPlaceNotIdentified:
    "No in-place practices were identified in the uploaded workshop materials for this control.",
  gapNotDiscussed:
    "This control was not addressed in uploaded workshop materials. No gap was inferred; schedule workshop coverage before assessing alignment with framework requirements.",
  gapDiscussedAligned:
    "Workshop evidence describes practices in this control area; no material misalignment with the stated requirement was identified from available materials.",
  gapDiscussedInsufficient:
    "Workshop materials reference this control area but do not provide sufficient evidence to confirm full alignment with framework requirements.",
  recommendationNotDiscussed:
    "No remediation action applies until this control is covered in a workshop session or additional evidence is uploaded.",
  recommendationNoGapIdentified:
    "No remediation action was identified from workshop materials because no material misalignment was established from available evidence.",
  recommendationPendingGap:
    "Document a remediation action after workshop evidence establishes a specific gap against the control requirement.",
  /** @deprecated use inPlaceNotIdentified */
  inPlace:
    "No in-place practices were identified in the uploaded workshop materials for this control.",
  /** @deprecated use gapNotDiscussed */
  gap: "This control was not addressed in uploaded workshop materials. No gap was inferred; schedule workshop coverage before assessing alignment with framework requirements.",
  /** @deprecated use recommendationNotDiscussed */
  recommendation:
    "No remediation action applies until this control is covered in a workshop session or additional evidence is uploaded.",
} as const;

const FILLER_PATTERNS = [
  /^it is (important|worth) to note that\s+/i,
  /^overall,?\s+/i,
  /^in conclusion,?\s+/i,
  /^as mentioned above,?\s+/i,
];

const MALFORMED_FINDING = /\[object Object\]/;

function stripChunkMetadata(text: string): string {
  return text
    .replace(/\[CHUNK[^\]]*\]/gi, "")
    .replace(/\[\/CHUNK\]/gi, "")
    .replace(/\bchunkId\s*[:=]\s*["']?[A-Za-z0-9_-]+["']?/gi, "")
    .replace(/\bsourceId\s*[:=]\s*["']?[A-Za-z0-9_-]+["']?/gi, "")
    .replace(/\bchunk\s+\d+\b/gi, "")
    .replace(/\bid\s*=\s*["'][^"']+["']/gi, "")
    .replace(/\bscore\s*=\s*["'][^"']+["']/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

/** True when persisted findings were stringified from objects (legacy bad AI parse). */
export function isMalformedFindingText(text: string): boolean {
  return MALFORMED_FINDING.test(text);
}

function joinLabelParts(prefix: string, body: string, suffixLabel: string, suffix: string): string {
  const main = body.trim();
  const tail = suffix.trim();
  if (!main) return tail;
  if (!tail) return main.startsWith(prefix) ? main : `${prefix} ${main}`;
  if (main.startsWith(prefix)) {
    return main.includes(suffixLabel) ? main : `${main} ${suffixLabel} ${tail}`;
  }
  return `${prefix} ${main}. ${suffixLabel} ${tail}`;
}

/** Coerce LLM JSON finding entries (string or structured object) to display text. */
export function coerceFindingItem(item: unknown): string {
  if (typeof item === "string") return stripChunkMetadata(item);
  if (item == null) return "";
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (Array.isArray(item)) {
    return stripChunkMetadata(item.map(coerceFindingItem).filter(Boolean).join(" ").trim());
  }
  if (typeof item !== "object") return String(item).trim();

  const o = item as Record<string, unknown>;
  if (typeof o.text === "string") return stripChunkMetadata(o.text);
  if (typeof o.finding === "string") return stripChunkMetadata(o.finding);
  if (typeof o.claimText === "string") return stripChunkMetadata(o.claimText);
  if (typeof o.content === "string") return stripChunkMetadata(o.content);

  const observed = o.observedPractice ?? o.observed ?? o.observed_practice;
  if (typeof observed === "string") {
    const evidence = o.evidence ?? o.basis ?? o.support;
    return typeof evidence === "string" && evidence.trim()
      ? stripChunkMetadata(joinLabelParts("Observed practice:", observed, "Evidence:", evidence))
      : stripChunkMetadata(observed);
  }

  if (typeof o.gap === "string") {
    const basis = o.basis ?? o.evidence ?? o.support;
    return typeof basis === "string" && basis.trim()
      ? stripChunkMetadata(joinLabelParts("Gap:", o.gap, "Basis:", basis))
      : stripChunkMetadata(o.gap);
  }

  if (typeof o.recommendation === "string") {
    const rationale = o.rationale ?? o.reason;
    return typeof rationale === "string" && rationale.trim()
      ? stripChunkMetadata(joinLabelParts("Recommendation:", o.recommendation, "Rationale:", rationale))
      : stripChunkMetadata(o.recommendation);
  }

  const stringValues = Object.values(o).filter((v) => typeof v === "string") as string[];
  if (stringValues.length > 0) return stripChunkMetadata(stringValues.join(" ").trim());

  try {
    return JSON.stringify(o);
  } catch {
    return "";
  }
}

/** Coerce LLM finding arrays (or a single string) into normalized string items. */
export function coerceFindingItems(items: unknown): string[] {
  if (items == null) return [];
  if (typeof items === "string") {
    const trimmed = items.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(items)) {
    const one = coerceFindingItem(items);
    return one ? [one] : [];
  }
  return items.map(coerceFindingItem).map((s) => s.trim()).filter(Boolean);
}

/** Normalize LLM finding bullets for consistent enterprise presentation. */
export function normalizeFindingItems(items: string[] | unknown[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of coerceFindingItems(items)) {
    const trimmed = raw.replace(/\s+/g, " ").trim();
    if (!trimmed) continue;

    let line = trimmed;
    for (const pattern of FILLER_PATTERNS) {
      line = line.replace(pattern, "");
    }
    line = line.charAt(0).toUpperCase() + line.slice(1);
    if (!/[.!?]$/.test(line)) line += ".";

    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(line);
  }

  return normalized;
}

export function joinFindingSection(items: string[]): string {
  return normalizeFindingItems(items).join("\n");
}

export function resolveCaptureSectionFallbacks(options: {
  hasWorkshopCoverage: boolean;
  gapItems: string[];
  inPlaceItems: string[];
  recommendationItems: string[];
  complianceStatus?: string;
}): { inPlace: string; gap: string; recommendation: string } {
  if (!options.hasWorkshopCoverage) {
    return {
      inPlace: CAPTURE_FINDING_FALLBACKS.inPlaceNotDiscussed,
      gap: CAPTURE_FINDING_FALLBACKS.gapNotDiscussed,
      recommendation: CAPTURE_FINDING_FALLBACKS.recommendationNotDiscussed,
    };
  }

  const hasGaps = options.gapItems.length > 0;
  const hasInPlace = options.inPlaceItems.length > 0;
  const hasRecs = options.recommendationItems.length > 0;
  const status = options.complianceStatus ?? "not_assessed";

  return {
    inPlace: hasInPlace ? "" : CAPTURE_FINDING_FALLBACKS.inPlaceNotIdentified,
    gap: hasGaps
      ? ""
      : status === "aligned" && hasInPlace
        ? CAPTURE_FINDING_FALLBACKS.gapDiscussedAligned
        : CAPTURE_FINDING_FALLBACKS.gapDiscussedInsufficient,
    recommendation: hasRecs
      ? ""
      : hasGaps || status === "gap" || status === "partial"
        ? CAPTURE_FINDING_FALLBACKS.recommendationPendingGap
        : CAPTURE_FINDING_FALLBACKS.recommendationNoGapIdentified,
  };
}
