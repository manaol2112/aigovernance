"use client";

import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Layers3,
  ListChecks,
  MessageSquareText,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuidedWorkshopBriefing } from "@/lib/guided-workshop-briefing";
import {
  WORKSHOP_ANSWER_INSTRUCTIONS,
  WORKSHOP_EXPECTATIONS,
} from "@/lib/guided-workshop-briefing";
import { MATURITY_LEVELS, MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";

const CRITICALITY_BADGE: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200/80",
  high: "bg-amber-50 text-amber-800 ring-amber-200/80",
  medium: "bg-slate-100 text-slate-600 ring-slate-200/80",
};

type Props = {
  briefing: GuidedWorkshopBriefing;
  onBegin: () => void;
  onSaveExit?: () => void;
  savingExit?: boolean;
};

export function GuidedWorkshopBriefingPanel({
  briefing,
  onBegin,
  onSaveExit,
  savingExit = false,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-900/10 bg-[#0B1220] px-6 py-8 text-white sm:px-8">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/90">
          <Sparkles className="h-3.5 w-3.5" />
          Before you begin
        </p>
        <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Workshop overview for {briefing.organizationName}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              You will work through{" "}
              <span className="font-semibold text-white">{briefing.totalQuestions} controls</span>{" "}
              across{" "}
              <span className="font-semibold text-white">{briefing.pillarCount} governance pillars</span>
              , aligned to {briefing.frameworkLabels.join(", ")}. Review the coverage, how to answer,
              and what to expect before starting facilitation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[26rem]">
            {[
              { label: "Pillars", value: String(briefing.pillarCount), icon: Layers3 },
              { label: "Controls", value: String(briefing.totalQuestions), icon: ListChecks },
              { label: "Frameworks", value: String(briefing.frameworkLabels.length), icon: BookOpen },
              {
                label: "Format",
                value: "Facilitated",
                icon: Users,
              },
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
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Pillars in scope
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Eleven governance pillars you will assess together
          </h3>
          <p className="mt-1.5 text-sm text-slate-500">
            Each pillar contains framework-mapped controls. You will discuss and rate controls pillar
            by pillar during the session.
          </p>

          <ol className="mt-5 space-y-3">
            {briefing.pillars.map((pillar, index) => (
              <li
                key={pillar.pillarId}
                className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:border-slate-200 hover:bg-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-brand text-xs font-bold text-white tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{pillar.pillarLabel}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                        CRITICALITY_BADGE[pillar.criticality] ?? CRITICALITY_BADGE.medium
                      )}
                    >
                      {pillar.criticality}
                    </span>
                    <span className="text-[10px] font-medium tabular-nums text-slate-400">
                      {pillar.controlCount} control{pillar.controlCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {pillar.pillarDescription}
                  </p>
                  <p className="mt-2 text-xs italic text-slate-400">{pillar.criticalQuestion}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-brand-muted text-theme-brand">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
                  How to provide answers
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Instructions for the session</h3>
              </div>
            </div>
            <ul className="mt-5 space-y-4">
              {WORKSHOP_ANSWER_INSTRUCTIONS.map((item, i) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Workshop expectations
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">What to expect today</h3>
              </div>
            </div>
            <ul className="mt-5 space-y-4">
              {WORKSHOP_EXPECTATIONS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Maturity scale
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">The six levels you will select from</h3>
          <p className="mt-1.5 text-sm text-slate-500">
            Every control uses the same scale. Each level maps to a predefined statement you will
            choose from during facilitation.
          </p>
          <div className="mt-4 flex gap-0.5 overflow-hidden rounded-full">
            {MATURITY_LEVELS.map((level) => (
              <div
                key={level}
                className="h-2 flex-1 first:rounded-l-full last:rounded-r-full"
                style={{ backgroundColor: MATURITY_LEVEL_GUIDANCE[level].color }}
                title={MATURITY_LEVEL_GUIDANCE[level].label}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400">
            <span>Not implemented</span>
            <span>Optimized</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MATURITY_LEVELS.map((level) => {
              const g = MATURITY_LEVEL_GUIDANCE[level];
              return (
                <div
                  key={level}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-slate-900">
                    {g.step}. {g.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{g.headline}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col items-center gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:justify-between">
          <p className="text-center text-xs text-slate-500 sm:text-left">
            {briefing.facilitatorName
              ? `Facilitated by ${briefing.facilitatorName}`
              : "Ready when your team and client are aligned on scope."}
            {briefing.clientContactName ? ` · Client lead: ${briefing.clientContactName}` : ""}
            {" · "}
            Progress saves automatically when you begin answering controls.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onSaveExit && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={savingExit}
                onClick={onSaveExit}
                className="gap-2"
              >
                <Bookmark className="h-4 w-4" />
                {savingExit ? "Saving…" : "Save & exit"}
              </Button>
            )}
            <Button type="button" size="lg" onClick={onBegin} className="gap-2 shadow-lg">
              <ClipboardList className="h-4 w-4" />
              Begin workshop
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
