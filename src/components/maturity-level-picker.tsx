"use client";

import { useState } from "react";
import type { MaturityLevel } from "@prisma/client";
import { Check, ChevronDown, ChevronUp, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_LEVELS,
  MATURITY_RATING_INSTRUCTIONS,
} from "@/lib/maturity-survey-constants";

type Props = {
  value: MaturityLevel | null;
  onChange: (level: MaturityLevel) => void;
  disabled?: boolean;
  variant?: "compact" | "detailed" | "guided" | "survey";
  /** Open the rating guide on first render (e.g. question 1). */
  guideInitiallyOpen?: boolean;
  /** Baseline scan: show one-line "what good looks like" hints on each level tile. */
  showGoodLooksLikeHints?: boolean;
};

function MaturityScaleLegend() {
  return (
    <div className="flex items-center gap-1">
      {MATURITY_LEVELS.map((level) => {
        const g = MATURITY_LEVEL_GUIDANCE[level];
        return (
          <div
            key={level}
            className="h-1.5 flex-1 rounded-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: g.color }}
            title={g.label}
          />
        );
      })}
    </div>
  );
}

export function RatingGuidePanel({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="text-sm font-semibold text-slate-900">
            {MATURITY_RATING_INSTRUCTIONS.title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-indigo-100/80 px-4 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-slate-600">
            {MATURITY_RATING_INSTRUCTIONS.summary}
          </p>
          <MaturityScaleLegend />
          <div className="flex justify-between text-[10px] font-medium text-slate-400">
            <span>Least mature</span>
            <span>Most mature</span>
          </div>
          <p className="text-xs text-slate-500">{MATURITY_RATING_INSTRUCTIONS.honestyNote}</p>
        </div>
      )}
    </div>
  );
}

function SelectedLevelDetail({ level, hideStepNumber = false }: { level: MaturityLevel; hideStepNumber?: boolean }) {
  const g = MATURITY_LEVEL_GUIDANCE[level];
  return (
    <div
      className="rounded-xl border px-4 py-4"
      style={{ borderColor: `${g.color}55`, backgroundColor: `${g.color}0d` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {!hideStepNumber && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: g.color }}
          >
            {g.step}
          </span>
        )}
        {hideStepNumber && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: g.color }}
            aria-hidden
          />
        )}
        <p className="text-sm font-bold text-slate-900">
          {g.label} — {g.headline}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{g.description}</p>
      <p className="mt-2 text-xs font-medium text-indigo-800">
        What good looks like: {g.goodLooksLike}
      </p>
      <ul className="mt-3 space-y-1.5">
        {g.signals.map((signal) => (
          <li key={signal} className="flex gap-2 text-xs leading-relaxed text-slate-600">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: g.color }}
            />
            {signal}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidedOption({
  level,
  isSelected,
  disabled,
  onSelect,
}: {
  level: MaturityLevel;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const guidance = MATURITY_LEVEL_GUIDANCE[level];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-xl border px-4 py-3.5 text-left transition-all",
        isSelected
          ? "border-indigo-500 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
        disabled && "opacity-60"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
            isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
          )}
          style={
            !isSelected ? { color: guidance.color, backgroundColor: `${guidance.color}18` } : undefined
          }
        >
          {isSelected ? <Check className="h-4 w-4" /> : guidance.step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-slate-900">{guidance.label}</span>
            <span className="text-xs text-slate-500">— {guidance.headline}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{guidance.description}</p>
          <ul className="mt-2 space-y-1">
            {guidance.signals.map((signal) => (
              <li key={signal} className="flex gap-2 text-[11px] leading-snug text-slate-500">
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: guidance.color }}
                />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
}

function SurveyOptionTile({
  level,
  isSelected,
  disabled,
  onSelect,
  compactHint,
}: {
  level: MaturityLevel;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  compactHint?: string;
}) {
  const g = MATURITY_LEVEL_GUIDANCE[level];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border text-left transition-all duration-200",
        isSelected
          ? "border-indigo-400 bg-gradient-to-br from-indigo-50/90 to-white shadow-md shadow-indigo-500/10 ring-2 ring-indigo-200/80"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm",
        disabled && "opacity-60"
      )}
    >
      <div
        className="absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5"
        style={{ backgroundColor: g.color }}
        aria-hidden
      />
      <div className="flex h-full flex-col px-3.5 py-3 pl-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-tight text-slate-900">{g.label}</span>
          {isSelected && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Check className="h-3 w-3" aria-hidden />
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-600">{g.headline}</p>
        {compactHint && (
          <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{compactHint}</p>
        )}
      </div>
    </button>
  );
}

export function MaturityLevelPicker({
  value,
  onChange,
  disabled,
  variant = "survey",
  guideInitiallyOpen = false,
  showGoodLooksLikeHints = false,
}: Props) {
  const [showAllLevels, setShowAllLevels] = useState(false);

  if (variant === "survey") {
    return (
      <div className="space-y-5">
        <RatingGuidePanel defaultOpen={guideInitiallyOpen} />

        <div>
          <p className="text-sm font-semibold text-slate-900">
            {showGoodLooksLikeHints ? "How mature is this pillar today?" : "Your maturity rating"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Choose the level that best describes your organization right now — these are maturity
            levels, not question numbers.
          </p>
          <div className="mt-4 grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2">
            {MATURITY_LEVELS.map((level) => (
              <SurveyOptionTile
                key={level}
                level={level}
                isSelected={value === level}
                disabled={disabled}
                onSelect={() => onChange(level)}
                compactHint={
                  showGoodLooksLikeHints
                    ? MATURITY_LEVEL_GUIDANCE[level].goodLooksLike
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {value && <SelectedLevelDetail level={value} hideStepNumber />}

        <button
          type="button"
          onClick={() => setShowAllLevels((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Info className="h-3.5 w-3.5" />
          {showAllLevels ? "Hide full level descriptions" : "Compare all level descriptions"}
          {showAllLevels ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showAllLevels && (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            {MATURITY_LEVELS.map((level) => (
              <GuidedOption
                key={level}
                level={level}
                isSelected={value === level}
                disabled={disabled}
                onSelect={() => onChange(level)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === "guided") {
    return (
      <div className="space-y-4">
        <RatingGuidePanel defaultOpen={guideInitiallyOpen} />
        <div>
          <p className="mb-3 text-sm font-medium text-slate-900">Select the level that fits best</p>
          <div className="space-y-2">
            {MATURITY_LEVELS.map((level) => (
              <GuidedOption
                key={level}
                level={level}
                isSelected={value === level}
                disabled={disabled}
                onSelect={() => onChange(level)}
              />
            ))}
          </div>
        </div>
        {value && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Your selection
            </p>
            <SelectedLevelDetail level={value} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variant === "detailed" && <RatingGuidePanel defaultOpen={false} />}

      <div
        className={cn(
          "grid gap-2",
          variant === "compact" ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        {MATURITY_LEVELS.map((level) => {
          const guidance = MATURITY_LEVEL_GUIDANCE[level];
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-all",
                isSelected
                  ? "border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                disabled && "opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                  style={{ backgroundColor: `${guidance.color}22`, color: guidance.color }}
                >
                  {guidance.step}
                </span>
                <span className="text-sm font-medium text-slate-900">{guidance.label}</span>
              </div>
              {variant === "detailed" && (
                <>
                  <p className="mt-1 text-[11px] font-medium text-slate-600">{guidance.headline}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    {guidance.description}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      {value && variant === "compact" && <SelectedLevelDetail level={value} />}
    </div>
  );
}
