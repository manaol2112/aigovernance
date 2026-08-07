export const TRANSCRIPT_EVIDENCE_TAG = "[transcript]";

export function isTranscriptEvidence(description: string | null | undefined): boolean {
  return description?.startsWith(TRANSCRIPT_EVIDENCE_TAG) ?? false;
}

export const CONTROL_DOC_EVIDENCE_TAG = "[control-doc]";

export function isControlDocumentationEvidence(description: string | null | undefined): boolean {
  return description?.startsWith(CONTROL_DOC_EVIDENCE_TAG) ?? false;
}

export function controlDocumentationDescription(controlCode: string, evidenceType: string): string {
  return `${CONTROL_DOC_EVIDENCE_TAG} ${controlCode} — ${evidenceType}`;
}

export function transcriptEvidenceDescription(label?: string): string {
  return label
    ? `${TRANSCRIPT_EVIDENCE_TAG} ${label}`
    : `${TRANSCRIPT_EVIDENCE_TAG} Workshop recording transcript`;
}

export type EvidenceKind =
  | "workshop_notes"
  | "policy"
  | "procedure"
  | "record"
  | "supporting";

const EVIDENCE_KIND_PREFIX = "[evidence:";

export function evidenceKindDescription(kind: EvidenceKind, fileName: string): string {
  return `${EVIDENCE_KIND_PREFIX}${kind}] ${fileName}`;
}

export function parseEvidenceKind(description: string | null | undefined): EvidenceKind | null {
  if (!description) return null;
  if (description.startsWith(TRANSCRIPT_EVIDENCE_TAG)) return "workshop_notes";
  if (description.startsWith(CONTROL_DOC_EVIDENCE_TAG)) return "supporting";

  const match = description.match(/^\[evidence:(workshop_notes|policy|procedure|record|supporting)\]/);
  if (!match) return null;
  return match[1] as EvidenceKind;
}

export function isWorkshopSource(description: string | null | undefined): boolean {
  return parseEvidenceKind(description) === "workshop_notes";
}

export function isDocumentarySource(description: string | null | undefined): boolean {
  const kind = parseEvidenceKind(description);
  return kind === "policy" || kind === "procedure" || kind === "record" || kind === "supporting";
}

export function isAnalyzableEvidence(
  description: string | null | undefined,
  extractedText: string | null | undefined
): boolean {
  return Boolean(extractedText?.trim());
}
