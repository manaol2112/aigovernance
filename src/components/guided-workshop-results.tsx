"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Compass,
  Printer,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { GuidedWorkshopReport } from "@/lib/guided-workshop-analysis";
import type { SurveyGapItem } from "@/lib/maturity-survey-analysis";
import { PillarMaturityRadarChart } from "@/components/maturity-charts";
import {
  MATURITY_LABELS,
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_LEVELS,
} from "@/lib/maturity-survey-constants";
import type { MaturityLevel } from "@prisma/client";
import type { RoadmapStep } from "@/lib/control-review-reports";
import {
  getWorkshopPrompt,
  getWorkshopSelectedStatement,
} from "@/lib/guided-workshop-questions";
import { formatGapSeverity } from "@/lib/maturity-client-copy";
import { MaturityFrameworkTags } from "@/components/maturity-framework-tags";
import {
  FilmGrain,
  HeroAmbientOrbs,
  MountReveal,
  ScrollProgressBar,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
  useLightHeaderZone,
} from "@/components/maturity-landing-motion";

const SECTIONS = [
  { id: "summary", label: "Executive summary", short: "Summary" },
  { id: "pillars", label: "Pillar status", short: "Pillars" },
  { id: "gaps", label: "Gap register", short: "Gaps" },
  { id: "plan", label: "Remediation roadmap", short: "Roadmap" },
] as const;

const PHASE_META: Record<
  RoadmapStep["phase"],
  { label: string; subtitle: string; accent: string; icon: typeof AlertTriangle }
> = {
  immediate: {
    label: "Immediate",
    subtitle: "0–90 days",
    accent: "border-l-red-500 bg-red-50/50",
    icon: AlertTriangle,
  },
  short_term: {
    label: "Near term",
    subtitle: "3–6 months",
    accent: "border-l-amber-500 bg-amber-50/50",
    icon: TrendingUp,
  },
  medium_term: {
    label: "Strategic",
    subtitle: "6–12 months",
    accent: "border-l-[var(--theme-brand)] bg-theme-brand-muted/30",
    icon: Compass,
  },
};

const SEVERITY_ORDER: Record<SurveyGapItem["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const GAP_SEVERITY_META: Record<
  SurveyGapItem["severity"],
  { label: string; accent: string; surface: string; ring: string; dot: string }
> = {
  critical: {
    label: "Critical",
    accent: "text-red-700",
    surface: "from-red-50/90 via-white to-white",
    ring: "ring-red-200/70",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    accent: "text-amber-800",
    surface: "from-amber-50/90 via-white to-white",
    ring: "ring-amber-200/70",
    dot: "bg-amber-500",
  },
  medium: {
    label: "Medium",
    accent: "text-slate-700",
    surface: "from-slate-50/90 via-white to-white",
    ring: "ring-slate-200/80",
    dot: "bg-slate-400",
  },
};

type GapFilter = "all" | SurveyGapItem["severity"];

function GapSummaryStrip({ gaps }: { gaps: SurveyGapItem[] }) {
  const counts = useMemo(
    () => ({
      critical: gaps.filter((g) => g.severity === "critical").length,
      high: gaps.filter((g) => g.severity === "high").length,
      medium: gaps.filter((g) => g.severity === "medium").length,
    }),
    [gaps]
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Total gaps</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{gaps.length}</p>
      </div>
      {(["critical", "high", "medium"] as const).map((severity) => {
        const meta = GAP_SEVERITY_META[severity];
        const count = counts[severity];
        return (
          <div
            key={severity}
            className={cn(
              "rounded-xl border border-slate-200/90 bg-gradient-to-br px-4 py-3.5 shadow-sm",
              meta.surface
            )}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", meta.accent)}>{count}</p>
          </div>
        );
      })}
    </div>
  );
}

function WorkshopResponsePanel({
  finding,
}: {
  finding: GuidedWorkshopReport["controlFindings"][number];
}) {
  const ratingColor = MATURITY_LEVEL_GUIDANCE[finding.maturity].color;
  const prompt = getWorkshopPrompt(finding.controlTitle);
  const selectedStatement = getWorkshopSelectedStatement(
    finding.controlTitle,
    finding.maturity
  );

  return (
    <div className="mt-4 rounded-xl border border-slate-200/90 bg-white/80 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Workshop question & your answer
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">{prompt}</p>
      <blockquote
        className="mt-3 border-l-[3px] pl-3.5 text-sm leading-relaxed text-slate-700"
        style={{ borderColor: ratingColor }}
      >
        &ldquo;{selectedStatement}&rdquo;
      </blockquote>
      {finding.notes?.trim() && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-600">Workshop notes: </span>
          {finding.notes.trim()}
        </p>
      )}
    </div>
  );
}

function GapCard({
  gap,
  rank,
  finding,
}: {
  gap: SurveyGapItem;
  rank: number;
  finding?: GuidedWorkshopReport["controlFindings"][number];
}) {
  const meta = GAP_SEVERITY_META[gap.severity];
  const ratingColor = MATURITY_LEVEL_GUIDANCE[gap.maturity].color;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br shadow-sm ring-1 transition-shadow hover:shadow-md",
        meta.surface,
        meta.ring
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.dot)} aria-hidden />
      <div className="px-5 py-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/90 text-xs font-bold tabular-nums text-white">
              {rank}
            </span>
            <div className="min-w-0">
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
                  {formatGapSeverity(gap.severity)}
                </Badge>
                <span className="text-xs font-medium text-slate-500">{gap.pillarLabel}</span>
                <span className="font-mono text-[10px] text-slate-400">{gap.controlCode}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">
                {gap.controlTitle}
              </h3>
            </div>
          </div>
          <span
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${ratingColor}18`, color: ratingColor }}
          >
            Rated {gap.maturityLabel}
          </span>
        </div>
        <p className="mt-4 border-t border-slate-200/70 pt-4 text-sm leading-relaxed text-slate-600">
          {gap.summary}
        </p>
        {finding && <WorkshopResponsePanel finding={finding} />}
        {gap.frameworkCodes.length > 0 && (
          <div className="mt-3">
            <MaturityFrameworkTags frameworkCodes={gap.frameworkCodes} max={4} />
          </div>
        )}
      </div>
    </article>
  );
}

function GapRegister({
  gaps,
  controlFindings,
}: {
  gaps: SurveyGapItem[];
  controlFindings: GuidedWorkshopReport["controlFindings"];
}) {
  const [filter, setFilter] = useState<GapFilter>("all");

  const findingsByCode = useMemo(
    () => new Map(controlFindings.map((c) => [c.controlCode, c])),
    [controlFindings]
  );

  const filtered = useMemo(
    () => (filter === "all" ? gaps : gaps.filter((g) => g.severity === filter)),
    [gaps, filter]
  );

  const filterCounts = useMemo(
    () => ({
      all: gaps.length,
      critical: gaps.filter((g) => g.severity === "critical").length,
      high: gaps.filter((g) => g.severity === "high").length,
      medium: gaps.filter((g) => g.severity === "medium").length,
    }),
    [gaps]
  );

  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-white px-6 py-16 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="mt-5 text-lg font-semibold text-slate-900">
          All rated controls are at Managed or Optimized
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          No remediation items were generated from your workshop selections.
        </p>
      </div>
    );
  }

  const filters: { id: GapFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "critical", label: "Critical" },
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
  ];

  return (
    <div className="space-y-6">
      <GapSummaryStrip gaps={gaps} />

      <div className="flex flex-wrap gap-2">
        {filters.map(({ id, label }) => {
          const count = filterCounts[id];
          if (id !== "all" && count === 0) return null;
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all",
                active
                  ? "border-[var(--theme-brand-ring)] bg-theme-brand-muted/35 text-slate-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] tabular-nums",
                  active ? "bg-theme-brand text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filtered.map((gap, i) => (
          <GapCard
            key={`${gap.controlCode}-${i}`}
            gap={gap}
            rank={i + 1}
            finding={findingsByCode.get(gap.controlCode)}
          />
        ))}
      </div>
    </div>
  );
}

function useSectionSpy(sectionIds: readonly string[], ready = true) {
  const [active, setActive] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    if (!ready) return;

    const root = document.querySelector("[data-maturity-scroll]");
    const isDocRoot =
      !root || root === document.documentElement || root === document.body;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      {
        root: isDocRoot ? null : (root as Element),
        rootMargin: "-12% 0px -55% 0px",
        threshold: [0, 0.15, 0.4],
      }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionIds, ready]);

  return active;
}

function useScrolled(threshold = 64, ready = true) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!ready) return;

    const root = document.querySelector("[data-maturity-scroll]");
    const isDocRoot =
      !root || root === document.documentElement || root === document.body;

    const onScroll = () => {
      const top = isDocRoot
        ? window.scrollY
        : (root as HTMLElement).scrollTop;
      setScrolled(top > threshold);
    };
    onScroll();
    const target = isDocRoot ? window : root;
    target?.addEventListener("scroll", onScroll, { passive: true });
    return () => target?.removeEventListener("scroll", onScroll);
  }, [threshold, ready]);

  return scrolled;
}

function MaturityScale({ current }: { current: MaturityLevel }) {
  const currentIdx = MATURITY_LEVELS.indexOf(current);

  return (
    <div className="w-full">
      <div className="flex gap-1">
        {MATURITY_LEVELS.map((level, idx) => {
          const g = MATURITY_LEVEL_GUIDANCE[level];
          const isCurrent = level === current;
          const isPast = idx <= currentIdx;
          return (
            <div key={level} className="flex-1">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  isCurrent && "ring-2 ring-offset-2 ring-[var(--theme-brand)]"
                )}
                style={{
                  backgroundColor: g.color,
                  opacity: isPast ? 1 : 0.22,
                }}
                title={g.label}
              />
              {isCurrent && (
                <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-theme-brand">
                  {g.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wider text-slate-400">
        <span>Early</span>
        <span>Leading</span>
      </div>
    </div>
  );
}

function HeroKpiTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "neutral" | "brand" | "warning" | "danger" | "success";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5",
    brand: "border-[var(--theme-brand-ring)]/50 bg-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]",
    warning: "border-amber-400/30 bg-amber-500/10",
    danger: "border-red-400/30 bg-red-500/10",
    success: "border-emerald-400/30 bg-emerald-500/10",
  };

  return (
    <div className={cn("rounded-xl border px-4 py-3.5 backdrop-blur-sm print:border-slate-200 print:bg-slate-50", tones[tone])}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 print:text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-white print:text-slate-900">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 print:text-slate-500">{sub}</p>}
    </div>
  );
}

function WorkshopMaturityHero({
  maturity,
  maturityLabel,
  nextMilestone,
}: {
  maturity: MaturityLevel;
  maturityLabel: string;
  nextMilestone: GuidedWorkshopReport["executiveSummary"]["nextMilestone"];
}) {
  const guidance = MATURITY_LEVEL_GUIDANCE[maturity];

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-lg shadow-black/20 backdrop-blur-sm print:border-slate-200 print:bg-slate-50 print:shadow-none">
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md print:shadow-none"
          style={{ backgroundColor: guidance.color }}
        >
          {guidance.step}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
            Current maturity
          </p>
          <p className="text-xl font-bold text-white print:text-slate-900">{maturityLabel}</p>
        </div>
      </div>
      <div className="mt-5">
        <MaturityScale current={maturity} />
      </div>
      {nextMilestone.label && (
        <div className="mt-5 border-t border-white/10 pt-4 print:border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-shimmer-from)] print:text-theme-brand">
            Next milestone
          </p>
          <p className="mt-1 font-semibold text-white print:text-slate-900">{nextMilestone.label}</p>
          {nextMilestone.pathForward && (
            <p className="mt-1 text-xs leading-relaxed text-slate-400 print:text-slate-500">
              {nextMilestone.pathForward}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ExecutiveBriefing({
  report,
}: {
  report: GuidedWorkshopReport;
}) {
  const {
    verdictHeadline,
    implication,
    leadershipPriorities,
    leadershipAsks,
    asksHorizon,
    strengths,
  } = report.executiveSummary;
  const showPriorities = leadershipPriorities.length > 0;
  const showAsks = leadershipAsks.length > 0;
  const askTitle =
    asksHorizon === "90 days"
      ? "What to do in 90 days"
      : asksHorizon
        ? `What to do next · ${asksHorizon}`
        : "What to do next";

  return (
    <SectionShell
      id="summary"
      eyebrow="Section 01"
      title={verdictHeadline}
      description={implication}
    >
      {(showPriorities || showAsks) && (
        <div
          className={cn(
            "grid gap-5",
            showPriorities && showAsks ? "lg:grid-cols-2" : "lg:grid-cols-1"
          )}
        >
          {showPriorities && (
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <div className="flex items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Leadership priorities
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">
                    The rated controls that matter most
                  </h3>
                </div>
                <a
                  href="#gaps"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-theme-brand hover:underline"
                >
                  Full register
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <ol className="divide-y divide-slate-100">
                {leadershipPriorities.map((item, i) => (
                  <li key={item.controlCode} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              item.severity === "critical"
                                ? "danger"
                                : item.severity === "high"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {formatGapSeverity(item.severity)}
                          </Badge>
                          <span className="text-xs font-medium text-slate-500">
                            {item.pillarLabel}
                          </span>
                        </div>
                        <p className="mt-1.5 font-semibold text-slate-900">{item.controlTitle}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          Rated {item.maturityLabel} in the workshop — {item.summary}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {showAsks && (
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <div className="flex items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Leadership asks
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{askTitle}</h3>
                </div>
                <a
                  href="#plan"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-theme-brand hover:underline"
                >
                  Full roadmap
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <ol className="divide-y divide-slate-100">
                {leadershipAsks.map((ask, i) => (
                  <li key={`${ask.phase}-${ask.controlCode}`} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-theme-brand text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {ask.pillarLabel}
                          {ask.ownerHint ? ` · ${ask.ownerHint}` : ""}
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">{ask.controlTitle}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{ask.action}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {!showPriorities && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 px-5 py-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No rated-control gaps for leadership to action
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Every control rated in this workshop is at Managed or Optimized. Use the pillar status
            below to confirm the operating pattern you want to sustain.
          </p>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="mt-5 rounded-xl border border-emerald-200/70 bg-white px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Practices to scale
          </p>
          <p className="mt-1 text-sm text-slate-600">
            These pillars already have rated controls at Managed or Optimized. Reuse that operating
            rhythm in weaker areas rather than designing from scratch.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {strengths.map((item) => (
              <li
                key={item}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionShell>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-6 border-b border-slate-200/80 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-theme-brand">{eyebrow}</p>
        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ControlTable({
  controls,
}: {
  controls: GuidedWorkshopReport["controlFindings"];
}) {
  if (controls.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 font-bold">Control</th>
            <th className="hidden px-4 py-3 font-bold sm:table-cell">Title</th>
            <th className="px-4 py-3 text-right font-bold">Your rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {controls.map((control) => {
            const color = MATURITY_LEVEL_GUIDANCE[control.maturity].color;
            return (
              <tr key={control.controlCode} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{control.controlCode}</td>
                <td className="hidden px-4 py-3 text-slate-900 sm:table-cell">{control.controlTitle}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {MATURITY_LABELS[control.maturity]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MixChips({
  pillar,
}: {
  pillar: GuidedWorkshopReport["pillarScorecard"][number];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {pillar.gapCount > 0 && (
        <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
          {pillar.gapCount} gap{pillar.gapCount === 1 ? "" : "s"}
        </span>
      )}
      {pillar.partialCount > 0 && (
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          {pillar.partialCount} partial
        </span>
      )}
      {pillar.alignedCount > 0 && (
        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
          {pillar.alignedCount} strong
        </span>
      )}
    </div>
  );
}

function PillarScorecard({
  pillars,
  controlsByPillar,
}: {
  pillars: GuidedWorkshopReport["pillarScorecard"];
  controlsByPillar: Map<string, GuidedWorkshopReport["controlFindings"]>;
}) {
  const [openId, setOpenId] = useState(pillars[0]?.pillarId ?? "");

  if (pillars.length === 0) {
    return <p className="text-sm text-slate-500">No pillars were rated in this workshop.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-slate-100 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Ranked weakest first
        </p>
        <p className="text-[11px] text-slate-400">Tap a row for rated controls</p>
      </div>
      <ul>
        {pillars.map((pillar, index) => {
          const open = pillar.pillarId === openId;
          const color = MATURITY_LEVEL_GUIDANCE[pillar.maturityLevel].color;
          const controls = controlsByPillar.get(pillar.pillarId) ?? [];

          return (
            <li
              key={pillar.pillarId}
              className={cn(
                "border-b border-slate-100 last:border-b-0",
                open && "bg-slate-50/40"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? "" : pillar.pillarId)}
                className="w-full px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
                aria-expanded={open}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "mt-0.5 w-7 shrink-0 text-right font-mono text-xs font-bold tabular-nums",
                      open ? "text-slate-900" : "text-slate-300"
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="mt-1 h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{pillar.pillarLabel}</p>
                        <p className="mt-0.5 text-sm font-medium" style={{ color }}>
                          {pillar.maturityLabel}
                          <span className="font-normal text-slate-400">
                            {" "}
                            · {pillar.reviewedControls} rated
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <MixChips pillar={pillar} />
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                            open && "rotate-180 text-slate-700"
                          )}
                        />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pillar.alignmentPct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              </button>
              {open && (
                <div className="px-5 pb-5 sm:pl-[4.75rem]">
                  <p className="mb-4 text-sm leading-relaxed text-slate-600">{pillar.insight}</p>
                  <ControlTable controls={controls} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoadmapPanel({
  roadmapByPhase,
  totalCount,
}: {
  roadmapByPhase: Record<RoadmapStep["phase"], RoadmapStep[]>;
  totalCount: number;
}) {
  const phases = (["immediate", "short_term", "medium_term"] as const).filter(
    (p) => roadmapByPhase[p].length > 0
  );
  const [activePhase, setActivePhase] = useState<RoadmapStep["phase"]>(
    phases[0] ?? "immediate"
  );

  useEffect(() => {
    if (phases.length > 0 && !phases.includes(activePhase)) {
      setActivePhase(phases[0]!);
    }
  }, [phases, activePhase]);

  if (totalCount === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        No remediation actions — all rated controls are at Managed maturity or above.
      </p>
    );
  }

  const steps = roadmapByPhase[activePhase] ?? [];
  const meta = PHASE_META[activePhase];
  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => {
          const m = PHASE_META[phase];
          const count = roadmapByPhase[phase].length;
          const active = phase === activePhase;
          return (
            <button
              key={phase}
              type="button"
              onClick={() => setActivePhase(phase)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                active
                  ? "border-[var(--theme-brand-ring)] bg-theme-brand-muted/30 text-slate-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              {m.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] tabular-nums",
                  active ? "bg-theme-brand text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className={cn("rounded-2xl border border-slate-200/90 border-l-[4px] p-5 sm:p-6", meta.accent)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{meta.label} actions</p>
            <p className="text-xs text-slate-500">{meta.subtitle} · {steps.length} item{steps.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((step) => (
            <li
              key={`${activePhase}-${step.controlCode}`}
              className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                  {step.priority}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {step.pillarLabel}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{step.controlCode}</span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">{step.controlTitle}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.action}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function GuidedWorkshopResults({ report }: { report: GuidedWorkshopReport }) {
  const maturityReport = report.maturityReport;
  // Prevent hydration mismatches from interactive content (SVG + scroll spy).
  // Server and first client render both show the same lightweight shell.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);
  const activeSection = useSectionSpy(sectionIds, mounted);
  const scrolled = useScrolled(64, mounted);
  const lightZone = useLightHeaderZone();
  const lightHeader = scrolled && lightZone;

  const ratedControlCodes = useMemo(
    () => new Set(report.controlFindings.map((c) => c.controlCode)),
    [report.controlFindings]
  );

  const controlsByPillar = useMemo(() => {
    const map = new Map<string, GuidedWorkshopReport["controlFindings"]>();
    for (const finding of report.controlFindings) {
      const list = map.get(finding.pillarId) ?? [];
      list.push(finding);
      map.set(finding.pillarId, list);
    }
    return map;
  }, [report.controlFindings]);

  const assessedPillars = useMemo(
    () => [...report.pillarScorecard].sort((a, b) => a.alignmentPct - b.alignmentPct),
    [report.pillarScorecard]
  );

  const assessedPillarMaturity = useMemo(
    () => maturityReport.pillarMaturity.filter((p) => p.reviewedControls > 0),
    [maturityReport.pillarMaturity]
  );

  const sortedGaps = useMemo(
    () =>
      [...maturityReport.gaps]
        .filter((g) => ratedControlCodes.has(g.controlCode))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [maturityReport.gaps, ratedControlCodes]
  );

  const filteredRoadmap = useMemo(
    () => maturityReport.roadmap.filter((step) => ratedControlCodes.has(step.controlCode)),
    [maturityReport.roadmap, ratedControlCodes]
  );

  const roadmapByPhase = useMemo(
    () => ({
      immediate: filteredRoadmap.filter((s) => s.phase === "immediate"),
      short_term: filteredRoadmap.filter((s) => s.phase === "short_term"),
      medium_term: filteredRoadmap.filter((s) => s.phase === "medium_term"),
    }),
    [filteredRoadmap]
  );

  const criticalGapCount = sortedGaps.filter((g) => g.severity === "critical").length;
  const immediateCount = roadmapByPhase.immediate.length;

  if (!mounted) {
    return (
      <div
        data-maturity-scroll
        className="h-full min-h-0 overflow-y-auto bg-slate-950 print:h-auto print:overflow-visible print:bg-white"
      />
    );
  }

  return (
    <div
      data-maturity-scroll
      className="h-full min-h-0 overflow-y-auto scroll-smooth bg-slate-950 print:h-auto print:overflow-visible print:bg-white"
    >
      <ScrollProgressBar />

      {/* Sticky report chrome */}
      <div
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 print:hidden",
          scrolled
            ? lightHeader
              ? "border-slate-200/90 bg-white/95 shadow-sm"
              : "border-white/10 bg-slate-950/90 shadow-lg shadow-black/20"
            : "border-white/10 bg-slate-950/80"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/guided-workshop"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                lightHeader
                  ? "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
              )}
              aria-label="Back to workshops"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-sm font-semibold",
                  lightHeader ? "text-slate-900" : "text-white"
                )}
              >
                {report.organizationName}
              </p>
              <p className={cn("truncate text-xs", lightHeader ? "text-slate-500" : "text-slate-400")}>
                Governance workshop report
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Report sections">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeSection === section.id
                    ? lightHeader
                      ? "bg-theme-brand-muted/50 text-theme-brand"
                      : "bg-[color-mix(in_srgb,var(--theme-brand)_20%,transparent)] text-[var(--theme-shimmer-from)]"
                    : lightHeader
                      ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {section.short}
              </a>
            ))}
          </nav>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "hidden shrink-0 gap-1.5 rounded-lg sm:inline-flex",
              lightHeader
                ? ""
                : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            )}
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Hero — Deloitte green, maturity-assessment structure */}
      <ScrollSection glow="emerald" className="text-white print:bg-white print:text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_-10%,rgba(134,188,37,0.35),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(134,188,37,0.12),transparent)]" />
        <FilmGrain />
        <HeroAmbientOrbs />

        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8 lg:py-12">
          <MountReveal delay={0}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[var(--theme-brand-ring)]/40 bg-[color-mix(in_srgb,var(--theme-brand)_18%,transparent)] text-[var(--theme-shimmer-from)] hover:bg-[color-mix(in_srgb,var(--theme-brand)_18%,transparent)]">
                <Shield className="mr-1 h-3 w-3" />
                AI Governance Report
              </Badge>
              <MaturityFrameworkTags
                frameworkCodes={report.frameworkCodes}
                max={5}
                tone="dark"
                className="print:hidden"
              />
              <span className="text-xs text-slate-400 print:text-slate-500">
                {formatDate(report.generatedAt)}
              </span>
            </div>
          </MountReveal>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_min(320px,100%)] lg:items-start">
            <div>
              <MountReveal delay={60}>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                  {report.organizationName}
                </h1>
              </MountReveal>
              <MountReveal delay={120}>
                <p className="mt-3 text-lg text-slate-300 print:text-slate-700">
                  Overall maturity:{" "}
                  <span className="font-semibold text-white print:text-slate-900">
                    <ShimmerGradientText>{report.overallMaturityLabel}</ShimmerGradientText>
                  </span>
                </p>
              </MountReveal>
              <MountReveal delay={180}>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 print:text-slate-700">
                  {report.executiveSummary.narrative}
                </p>
                <p className="mt-3 max-w-2xl rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs leading-relaxed text-slate-400 backdrop-blur-sm print:border-slate-200 print:bg-slate-50 print:text-slate-600">
                  {report.scope.methodologyNote}
                </p>
              </MountReveal>
            </div>

            <MountReveal delay={200}>
              <WorkshopMaturityHero
                maturity={report.overallMaturity}
                maturityLabel={report.overallMaturityLabel}
                nextMilestone={report.executiveSummary.nextMilestone}
              />
            </MountReveal>
          </div>

          <MountReveal delay={260}>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroKpiTile label="Controls rated" value={report.scope.controlsRated} tone="brand" />
              <HeroKpiTile label="Pillars assessed" value={report.scope.pillarsRated} />
              <HeroKpiTile
                label="Gaps identified"
                value={sortedGaps.length}
                tone={sortedGaps.length > 0 ? "warning" : "success"}
                sub={criticalGapCount > 0 ? `${criticalGapCount} critical` : undefined}
              />
              <HeroKpiTile
                label="90-day actions"
                value={immediateCount}
                tone={immediateCount > 0 ? "danger" : "neutral"}
              />
            </div>
          </MountReveal>

          <MountReveal delay={320} className="mt-8 flex flex-wrap gap-2 print:hidden md:hidden">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--theme-brand-ring)]/50 hover:bg-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)] hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      {/* Main document body */}
      <div className="bg-slate-50" data-header-theme="light">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)]">
          {/* Desktop TOC */}
          <aside className="hidden lg:block">
            <nav
              className="sticky top-[4.5rem] space-y-1 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm"
              aria-label="Table of contents"
            >
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Contents
              </p>
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    "block rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-theme-brand-muted/40 text-theme-brand"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-16">
            <ExecutiveBriefing report={report} />

            {/* Pillars */}
            <SectionShell
              id="pillars"
              eyebrow="Section 02"
              title="Pillar status"
              description="Every rated pillar is listed below. Open a row to see the control ratings from your workshop."
            >
              {assessedPillarMaturity.length >= 3 && (
                <div className="mb-8 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Maturity profile
                  </p>
                  <PillarMaturityRadarChart pillars={assessedPillarMaturity} accent="brand" />
                </div>
              )}

              <PillarScorecard pillars={assessedPillars} controlsByPillar={controlsByPillar} />
            </SectionShell>

            {/* Gaps */}
            <SectionShell
              id="gaps"
              eyebrow="Section 03"
              title="Gap register"
              description="Controls you rated below Managed maturity — with the workshop question, your selected answer, and recommended follow-up."
            >
              <GapRegister gaps={sortedGaps} controlFindings={report.controlFindings} />
            </SectionShell>

            {/* Roadmap */}
            <SectionShell
              id="plan"
              eyebrow="Section 04"
              title="Remediation roadmap"
              description="Prioritized actions tied to your rated controls — grouped by implementation horizon."
            >
              <RoadmapPanel roadmapByPhase={roadmapByPhase} totalCount={filteredRoadmap.length} />
            </SectionShell>

            <div className="flex justify-center border-t border-slate-200/80 pt-8 print:hidden">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/guided-workshop">All workshops</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
