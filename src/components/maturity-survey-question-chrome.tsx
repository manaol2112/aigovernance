"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SurveyStep } from "@/lib/maturity-survey-types";
import { surveyStepResponseKeyFromStep } from "@/lib/maturity-survey-progress";

type ResponseLike = {
  controlId: string;
  pillarId: string;
};

function shortPillarLabel(label: string): string {
  const part = label.split("&")[0]?.trim();
  return part && part.length <= 22 ? part : label.split(" ")[0] ?? label;
}

type Props = {
  steps: SurveyStep[];
  stepIndex: number;
  progressPct: number;
  answeredStepCount: number;
  responsesByStepKey: Map<string, ResponseLike>;
  organizationName?: string | null;
  modeLabel: string;
  onGoToStep: (index: number) => void;
};

export function MaturitySurveyQuestionChrome({
  steps,
  stepIndex,
  progressPct,
  answeredStepCount,
  responsesByStepKey,
  organizationName,
  modeLabel,
  onGoToStep,
}: Props) {
  const current = steps[stepIndex];
  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
              {modeLabel}
            </p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {organizationName?.trim() || "Your organization"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">Baseline progress</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900">{progressPct}%</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Pillar {stepIndex + 1} of {steps.length}
              </p>
              <h2 className="mt-0.5 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                {current.pillarLabel}
              </h2>
            </div>
            <p className="shrink-0 text-xs tabular-nums text-slate-400">
              {answeredStepCount}/{steps.length} rated
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 px-3 py-3 sm:px-4">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Jump to pillar
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {steps.map((step, i) => {
            const done = responsesByStepKey.has(surveyStepResponseKeyFromStep(step));
            const active = i === stepIndex;
            return (
              <button
                key={`${step.pillarId}-${step.control.id}`}
                type="button"
                title={step.pillarLabel}
                onClick={() => onGoToStep(i)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-all",
                  active
                    ? "border-indigo-300 bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {done && !active && <Check className="h-3 w-3 shrink-0" aria-hidden />}
                <span className="max-w-[7rem] truncate sm:max-w-[9rem]">
                  {shortPillarLabel(step.pillarLabel)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const SURVEY_QUESTION_CARD =
  "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02] sm:p-8";
