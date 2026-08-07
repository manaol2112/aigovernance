import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ClipboardList,
  GitCompareArrows,
  Grid3x3,
  Layers3,
  Plus,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  journeyPhaseLabel,
  resolveActiveJourneyPhase,
} from "@/lib/assessment-journey";
import { getFrameworkLibraryMeta, getFrameworkShortLabel } from "@/lib/framework-library";
import type { MissionControlSnapshot } from "@/lib/mission-control";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { cn, titleCase } from "@/lib/utils";

export type DashboardStats = {
  frameworkCount: number;
  requirementCount: number;
  crosswalkCount: number;
  controlCount: number;
  riskCount: number;
  unmappedNist: number;
  assessmentCount: number;
};

export type DashboardFramework = {
  id: string;
  code: string;
  name: string;
  version: string;
  publisher: string;
  requirementCount: number;
};

export type MatrixSummary = {
  pillarCount: number;
  fullyCrossed: number;
  criticalPillars: number;
  totalControls: number;
};

type GovernanceDashboardProps = {
  stats: DashboardStats;
  matrixSummary: MatrixSummary;
  mission: MissionControlSnapshot;
  frameworks: DashboardFramework[];
};

const QUICK_PATHS = [
  {
    href: "/assessments/new",
    label: "New engagement",
    description: "Scope use cases and launch a client assessment",
    icon: Plus,
    accent: "from-indigo-500 to-violet-600",
  },
  {
    href: "/frameworks",
    label: "Framework library",
    description: "Browse clause-level requirements and provenance",
    icon: BookOpen,
    accent: "from-blue-500 to-cyan-600",
  },
  {
    href: "/crosswalk",
    label: "Crosswalk console",
    description: "Align obligations across standards with traceability",
    icon: GitCompareArrows,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    href: "/controls",
    label: "Control catalog",
    description: "Canonical mitigations mapped to risks and requirements",
    icon: Shield,
    accent: "from-slate-700 to-slate-900",
  },
  {
    href: "/matrix",
    label: "Risk matrix",
    description: "Pillar coverage across all five frameworks",
    icon: Grid3x3,
    accent: "from-violet-500 to-purple-700",
  },
  {
    href: "/maturity-assessment",
    label: "Maturity portal",
    description: "Executive quick scan across governance pillars",
    icon: Target,
    accent: "from-amber-500 to-orange-600",
  },
] as const;

function HeroStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{detail}</p>
    </div>
  );
}

function MissionMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success";
}) {
  const tones = {
    default: "border-slate-200/80 bg-white text-slate-900",
    warning: "border-amber-200/80 bg-amber-50/80 text-amber-950",
    success: "border-emerald-200/80 bg-emerald-50/80 text-emerald-950",
  }[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-3.5 shadow-sm", tones)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function MissionAttentionCard({
  id,
  name,
  clientName,
  workflowStage,
  controlTotal,
  controlConfirmed,
  pendingApprovals,
  nextActionLabel,
  nextActionHint,
}: MissionControlSnapshot["attentionItems"][number]) {
  const phase = resolveActiveJourneyPhase(workflowStage);
  const validationPct =
    controlTotal > 0 ? Math.round((controlConfirmed / controlTotal) * 100) : null;

  return (
    <Link
      href={`/assessments/${id}/workflow`}
      className="group block rounded-[22px] border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_20px_50px_-24px_rgba(79,70,229,0.35)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">
              {journeyPhaseLabel(phase)}
            </span>
            {pendingApprovals > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                {pendingApprovals} approval{pendingApprovals === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950 transition-colors group-hover:text-indigo-700">
            {name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {clientName ?? "Client"} · {titleCase(workflowStage.replace(/_/g, " "))}
            {controlTotal > 0 && (
              <>
                {" "}
                · Validation {controlConfirmed}/{controlTotal}
              </>
            )}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{nextActionHint}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {validationPct !== null && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700">
              {validationPct}%
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-indigo-600">
            {nextActionLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function GovernanceDashboard({
  stats,
  matrixSummary,
  mission,
  frameworks,
}: GovernanceDashboardProps) {
  const crosswalkCoverage =
    stats.requirementCount > 0
      ? Math.round((stats.crosswalkCount / Math.max(stats.requirementCount, 1)) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 lg:px-8">
        <div
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200/80">
            AI governance command center
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Governance dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Portfolio visibility across engagements, source-verified crosswalk alignment, and the
            canonical control layer powering workshop validation and client delivery.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroStat
              label="Active engagements"
              value={mission.activeEngagements}
              detail="Client assessments in flight"
            />
            <HeroStat
              label="Crosswalk links"
              value={stats.crosswalkCount.toLocaleString()}
              detail={`${crosswalkCoverage}% of requirement graph mapped`}
            />
            <HeroStat
              label="Canonical controls"
              value={stats.controlCount.toLocaleString()}
              detail="Unified mitigation layer"
            />
            <HeroStat
              label="Assessments"
              value={stats.assessmentCount}
              detail="Total engagements in portfolio"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/assessments/new">
                <Plus className="mr-1.5 h-4 w-4" />
                New engagement
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/assessments">View portfolio</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/matrix">Open risk matrix</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <ClipboardList className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Mission control</p>
                  </div>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                    Engagements needing attention
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Prioritized queue for facilitators and reviewers — approvals, validation, and delivery readiness.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full">
                  <Link href="/assessments">All assessments</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MissionMetric label="Active" value={mission.activeEngagements} />
                <MissionMetric
                  label="Pending approvals"
                  value={mission.pendingApprovals}
                  tone={mission.pendingApprovals > 0 ? "warning" : "default"}
                />
                <MissionMetric
                  label="Controls to sign off"
                  value={mission.controlsAwaitingSignOff}
                  tone={mission.controlsAwaitingSignOff > 0 ? "warning" : "default"}
                />
                <MissionMetric
                  label="Ready for delivery"
                  value={mission.readyForDelivery}
                  tone={mission.readyForDelivery > 0 ? "success" : "default"}
                />
              </div>

              {mission.attentionItems.length === 0 ? (
                <div className="flex flex-col items-center rounded-[22px] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-800">Portfolio is clear</p>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                    No engagements need immediate facilitator or reviewer action. Start a new assessment or
                    continue work in the library.
                  </p>
                  <Button asChild className="mt-5 gap-1.5 rounded-full">
                    <Link href="/assessments/new">
                      Start engagement
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mission.attentionItems.map((item) => (
                    <MissionAttentionCard key={item.id} {...item} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Quick paths</h2>
              <p className="mt-1 text-sm text-slate-500">
                Jump into the core surfaces that power assessments, alignment, and delivery.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_PATHS.map((path) => {
                const Icon = path.icon;
                return (
                  <Link
                    key={path.href}
                    href={path.href}
                    className="group relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div
                      className={cn(
                        "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.12] transition-opacity group-hover:opacity-20",
                        path.accent
                      )}
                      aria-hidden
                    />
                    <div className="relative flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                          path.accent
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-indigo-700">
                            {path.label}
                          </h3>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{path.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl shadow-slate-300/20">
            <div className="flex items-center gap-2 text-indigo-200">
              <Grid3x3 className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Risk & control matrix</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Cross-framework coverage</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {matrixSummary.pillarCount} risk pillars · {matrixSummary.fullyCrossed} with 4+ framework
              alignment · {matrixSummary.totalControls} canonical controls
            </p>

            <div className="mt-5 space-y-3">
              {[
                { label: "Critical pillars", value: matrixSummary.criticalPillars },
                { label: "4+ framework coverage", value: matrixSummary.fullyCrossed },
                { label: "Canonical controls", value: matrixSummary.totalControls },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <span className="text-lg font-semibold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Framework columns
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {FRAMEWORK_COLUMNS.map((fw) => (
                  <span
                    key={fw.code}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-200"
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", fw.color)} />
                    {fw.short}
                  </span>
                ))}
              </div>
            </div>

            <Button asChild size="sm" className="mt-5 w-full bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/matrix">
                Explore matrix
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>

          <section className="rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Layers3 className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Corpus health</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Requirements</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {stats.requirementCount.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Risk statements</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {stats.riskCount.toLocaleString()}
                </p>
              </div>
            </div>

            {stats.unmappedNist > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-950">Crosswalk gap detected</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                      {stats.unmappedNist} NIST subcategories still need outbound mappings.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 bg-white">
                      <Link href="/crosswalk?filter=unmapped">Review crosswalk</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                NIST subcategory crosswalk is fully mapped.
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Source-verified library
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Framework corpus</h2>
            <p className="mt-1 text-sm text-slate-500">
              Authoritative standards ingested with provenance — open any framework for clause-level detail.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/frameworks">Open library</Link>
          </Button>
        </div>

        <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
          {frameworks.map((framework) => {
            const meta = getFrameworkLibraryMeta(framework.code);
            const shortLabel = getFrameworkShortLabel(framework.code);

            return (
              <Link
                key={framework.id}
                href={`/frameworks/${framework.code}`}
                className="group flex flex-col bg-white p-5 transition-colors hover:bg-slate-50/80"
              >
                <div className="flex items-start gap-3">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", meta.accentDot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                        {shortLabel}
                      </code>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900 transition-colors group-hover:text-indigo-700">
                      {framework.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{meta.tagline}</p>
                    <p className="mt-3 text-[11px] text-slate-400">
                      {framework.publisher} · v{framework.version} · {framework.requirementCount.toLocaleString()}{" "}
                      requirements
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
