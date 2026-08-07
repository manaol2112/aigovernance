import { prisma } from "@/lib/db";
import {
  AssessmentsEmptyState,
  AssessmentsListHero,
  AssessmentsPortfolioOverview,
  AssessmentEngagementCard,
  type AssessmentListItem,
  type PortfolioPhaseSummary,
} from "@/components/assessments-list";
import {
  ASSESSMENT_JOURNEY_PHASES,
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
  let totalUseCases = 0;
  let totalDeliverables = 0;
  let totalFrameworkSelections = 0;

  const items: AssessmentListItem[] = assessments.map((a) => {
    const pendingCp = a.checkpoints.filter((c) => c.status === "pending").length;
    const controlTotal = a.controlEvaluations.length;
    const controlConfirmed = a.controlEvaluations.filter(
      (e) => e.status === "human_confirmed"
    ).length;

    pendingApprovals += pendingCp;
    if (a.workflowStage !== "finalized") active += 1;
    totalUseCases += a.useCases.length;
    totalDeliverables += a._count.deliverables;
    totalFrameworkSelections += a.scope?.frameworkCodes?.length ?? 0;
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

  const completed = assessments.length - active;
  const averageFrameworks =
    assessments.length > 0 ? Math.round((totalFrameworkSelections / assessments.length) * 10) / 10 : 0;

  const phaseBreakdown: PortfolioPhaseSummary[] = ASSESSMENT_JOURNEY_PHASES.map((phase) => ({
    id: phase.id,
    label: phase.label,
    subtitle: phase.subtitle,
    count: items.filter((item) => item.journeyPhase === phase.id).length,
  }));

  const attentionItems = [...items]
    .sort((a, b) => {
      const score = (item: AssessmentListItem) => {
        const validationGap =
          isAnalysisStage(item.workflowStage) || item.workflowStage === "deliverables"
            ? Math.max(0, item.controlTotal - item.controlConfirmed)
            : 0;
        const unfinishedBoost = item.workflowStage === "finalized" ? 0 : 10;
        return item.pendingApprovals * 100 + validationGap * 10 + unfinishedBoost;
      };

      return score(b) - score(a);
    })
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <AssessmentsListHero
        total={assessments.length}
        active={active}
        completed={completed}
        pendingApprovals={pendingApprovals}
        controlsAwaiting={controlsAwaiting}
        phaseBreakdown={phaseBreakdown}
      />

      {items.length === 0 ? (
        <AssessmentsEmptyState />
      ) : (
        <div className="space-y-6">
          <AssessmentsPortfolioOverview
            attentionItems={attentionItems}
            totalUseCases={totalUseCases}
            totalDeliverables={totalDeliverables}
            averageFrameworks={averageFrameworks}
            completed={completed}
            total={items.length}
          />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 px-1">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  All engagements
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {items.length} assessment{items.length === 1 ? "" : "s"} sorted by most recent activity
                </p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {items.map((item) => (
                <AssessmentEngagementCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
