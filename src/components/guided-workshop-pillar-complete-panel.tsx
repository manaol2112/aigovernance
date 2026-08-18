"use client";

import { ArrowRight, CheckCircle2, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatOfTotal } from "@/lib/format-unit-count";
import type { WorkshopPillarSummary } from "@/lib/guided-workshop-wizard-state";

type Props = {
  pillar: WorkshopPillarSummary;
  completedPillarCount: number;
  totalPillarCount: number;
  overallProgressPct: number;
  allWorkshopComplete: boolean;
  onChooseNextPillar: () => void;
  onReview?: () => void;
};

export function GuidedWorkshopPillarCompletePanel({
  pillar,
  completedPillarCount,
  totalPillarCount,
  overallProgressPct,
  allWorkshopComplete,
  onChooseNextPillar,
  onReview,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-xl shadow-emerald-900/[0.04] ring-1 ring-emerald-900/[0.03]">
      <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-[var(--theme-brand-muted)]/30 px-6 py-10 text-center sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200/80">
          <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
          Pillar complete
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {pillar.pillarLabel}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
          All {pillar.controlCount} control{pillar.controlCount === 1 ? "" : "s"} in this pillar
          have been answered and saved. When you&apos;re ready, return to the pillar list to choose
          where to focus next.
        </p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            This pillar
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">100%</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatOfTotal(pillar.controlCount, pillar.controlCount, "answered")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Pillars done
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {completedPillarCount}
            <span className="text-sm font-medium text-slate-400"> / {totalPillarCount}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Overall session
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-theme-brand">
            {overallProgressPct}%
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-6 sm:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {allWorkshopComplete && onReview ? (
            <>
              <Button type="button" size="lg" onClick={onReview} className="gap-2">
                Review all answers
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={onChooseNextPillar}>
                View pillar list
              </Button>
            </>
          ) : (
            <Button type="button" size="lg" onClick={onChooseNextPillar} className="gap-2">
              <Layers3 className="h-4 w-4" />
              Back to pillar list
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          {allWorkshopComplete
            ? "Every pillar is complete. You can review answers or revisit the pillar list."
            : "Choose another pillar to continue the workshop at your own pace."}
        </p>
      </div>
    </div>
  );
}
