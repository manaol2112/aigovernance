export const TRANSCRIPT_EVIDENCE_TAG = "[transcript]";

export function isTranscriptEvidence(description: string | null | undefined): boolean {
  return description?.startsWith(TRANSCRIPT_EVIDENCE_TAG) ?? false;
}

export function transcriptEvidenceDescription(label?: string): string {
  return label
    ? `${TRANSCRIPT_EVIDENCE_TAG} ${label}`
    : `${TRANSCRIPT_EVIDENCE_TAG} Workshop recording transcript`;
}
