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

/** Normalize LLM finding bullets for consistent enterprise presentation. */
export function normalizeFindingItems(items: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of items) {
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
