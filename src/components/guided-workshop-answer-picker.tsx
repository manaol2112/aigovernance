"use client";

import { Check, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaturityLevel } from "@prisma/client";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import type { WorkshopControlAnswerOption } from "@/lib/guided-workshop-questions";

type Props = {
  value: MaturityLevel | null;
  onChange: (level: MaturityLevel) => void;
  options: WorkshopControlAnswerOption[];
  disabled?: boolean;
};

export function WorkshopAnswerPicker({ value, onChange, options, disabled }: Props) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-slate-500">
        Select the single statement that best describes your organisation today.
      </p>
      {options.map((option) => {
        const selected = value === option.level;
        const guidance = MATURITY_LEVEL_GUIDANCE[option.level];
        return (
          <button
            key={option.level}
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(option.level);
              (document.activeElement as HTMLElement | null)?.blur?.();
            }}
            className={cn(
              "group relative w-full rounded-xl border px-4 py-4 text-left transition-all duration-200",
              selected
                ? "border-[var(--theme-brand)] bg-theme-brand-muted/70 shadow-sm ring-2 ring-[var(--theme-brand-ring)]/80"
                : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <div className="flex gap-3.5">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors",
                  selected
                    ? "bg-theme-brand text-white"
                    : "bg-slate-100 text-slate-600"
                )}
                style={
                  !selected
                    ? {
                        color: guidance.color,
                        backgroundColor: `${guidance.color}14`,
                      }
                    : undefined
                }
              >
                {selected ? <Check className="h-4 w-4" strokeWidth={2.5} /> : guidance.step}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-900">{guidance.label}</span>
                  <span className="text-xs text-slate-500">· {guidance.headline}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{option.statement}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

type GuideProps = {
  pillarLabel: string;
  facilitationTip: string;
  frameworkLabels: string[];
};

/** Client-visible discussion guide — shown alongside each question. */
export function WorkshopDiscussionGuide({
  pillarLabel,
  facilitationTip,
  frameworkLabels,
}: GuideProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--theme-brand-ring)]/90 bg-gradient-to-br from-[var(--theme-brand-muted)]/90 via-white to-slate-50/50">
      <div className="flex items-start gap-3 border-b border-[var(--theme-brand-ring)]/80 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-brand text-white shadow-sm">
          <MessageSquareText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-theme-brand">
            Discussion guide
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{pillarLabel}</p>
          {frameworkLabels.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Framework alignment: {frameworkLabels.join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-700">{facilitationTip}</p>
        <p className="rounded-lg border border-slate-200/80 bg-white/80 px-3.5 py-3 text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">How this feeds your score: </span>
          Each statement maps to a maturity level (1–6). Your workshop results combine these
          ratings across all controls — stronger capability in an area yields a higher pillar score.
          There are no free-text answers; choose the closest match below.
        </p>
      </div>
    </div>
  );
}
