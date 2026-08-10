"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Compass,
  Layers,
  Map,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MaturitySurveyReport, SurveyGapItem } from "@/lib/maturity-survey-analysis";
import {
  PillarComplianceStackedChart,
  PillarMaturityRadarChart,
} from "@/components/maturity-charts";
import {
  MATURITY_LEVEL_GUIDANCE,
} from "@/lib/maturity-survey-constants";
import type { MaturityLevel } from "@prisma/client";
import type { PillarMaturityRecord, RoadmapStep } from "@/lib/control-review-reports";
import { MaturityAssessmentUpsellPanel } from "@/components/maturity-assessment-upsell-panel";
import {
  MaturityDeepDiveBaselineBanner,
  MaturityDeepDiveContinuePanel,
} from "@/components/maturity-deep-dive-continue-panel";
import { MaturityPillarDeepDiveResults } from "@/components/maturity-pillar-deep-dive-results";
import type { DeepDiveContinuationState } from "@/lib/maturity-survey-continue";
import { isPillarFocusedDeepDive } from "@/lib/maturity-survey-analysis";
import {
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
} from "@/components/maturity-landing-motion";

const PHASE_META: Record<
  RoadmapStep["phase"],
  { label: string; subtitle: string; style: string; icon: typeof AlertTriangle }
> = {
  immediate: {
    label: "Immediate",
    subtitle: "0–90 days",
    style: "border-red-200/80 bg-gradient-to-br from-red-50 to-white",
    icon: AlertTriangle,
  },
  short_term: {
    label: "Near term",
    subtitle: "3–6 months",
    style: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    icon: TrendingUp,
  },
  medium_term: {
    label: "Strategic",
    subtitle: "6–12 months",
    style: "border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-white",
    icon: Compass,
  },
};

const SEVERITY_ORDER: Record<SurveyGapItem["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const SECTION_NAV = [
  { id: "priorities", label: "Priorities" },
  { id: "pillars", label: "Pillars" },
  { id: "roadmap", label: "Roadmap" },
  { id: "details", label: "Full detail" },
] as const;

function MaturityScoreRing({
  scorePct,
  maturity,
  maturityLabel,
}: {
  scorePct: number;
  maturity: MaturityLevel;
  maturityLabel: string;
}) {
  const color = MATURITY_LEVEL_GUIDANCE[maturity].color;
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, scorePct)) / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={10} />
        <circle
          cx={64}
          cy={64}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums text-white">{scorePct}%</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Maturity
        </span>
        <span className="mt-1 text-xs font-medium" style={{ color }}>
          {maturityLabel}
        </span>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
      )}
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function PriorityGapCard({ gap, rank }: { gap: SurveyGapItem; rank: number }) {
  const severityStyles = {
    critical: "border-red-200 bg-red-50/80",
    high: "border-amber-200 bg-amber-50/80",
    medium: "border-slate-200 bg-slate-50/80",
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md",
        severityStyles[gap.severity]
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                gap.severity === "critical"
                  ? "danger"
                  : gap.severity === "high"
                    ? "warning"
                    : "secondary"
              }
            >
              {gap.severity}
            </Badge>
            <span className="text-xs font-medium text-slate-500">{gap.pillarLabel}</span>
          </div>
          <p className="mt-2 font-semibold text-slate-900">{gap.controlTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{gap.summary}</p>
        </div>
      </div>
    </article>
  );
}

function ActionCard({ step, rank }: { step: RoadmapStep; rank: number }) {
  return (
    <article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
          {rank}
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            {step.pillarLabel} · {PHASE_META[step.phase].subtitle}
          </p>
          <p className="mt-1 font-semibold text-slate-900">{step.controlTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.action}</p>
          <p className="mt-2 text-xs text-slate-400">Suggested owner: {step.ownerHint}</p>
        </div>
      </div>
    </article>
  );
}

function PillarScoreRow({
  pillar,
  priorityFocus,
}: {
  pillar: PillarMaturityRecord;
  priorityFocus?: boolean;
}) {
  const pct = pillar.alignmentPct;
  const barColor =
    pct >= 76 ? "bg-emerald-500" : pct >= 51 ? "bg-amber-500" : pct >= 26 ? "bg-orange-500" : "bg-red-500";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        priorityFocus ? "border-indigo-200/80 bg-indigo-50/40" : "border-slate-100 bg-white"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{pillar.pillarLabel}</p>
          {priorityFocus && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              Most room to strengthen
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RoadmapPhaseColumn({
  phase,
  steps,
}: {
  phase: RoadmapStep["phase"];
  steps: RoadmapStep[];
}) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  if (steps.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", meta.style)}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
          <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li
            key={`roadmap-${step.priority}-${step.controlCode}`}
            className="rounded-xl border border-white/60 bg-white/70 p-3.5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {step.priority}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {step.pillarLabel}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-900">{step.controlTitle}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{step.action}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50/80"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-slate-100 px-6 py-6">{children}</div>}
    </section>
  );
}

export function MaturitySurveyResults({
  surveyId,
  report,
  deepDiveContinuation,
  quickScanReport,
}: {
  surveyId: string;
  report: MaturitySurveyReport;
  deepDiveContinuation?: DeepDiveContinuationState | null;
  quickScanReport?: MaturitySurveyReport | null;
}) {
  if (isPillarFocusedDeepDive(report) && report.pillarDeepDive) {
    return (
      <MaturityPillarDeepDiveResults
        surveyId={surveyId}
        report={report}
        deepDiveContinuation={deepDiveContinuation}
        quickScanReport={quickScanReport}
      />
    );
  }

  const maturityColor = MATURITY_LEVEL_GUIDANCE[report.overallMaturity].color;

  const sortedPillars = useMemo(
    () =>
      [...report.pillarMaturity]
        .filter((p) => p.reviewedControls > 0)
        .sort((a, b) => a.alignmentPct - b.alignmentPct),
    [report.pillarMaturity]
  );

  const topGaps = useMemo(
    () =>
      [...report.gaps]
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
        .slice(0, 3),
    [report.gaps]
  );

  const topActions = useMemo(() => {
    const immediate = report.roadmapByPhase.immediate;
    if (immediate.length >= 3) return immediate.slice(0, 3);
    const rest = [...report.roadmapByPhase.short_term, ...report.roadmapByPhase.medium_term];
    return [...immediate, ...rest].slice(0, 3);
  }, [report.roadmapByPhase]);

  const priorityFocusPillarId = sortedPillars[0]?.pillarId;
  const hasStrengths = report.executiveSummary.strengths.length > 0;

  return (
    <div className="bg-slate-950">
      {/* ── VERDICT ── */}
      <ScrollSection glow="indigo" className="text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(99,102,241,0.4),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <MountReveal delay={0}>
            <Link
              href="/maturity-assessment"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to maturity assessment
            </Link>
          </MountReveal>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <MountReveal delay={60}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-indigo-400/30 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/20">
                    {report.surveyModeLabel}
                  </Badge>
                  {report.organizationName && (
                    <span className="text-xs text-slate-400">{report.organizationName}</span>
                  )}
                </div>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  {report.executiveSummary.headline.split(" ").length > 6 ? (
                    <>
                      Your maturity result:{" "}
                      <ShimmerGradientText>{report.overallMaturityLabel}</ShimmerGradientText>
                    </>
                  ) : (
                    report.executiveSummary.headline
                  )}
                </h1>
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-4 text-base leading-relaxed text-slate-300">
                  {report.executiveSummary.narrative}
                </p>
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {report.scope.pillarsAssessed} pillars assessed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {report.gaps.length} gap{report.gaps.length === 1 ? "" : "s"} identified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Map className="h-3.5 w-3.5" />
                    {report.roadmap.length} recommended actions
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-600">
                  Generated {formatDate(new Date(report.generatedAt))}
                </p>
              </MountReveal>
            </div>

            <MountReveal delay={200} className="flex shrink-0 flex-col items-center gap-4">
              <MaturityScoreRing
                scorePct={report.overallScorePct}
                maturity={report.overallMaturity}
                maturityLabel={report.overallMaturityLabel}
              />
              {report.nextMaturityTargetLabel && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Next milestone</p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: maturityColor }}>
                    {report.nextMaturityTargetLabel}
                  </p>
                </div>
              )}
            </MountReveal>
          </div>

          {/* In-page nav */}
          <MountReveal delay={300} className="mt-10 flex flex-wrap gap-2">
            {SECTION_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      <div className="bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {/* ── 1. PRIORITIES (what users care about most) ── */}
          <ScrollSection data-header-theme="light" glow="none" id="priorities">
            <ScrollReveal variant="premium">
              <SectionHeading
                eyebrow="Start here"
                title="What to focus on first"
                description="Your highest-severity gaps and the first actions to take — based on what you assessed."
              />

              {topGaps.length === 0 && topActions.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="mt-3 font-semibold text-slate-900">No critical gaps in assessed areas</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Review your pillar breakdown below and consider a deep-dive for full coverage.
                  </p>
                </div>
              ) : (
                <div className="grid gap-8 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Priority gaps
                    </h3>
                    {topGaps.length === 0 ? (
                      <p className="text-sm text-slate-500">No high-priority gaps in assessed scope.</p>
                    ) : (
                      <div className="space-y-3">
                        {topGaps.map((gap, i) => (
                          <PriorityGapCard key={`${gap.controlCode}-${i}`} gap={gap} rank={i + 1} />
                        ))}
                        {report.gaps.length > 3 && (
                          <a
                            href="#details"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                          >
                            View all {report.gaps.length} gaps
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Recommended next steps
                    </h3>
                    {topActions.length === 0 ? (
                      <p className="text-sm text-slate-500">No roadmap actions generated yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {topActions.map((step, i) => (
                          <ActionCard key={`${step.controlCode}-${i}`} step={step} rank={i + 1} />
                        ))}
                        {report.roadmap.length > 3 && (
                          <a
                            href="#roadmap"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                          >
                            View full roadmap
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {report.executiveSummary.boardActions[0] && (
                <div className="mt-8 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                    Leadership takeaway
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">
                    {report.executiveSummary.boardActions[0]}
                  </p>
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          {/* ── 2. PILLARS (where you stand) ── */}
          <ScrollSection data-header-theme="light" glow="none" id="pillars">
            <ScrollReveal variant="premium" delay={80}>
              <SectionHeading
                eyebrow="Your profile"
                title="Where you stand by pillar"
                description="Sorted by opportunity to strengthen — so you know where deeper assessment adds the most value."
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  {sortedPillars.map((pillar) => (
                    <PillarScoreRow
                      key={pillar.pillarId}
                      pillar={pillar}
                      priorityFocus={pillar.pillarId === priorityFocusPillarId}
                    />
                  ))}
                </div>
                <div className="space-y-4">
                  <PillarMaturityRadarChart pillars={report.pillarMaturity} />
                  {hasStrengths && (
                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Strengths
                      </p>
                      <ul className="mt-3 space-y-2">
                        {report.executiveSummary.strengths.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </ScrollSection>

          {/* ── 3. ROADMAP (full plan) ── */}
          {report.roadmap.length > 0 && (
            <ScrollSection data-header-theme="light" glow="none" id="roadmap">
              <ScrollReveal variant="premium" delay={120}>
                <SectionHeading
                  eyebrow="Your plan"
                  title="Remediation roadmap"
                  description="Prioritized actions grouped by timeframe — use this to plan resourcing and board updates."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <RoadmapPhaseColumn phase="immediate" steps={report.roadmapByPhase.immediate} />
                  <RoadmapPhaseColumn phase="short_term" steps={report.roadmapByPhase.short_term} />
                  <RoadmapPhaseColumn phase="medium_term" steps={report.roadmapByPhase.medium_term} />
                </div>
              </ScrollReveal>
            </ScrollSection>
          )}

          {/* ── 4. LEADERSHIP ACTIONS ── */}
          {report.executiveSummary.boardActions.length > 1 && (
            <ScrollReveal variant="premium" delay={160}>
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <SectionHeading
                  title="Recommended leadership actions"
                  description="Executive next steps for your leadership team or board."
                />
                <ul className="space-y-3">
                  {report.executiveSummary.boardActions.map((action, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-700"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </section>
            </ScrollReveal>
          )}

          {/* ── 5. DETAILS (collapsed by default) ── */}
          <ScrollReveal variant="premium" delay={200}>
            <CollapsibleSection
              id="details"
              title="Full analysis & evidence"
              description="Charts, per-question results, and complete gap detail — for deeper review or audit prep."
              defaultOpen={false}
            >
              <div className="space-y-8">
                <div className="grid gap-5 lg:grid-cols-2">
                  <PillarComplianceStackedChart pillars={report.pillarMaturity} />
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Assessment scope</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {report.scope.methodologyNote}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {report.frameworkCodes.map((fw) => (
                        <span
                          key={fw}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] text-slate-600"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-sm font-bold text-slate-900">
                    Per-pillar assessment detail
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Pillar</th>
                          <th className="px-4 py-3 font-semibold">Control</th>
                          <th className="px-4 py-3 font-semibold">Maturity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.assessmentMatrix.map((row) => {
                          const color = MATURITY_LEVEL_GUIDANCE[row.maturity].color;
                          return (
                            <tr key={`${row.pillarId}-${row.controlCode}`} className="bg-white">
                              <td className="px-4 py-3 align-top">
                                <p className="font-medium text-slate-900">{row.pillarLabel}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{row.criticalQuestion}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="font-mono text-[10px] text-indigo-600">{row.controlCode}</p>
                                <p className="mt-0.5 text-xs text-slate-700">{row.controlTitle}</p>
                                {row.notes && (
                                  <p className="mt-1 text-[11px] italic text-slate-500">
                                    &ldquo;{row.notes}&rdquo;
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span
                                  className="inline-block rounded-lg px-2 py-1 text-xs font-bold"
                                  style={{ backgroundColor: `${color}18`, color }}
                                >
                                  {row.maturityLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {report.gaps.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-sm font-bold text-slate-900">Complete gap register</h3>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {report.gaps.map((gap, i) => (
                        <div
                          key={`${gap.pillarId}-${gap.controlCode}-${i}`}
                          className="flex flex-wrap items-start gap-4 px-5 py-4"
                        >
                          <Badge
                            variant={
                              gap.severity === "critical"
                                ? "danger"
                                : gap.severity === "high"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {gap.severity}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-indigo-600">{gap.pillarLabel}</p>
                            <p className="font-medium text-slate-900">{gap.controlTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">{gap.summary}</p>
                          </div>
                          <Badge variant="outline">{gap.maturityLabel}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </ScrollReveal>

          {deepDiveContinuation && (
            <ScrollReveal variant="premium" delay={260}>
              <MaturityDeepDiveContinuePanel
                surveyId={surveyId}
                report={report}
                continuation={deepDiveContinuation}
              />
            </ScrollReveal>
          )}

          {report.surveyMode === "deep_dive" && (
            <ScrollReveal variant="premium" delay={280}>
              <MaturityDeepDiveBaselineBanner report={report} />
            </ScrollReveal>
          )}

          {/* ── UPSELL (end of journey) ── */}
          <ScrollReveal variant="premium" delay={320}>
            <MaturityAssessmentUpsellPanel report={report} />
          </ScrollReveal>

          <ScrollReveal variant="premium" delay={360}>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-6 py-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {report.surveyMode === "quick"
                    ? "Ready for evidence-backed validation?"
                    : "Need a full client engagement?"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {report.surveyMode === "quick"
                    ? "Deep dive extends self-assessment; a full assessment adds workshop evidence and sign-off."
                    : "Workshops, evidence analysis, and board-ready deliverables in a full client assessment."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="gap-2 rounded-xl">
                  <Link href="/assessments/new">
                    Start full assessment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {report.surveyMode === "deep_dive" ? (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/maturity-assessment/new">New maturity survey</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
