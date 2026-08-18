"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Layers3,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatOfTotal } from "@/lib/format-unit-count";
import type { WorkshopPillarSummary } from "@/lib/guided-workshop-wizard-state";

const CRITICALITY_BADGE: Record<string, string> = {
  critical: "bg-slate-100 text-slate-700 ring-slate-200/80",
  high: "bg-slate-50 text-slate-600 ring-slate-200/80",
  medium: "text-slate-500 ring-slate-200/70",
};

type ViewFilter = "todo" | "in_progress" | "not_started" | "complete" | "all";

type Props = {
  pillars: WorkshopPillarSummary[];
  overallProgressPct: number;
  allComplete: boolean;
  onSelectPillar: (pillarId: string) => void;
  onReview?: () => void;
};

function sortRemainingPillars(pillars: WorkshopPillarSummary[]) {
  return [...pillars].sort((a, b) => {
    const aStarted = a.answeredCount > 0 ? 1 : 0;
    const bStarted = b.answeredCount > 0 ? 1 : 0;
    if (bStarted !== aStarted) return bStarted - aStarted;
    if (a.answeredCount !== b.answeredCount) return b.answeredCount - a.answeredCount;
    const rank: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    return (rank[a.criticality] ?? 3) - (rank[b.criticality] ?? 3);
  });
}

function PillarCard({
  pillar,
  featured = false,
  onSelect,
}: {
  pillar: WorkshopPillarSummary;
  featured?: boolean;
  onSelect: () => void;
}) {
  const inProgress = pillar.answeredCount > 0 && !pillar.isComplete;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition-all",
        featured
          ? "border-[var(--theme-brand-ring)] bg-gradient-to-br from-[var(--theme-brand-muted)]/80 via-white to-white p-6 shadow-lg shadow-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)] ring-1 ring-[var(--theme-brand-ring)]/60 hover:shadow-xl"
          : pillar.isComplete
            ? "border-emerald-200/80 bg-emerald-50/30 p-4 hover:border-emerald-300 hover:bg-emerald-50/50"
            : "border-slate-200/90 bg-white p-4 hover:border-[var(--theme-brand-ring)] hover:shadow-md"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-3 bottom-3 w-1 rounded-full transition-colors",
          pillar.isComplete ? "bg-theme-brand" : "bg-slate-200 group-hover:bg-theme-brand"
        )}
      />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <Sparkles className="h-3 w-3" />
                Suggested next
              </span>
            )}
            {inProgress && !featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-brand-muted px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-brand-hover)]">
                <PlayCircle className="h-3 w-3" />
                In progress
              </span>
            )}
            {pillar.isComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </span>
            )}
            {!pillar.isComplete && pillar.answeredCount === 0 && !featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                <CircleDashed className="h-3 w-3" />
                Not started
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-2 font-semibold text-slate-900 group-hover:text-theme-brand",
              featured ? "text-lg" : "text-sm"
            )}
          >
            {pillar.pillarLabel}
          </p>
          <span
            className={cn(
              "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
              CRITICALITY_BADGE[pillar.criticality] ?? CRITICALITY_BADGE.medium
            )}
          >
            {pillar.criticality}
          </span>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl font-bold tabular-nums text-white",
            featured ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs",
            pillar.isComplete ? "bg-emerald-600" : "bg-theme-brand"
          )}
        >
          {pillar.isComplete ? (
            <CheckCircle2 className={featured ? "h-6 w-6" : "h-4 w-4"} />
          ) : (
            `${pillar.progressPct}%`
          )}
        </span>
      </div>

      <p
        className={cn(
          "mt-3 pl-3 leading-relaxed text-slate-500",
          featured ? "line-clamp-3 text-sm" : "line-clamp-2 text-xs"
        )}
      >
        {pillar.pillarDescription}
      </p>

      <div className="mt-auto pl-3 pt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{formatOfTotal(pillar.answeredCount, pillar.controlCount, "answered")}</span>
          {!pillar.isComplete && (
            <span className="inline-flex items-center gap-1 font-semibold text-theme-brand opacity-0 transition-opacity group-hover:opacity-100">
              {inProgress ? "Continue" : "Start"}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pillar.isComplete ? "bg-emerald-500" : "bg-theme-brand"
            )}
            style={{ width: `${pillar.progressPct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

export function GuidedWorkshopPillarPicker({
  pillars,
  overallProgressPct,
  allComplete,
  onSelectPillar,
  onReview,
}: Props) {
  const [view, setView] = useState<ViewFilter>("todo");
  const [showCompleted, setShowCompleted] = useState(false);

  const { remaining, complete, inProgress, notStarted } = useMemo(() => {
    const completeList = pillars.filter((p) => p.isComplete);
    const remainingList = sortRemainingPillars(pillars.filter((p) => !p.isComplete));
    const inProgressList = remainingList.filter((p) => p.answeredCount > 0);
    const notStartedList = remainingList.filter((p) => p.answeredCount === 0);
    return {
      remaining: remainingList,
      complete: completeList,
      inProgress: inProgressList,
      notStarted: notStartedList,
    };
  }, [pillars]);

  const featured = remaining[0] ?? null;
  const otherRemaining = remaining.slice(1);

  const visiblePillars = useMemo(() => {
    switch (view) {
      case "in_progress":
        return inProgress;
      case "not_started":
        return notStarted;
      case "complete":
        return complete;
      case "all":
        return [...remaining, ...complete];
      case "todo":
      default:
        return remaining;
    }
  }, [view, remaining, complete, inProgress, notStarted]);

  const filters: { id: ViewFilter; label: string; count: number }[] = [
    { id: "todo", label: "To do", count: remaining.length },
    { id: "in_progress", label: "In progress", count: inProgress.length },
    { id: "not_started", label: "Not started", count: notStarted.length },
    { id: "complete", label: "Complete", count: complete.length },
    { id: "all", label: "All", count: pillars.length },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-900/10 bg-[#0B1220] px-6 py-8 text-white sm:px-8">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--theme-shimmer-from)]">
          <Layers3 className="h-3.5 w-3.5" />
          Pillar navigation
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {allComplete
            ? "All pillars complete"
            : remaining.length === 1
              ? "One pillar left"
              : "Choose where to focus next"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          {allComplete
            ? "Every pillar has been assessed. Review answers or reopen any pillar to adjust ratings."
            : "Remaining pillars are shown first — no need to scroll past completed work. Pick any order that fits your session."}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-lg">
          {[
            { label: "Session", value: `${overallProgressPct}%` },
            { label: "Remaining", value: String(remaining.length) },
            { label: "Done", value: `${complete.length}/${pillars.length}` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur-sm"
            >
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {allComplete && onReview && (
          <Button
            type="button"
            size="lg"
            onClick={onReview}
            className="mt-6 gap-2 shadow-lg"
          >
            Review &amp; submit
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setView(filter.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                view === filter.id
                  ? "bg-theme-brand text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              )}
            >
              {filter.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  view === filter.id ? "bg-white/20" : "bg-white text-slate-500"
                )}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {allComplete && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {complete.map((pillar) => (
              <PillarCard
                key={pillar.pillarId}
                pillar={pillar}
                onSelect={() => onSelectPillar(pillar.pillarId)}
              />
            ))}
          </div>
        )}

        {!allComplete && view === "todo" && featured && (
          <div className="mb-6">
            <PillarCard
              pillar={featured}
              featured
              onSelect={() => onSelectPillar(featured.pillarId)}
            />
          </div>
        )}

        {!allComplete && view === "todo" && otherRemaining.length > 0 && (
          <div className="mb-2">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {otherRemaining.length === 1 ? "Other remaining pillar" : "Other remaining pillars"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {otherRemaining.map((pillar) => (
                <PillarCard
                  key={pillar.pillarId}
                  pillar={pillar}
                  onSelect={() => onSelectPillar(pillar.pillarId)}
                />
              ))}
            </div>
          </div>
        )}

        {view !== "todo" && (
          <>
            {visiblePillars.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">Nothing in this view</p>
                <p className="mt-1 text-xs text-slate-500">
                  Try another filter to find pillars for your session.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePillars.map((pillar) => (
                  <PillarCard
                    key={pillar.pillarId}
                    pillar={pillar}
                    onSelect={() => onSelectPillar(pillar.pillarId)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!allComplete && view === "todo" && complete.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowCompleted((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">
                  Completed pillars
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800">
                  {complete.length}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform",
                  showCompleted && "rotate-180"
                )}
              />
            </button>
            {showCompleted && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {complete.map((pillar) => (
                  <PillarCard
                    key={pillar.pillarId}
                    pillar={pillar}
                    onSelect={() => onSelectPillar(pillar.pillarId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === "todo" && remaining.length === 0 && !allComplete && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No pillars match this view</p>
          </div>
        )}
      </div>
    </div>
  );
}
