import { prisma } from "@/lib/db";
import { isAnalysisStage } from "@/lib/use-case-types";
import { resolveListNextAction } from "@/lib/assessment-journey";

export type MissionControlItem = {
  id: string;
  name: string;
  clientName: string | null;
  workflowStage: string;
  pendingApprovals: number;
  controlTotal: number;
  controlConfirmed: number;
  nextActionLabel: string;
  nextActionHint: string;
};

export type MissionControlSnapshot = {
  activeEngagements: number;
  pendingApprovals: number;
  controlsAwaitingSignOff: number;
  readyForDelivery: number;
  attentionItems: MissionControlItem[];
};

export async function getMissionControlSnapshot(): Promise<MissionControlSnapshot> {
  const assessments = await prisma.assessment.findMany({
    where: { workflowStage: { not: "finalized" } },
    include: {
      checkpoints: true,
      useCases: true,
      controlEvaluations: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  let pendingApprovals = 0;
  let controlsAwaitingSignOff = 0;
  let readyForDelivery = 0;

  const attentionItems: MissionControlItem[] = [];

  for (const a of assessments) {
    const pending = a.checkpoints.filter((c) => c.status === "pending").length;
    pendingApprovals += pending;

    const controlTotal = a.controlEvaluations.length;
    const controlConfirmed = a.controlEvaluations.filter(
      (e) => e.status === "human_confirmed"
    ).length;
    const remaining = Math.max(0, controlTotal - controlConfirmed);
    if (isAnalysisStage(a.workflowStage) || a.workflowStage === "deliverables") {
      controlsAwaitingSignOff += remaining;
    }
    if (a.workflowStage === "deliverables" && remaining === 0) {
      readyForDelivery += 1;
    }

    const nextAction = resolveListNextAction({
      workflowStage: a.workflowStage,
      useCaseCount: a.useCases.length,
      pendingCheckpoints: pending,
      controlTotal,
      controlConfirmed,
    });

    const needsAttention =
      pending > 0 ||
      (isAnalysisStage(a.workflowStage) && remaining > 0) ||
      a.workflowStage === "deliverables";

    if (needsAttention) {
      attentionItems.push({
        id: a.id,
        name: a.name,
        clientName: a.clientName,
        workflowStage: a.workflowStage,
        pendingApprovals: pending,
        controlTotal,
        controlConfirmed,
        nextActionLabel: nextAction.label,
        nextActionHint: nextAction.hint,
      });
    }
  }

  return {
    activeEngagements: assessments.length,
    pendingApprovals,
    controlsAwaitingSignOff,
    readyForDelivery,
    attentionItems: attentionItems.slice(0, 8),
  };
}
