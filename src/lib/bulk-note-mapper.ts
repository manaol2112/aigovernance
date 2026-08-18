import { prisma } from "@/lib/db";
import { getPillarControlTreeForAssessment } from "@/lib/pillar-control-tree";

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function controlKeywords(code: string, title: string): string[] {
  return [
    code.toLowerCase(),
    ...title.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ];
}

function pillarKeywords(pillarId: string, pillarLabel: string): string[] {
  const map: Record<string, string[]> = {
    governance: ["governance", "policy", "board", "accountability", "oversight", "roles"],
    compliance: ["compliance", "documentation", "audit", "logging", "records", "traceability"],
    "safety-reliability": ["safety", "reliability", "robustness", "accuracy", "harm", "security", "adversarial"],
    oversight: ["human oversight", "monitoring", "incident", "override", "operations"],
    systemic: ["gpai", "systemic", "foundation model", "general purpose"],
    "supply-chain": ["vendor", "third party", "supplier", "supply chain", "ecosystem", "partner"],
    transparency: ["transparency", "explainability", "disclosure", "interpretability"],
    fairness: ["fairness", "bias", "discrimination", "equity", "fundamental rights"],
    "privacy-data": ["privacy", "data", "personal", "pii", "provenance", "gdpr"],
    workforce: ["workforce", "training", "competency", "human capital", "skills", "talent"],
    "financial-resilience": ["financial", "resilience", "continuity", "sustainability", "decommission"],
  };
  return map[pillarId] ?? pillarLabel.toLowerCase().split(/\s+/);
}

function scoreSentence(sentence: string, keywords: string[]): number {
  const lower = sentence.toLowerCase();
  return keywords.filter((k) => lower.includes(k)).length;
}

/** Map bulk workshop notes to per-control attribution by risk pillar. */
export async function bulkMapNotesToControls(assessmentId: string): Promise<{
  controlsUpdated: number;
  pillarsMatched: number;
  unmappedSentences: number;
}> {
  const repo = await prisma.assessmentRepository.findUnique({ where: { assessmentId } });
  const bulk = `${repo?.workshopNotes ?? ""}\n${repo?.facilitatorNotes ?? ""}`.trim();
  if (!bulk) {
    return { controlsUpdated: 0, pillarsMatched: 0, unmappedSentences: 0 };
  }

  const tree = await getPillarControlTreeForAssessment(assessmentId);
  const sentences = splitSentences(bulk);
  let controlsUpdated = 0;
  let pillarsMatched = 0;

  for (const pillar of tree) {
    const pKeywords = pillarKeywords(pillar.pillarId, pillar.pillarLabel);
    const pillarHits = sentences.filter((s) => scoreSentence(s, pKeywords) > 0);
    if (pillarHits.length > 0) pillarsMatched++;

    for (const control of pillar.controls) {
      const cKeywords = controlKeywords(control.code, control.title);
      const matched = sentences.filter(
        (s) => scoreSentence(s, cKeywords) > 0 || scoreSentence(s, pKeywords) > 0
      );
      if (matched.length === 0) continue;

      const attributed = matched
        .map((s) => `[${pillar.pillarLabel} / ${control.code}] ${s}`)
        .join("\n");

      const existing = await prisma.controlEvaluation.findUnique({
        where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
      });

      const merged = existing?.workshopNotes
        ? `${existing.workshopNotes}\n\n--- Auto-mapped ---\n${attributed}`
        : attributed;

      await prisma.controlEvaluation.upsert({
        where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
        create: {
          assessmentId,
          controlId: control.id,
          workshopNotes: merged,
          status: "pending",
        },
        update: { workshopNotes: merged },
      });
      controlsUpdated++;
    }
  }

  const mapped = new Set<string>();
  for (const pillar of tree) {
    const pKeywords = pillarKeywords(pillar.pillarId, pillar.pillarLabel);
    for (const control of pillar.controls) {
      const cKeywords = controlKeywords(control.code, control.title);
      for (const s of sentences) {
        if (scoreSentence(s, cKeywords) > 0 || scoreSentence(s, pKeywords) > 0) {
          mapped.add(s);
        }
      }
    }
  }

  return {
    controlsUpdated,
    pillarsMatched,
    unmappedSentences: sentences.filter((s) => !mapped.has(s)).length,
  };
}
