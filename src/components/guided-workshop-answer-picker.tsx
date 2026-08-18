"use client";

import { cn } from "@/lib/utils";
import type { MaturityLevel } from "@prisma/client";
import { Check, Scale } from "lucide-react";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import type { WorkshopControlAnswerOption } from "@/lib/guided-workshop-questions";

type Props = {
  value: MaturityLevel | null;
  onChange: (level: MaturityLevel) => void;
  options: WorkshopControlAnswerOption[];
  disabled?: boolean;
  showMethodology?: boolean;
};

export function WorkshopAnswerPicker({
  value,
  onChange,
  options,
  disabled,
  showMethodology = true,
}: Props) {
  return (
    <div className="space-y-4">
      {showMethodology && (
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-4 py-3">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Weighted answer — read options to client</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                The client selects exactly one statement below. Each option carries a fixed weight (0–100%)
                used in the workshop scorecard — no open-ended scoring.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {options.map((option) => {
          const selected = value === option.level;
          const guidance = MATURITY_LEVEL_GUIDANCE[option.level];
          return (
            <button
              key={option.level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.level)}
              className={cn(
                "group relative flex w-full flex-col rounded-xl border p-4 text-left transition-all duration-200",
                selected
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-2 ring-slate-900/10"
                  : "border-slate-200 bg-white hover:border-violet-200 hover:shadow-md",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                style={{ backgroundColor: guidance.color }}
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-snug",
                      selected ? "text-white" : "text-slate-900"
                    )}
                  >
                    {option.statement}
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 text-xs",
                      selected ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {option.label} · {option.headline}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                      selected ? "bg-white/15 text-white" : "bg-violet-100 text-violet-800"
                    )}
                  >
                    {option.weightPct}% weight
                  </span>
                  {selected && <Check className="h-4 w-4 text-emerald-400" />}
                </div>
              </div>
              <p
                className={cn(
                  "mt-2 pl-2 text-[10px] font-medium",
                  selected ? "text-indigo-200" : "text-slate-400"
                )}
              >
                {option.scoringNote}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
