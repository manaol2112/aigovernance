"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Compass,
  HelpCircle,
  Layers,
  Map as MapIcon,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PackAnswerStackedChart,
  PackPillarRadarChart,
  PackPostureLegend,
  PackPostureMeter,
  PackScoreHero,
} from "@/components/pack-maturity-charts";
import {
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
  handleMaturitySectionNav,
} from "@/components/maturity-landing-motion";
import { MaturityPortalFooterMode } from "@/components/maturity-portal-shell";
import { MaturityReportExportButton } from "@/components/maturity-report-export-button";
import { MaturityReportSharePanel } from "@/components/maturity-report-share-panel";
import {
  buildPackRoadmap,
  derivePackExecutiveSummary,
  groupPackRoadmapByPhase,
  scoreBandLabel,
  type PackPillarScore,
  type PackReport,
  type PackRoadmapPhase,
  type PackRoadmapStep,
} from "@/lib/pillar-questionnaire-scoring";
import {
  getPackClientCopy,
  type PackClientCopy,
} from "@/lib/maturity-client-copy";
import { cn, formatDate } from "@/lib/utils";

const ROADMAP_PHASE_META: Record<
  PackRoadmapPhase,
  { label: string; subtitle: string; style: string; icon: typeof AlertTriangle }
> = {
  immediate: {
    label: "0–90 days",
    subtitle: "Priority improvements",
    style: "border-rose-200/80 bg-rose-50/50",
    icon: AlertTriangle,
  },
  short_term: {
    label: "3–6 months",
    subtitle: "Areas underway",
    style: "border-amber-200/80 bg-amber-50/50",
    icon: TrendingUp,
  },
  medium_term: {
    label: "6–12 months",
    subtitle: "Items to confirm",
    style: "border-slate-200/80 bg-slate-50/70",
    icon: Compass,
  },
};

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
      )}
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
    </div>
  );
}

type PillarAnswerFact = {
  prompt: string;
  status: "no" | "partial" | "dont_know" | "yes";
};

const PILLAR_FACT_STATUS: Record<
  PillarAnswerFact["status"],
  { label: string; short: string; row: string; mark: string }
> = {
  no: {
    label: "Not in place",
    short: "No",
    row: "text-rose-800",
    mark: "bg-rose-500",
  },
  partial: {
    label: "Underway",
    short: "Partial",
    row: "text-amber-800",
    mark: "bg-amber-500",
  },
  dont_know: {
    label: "To confirm",
    short: "Unknown",
    row: "text-slate-600",
    mark: "bg-slate-400",
  },
  yes: {
    label: "In place",
    short: "Yes",
    row: "text-emerald-800",
    mark: "bg-emerald-500",
  },
};

function displaySurveyPrompt(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return cleaned;
  // Keep the original question text — accuracy over rewriting.
  return /[?.!]$/.test(cleaned) ? cleaned : `${cleaned}?`;
}

function postureLabelClass(tone: ReturnType<typeof scoreBandLabel>["tone"] | null, unknown?: boolean): string {
  if (unknown) return "text-slate-500";
  switch (tone) {
    case "critical":
      return "text-rose-700";
    case "developing":
      return "text-amber-700";
    case "defined":
      return "text-amber-600";
    case "leading":
      return "text-emerald-700";
    default:
      return "text-slate-700";
  }
}

function PackPillarScoreRow({
  pillar,
  priorityFocus,
  facts = [],
}: {
  pillar: PackPillarScore;
  priorityFocus?: boolean;
  facts?: PillarAnswerFact[];
}) {
  const [open, setOpen] = useState(false);
  const posture = scoreBandLabel(pillar.alignmentPct);
  const unknown = pillar.alignmentPct == null;
  const ratingLabel = unknown ? "To confirm" : posture.shortLabel;

  const counts = [
    pillar.noCount > 0
      ? { key: "no", count: pillar.noCount, label: "Not in place", className: "bg-rose-50 text-rose-800" }
      : null,
    pillar.partialCount > 0
      ? { key: "partial", count: pillar.partialCount, label: "Underway", className: "bg-amber-50 text-amber-900" }
      : null,
    pillar.dontKnowCount > 0
      ? {
          key: "dont_know",
          count: pillar.dontKnowCount,
          label: "To confirm",
          className: "bg-slate-100 text-slate-700",
        }
      : null,
    pillar.yesCount > 0
      ? { key: "yes", count: pillar.yesCount, label: "In place", className: "bg-emerald-50 text-emerald-900" }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div
      className={cn(
        "border-b border-slate-200/80 last:border-b-0",
        open && "bg-slate-50/80"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group w-full px-5 py-4 text-left transition-colors",
          open ? "bg-slate-50/80" : "hover:bg-slate-50/60"
        )}
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {priorityFocus && (
                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
                  Focus
                </span>
              )}
              <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                {pillar.pillarLabel}
              </p>
            </div>
            <div className="mt-3 max-w-md">
              <PackPostureMeter tone={unknown ? null : posture.tone} size="sm" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 pt-0.5">
            <div className="text-right">
              <p
                className={cn(
                  "text-sm font-semibold tracking-tight",
                  postureLabelClass(unknown ? null : posture.tone, unknown)
                )}
              >
                {ratingLabel}
              </p>
              {!unknown && (
                <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                  {pillar.alignmentPct}%
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:text-slate-500",
                open && "rotate-180 text-slate-500"
              )}
            />
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 pt-0">
          {counts.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {counts.map((item) => (
                <span
                  key={item.key}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                    item.className
                  )}
                >
                  <span className="tabular-nums">{item.count}</span>
                  {item.label}
                </span>
              ))}
            </div>
          )}

          {facts.length === 0 ? (
            <p className="text-sm text-slate-500">No answers recorded for this pillar yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-slate-200/90 bg-white">
              {facts.map((fact, index) => {
                const status = PILLAR_FACT_STATUS[fact.status];
                return (
                  <li
                    key={`${fact.status}-${index}`}
                    className="flex items-start gap-3 border-b border-slate-100 px-3.5 py-3 last:border-b-0"
                  >
                    <span
                      className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", status.mark)}
                      aria-hidden
                    />
                    <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-700">
                      {displaySurveyPrompt(fact.prompt)}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                        status.row,
                        fact.status === "no" && "bg-rose-50",
                        fact.status === "partial" && "bg-amber-50",
                        fact.status === "dont_know" && "bg-slate-50",
                        fact.status === "yes" && "bg-emerald-50"
                      )}
                    >
                      {status.short}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FindingCard({
  item,
  rank,
  variant = "gap",
}: {
  item: {
    pillarLabel: string;
    summary: string;
    insight: string;
    recommendation: string;
    severity?: "critical" | "high" | "medium";
  };
  rank: number;
  variant?: "gap" | "partial" | "follow" | "strength";
}) {
  const tone =
    variant === "gap"
      ? {
          shell: "border-rose-200/80 bg-gradient-to-br from-white via-white to-rose-50/40",
          rank: "bg-rose-600 text-white",
          label: "Why it matters",
          actionLabel: "Recommended move",
          action: "border-rose-100 bg-rose-50/80 text-rose-950",
        }
      : variant === "partial"
        ? {
            shell: "border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/40",
            rank: "bg-amber-500 text-white",
            label: "Why finish this",
            actionLabel: "Recommended move",
            action: "border-amber-100 bg-amber-50/80 text-amber-950",
          }
        : variant === "follow"
          ? {
              shell: "border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50",
              rank: "bg-slate-700 text-white",
              label: "Why confirm this",
              actionLabel: "Recommended move",
              action: "border-slate-200 bg-slate-50 text-slate-800",
            }
          : {
              shell: "border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/40",
              rank: "bg-emerald-600 text-white",
              label: "Why this matters",
              actionLabel: "Protect it",
              action: "border-emerald-100 bg-emerald-50/80 text-emerald-950",
            };

  return (
    <article
      className={cn(
        "rounded-2xl border p-5 shadow-sm print:break-inside-avoid print:shadow-none",
        tone.shell
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
            tone.rank
          )}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {item.pillarLabel}
            </p>
            {variant === "gap" && item.severity && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  item.severity === "critical"
                    ? "bg-rose-100 text-rose-800"
                    : item.severity === "high"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-slate-100 text-slate-600"
                )}
              >
                {item.severity === "critical"
                  ? "Critical pillar"
                  : item.severity === "high"
                    ? "High priority"
                    : "Medium priority"}
              </span>
            )}
          </div>
          <p className="mt-2 text-base font-semibold leading-snug tracking-tight text-slate-900">
            {item.summary}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">{tone.label}. </span>
            {item.insight}
          </p>
          <div className={cn("mt-4 rounded-xl border px-3.5 py-3", tone.action)}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
              {tone.actionLabel}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed">{item.recommendation}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function PackRoadmapPhaseColumn({
  phase,
  steps,
}: {
  phase: PackRoadmapPhase;
  steps: PackRoadmapStep[];
}) {
  const meta = ROADMAP_PHASE_META[phase];
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
        {steps.map((step, index) => (
          <li
            key={`${phase}-${step.priority}-${index}`}
            className="rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {step.priority}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {step.pillarLabel}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{step.summary}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{step.insight}</p>
            <p className="mt-2 rounded-lg bg-slate-900/[0.04] px-2.5 py-2 text-xs font-medium leading-relaxed text-slate-700">
              {step.action}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MaturityPackSurveyResults({
  sessionId,
  report,
  backHref,
  backLabel,
  product = "maturity",
}: {
  sessionId: string;
  report: PackReport;
  backHref: string;
  backLabel: string;
  product?: "maturity" | "workshop";
}) {
  const copy: PackClientCopy = getPackClientCopy(product);
  const exportUrl =
    product === "maturity"
      ? `/api/maturity-surveys/${sessionId}/export`
      : `/api/guided-workshops/${sessionId}/export`;
  const exportFilenamePrefix = product === "maturity" ? "maturity-report" : "workshop-report";
  const isWorkshop = product === "workshop";
  const summary = useMemo(() => derivePackExecutiveSummary(report), [report]);
  const roadmap = useMemo(() => buildPackRoadmap(report), [report]);
  const roadmapByPhase = useMemo(() => groupPackRoadmapByPhase(roadmap), [roadmap]);

  const sortedPillars = useMemo(
    () =>
      [...report.pillarScores]
        .filter((pillar) => pillar.questionCount > 0)
        .sort((left, right) => (left.alignmentPct ?? 0) - (right.alignmentPct ?? 0)),
    [report.pillarScores]
  );

  const factsByPillar = useMemo(() => {
    const map = new Map<string, PillarAnswerFact[]>();
    const push = (pillarLabel: string, prompt: string, status: PillarAnswerFact["status"]) => {
      const list = map.get(pillarLabel) ?? [];
      list.push({ prompt, status });
      map.set(pillarLabel, list);
    };

    // Gaps first, then partials / unknowns / strengths — mirrors priority reading order.
    for (const gap of report.gaps) push(gap.pillarLabel, gap.prompt, "no");
    for (const partial of report.partials) push(partial.pillarLabel, partial.prompt, "partial");
    for (const followUp of report.followUps) push(followUp.pillarLabel, followUp.prompt, "dont_know");
    for (const strength of report.strengths) push(strength.pillarLabel, strength.prompt, "yes");

    return map;
  }, [report.gaps, report.partials, report.strengths, report.followUps]);

  const priorityPillarId = useMemo(() => {
    const withGaps = sortedPillars.filter((pillar) =>
      (factsByPillar.get(pillar.pillarLabel) ?? []).some((fact) => fact.status === "no")
    );
    if (withGaps.length > 0) return withGaps[0]?.pillarId;

    const needsAttention = sortedPillars.filter((pillar) => {
      if (pillar.alignmentPct == null) return pillar.dontKnowCount > 0;
      return pillar.alignmentPct < 51;
    });
    return needsAttention[0]?.pillarId;
  }, [sortedPillars, factsByPillar]);

  const hasStrengths = report.strengths.length > 0;
  const hasRoadmap = roadmap.length > 0;

  const sectionNav = useMemo(() => {
    const items: Array<{ id: string; label: string }> = [
      { id: "profile", label: "Profile" },
    ];
    if (hasStrengths) items.push({ id: "strengths", label: "Strengths" });
    items.push({ id: "gaps", label: "Priorities" });
    items.push({ id: "partials", label: "Underway" });
    items.push({ id: "follow-ups", label: "To confirm" });
    if (hasRoadmap) items.push({ id: "roadmap", label: "Next steps" });
    return items;
  }, [hasRoadmap, hasStrengths]);

  return (
    <div className="bg-slate-950 print:bg-white">
      <MaturityPortalFooterMode mode="hidden" />
      <ScrollSection glow={isWorkshop ? "emerald" : "indigo"} className="text-white print:bg-white print:text-slate-900">
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            isWorkshop
              ? "bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(134,188,37,0.35),transparent)]"
              : "bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(99,102,241,0.4),transparent)]"
          )}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <MountReveal delay={0}>
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              <Link
                href={backHref}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to {backLabel.toLowerCase()}
              </Link>
              <MaturityReportExportButton
                exportUrl={exportUrl}
                filenamePrefix={exportFilenamePrefix}
                organizationName={report.organizationName}
              />
            </div>
          </MountReveal>

          <div className="hidden print:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {copy.printTitle}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{report.organizationName}</p>
            {report.title && <p className="mt-1 text-sm text-slate-600">{report.title}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Generated {formatDate(new Date(report.generatedAt))}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between print:mt-4">
            <div className="max-w-2xl">
              <MountReveal delay={60}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      isWorkshop
                        ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20"
                        : "border-indigo-400/30 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/20"
                    )}
                  >
                    {copy.reportBadge}
                  </Badge>
                  {report.organizationName && (
                    <span className="text-xs text-slate-400">{report.organizationName}</span>
                  )}
                </div>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  {report.organizationName ? (
                    <>
                      {report.organizationName}
                      <span className="mt-2 block text-2xl font-semibold sm:text-3xl">
                        <ShimmerGradientText>{summary.scoreLabel}</ShimmerGradientText>
                        <span className="text-slate-300"> {copy.heroPostureSuffix}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      Your{" "}
                      <ShimmerGradientText>{summary.scoreLabel.toLowerCase()}</ShimmerGradientText>{" "}
                      {copy.heroPostureSuffix}
                    </>
                  )}
                </h1>
                {summary.headline && (
                  <p className="mt-3 text-base text-slate-400 print:text-slate-600">{summary.headline}</p>
                )}
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-4 text-base leading-relaxed text-slate-300 print:text-slate-700">
                  {summary.narrative}
                </p>
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {summary.pillarsAssessed} pillars assessed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {report.gaps.length} {copy.heroStatPriorities}
                  </span>
                  {hasRoadmap && (
                    <span className="flex items-center gap-1.5">
                      <MapIcon className="h-3.5 w-3.5" />
                      {roadmap.length} recommended actions
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {report.followUps.length} {copy.heroStatToConfirm}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-600">
                  Generated {formatDate(new Date(report.generatedAt))}
                </p>
              </MountReveal>
            </div>

            <MountReveal delay={200} className="flex shrink-0 flex-col items-center gap-4">
              <PackScoreHero
                scoreLabel={summary.scoreLabel}
                scoreTone={report.overallScorePct == null ? null : summary.scoreTone}
                scoreHeroNote={copy.scoreHeroNote}
              />
              <MaturityReportSharePanel
                sessionId={sessionId}
                resultsBasePath={product === "workshop" ? "/guided-workshop" : "/maturity-assessment"}
                organizationName={report.organizationName}
                surveyModeLabel={copy.reportBadge}
                shareSummary={copy.shareSummary}
                className="w-full max-w-xs"
              />
            </MountReveal>
          </div>

          <MountReveal delay={300} className="mt-10 flex flex-wrap gap-2 print:hidden">
            {sectionNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => handleMaturitySectionNav(event, item.id)}
                className={cn(
                  "rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white",
                  isWorkshop
                    ? "hover:border-emerald-400/40 hover:bg-emerald-500/10"
                    : "hover:border-indigo-400/40 hover:bg-indigo-500/10"
                )}
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
          <ScrollSection data-header-theme="light" glow="none" id="profile" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeading
                  eyebrow={copy.sectionProfileEyebrow}
                  title={copy.sectionProfileTitle}
                  description={copy.sectionProfileDescription}
                  className="mb-0"
                />
                <PackPostureLegend className="sm:mb-1 sm:justify-end" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Pillars
                    </p>
                    <p className="text-[11px] text-slate-400">{sortedPillars.length} assessed</p>
                  </div>
                  <div>
                    {sortedPillars.map((pillar) => (
                      <PackPillarScoreRow
                        key={pillar.pillarId}
                        pillar={pillar}
                        priorityFocus={pillar.pillarId === priorityPillarId}
                        facts={factsByPillar.get(pillar.pillarLabel) ?? []}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <PackPillarRadarChart
                    pillars={report.pillarScores}
                    accent={isWorkshop ? "brand" : "indigo"}
                  />
                  <PackAnswerStackedChart pillars={report.pillarScores} />
                </div>
              </div>
            </ScrollReveal>
          </ScrollSection>

          {hasStrengths && (
            <ScrollSection data-header-theme="light" glow="none" id="strengths" className="print:break-inside-avoid">
              <ScrollReveal variant="premium" instant>
                <SectionHeading
                  eyebrow={copy.sectionStrengthsEyebrow}
                  title={copy.sectionStrengthsTitle}
                  description={copy.sectionStrengthsDescription}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.strengths.map((strength, index) => (
                    <FindingCard
                      key={`${strength.pillarLabel}-${index}`}
                      item={strength}
                      rank={index + 1}
                      variant="strength"
                    />
                  ))}
                </div>
              </ScrollReveal>
            </ScrollSection>
          )}

          <ScrollSection data-header-theme="light" glow="none" id="gaps" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionPrioritiesEyebrow}
                title={copy.sectionPriorities}
                description={copy.sectionPrioritiesDescription}
              />
              {report.gaps.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-relaxed text-emerald-950">
                    No priority improvements were identified. Review areas underway and items to confirm for remaining nuance.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.gaps.map((gap, index) => (
                    <FindingCard
                      key={`${gap.pillarLabel}-${index}`}
                      item={gap}
                      rank={index + 1}
                      variant="gap"
                    />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="partials" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionImprovementsEyebrow}
                title="Areas underway"
                description={copy.sectionImprovementsDescription}
              />
              {report.partials.length === 0 ? (
                <p className="text-sm text-slate-500">No areas underway were identified in this assessment.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.partials.map((partial, index) => (
                    <FindingCard
                      key={`${partial.pillarLabel}-${index}`}
                      item={partial}
                      rank={index + 1}
                      variant="partial"
                    />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="follow-ups" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionToConfirmEyebrow}
                title="To confirm"
                description={copy.sectionToConfirmDescription}
              />
              {report.followUps.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing left to confirm in this assessment.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.followUps.map((followUp, index) => (
                    <FindingCard
                      key={`${followUp.pillarLabel}-${index}`}
                      item={followUp}
                      rank={index + 1}
                      variant="follow"
                    />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          {hasRoadmap && (
            <ScrollSection data-header-theme="light" glow="none" id="roadmap" className="print:break-inside-avoid">
              <ScrollReveal variant="premium" instant>
                <SectionHeading
                  eyebrow={copy.sectionRoadmapEyebrow}
                  title={copy.sectionRoadmapTitle}
                  description={copy.sectionRoadmapDescription}
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <PackRoadmapPhaseColumn phase="immediate" steps={roadmapByPhase.immediate} />
                  <PackRoadmapPhaseColumn phase="short_term" steps={roadmapByPhase.short_term} />
                  <PackRoadmapPhaseColumn phase="medium_term" steps={roadmapByPhase.medium_term} />
                </div>
              </ScrollReveal>
            </ScrollSection>
          )}

          <footer className="border-t border-slate-200 pt-8 print:mt-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {copy.aboutReportTitle}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              {copy.aboutReport}
            </p>
            <p className="mt-4 text-[11px] text-slate-400">
              {copy.printConfidential}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
