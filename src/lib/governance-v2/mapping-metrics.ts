import type { StructuredSignals, TraceabilityScoreBreakdown } from "@/lib/governance-v2/types";

export type VerificationStatus = TraceabilityScoreBreakdown["verificationStatus"];

export type ScoreFactor = TraceabilityScoreBreakdown["factors"][number];

type CitationLike = {
  sourceId: string | null;
  excerpt: string;
};

export function citationEvidenceConfidence(
  complianceStatus: string,
  excerpt: string | null | undefined,
  hasSourceId: boolean
): number {
  let score = 0.35;
  const excerptLen = excerpt?.trim().length ?? 0;
  if (excerptLen > 120) score += 0.2;
  else if (excerptLen > 50) score += 0.12;
  else if (excerptLen > 15) score += 0.04;
  else score -= 0.15;

  if (hasSourceId) score += 0.12;
  else score -= 0.1;

  switch (complianceStatus) {
    case "aligned":
      score += 0.06;
      break;
    case "partial":
      score += 0.03;
      break;
    default:
      break;
  }

  return Math.round(Math.min(0.92, Math.max(0.15, score)) * 100) / 100;
}

export function computeMappingConfidence(
  evaluation: {
    complianceStatus: string;
    inPlaceFindings?: string | null;
    gapFindings?: string | null;
    aiGenerated?: boolean;
  },
  evidenceItems: Array<{ confidenceScore: number }>,
  citations: CitationLike[]
): number | null {
  const hasFindings =
    Boolean(evaluation.inPlaceFindings?.trim()) || Boolean(evaluation.gapFindings?.trim());

  if (citations.length === 0 && evidenceItems.length === 0) return null;
  if (evaluation.complianceStatus === "not_assessed" && !hasFindings && citations.length === 0) {
    return null;
  }

  const sourced = citations.filter((c) => c.sourceId && c.excerpt.trim().length > 20);

  if (citations.length === 0) {
    return hasFindings ? 0.25 : null;
  }

  let score = 0.32;
  score += Math.min(0.28, sourced.length * 0.1);
  score += Math.min(0.12, (citations.length - sourced.length) * 0.03);

  if (evidenceItems.length > 0) {
    const avg =
      evidenceItems.reduce((sum, item) => sum + item.confidenceScore, 0) / evidenceItems.length;
    score += avg * 0.15;
  }

  if (sourced.length === 0) score = Math.min(score, 0.42);
  if (citations.length === 1) score = Math.min(score, 0.68);

  return Math.round(Math.min(0.92, Math.max(0.18, score)) * 100) / 100;
}

export function computeEvidenceStrength(
  evaluation: {
    complianceStatus: string;
    inPlaceFindings?: string | null;
    gapFindings?: string | null;
  },
  evidenceItems: Array<{ rawText: string }>,
  citations: CitationLike[]
): number {
  const sourced = citations.filter((c) => c.sourceId && c.excerpt.trim().length > 20);
  let strength = 0;

  if (sourced.length > 0) strength += Math.min(0.5, sourced.length * 0.14);
  else if (citations.length > 0) strength += 0.12;
  else strength += 0.05;

  if (evaluation.inPlaceFindings?.trim()) strength += 0.12;
  if (evaluation.gapFindings?.trim()) strength += 0.08;

  if (evidenceItems.length > 0) {
    const excerptQuality =
      evidenceItems.reduce((sum, item) => sum + Math.min(1, item.rawText.trim().length / 120), 0) /
      evidenceItems.length;
    strength += excerptQuality * 0.1;
  }

  if (sourced.length === 0) strength = Math.min(strength, 0.35);

  return Math.round(Math.min(1, strength) * 100) / 100;
}

export function resolveVerificationStatus(
  citations: CitationLike[]
): VerificationStatus {
  const sourced = citations.filter((c) => c.sourceId && c.excerpt.trim().length > 20);
  if (sourced.length >= 2) return "source_grounded";
  if (sourced.length >= 1) return "partially_grounded";
  return "unverified";
}

export function buildTraceabilityBreakdown(input: {
  evaluation: {
    complianceStatus: string;
    inPlaceFindings?: string | null;
    gapFindings?: string | null;
    aiGenerated?: boolean;
  };
  evidenceItems: Array<{ confidenceScore: number; rawText: string }>;
  citations: CitationLike[];
}): TraceabilityScoreBreakdown {
  const { evaluation, evidenceItems, citations } = input;
  const sourced = citations.filter((c) => c.sourceId && c.excerpt.trim().length > 20);
  const verificationStatus = resolveVerificationStatus(citations);
  const traceability = computeMappingConfidence(evaluation, evidenceItems, citations);
  const evidenceStrength = computeEvidenceStrength(evaluation, evidenceItems, citations);

  const factors: ScoreFactor[] = [];

  if (sourced.length > 0) {
    factors.push({
      label: `${sourced.length} source-anchored citation${sourced.length === 1 ? "" : "s"}`,
      detail: "Excerpt linked to an uploaded file with character offsets",
      impact: "+",
    });
  } else if (citations.length > 0) {
    factors.push({
      label: "Citations lack file anchors",
      detail: "Claims exist but are not tied to uploaded source files — traceability capped",
      impact: "−",
    });
  } else {
    factors.push({
      label: "No source citations",
      detail: "Findings are not anchored to workshop transcripts — treat as unverified",
      impact: "−",
    });
  }

  if (citations.length >= 2) {
    factors.push({
      label: "Multiple independent excerpts",
      detail: "Corroboration across more than one citation improves confidence",
      impact: "+",
    });
  }

  if (evaluation.inPlaceFindings?.trim() || evaluation.gapFindings?.trim()) {
    factors.push({
      label: "Structured findings present",
      detail: "Analysis produced in-place / gap narrative (still requires citation review)",
      impact: "=",
    });
  }

  if (evaluation.aiGenerated) {
    factors.push({
      label: "AI-generated draft",
      detail: "Requires human reviewer sign-off before client use — not treated as fact",
      impact: "−",
    });
  }

  factors.push({
    label: "Traceability formula",
    detail:
      "Weighted by source-anchored citations (not AI opinion). Unanchored claims cannot exceed 42%.",
    impact: "=",
  });

  factors.push({
    label: "Evidence strength formula",
    detail:
      "Measures depth of sourced material — citation count, excerpt length, and finding coverage.",
    impact: "=",
  });

  return {
    traceability,
    evidenceStrength,
    verificationStatus,
    citationCount: citations.length,
    sourcedCitationCount: sourced.length,
    factors,
    reviewerRequired: Boolean(evaluation.aiGenerated) || verificationStatus !== "source_grounded",
  };
}

export function evidenceBelongsToControl(
  signals: StructuredSignals,
  control: { id: string; code: string }
): boolean {
  if (signals.linkedControlId && signals.linkedControlId === control.id) return true;
  if (signals.controlCode && signals.controlCode.toUpperCase() === control.code.toUpperCase()) {
    return true;
  }
  return false;
}

export function buildAmbiguityFlags(input: {
  complianceStatus: string;
  mappingConfidence: number | null;
  citationCount: number;
  sourcedCitationCount: number;
  evidenceCount: number;
  aiGenerated?: boolean;
}): string[] {
  const flags: string[] = [];

  if (input.aiGenerated) flags.push("ai_draft_requires_sign_off");
  if (input.complianceStatus === "not_assessed") flags.push("not_assessed");
  if (input.sourcedCitationCount === 0 && input.citationCount > 0) {
    flags.push("no_source_file_anchor");
  }
  if (input.citationCount === 0 && input.evidenceCount > 0) {
    flags.push("findings_without_citations");
  }
  if (input.sourcedCitationCount === 0) flags.push("unverified_not_source_grounded");
  if (input.mappingConfidence != null && input.mappingConfidence < 0.45) {
    flags.push("low_traceability_confidence");
  }
  if (input.complianceStatus === "partial" && input.sourcedCitationCount < 2) {
    flags.push("thin_evidence_for_partial");
  }
  if (
    input.complianceStatus === "aligned" &&
    input.sourcedCitationCount < 1
  ) {
    flags.push("aligned_without_source_proof");
  }

  return flags;
}

export const FLAG_LABELS: Record<string, string> = {
  ai_draft_requires_sign_off: "AI draft — reviewer sign-off required",
  not_assessed: "Not assessed in sources",
  no_source_file_anchor: "Citation not linked to uploaded file",
  findings_without_citations: "Narrative without source citations",
  unverified_not_source_grounded: "Not source-grounded — do not treat as verified fact",
  low_traceability_confidence: "Low traceability score",
  thin_evidence_for_partial: "Partial status with thin source coverage",
  aligned_without_source_proof: "Aligned claim lacks file-anchored proof",
};
