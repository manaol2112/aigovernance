"use client";

import { useState } from "react";
import type { MaturityLevel } from "@prisma/client";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Layers3,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import type { MaturitySurveyBriefing } from "@/lib/maturity-survey-briefing";
import {
  formatBriefingDomainsHeadline,
  formatBriefingFrameworks,
  formatBriefingGovernanceDomains,
  getBriefingQuestionCount,
} from "@/lib/maturity-survey-briefing";
import {
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_LEVELS,
  MATURITY_RATING_INSTRUCTIONS,
} from "@/lib/maturity-survey-constants";
import { getSurveyModeMeta } from "@/lib/maturity-survey-mode";
import { cn } from "@/lib/utils";

const CRITICALITY_BADGE: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200/80",
  high: "bg-amber-50 text-amber-800 ring-amber-200/80",
  medium: "bg-slate-100 text-slate-600 ring-slate-200/80",
};

const PROCESS_STEPS = [
  {
    title: "Rate each domain",
    description: "One screen per pillar using the scale above — based on practice today.",
  },
  {
    title: "Framework mapping",
    description: "Ratings translate into gap analysis for the standards you selected.",
  },
  {
    title: "Baseline report",
    description: "Maturity score, heatmap, priority gaps, and a leadership-ready roadmap.",
  },
] as const;

function MaturityScaleSpectrum({
  selected,
  onSelect,
}: {
  selected: MaturityLevel;
  onSelect: (level: MaturityLevel) => void;
}) {
  const active = MATURITY_LEVEL_GUIDANCE[selected];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
            Your rating scale
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {MATURITY_RATING_INSTRUCTIONS.title}
          </h3>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            {MATURITY_RATING_INSTRUCTIONS.summary}
          </p>
        </div>
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs leading-relaxed text-emerald-900/90 sm:max-w-xs">
          {MATURITY_RATING_INSTRUCTIONS.honestyNote}
        </p>
      </div>

      {/* Spectrum bar */}
      <div className="mt-6">
        <div className="flex overflow-hidden rounded-full">
          {MATURITY_LEVELS.map((level) => {
            const g = MATURITY_LEVEL_GUIDANCE[level];
            return (
              <div
                key={level}
                className="h-2 flex-1 first:rounded-l-full last:rounded-r-full"
                style={{ backgroundColor: g.color }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
          <span>Least mature</span>
          <span>Most mature</span>
        </div>
      </div>

      {/* Level selectors */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MATURITY_LEVELS.map((level) => {
          const g = MATURITY_LEVEL_GUIDANCE[level];
          const isActive = selected === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onSelect(level)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-all",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                  : "border-slate-200/90 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                    isActive ? "bg-white/20 text-white" : "text-white"
                  )}
                  style={!isActive ? { backgroundColor: g.color } : undefined}
                >
                  {g.step}
                </span>
                <span className={cn("text-xs font-bold", isActive ? "text-white" : "text-slate-900")}>
                  {g.label}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1.5 text-[11px] leading-snug",
                  isActive ? "text-white/80" : "text-slate-500"
                )}
              >
                {g.headline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active level detail */}
      <div
        className="mt-5 rounded-xl border px-4 py-4"
        style={{
          borderColor: `${active.color}44`,
          backgroundColor: `${active.color}0c`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: active.color }}
          >
            {active.step}
          </span>
          <p className="text-sm font-bold text-slate-900">
            {active.label} — {active.headline}
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{active.description}</p>
        <p className="mt-2 text-xs font-medium text-indigo-800">
          What good looks like: {active.goodLooksLike}
        </p>
        <ul className="mt-3 space-y-1.5">
          {active.signals.map((signal) => (
            <li key={signal} className="flex gap-2 text-xs leading-relaxed text-slate-600">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: active.color }}
              />
              {signal}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-slate-500">
          You&apos;ll use this same scale for every domain listed above. Tap another level to
          compare before you begin.
        </p>
      </div>
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04]">
      <div className="h-40 animate-pulse bg-slate-100" />
      <div className="space-y-6 p-8">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export function MaturitySurveyBriefingPanel({
  briefing,
  organizationName,
  loading = false,
}: {
  briefing: MaturitySurveyBriefing | null;
  organizationName: string;
  loading?: boolean;
}) {
  const [previewLevel, setPreviewLevel] = useState<MaturityLevel>("developing");

  if (loading) return <BriefingSkeleton />;
  if (!briefing) return null;

  const questionCount = getBriefingQuestionCount(briefing);
  const frameworksLabel = formatBriefingFrameworks(briefing.frameworkLabels);
  const durationLabel = getSurveyModeMeta("quick").duration;
  const orgLabel = organizationName.trim() || "your organization";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-900/10 bg-[#0B1220] px-6 py-8 text-white sm:px-8">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/90">
          <Sparkles className="h-3.5 w-3.5" />
          Step 3 of 3 · Before you begin
        </p>
        <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              See what you&apos;ll assess, then how to rate it
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {orgLabel} will be rated across{" "}
              <span className="font-semibold text-white">
                {formatBriefingGovernanceDomains(questionCount)}
              </span>,
              aligned to {frameworksLabel}. Review the domains first, then the maturity scale
              you&apos;ll use for each one.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[26rem]">
            {[
              { label: "Domains", value: String(questionCount), icon: Layers3 },
              { label: "Duration", value: durationLabel, icon: Clock },
              { label: "Frameworks", value: String(briefing.frameworkLabels.length), icon: BookOpen },
              { label: "Confidential", value: "Private", icon: Lock },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8 bg-slate-50/40 p-6 sm:p-8">
        {/* 1 — Domains first */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Step A · Coverage
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {formatBriefingDomainsHeadline(questionCount)}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500">
            One step per domain, in order. Questions appear one at a time during the scan — this is
            the scope of what you&apos;re evaluating.
          </p>

          <ol className="mt-5 space-y-3">
            {briefing.pillars.map((pillar, index) => (
              <li
                key={pillar.pillarId}
                className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{pillar.pillarLabel}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset",
                        CRITICALITY_BADGE[pillar.criticality] ?? CRITICALITY_BADGE.medium
                      )}
                    >
                      {pillar.criticality}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {pillar.pillarDescription}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 2 — Maturity scale second */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Step B · Rating scale
          </p>
          <MaturityScaleSpectrum selected={previewLevel} onSelect={setPreviewLevel} />
        </div>

        {/* 3 — Process + deliverable */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Process
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">What happens next</h3>
            <ol className="mt-4 space-y-4">
              {PROCESS_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-5">
            <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <p className="text-sm font-bold text-slate-900">Your deliverable</p>
              </div>
              <ul className="mt-3 space-y-2.5">
                {[
                  "Executive maturity score and pillar heatmap",
                  "Priority gaps tied to your framework scope",
                  "Option to go deeper on any pillar afterward",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500">
              <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              Progress saves automatically. Optional notes on each question. Mapped to{" "}
              {frameworksLabel}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
