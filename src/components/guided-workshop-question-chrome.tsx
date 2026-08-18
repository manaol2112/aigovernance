"use client";

import { Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SurveyStep } from "@/lib/maturity-survey-types";

type Props = {
  steps: SurveyStep[];
  stepIndex: number;
  progressPct: number;
  answeredStepCount: number;
  totalStepCount?: number;
  organizationName?: string | null;
  facilitatorName?: string | null;
  onChoosePillar?: () => void;
};

export function GuidedWorkshopQuestionChrome({
  steps,
  stepIndex,
  progressPct,
  answeredStepCount,
  totalStepCount,
  organizationName,
  facilitatorName,
  onChoosePillar,
}: Props) {
  const current = steps[stepIndex];
  if (!current) return null;

  const pillarIds = [...new Set(steps.map((s) => s.pillarId))];
  const pillarSteps = steps.filter((s) => s.pillarId === current.pillarId);
  const controlIndexInPillar = pillarSteps.findIndex(
    (s) => s.control.id === current.control.id
  );
  const pillarIndex = pillarIds.indexOf(current.pillarId);
  const scopeTotal = totalStepCount ?? steps.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-[var(--theme-brand-muted)]/30 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-brand">
              Guided workshop
            </p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {organizationName?.trim() || "Client organization"}
              {facilitatorName ? ` · ${facilitatorName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onChoosePillar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onChoosePillar}
                className="h-8 gap-1.5 text-xs"
              >
                <Layers3 className="h-3.5 w-3.5" />
                Choose pillar
              </Button>
            )}
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">This pillar</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">{progressPct}%</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Pillar {pillarIndex + 1} of {pillarIds.length}
                <span className="mx-1.5 text-slate-300">·</span>
                Control {controlIndexInPillar + 1} of {pillarSteps.length}
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                {current.pillarLabel}
              </h2>
            </div>
            <p className="shrink-0 text-xs tabular-nums text-slate-400">
              {answeredStepCount} of {scopeTotal} in pillar
            </p>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full bg-theme-brand transition-all duration-500")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const WORKSHOP_QUESTION_CARD =
  "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02] sm:p-8";
