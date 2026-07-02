import { prisma } from "@/lib/db";
import {
  AssessmentsEmptyState,
  AssessmentsListHero,
  AssessmentEngagementCard,
  type AssessmentListItem,
} from "@/components/assessments-list";
import {
  resolveActiveJourneyPhase,
  resolveListNextAction,
} from "@/lib/assessment-journey";
import { isAnalysisStage } from "@/lib/use-case-types";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    include: {
      scope: true,
      useCases: true,
      checkpoints: true,
      controlEvaluations: { select: { status: true } },
      _count: { select: { deliverables: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let pendingApprovals = 0;
  let controlsAwaiting = 0;
  let active = 0;

  const items: AssessmentListItem[] = assessments.map((a) => {
    const pendingCp = a.checkpoints.filter((c) => c.status === "pending").length;
    const controlTotal = a.controlEvaluations.length;
    const controlConfirmed = a.controlEvaluations.filter(
      (e) => e.status === "human_confirmed"
    ).length;

    pendingApprovals += pendingCp;
    if (a.workflowStage !== "finalized") active += 1;
    if (isAnalysisStage(a.workflowStage) || a.workflowStage === "deliverables") {
      controlsAwaiting += Math.max(0, controlTotal - controlConfirmed);
    }

    const journeyPhase = resolveActiveJourneyPhase(a.workflowStage);
    const nextAction = resolveListNextAction({
      workflowStage: a.workflowStage,
      useCaseCount: a.useCases.length,
      pendingCheckpoints: pendingCp,
      controlTotal,
      controlConfirmed,
    });

    return {
      id: a.id,
      name: a.name,
      clientName: a.clientName,
      clientIndustry: a.clientIndustry,
      status: a.status,
      workflowStage: a.workflowStage,
      createdAt: a.createdAt,
      frameworkCodes: a.scope?.frameworkCodes ?? [],
      useCaseCount: a.useCases.length,
      deliverableCount: a._count.deliverables,
      pendingApprovals: pendingCp,
      controlTotal,
      controlConfirmed,
      journeyPhase,
      nextActionLabel: nextAction.label,
      nextActionHint: nextAction.hint,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AssessmentsListHero
        total={assessments.length}
        active={active}
        pendingApprovals={pendingApprovals}
        controlsAwaiting={controlsAwaiting}
      />

      {items.length === 0 ? (
        <AssessmentsEmptyState />
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                All engagements
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {items.length} assessment{items.length === 1 ? "" : "s"} · sorted by most recent
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <AssessmentEngagementCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
