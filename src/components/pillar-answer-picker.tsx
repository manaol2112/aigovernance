"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PILLAR_QUESTION_ANSWERS,
  PILLAR_QUESTION_ANSWER_META,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";

/** Short supporting line — shown only in Focus mode. */
const FOCUS_HINT: Record<PillarQuestionAnswer, string> = {
  yes: "In place today",
  partial: "Started, not complete",
  no: "Not yet in place",
  dont_know: "Confirm later",
};

/**
 * Focus: light selected cards (readable under Deloitte theme overrides).
 * Compact (list): quiet segmented control.
 */
export function PillarAnswerPicker({
  value,
  onChange,
  disabled,
  variant = "compact",
  name,
}: {
  value: PillarQuestionAnswer | null;
  onChange: (answer: PillarQuestionAnswer) => void;
  disabled?: boolean;
  variant?: "compact" | "survey";
  name?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        role="radiogroup"
        aria-label={name ?? "Answer"}
        className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-4"
      >
        {PILLAR_QUESTION_ANSWERS.map((answer) => {
          const selected = value === answer;
          return (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(answer)}
              className={cn(
                "relative flex items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-2 text-center transition-all",
                selected
                  ? "border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/10"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 w-0.5",
                  selected ? "bg-[var(--theme-brand)]" : "bg-transparent"
                )}
              />
              <span className="text-[11px] font-semibold tracking-tight text-slate-900 sm:text-xs">
                {PILLAR_QUESTION_ANSWER_META[answer].shortLabel}
              </span>
              {selected && (
                <Check className="h-3 w-3 shrink-0 text-slate-900" strokeWidth={2.5} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={name ?? "Select your answer"}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {PILLAR_QUESTION_ANSWERS.map((answer) => {
        const selected = value === answer;
        return (
          <button
            key={answer}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(answer)}
            className={cn(
              "group relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-xl border bg-white px-5 py-4 text-left transition-all duration-200",
              selected
                ? "border-slate-900 shadow-md shadow-slate-900/8 ring-1 ring-slate-900/10"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 w-1 transition-colors",
                selected ? "bg-[var(--theme-brand)]" : "bg-transparent"
              )}
            />

            <span className="flex items-start justify-between gap-3 pl-1">
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                {PILLAR_QUESTION_ANSWER_META[answer].label}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected
                    ? "border-slate-900 bg-slate-900"
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                )}
                aria-hidden
              >
                {selected && (
                  <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#ffffff" }} />
                )}
              </span>
            </span>
            <span className="mt-3 pl-1 text-sm leading-snug text-slate-500">
              {FOCUS_HINT[answer]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
