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
            title={`${g.step}. ${g.label}`}
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

function SelectedLevelDetail({
  level,
  showGoodLooksLike,
}: {
  level: MaturityLevel;
  showGoodLooksLike?: boolean;
}) {
  const g = MATURITY_LEVEL_GUIDANCE[level];
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: `${g.color}55`, backgroundColor: `${g.color}0d` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold"
          style={{ backgroundColor: `${g.color}22`, color: g.color }}
        >
          {g.step}
        </span>
        <p className="text-sm font-semibold text-slate-900">
          {g.label} — {g.headline}
        </p>
      </div>
      {showGoodLooksLike && (
        <p className="mt-2 text-xs font-medium text-indigo-700">
          What good looks like: {g.goodLooksLike}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{g.description}</p>
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
  showGoodLooksLike,
}: {
  level: MaturityLevel;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  showGoodLooksLike?: boolean;
}) {
  const g = MATURITY_LEVEL_GUIDANCE[level];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-xl border px-3 py-3 text-left transition-all",
        isSelected
          ? "border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
            isSelected && "bg-indigo-600 text-white"
          )}
          style={
            !isSelected ? { backgroundColor: `${g.color}22`, color: g.color } : undefined
          }
        >
          {isSelected ? <Check className="h-3.5 w-3.5" /> : g.step}
        </span>
        <span className="text-xs font-semibold text-slate-900">{g.label}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
        {showGoodLooksLike ? g.goodLooksLike : g.headline}
      </p>
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
  const selected = value ? MATURITY_LEVEL_GUIDANCE[value] : null;

  if (variant === "survey") {
    return (
      <div className="space-y-4">
        <RatingGuidePanel defaultOpen={guideInitiallyOpen} />

        {showGoodLooksLikeHints && (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs leading-relaxed text-emerald-900">
            Each level shows what good looks like in plain language — pick the one closest to your
            organization today.
          </p>
        )}

        <div>
          <p className="mb-3 text-sm font-medium text-slate-900">
            {showGoodLooksLikeHints ? "Where are you today?" : "Your rating"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MATURITY_LEVELS.map((level) => (
              <SurveyOptionTile
                key={level}
                level={level}
                isSelected={value === level}
                disabled={disabled}
                showGoodLooksLike={showGoodLooksLikeHints}
                onSelect={() => onChange(level)}
              />
            ))}
          </div>
        </div>

        {value && (
          <SelectedLevelDetail level={value} showGoodLooksLike={showGoodLooksLikeHints} />
        )}

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
        {selected && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Your selection
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {selected.label} — {selected.headline}
            </p>
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
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {guidance.description}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      {selected && variant === "compact" && (
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-xs font-medium text-slate-700">
            {selected.label}: {selected.headline}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{selected.description}</p>
        </div>
      )}
    </div>
  );
}
