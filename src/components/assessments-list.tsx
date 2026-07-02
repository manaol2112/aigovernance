import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteAssessmentButton } from "@/components/delete-assessment-button";
import {
  ASSESSMENT_JOURNEY_PHASES,
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

function MiniJourneyRail({ activePhase }: { activePhase: JourneyPhaseId }) {
  const activeIdx = journeyPhaseIndex(activePhase);

  return (
    <div className="flex items-center gap-1" aria-hidden>
      {ASSESSMENT_JOURNEY_PHASES.map((phase, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={phase.id} className="flex items-center gap-1">
            <span
              title={phase.label}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                done && "bg-emerald-400",
                active && "h-2 w-2 bg-indigo-600 ring-2 ring-indigo-200",
                !done && !active && "bg-slate-200"
              )}
            />
            {i < ASSESSMENT_JOURNEY_PHASES.length - 1 && (
              <span
                className={cn(
                  "h-px w-2",
                  i < activeIdx ? "bg-emerald-300" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AssessmentEngagementCard({ item }: { item: AssessmentListItem }) {
  const accent = PHASE_ACCENT[item.journeyPhase];
  const validationPct =
    item.controlTotal > 0
      ? Math.round((item.controlConfirmed / item.controlTotal) * 100)
      : null;
  const isFinalized = item.workflowStage === "finalized";
  const showValidation =
    (isAnalysisStage(item.workflowStage) || item.workflowStage === "deliverables") &&
    item.controlTotal > 0;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg",
        accent.glow
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", accent.bar)} />

      <div className="flex flex-col gap-5 p-5 pl-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                accent.badge
              )}
            >
              {journeyPhaseLabel(item.journeyPhase)}
            </span>
            {isFinalized && (
              <Badge variant="success" className="gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Badge>
            )}
            {item.pendingApprovals > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {item.pendingApprovals} approval{item.pendingApprovals === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          <Link
            href={`/assessments/${item.id}/workflow`}
            className="mt-2 block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-700">
              {item.name}
            </h2>
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {item.clientName && (
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {item.clientName}
              </span>
            )}
            {item.clientIndustry && <span>{item.clientIndustry}</span>}
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(item.createdAt)}
            </span>
          </div>

          {item.frameworkCodes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.frameworkCodes.slice(0, 4).map((code) => (
                <span
                  key={code}
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-600"
                >
                  {code}
                </span>
              ))}
              {item.frameworkCodes.length > 4 && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                  +{item.frameworkCodes.length - 4}
                </span>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {item.useCaseCount} use case{item.useCaseCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {item.deliverableCount} deliverable{item.deliverableCount === 1 ? "" : "s"}
            </span>
            <span className="text-slate-400">{titleCase(item.status)}</span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <MiniJourneyRail activePhase={item.journeyPhase} />
              {showValidation && validationPct !== null && (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-indigo-700">
                  {item.controlConfirmed}/{item.controlTotal} signed off
                </span>
              )}
            </div>
            {showValidation && validationPct !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${validationPct}%` }}
                />
              </div>
            )}
            <p className="text-xs leading-relaxed text-slate-500">{item.nextActionHint}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
          <DeleteAssessmentButton
            assessmentId={item.id}
            assessmentName={item.name}
            variant="list"
          />
          <Button asChild size="sm" className="gap-1.5 shadow-sm">
            <Link href={`/assessments/${item.id}/workflow`}>
              {item.nextActionLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function AssessmentsListHero({
  total,
  active,
  pendingApprovals,
  controlsAwaiting,
}: {
  total: number;
  active: number;
  pendingApprovals: number;
  controlsAwaiting: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(79,70,229,0.14),transparent)]" />
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Client engagements
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Assessments
            </h1>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
              Run end-to-end AI governance engagements — from scoping and workshop facilitation through
              evidence analysis, validation, and client deliverables.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 gap-2 shadow-md shadow-indigo-200/50">
            <Link href="/assessments/new">
              New assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total engagements", value: total },
            { label: "Active", value: active },
            { label: "Pending approvals", value: pendingApprovals },
            { label: "Controls to sign off", value: controlsAwaiting },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AssessmentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-slate-900">Start your first engagement</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Create a client assessment to scope frameworks and use cases, facilitate workshops, map evidence
        to controls, and produce board-ready deliverables.
      </p>
      <Button asChild size="lg" className="mt-6 gap-2">
        <Link href="/assessments/new">
          Create assessment
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
