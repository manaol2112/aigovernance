import { callOpenAIJson } from "@/lib/openai-client";
import {
  evidenceKindDescription,
  type EvidenceKind,
} from "@/lib/transcript-evidence";

export type { EvidenceKind };

const KIND_LABELS: Record<EvidenceKind, string> = {
  workshop_notes: "Workshop notes",
  policy: "Policy",
  procedure: "Procedure",
  record: "Record / artifact",
  supporting: "Supporting evidence",
};

export function evidenceKindLabel(kind: EvidenceKind): string {
  return KIND_LABELS[kind];
}

function classifyByHeuristics(fileName: string, textPreview: string): EvidenceKind | null {
  const hay = `${fileName} ${textPreview.slice(0, 2000)}`.toLowerCase();

  if (
    /\b(transcript|workshop|facilitator|interview|discussion|meeting notes|capture)\b/.test(hay) ||
    /\b(q&a|q and a|attendees|facilitated)\b/.test(hay)
  ) {
    return "workshop_notes";
  }
  if (/\b(policy|policies|standard|directive|governance framework|aims)\b/.test(hay)) {
    return "policy";
  }
  if (/\b(procedure|sop|runbook|playbook|operating procedure|process document)\b/.test(hay)) {
    return "procedure";
  }
  if (
    /\b(audit report|minutes|register|log|certificate|attestation|record of|evidence of|raci|matrix)\b/.test(
      hay
    )
  ) {
    return "record";
  }
  return null;
}

type AiClassification = { kind: EvidenceKind; rationale?: string };

async function classifyWithAI(fileName: string, textPreview: string): Promise<EvidenceKind | null> {
  if (!process.env.OPENAI_API_KEY || !textPreview.trim()) return null;

  const result = await callOpenAIJson<AiClassification>({
    system: [
      "Classify uploaded governance files for an AI compliance assessment.",
      "Return JSON: { kind: workshop_notes|policy|procedure|record|supporting }",
      "workshop_notes = transcripts, meeting notes, workshop capture",
      "policy = policies, standards, governance frameworks",
      "procedure = SOPs, procedures, runbooks",
      "record = audit records, registers, minutes, signed artifacts",
      "supporting = other evidence that supports control requirements",
    ].join("\n"),
    user: `File: ${fileName}\n\nExcerpt:\n${textPreview.slice(0, 3_000)}`,
    temperature: 0,
    maxTokens: 200,
  });

  if (!result.ok) return null;
  const kind = result.data.kind;
  if (
    kind === "workshop_notes" ||
    kind === "policy" ||
    kind === "procedure" ||
    kind === "record" ||
    kind === "supporting"
  ) {
    return kind;
  }
  return null;
}

export async function classifyEvidenceFile(options: {
  fileName: string;
  textPreview: string;
  explicitKind?: EvidenceKind | null;
  forceAi?: boolean;
}): Promise<{ kind: EvidenceKind; description: string }> {
  if (options.explicitKind) {
    return {
      kind: options.explicitKind,
      description: evidenceKindDescription(options.explicitKind, options.fileName),
    };
  }

  const heuristic = classifyByHeuristics(options.fileName, options.textPreview);
  if (heuristic && !options.forceAi) {
    return {
      kind: heuristic,
      description: evidenceKindDescription(heuristic, options.fileName),
    };
  }

  const aiKind = await classifyWithAI(options.fileName, options.textPreview);
  const kind = aiKind ?? heuristic ?? "supporting";
  return {
    kind,
    description: evidenceKindDescription(kind, options.fileName),
  };
}
