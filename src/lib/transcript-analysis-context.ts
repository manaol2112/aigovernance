import { RISK_PILLARS } from "@/lib/risk-control-matrix";
import { RISK_SUB_PILLARS } from "@/lib/risk-sub-pillars";
import { getPillarControlTreeForAssessment } from "@/lib/pillar-control-tree";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import { SUB_PILLAR_QUESTION_BANK } from "@/lib/workshop-question-bank";

export type TranscriptAnalysisContext = {
  assessmentName: string;
  clientName: string | null;
  pillars: Array<{
    pillarId: string;
    pillarLabel: string;
    controls: Array<{ code: string; title: string }>;
  }>;
  topics: Array<{
    subPillarId: string;
    pillarLabel: string;
    topicLabel: string;
    workshopQuestions: string[];
  }>;
  controlIndex: Array<{ code: string; title: string; description: string }>;
};

export async function buildTranscriptAnalysisContext(
  assessmentId: string
): Promise<TranscriptAnalysisContext> {
  const { prisma } = await import("@/lib/db");
  const [assessment, pillarTree, controls] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { name: true, clientName: true },
    }),
    getPillarControlTreeForAssessment(assessmentId),
    getScopedControlsForAssessment(assessmentId),
  ]);

  const pillarLabelById = new Map(RISK_PILLARS.map((p) => [p.id, p.label]));

  const topics = RISK_SUB_PILLARS.map((sub) => {
    const bank = SUB_PILLAR_QUESTION_BANK[sub.id] ?? [];
    return {
      subPillarId: sub.id,
      pillarLabel: pillarLabelById.get(sub.pillarId) ?? sub.pillarId,
      topicLabel: sub.label,
      workshopQuestions: bank.slice(0, 4).map((q) => q.prompt),
    };
  });

  return {
    assessmentName: assessment?.name ?? "Assessment",
    clientName: assessment?.clientName ?? null,
    pillars: pillarTree.map((p) => ({
      pillarId: p.pillarId,
      pillarLabel: p.pillarLabel,
      controls: p.controls.slice(0, 12).map((c) => ({ code: c.code, title: c.title })),
    })),
    topics,
    controlIndex: controls.slice(0, 80).map((c) => ({
      code: c.code,
      title: c.title,
      description: c.description.slice(0, 200),
    })),
  };
}

export function formatContextForPrompt(ctx: TranscriptAnalysisContext): string {
  const pillarBlock = ctx.pillars
    .map(
      (p) =>
        `### ${p.pillarLabel}\nControls: ${p.controls.map((c) => `${c.code} (${c.title})`).join("; ") || "none scoped"}`
    )
    .join("\n\n");

  const topicBlock = ctx.topics
    .map(
      (t) =>
        `- ${t.pillarLabel} → ${t.topicLabel}\n  Workshop probes:\n${t.workshopQuestions.map((q) => `    • ${q.slice(0, 180)}`).join("\n")}`
    )
    .join("\n");

  return `Assessment: ${ctx.assessmentName}${ctx.clientName ? ` | Client: ${ctx.clientName}` : ""}

RISK PILLARS & SCOPED CONTROLS:
${pillarBlock}

WORKSHOP TOPICS (map extracted findings here):
${topicBlock}

CONTROL INDEX (for mapping — do not invent controls not listed):
${ctx.controlIndex.map((c) => `- ${c.code}: ${c.title}`).join("\n")}`;
}
