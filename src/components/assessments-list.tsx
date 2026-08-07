import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteAssessmentButton } from "@/components/delete-assessment-button";
import {
  ASSESSMENT_JOURNEY_PHASES,
  getJourneyPhase,
  journeyPhaseIndex,
  journeyPhaseLabel,
  type JourneyPhaseId,
} from "@/lib/assessment-journey";
import { isAnalysisStage } from "@/lib/use-case-types";
import { cn, formatDate, titleCase } from "@/lib/utils";

const PHASE_ACCENT: Record<JourneyPhaseId, { bar: string; badge: string; glow: string }> = {
  scope: {
    bar: "bg-slate-500",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    glow: "group-hover:shadow-slate-200/80",
  },
  facilitate: {
    bar: "bg-violet-500",
    badge: "bg-violet-50 text-violet-800 border-violet-200",
    glow: "group-hover:shadow-violet-200/60",
  },
  evidence: {
    bar: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
    glow: "group-hover:shadow-indigo-200/60",
  },
  validate: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    glow: "group-hover:shadow-amber-200/60",
  },
  preview: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    glow: "group-hover:shadow-emerald-200/60",
  },
  deliver: {
    bar: "bg-teal-600",
    badge: "bg-teal-50 text-teal-800 border-teal-200",
    glow: "group-hover:shadow-teal-200/60",
  },
};

export type AssessmentListItem = {
  id: string;
  name: string;
  clientName: string | null;
  clientIndustry: string | null;
  status: string;
  workflowStage: string;
  createdAt: Date;
  frameworkCodes: string[];
  useCaseCount: number;
  deliverableCount: number;
  pendingApprovals: number;
  controlTotal: number;
  controlConfirmed: number;
  journeyPhase: JourneyPhaseId;
  nextActionLabel: string;
  nextActionHint: string;
};

export type PortfolioPhaseSummary = {
  id: JourneyPhaseId;
  label: string;
  subtitle: string;
  count: number;
};

function MiniJourneyRail({ activePhase }: { activePhase: JourneyPhaseId }) {
  const activeIdx = journeyPhaseIndex(activePhase);

  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {ASSESSMENT_JOURNEY_PHASES.map((phase, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={phase.id} className="flex items-center gap-1.5">
            <span
              title={phase.label}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                done && "bg-emerald-400",
                active && "h-2.5 w-2.5 bg-indigo-500 ring-4 ring-indigo-200/60",
                !done && !active && "bg-slate-300"
              )}
            />
            {i < ASSESSMENT_JOURNEY_PHASES.length - 1 && (
              <span
                className={cn(
                  "h-px w-3",
                  i < activeIdx ? "bg-emerald-300" : "bg-slate-300"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function portfolioProgress(phase: JourneyPhaseId, isFinalized: boolean) {
  if (isFinalized) return 100;
  const maxIndex = ASSESSMENT_JOURNEY_PHASES.length - 1;
  return Math.max(12, Math.round((journeyPhaseIndex(phase) / maxIndex) * 100));
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

export function AssessmentEngagementCard({ item }: { item: AssessmentListItem }) {
  const accent = PHASE_ACCENT[item.journeyPhase];
  const phase = getJourneyPhase(item.journeyPhase);
  const validationPct =
    item.controlTotal > 0
      ? Math.round((item.controlConfirmed / item.controlTotal) * 100)
      : null;
  const isFinalized = item.workflowStage === "finalized";
  const showValidation =
    (isAnalysisStage(item.workflowStage) || item.workflowStage === "deliverables") &&
    item.controlTotal > 0;
  const remainingControls = showValidation ? Math.max(0, item.controlTotal - item.controlConfirmed) : 0;
  const progress = portfolioProgress(item.journeyPhase, isFinalized);
  const statusLabel = titleCase(item.status.replace(/_/g, " "));

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]",
        accent.glow
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", accent.bar)} />

      <div className="flex flex-col gap-6 p-6 pl-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  accent.badge
                )}
              >
                {journeyPhaseLabel(item.journeyPhase)}
              </span>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                {statusLabel}
              </Badge>
              {isFinalized && (
                <Badge variant="success" className="gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Finalized
                </Badge>
              )}
              {!isFinalized && item.pendingApprovals > 0 && (
                <Badge variant="warning" className="gap-1 text-[10px]">
                  <AlertTriangle className="h-3 w-3" />
                  {item.pendingApprovals} pending approval{item.pendingApprovals === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            <Link
              href={`/assessments/${item.id}/workflow`}
              className="mt-3 block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 transition-colors group-hover:text-indigo-700">
                {item.name}
              </h2>
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {item.clientName && (
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {item.clientName}
                </span>
              )}
              {item.clientIndustry && <span>{item.clientIndustry}</span>}
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Created {formatDate(item.createdAt)}
              </span>
            </div>

            {item.frameworkCodes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.frameworkCodes.slice(0, 4).map((code) => (
                  <span
                    key={code}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-medium text-slate-600"
                  >
                    {code}
                  </span>
                ))}
                {item.frameworkCodes.length > 4 && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">
                    +{item.frameworkCodes.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            <DeleteAssessmentButton
              assessmentId={item.id}
              assessmentName={item.name}
              variant="list"
            />
            <Button asChild size="sm" className="gap-1.5 rounded-full px-4 shadow-sm shadow-indigo-200/60">
              <Link href={`/assessments/${item.id}/workflow`}>
                {item.nextActionLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <MetricTile
            label="Scope"
            value={`${item.frameworkCodes.length}`}
            detail={`Framework${item.frameworkCodes.length === 1 ? "" : "s"} selected`}
          />
          <MetricTile
            label="Use cases"
            value={`${item.useCaseCount}`}
            detail={`${item.useCaseCount === 1 ? "System" : "Systems"} in engagement scope`}
          />
          <MetricTile
            label="Deliverables"
            value={`${item.deliverableCount}`}
            detail="Outputs prepared for client handoff"
          />
          <MetricTile
            label="Validation"
            value={
              showValidation && validationPct !== null
                ? `${validationPct}%`
                : isFinalized
                  ? "100%"
                  : item.pendingApprovals > 0
                    ? `${item.pendingApprovals}`
                    : "On track"
            }
            detail={
              showValidation && validationPct !== null
                ? `${item.controlConfirmed}/${item.controlTotal} controls signed off`
                : item.pendingApprovals > 0
                  ? "Approvals waiting for reviewer action"
                  : "No validation bottleneck detected"
            }
          />
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Recommended next move
            </div>
            <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              <span>{phase.label}</span>
              <span className="mx-1 text-slate-300">·</span>
              <span>{progress}%</span>
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-950">{item.nextActionLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.nextActionHint}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Journey
                </p>
                <p className="mt-1 text-xs text-slate-600">{phase.subtitle}</p>
              </div>
              <span className="text-[11px] text-slate-500">
                {showValidation && validationPct !== null
                  ? `${remainingControls} control${remainingControls === 1 ? "" : "s"} remaining`
                  : isFinalized
                    ? "Delivery-ready"
                    : "In progress"}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <MiniJourneyRail activePhase={item.journeyPhase} />
              <span className="shrink-0 text-xs font-semibold tabular-nums text-indigo-700">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AssessmentsListHero({
  total,
  active,
  completed,
  pendingApprovals,
  controlsAwaiting,
  phaseBreakdown,
}: {
  total: number;
  active: number;
  completed: number;
  pendingApprovals: number;
  controlsAwaiting: number;
  phaseBreakdown: PortfolioPhaseSummary[];
}) {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const glassPanelStyle = {
    borderColor: "color-mix(in srgb, var(--theme-sidebar-fg) 10%, transparent)",
    backgroundColor: "color-mix(in srgb, var(--theme-sidebar-fg) 6%, transparent)",
  } as const;
  const mutedHeroText = {
    color: "color-mix(in srgb, var(--theme-sidebar-fg) 72%, transparent)",
  } as const;
  const faintHeroText = {
    color: "color-mix(in srgb, var(--theme-sidebar-fg) 52%, transparent)",
  } as const;

  return (
    <section
      className="relative overflow-hidden rounded-[32px] border shadow-[0_28px_80px_-36px_rgba(15,23,42,0.85)]"
      style={{
        borderColor: "var(--theme-border)",
        backgroundColor: "var(--theme-hero-bg)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--theme-brand) 28%, transparent), transparent 32%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--theme-brand) 16%, transparent), transparent 24%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-sidebar-fg) 4%, transparent))",
        }}
      />
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-brand) 26%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--theme-brand) 18%, transparent)",
                color: "var(--theme-sidebar-fg)",
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--theme-brand)" }} />
              Enterprise assessment portfolio
            </div>
            <h1
              className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl"
              style={{ color: "var(--theme-sidebar-fg)" }}
            >
              Assessments
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed sm:text-lg" style={mutedHeroText}>
              Manage client AI governance engagements with a clearer executive view of portfolio load,
              workflow progression, validation pressure, and delivery readiness.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm" style={glassPanelStyle}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={faintHeroText}>
                Completion signal
              </p>
              <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--theme-brand)" }}>
                {completionRate}%
              </p>
              <p className="mt-1 text-xs" style={faintHeroText}>
                {completed} finalized engagement{completed === 1 ? "" : "s"}
              </p>
            </div>
            <Button asChild size="lg" className="gap-2 rounded-full shadow-lg shadow-black/20">
              <Link href="/assessments/new">
                New assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total engagements", value: total, tone: "text-white" },
              { label: "Active", value: active, tone: "text-white" },
              { label: "Pending approvals", value: pendingApprovals, tone: "text-amber-200" },
              { label: "Controls awaiting sign-off", value: controlsAwaiting, tone: "text-cyan-200" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border px-4 py-4 backdrop-blur-sm"
                style={glassPanelStyle}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={faintHeroText}>
                  {stat.label}
                </p>
                <p
                  className={cn("mt-2 text-3xl font-semibold tabular-nums", stat.tone)}
                  style={stat.tone === "text-white" ? { color: "var(--theme-sidebar-fg)" } : undefined}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border p-5 backdrop-blur-sm" style={glassPanelStyle}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={faintHeroText}>
              <BarChart3 className="h-3.5 w-3.5" style={{ color: "var(--theme-brand)" }} />
              Portfolio posture
            </div>
            <p className="mt-3 text-lg font-semibold" style={{ color: "var(--theme-sidebar-fg)" }}>
              {active > completed ? "Active execution dominates the portfolio." : "Delivery and closeout are accelerating."}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={mutedHeroText}>
              Use this board to identify which engagements need reviewer attention, which are nearing
              delivery, and where validation throughput could become the next bottleneck.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {phaseBreakdown.map((phase) => (
            <div
              key={phase.id}
              className="rounded-2xl border px-4 py-4 backdrop-blur-sm"
              style={glassPanelStyle}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={faintHeroText}>
                {phase.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "var(--theme-sidebar-fg)" }}>
                {phase.count}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={faintHeroText}>
                {phase.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AssessmentsPortfolioOverview({
  attentionItems,
  totalUseCases,
  totalDeliverables,
  averageFrameworks,
  completed,
  total,
}: {
  attentionItems: AssessmentListItem[];
  totalUseCases: number;
  totalDeliverables: number;
  averageFrameworks: number;
  completed: number;
  total: number;
}) {
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Executive attention
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Highest-priority engagements
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Focus reviewers and facilitators on the assessments with pending approvals, unfinished
            validation, or the clearest next workflow action.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {attentionItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No urgent items right now.</p>
              <p className="mt-1 text-sm text-slate-500">
                The portfolio is clear of immediate approval or validation pressure.
              </p>
            </div>
          ) : (
            attentionItems.map((item) => {
              const showValidation =
                (isAnalysisStage(item.workflowStage) || item.workflowStage === "deliverables") &&
                item.controlTotal > 0;
              const outstandingControls = showValidation
                ? Math.max(0, item.controlTotal - item.controlConfirmed)
                : 0;

              return (
                <Link
                  key={item.id}
                  href={`/assessments/${item.id}/workflow`}
                  className="group flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 px-5 py-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        {journeyPhaseLabel(item.journeyPhase)}
                      </span>
                      {item.pendingApprovals > 0 && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
                          {item.pendingApprovals} approval{item.pendingApprovals === 1 ? "" : "s"} pending
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-950 group-hover:text-indigo-700">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.clientName ?? "Client"}{item.clientIndustry ? ` · ${item.clientIndustry}` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.nextActionHint}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Immediate next
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.nextActionLabel}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {showValidation
                        ? `${outstandingControls} control${outstandingControls === 1 ? "" : "s"} waiting on sign-off`
                        : `Created ${formatDate(item.createdAt)}`}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Operational footprint
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Portfolio density
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {[
              { label: "Use cases in scope", value: totalUseCases, icon: Layers },
              { label: "Deliverables", value: totalDeliverables, icon: Package },
              { label: "Avg. frameworks", value: averageFrameworks, icon: ShieldCheck },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Icon className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Completion posture
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Delivery readiness
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {completed} of {total} engagement{total === 1 ? "" : "s"} are finalized. Track this ratio to
            understand how much portfolio capacity is still tied up in active assessment execution.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">{completionPct}% complete</span>
            <span className="text-slate-500">{Math.max(0, total - completed)} still active</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AssessmentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 px-8 py-20 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-lg shadow-slate-300/60">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
        Start the first client engagement
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
        Stand up a premium assessment workspace for scoping, workshop facilitation, evidence analysis,
        control validation, and board-ready reporting.
      </p>
      <Button asChild size="lg" className="mt-8 gap-2 rounded-full px-6 shadow-sm shadow-indigo-200/60">
        <Link href="/assessments/new">
          Create assessment
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
