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
import { PackRatingMethodDialog } from "@/components/pack-rating-method-dialog";
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
  handleMaturitySectionNav,
} from "@/components/maturity-landing-motion";
import { MaturityPortalFooterMode } from "@/components/maturity-portal-shell";
import { MaturityReportExportButton } from "@/components/maturity-report-export-button";
import { MaturityReportSharePanel } from "@/components/maturity-report-share-panel";
import {
  buildPackRoadmap,
  derivePackExecutiveSummary,
  describePackPillarBriefing,
  groupPackRoadmapByPhase,
  scoreBandLabel,
  splitPackFindingsPreview,
  type PackPillarScore,
  type PackReport,
  type PackRoadmapPhase,
  type PackRoadmapStep,
} from "@/lib/pillar-questionnaire-scoring";
import type { PackFinding } from "@/lib/pillar-questionnaire";
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
    style: "border-slate-200 bg-white",
    icon: AlertTriangle,
  },
  short_term: {
    label: "3–6 months",
    subtitle: "Areas underway",
    style: "border-slate-200 bg-white",
    icon: TrendingUp,
  },
  medium_term: {
    label: "6–12 months",
    subtitle: "Items to confirm",
    style: "border-slate-200 bg-white",
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
    <div className={cn("relative mb-6 pl-3", className)}>
      <span
        aria-hidden
        className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-[var(--theme-brand)]"
      />
      {eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-brand">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-xl font-light tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
    </div>
  );
}

type PillarAnswerFact = {
  prompt: string;
  status: "no" | "partial" | "dont_know" | "yes";
};

function postureLabelClass(tone: ReturnType<typeof scoreBandLabel>["tone"] | null, unknown?: boolean): string {
  if (unknown) return "text-slate-500";
  switch (tone) {
    case "critical":
      return "text-[#DA291C]";
    case "developing":
      return "text-[#ED8B00]";
    case "defined":
      return "text-[#53565A]";
    case "leading":
      return "text-[#046A38]";
    default:
      return "text-slate-700";
  }
}

function PackPillarScoreRow({
  pillar,
  priorityFocus,
}: {
  pillar: PackPillarScore;
  priorityFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const posture = scoreBandLabel(pillar.alignmentPct);
  const unknown = pillar.alignmentPct == null;
  const ratingLabel = unknown ? "Unresolved" : posture.shortLabel;
  const briefing = describePackPillarBriefing(pillar);

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
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {briefing.ratingTeaser}
            </p>
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
        <div className="space-y-3 px-5 pb-5 pt-0">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <span
              aria-hidden
              className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-[var(--theme-brand)]"
            />
            <p className="pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-brand">
              {briefing.ratingTitle}
            </p>
            <p className="mt-1.5 pl-2 text-sm leading-relaxed text-slate-700">
              {briefing.ratingReason}
            </p>
            <p className="mt-3 pl-2 text-sm leading-relaxed text-slate-700">{briefing.reading}</p>
          </div>

          {briefing.weightReason ? (
            <div className="relative overflow-hidden rounded-xl border border-[#86BC25]/30 bg-[#86BC25]/[0.06] px-4 py-3.5">
              <span
                aria-hidden
                className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-[#86BC25]"
              />
              <p className="pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#26890D]">
                {briefing.weightTitle}
              </p>
              <p className="mt-1.5 pl-2 text-sm leading-relaxed text-slate-700">
                {briefing.weightReason}
              </p>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-xl border border-[#86BC25]/35 bg-gradient-to-br from-[#86BC25]/[0.14] via-[#86BC25]/[0.06] to-white px-4 py-4 shadow-sm ring-1 ring-[#86BC25]/10">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#86BC25]/15 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#86BC25] text-white shadow-sm shadow-[#86BC25]/30">
                <TrendingUp className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#26890D]">
                  {briefing.nextLevelLabel
                    ? `Path to ${briefing.nextLevelLabel}`
                    : "How to hold this level"}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#3d6b12]/80">
                  {briefing.nextLevelLabel
                    ? "What to focus on next so this area earns the next level."
                    : "What to protect so this strength does not quietly erode."}
                </p>
                <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-800">
                  {briefing.nextLevelGuidance}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FindingList({
  items,
  variant,
  previewLimit = 4,
}: {
  items: PackFinding[];
  variant: "gap" | "partial" | "follow" | "strength";
  previewLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { preview, remaining } = useMemo(
    () => splitPackFindingsPreview(items, previewLimit),
    [items, previewLimit]
  );
  const hiddenCount = remaining.length;
  const visible = expanded ? [...preview, ...remaining] : preview;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((item, index) => (
          <FindingCard
            key={`${item.pillarId}-${item.prompt}-${index}`}
            item={item}
            rank={index + 1}
            variant={variant}
          />
        ))}
      </div>
      {hiddenCount > 0 ? (
        <div className="mt-4 flex justify-center print:hidden">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E3E3] bg-white px-3.5 py-2 text-xs font-semibold text-[#53565A] transition-colors hover:border-[#D0D0CE] hover:bg-[#FAFAFA] hover:text-black"
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
            {expanded
              ? "Show priority only"
              : `Show all ${items.length} (${hiddenCount} more)`}
          </button>
        </div>
      ) : null}
      {/* Print always includes the full ranked list beyond the on-screen preview. */}
      {!expanded && hiddenCount > 0 ? (
        <div className="mt-3 hidden grid-cols-2 gap-3 print:grid">
          {remaining.map((item, index) => (
            <FindingCard
              key={`print-${item.pillarId}-${item.prompt}-${index}`}
              item={item}
              rank={preview.length + index + 1}
              variant={variant}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FindingCard({
  item,
  rank,
  variant = "gap",
}: {
  item: PackFinding;
  rank: number;
  variant?: "gap" | "partial" | "follow" | "strength";
}) {
  const accent =
    variant === "gap"
      ? "bg-[#DA291C]"
      : variant === "partial"
        ? "bg-[#ED8B00]"
        : variant === "strength"
          ? "bg-[var(--theme-brand)]"
          : "bg-slate-400";
  const label =
    variant === "gap"
      ? "Why this area matters"
      : variant === "partial"
        ? "Why finish this"
        : variant === "follow"
          ? "Why confirm this"
          : "What you reported";
  const showRecommendation = variant === "partial" || variant === "follow";

  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none">
      <span aria-hidden className={cn("absolute bottom-4 left-0 top-4 w-0.5 rounded-r-full", accent)} />
      <div className="flex items-start gap-3 pl-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold tabular-nums text-white">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {item.pillarLabel}
          </p>
          <p className="mt-2 text-base font-semibold leading-snug tracking-tight text-slate-900">
            {item.summary}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">{label}. </span>
            {item.insight}
          </p>
          {showRecommendation && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Recommended move
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-800">
                {item.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function PackRoadmapPhaseColumn({
  phase,
  steps,
  previewLimit = 3,
}: {
  phase: PackRoadmapPhase;
  steps: PackRoadmapStep[];
  previewLimit?: number;
}) {
  const meta = ROADMAP_PHASE_META[phase];
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;

  const preview = steps.slice(0, previewLimit);
  const remaining = steps.slice(previewLimit);
  const hiddenCount = remaining.length;
  const visible = expanded ? steps : preview;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-5 shadow-sm", meta.style)}>
      <span
        aria-hidden
        className="absolute bottom-4 left-0 top-4 w-0.5 rounded-r-full bg-[var(--theme-brand)]"
      />
      <div className="flex items-center gap-2 pl-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
          <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-3 pl-2">
        {visible.map((step, index) => (
          <li
            key={`${phase}-${step.priority}-${index}`}
            className="rounded-lg border border-slate-200 bg-[#fafafa] p-3.5"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold text-white">
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
      {hiddenCount > 0 ? (
        <div className="mt-3 pl-2 print:hidden">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E3E3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#53565A] transition-colors hover:border-[#D0D0CE] hover:bg-[#FAFAFA] hover:text-black"
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
            {expanded
              ? "Show priority only"
              : `Show all ${steps.length} (${hiddenCount} more)`}
          </button>
        </div>
      ) : null}
      {!expanded && hiddenCount > 0 ? (
        <ol className="mt-3 hidden space-y-3 pl-2 print:block">
          {remaining.map((step, index) => (
            <li
              key={`${phase}-print-${step.priority}-${index}`}
              className="rounded-lg border border-slate-200 bg-[#fafafa] p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold text-white">
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
      ) : null}
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
      { id: "profile", label: "Posture" },
    ];
    if (hasStrengths) items.push({ id: "strengths", label: "Operating" });
    items.push({ id: "gaps", label: "Open gaps" });
    items.push({ id: "partials", label: "In progress" });
    items.push({ id: "follow-ups", label: "Unresolved" });
    if (hasRoadmap) items.push({ id: "roadmap", label: "Next steps" });
    return items;
  }, [hasRoadmap, hasStrengths]);

  return (
    <div className="brand-ink-surface bg-black print:bg-white">
      <MaturityPortalFooterMode mode="hidden" />
      <ScrollSection glow="emerald" className="brand-ink-surface text-white print:bg-white print:text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(134,188,37,0.22),transparent)]" />
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
            <p className="mt-1 text-2xl font-light text-slate-900">{report.organizationName}</p>
            {report.title && <p className="mt-1 text-sm text-slate-600">{report.title}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Generated {formatDate(new Date(report.generatedAt))}
            </p>
          </div>

          <div className="relative mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between print:mt-4">
            <span
              aria-hidden
              className="absolute bottom-0 left-0 top-0 hidden w-0.5 rounded-r-full bg-[var(--theme-brand)] lg:block"
            />
            <div className="max-w-2xl lg:pl-4">
              <MountReveal delay={60}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  {copy.reportBadge}
                  {report.organizationName ? ` · ${report.organizationName}` : ""}
                </p>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-light leading-tight tracking-tight sm:text-4xl">
                  {report.organizationName ? (
                    <>
                      {report.organizationName}
                      <span className="mt-2 block text-2xl font-light text-white sm:text-3xl">
                        <span className="text-[var(--theme-brand)]">{summary.scoreLabel}</span>
                        <span className="text-slate-300"> {copy.heroPostureSuffix}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      Your{" "}
                      <span className="text-[var(--theme-brand)]">
                        {summary.scoreLabel.toLowerCase()}
                      </span>{" "}
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
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-300" />
                    {summary.pillarsAssessed} pillars assessed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-indigo-300" />
                    {report.gaps.length} {copy.heroStatPriorities}
                  </span>
                  {hasRoadmap && (
                    <span className="flex items-center gap-1.5">
                      <MapIcon className="h-3.5 w-3.5 text-indigo-300" />
                      {roadmap.length} recommended actions
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-300" />
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
                overallScorePct={report.overallScorePct}
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
                className="rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[var(--theme-brand)]/50 hover:bg-white/[0.08] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      <div className="brand-canvas-shell bg-white">
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <ScrollSection data-header-theme="light" glow="none" id="profile" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <SectionHeading
                    eyebrow={copy.sectionProfileEyebrow}
                    title={copy.sectionProfileTitle}
                    description={copy.sectionProfileDescription}
                    className="mb-0"
                  />
                  {report.weighting ? (
                    <PackRatingMethodDialog
                      weighting={report.weighting}
                      overallScorePct={report.overallScorePct}
                    />
                  ) : null}
                </div>
                <PackPostureLegend className="sm:mb-1 sm:justify-end print:hidden" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-[#fafafa] px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Pillars
                    </p>
                    <p className="text-[11px] tabular-nums text-slate-400">
                      {sortedPillars.length} assessed
                    </p>
                  </div>
                  <div>
                    {sortedPillars.map((pillar) => (
                      <PackPillarScoreRow
                        key={pillar.pillarId}
                        pillar={pillar}
                        priorityFocus={pillar.pillarId === priorityPillarId}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <PackPillarRadarChart
                    pillars={report.pillarScores}
                    overallScorePct={report.overallScorePct}
                    accent="brand"
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
                <FindingList items={report.strengths} variant="strength" />
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
                <div className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
                  <span
                    aria-hidden
                    className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-[var(--theme-brand)]"
                  />
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--theme-brand)]" />
                  <p className="text-sm leading-relaxed text-slate-700">
                    No priority improvements were identified. Review areas underway and items to confirm for remaining nuance.
                  </p>
                </div>
              ) : (
                <FindingList items={report.gaps} variant="gap" />
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="partials" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionImprovementsEyebrow}
                title="In progress"
                description={copy.sectionImprovementsDescription}
              />
              {report.partials.length === 0 ? (
                <p className="text-sm text-slate-500">No in-progress items in this assessment.</p>
              ) : (
                <FindingList items={report.partials} variant="partial" />
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="follow-ups" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionToConfirmEyebrow}
                title="Unresolved"
                description={copy.sectionToConfirmDescription}
              />
              {report.followUps.length === 0 ? (
                <p className="text-sm text-slate-500">No unresolved items in this assessment.</p>
              ) : (
                <FindingList items={report.followUps} variant="follow" />
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
