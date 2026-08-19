"use client";

import { Check, HelpCircle, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PILLAR_QUESTION_ANSWERS,
  PILLAR_QUESTION_ANSWER_META,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";

const TONE: Record<PillarQuestionAnswer, string> = {
  yes: "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-emerald-500/10",
  partial: "border-amber-400 bg-amber-50 text-amber-950 shadow-amber-500/10",
  no: "border-rose-400 bg-rose-50 text-rose-950 shadow-rose-500/10",
  dont_know: "border-slate-400 bg-slate-50 text-slate-800 shadow-slate-500/10",
};

const ICONS: Record<PillarQuestionAnswer, typeof Check> = {
  yes: Check,
  partial: Minus,
  no: X,
  dont_know: HelpCircle,
};

const DESCRIPTIONS: Record<PillarQuestionAnswer, string> = {
  yes: "This is in place today",
  partial: "Work has started, but it is not complete",
  no: "This is not yet in place",
  dont_know: "You will confirm this later",
};

const ACCENT: Record<PillarQuestionAnswer, string> = {
  yes: "bg-emerald-500",
  partial: "bg-amber-500",
  no: "bg-rose-500",
  dont_know: "bg-slate-400",
};

const RING: Record<PillarQuestionAnswer, string> = {
  yes: "ring-emerald-400/35",
  partial: "ring-amber-400/35",
  no: "ring-rose-400/35",
  dont_know: "ring-slate-400/30",
};

export function PillarAnswerPicker({
  value,
  onChange,
  disabled,
  variant = "compact",
}: {
  value: PillarQuestionAnswer | null;
  onChange: (answer: PillarQuestionAnswer) => void;
  disabled?: boolean;
  variant?: "compact" | "survey";
}) {
  if (variant === "compact") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PILLAR_QUESTION_ANSWERS.map((answer) => {
          const selected = value === answer;
          return (
            <button
              key={answer}
              type="button"
              disabled={disabled}
              onClick={() => onChange(answer)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-sm font-semibold transition-all",
                selected
                  ? TONE[answer]
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {PILLAR_QUESTION_ANSWER_META[answer].label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {PILLAR_QUESTION_ANSWERS.map((answer) => {
        const selected = value === answer;
        const Icon = ICONS[answer];
        return (
          <button
            key={answer}
            type="button"
            disabled={disabled}
            onClick={() => onChange(answer)}
            className={cn(
              "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-200",
              selected
                ? cn("shadow-lg ring-2 ring-offset-2", TONE[answer], RING[answer])
                : "border-slate-200/90 bg-white hover:-translate-y-px hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5"
            )}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", selected ? ACCENT[answer] : "bg-transparent")} />
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                selected ? "bg-white/90 shadow-sm" : "bg-slate-100 group-hover:bg-indigo-50"
              )}
            >
              <Icon className={cn("h-5 w-5", selected ? "text-current" : "text-slate-500")} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold tracking-tight">
                {PILLAR_QUESTION_ANSWER_META[answer].label}
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed opacity-75">
                {DESCRIPTIONS[answer]}
              </span>
            </span>
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected
                  ? "border-transparent bg-slate-900 text-white"
                  : "border-slate-300 bg-white group-hover:border-indigo-300"
              )}
              aria-hidden
            >
              {selected && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
