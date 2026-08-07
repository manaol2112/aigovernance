import { prisma } from "@/lib/db";
import {
  isAnalyzableEvidence,
  parseEvidenceKind,
  type EvidenceKind,
} from "@/lib/transcript-evidence";

export type CaptureSource = {
  id: string;
  fileName: string;
  text: string;
  kind: EvidenceKind;
};

export async function getCaptureSources(assessmentId: string): Promise<CaptureSource[]> {
  const files = await prisma.assessmentEvidence.findMany({
    where: { assessmentId },
    orderBy: { uploadedAt: "asc" },
  });

  return files
    .filter((f) => isAnalyzableEvidence(f.description, f.extractedText))
    .map((f) => ({
      id: f.id,
      fileName: f.fileName,
      text: f.extractedText!.trim(),
      kind: parseEvidenceKind(f.description) ?? "supporting",
    }));
}

export function toCaptureSourceDocs(sources: CaptureSource[]) {
  return sources.map((s) => ({ id: s.id, fileName: s.fileName, text: s.text, kind: s.kind }));
}

export function formatCaptureCorpusForPrompt(
  sources: Array<{ id: string; fileName: string; text: string; kind?: EvidenceKind }>,
  maxTotalChars = 90_000
): string {
  if (sources.length === 0) return "";

  const perFileBudget = Math.floor(maxTotalChars / sources.length);
  return sources
    .map((s) => {
      const body = s.text.slice(0, perFileBudget);
      const type = s.kind ?? "supporting";
      return [`[SOURCE id="${s.id}" file="${s.fileName}" type="${type}"]`, body, "[/SOURCE]"].join(
        "\n"
      );
    })
    .join("\n\n");
}
