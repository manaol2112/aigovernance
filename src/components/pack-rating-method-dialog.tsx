"use client";

import type { ReactNode } from "react";
import { CheckCircle2, HelpCircle, Layers, Scale } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DELOITTE_BRAND } from "@/lib/deloitte-brand";
import { PILLAR_QUESTION_ANSWER_META } from "@/lib/pillar-questionnaire";
import {
  scoreBandLabel,
  type PackWeightingMethodology,
} from "@/lib/pillar-questionnaire-scoring";
import { cn } from "@/lib/utils";

/** Restrained Deloitte scale for pillar mix — greens + neutrals only. */
const PILLAR_COLORS = [
  DELOITTE_BRAND.green,
  DELOITTE_BRAND.green4,
  DELOITTE_BRAND.green6,
  DELOITTE_BRAND.green7,
  DELOITTE_BRAND.slate,
  DELOITTE_BRAND.charcoal,
  DELOITTE_BRAND.greenDark,
  DELOITTE_BRAND.soft,
] as const;

function bandToneClass(alignmentPct: number | null): string {
  const tone = scoreBandLabel(alignmentPct).tone;
  if (tone === "critical") return "bg-[#DA291C]/10 text-[#DA291C]";
  if (tone === "developing") return "bg-[#ED8B00]/15 text-[#9A5B00]";
  if (tone === "defined") return "bg-[#F5F5F5] text-[#53565A]";
  return "bg-[var(--theme-brand-muted)] text-[var(--theme-brand-hover)]";
}

function answerTone(answer: keyof typeof PILLAR_QUESTION_ANSWER_META): string {
  const tone = PILLAR_QUESTION_ANSWER_META[answer].tone;
  if (tone === "yes") return "text-[var(--theme-brand-hover)]";
  if (tone === "partial") return "text-[#9A5B00]";
  if (tone === "no") return "text-[#DA291C]";
  return "text-[#666666]";
}

export function PackRatingMethodDialog({
  weighting,
  overallScorePct,
}: {
  weighting: PackWeightingMethodology;
  overallScorePct: number | null;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#E3E3E3] bg-white px-3 py-1.5 text-xs font-semibold text-[#53565A] transition-colors hover:border-[#D0D0CE] hover:bg-[#FAFAFA] hover:text-black print:hidden"
        >
          <HelpCircle className="h-3.5 w-3.5 text-[var(--theme-brand)]" />
          How are these ratings calculated?
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[min(90vh,820px)] max-w-3xl overflow-hidden border border-[#E3E3E3] p-0 shadow-lg">
        <div className="brand-ink-surface relative bg-black px-6 pb-5 pt-5 text-white">
          <span
            aria-hidden
            className="absolute bottom-5 left-0 top-5 w-1 rounded-r-sm bg-[var(--theme-brand)]"
          />
          <DialogHeader className="relative border-0 px-0 py-0 pl-3 pr-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-brand)]">
              Scoring guide
            </p>
            <DialogTitle className="mt-1 text-xl font-light tracking-tight text-white">
              How we arrived at these ratings
            </DialogTitle>
            <DialogDescription className="mt-1.5 max-w-xl text-sm text-slate-300">
              {weighting.summary}
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-5 flex flex-wrap items-end gap-4 pl-3">
            <div className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Overall result
              </p>
              <p className="mt-1 text-3xl font-light tabular-nums tracking-tight text-white">
                {overallScorePct == null ? "—" : `${overallScorePct}%`}
              </p>
            </div>
            <div className="min-w-[12rem] flex-1">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Pillar weighting
              </p>
              <div className="flex h-2.5 overflow-hidden rounded-md bg-white/10 ring-1 ring-white/10">
                {weighting.pillars.map((pillar, index) => (
                  <div
                    key={pillar.pillarId}
                    title={`${pillar.pillarLabel}: ${pillar.weightSharePct}%`}
                    className="h-full transition-all"
                    style={{
                      width: `${Math.max(pillar.weightSharePct, 0)}%`,
                      backgroundColor: PILLAR_COLORS[index % PILLAR_COLORS.length],
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="max-h-[min(58vh,560px)] space-y-5 overflow-y-auto px-6 py-5"
          style={{ backgroundColor: DELOITTE_BRAND.wash }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MethodCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Answers"
              body={weighting.answerPoints}
            />
            <MethodCard
              icon={<Scale className="h-4 w-4" />}
              label="Question weighting"
              body={weighting.questionWeightBlurb}
              accent
            />
            <MethodCard
              icon={<Layers className="h-4 w-4" />}
              label="Pillar weighting"
              body={weighting.pillarWeightBlurb}
              accent
            />
          </div>

          <p className="text-sm leading-relaxed text-[#666666]">{weighting.pillarFormula}</p>
          <p className="text-sm leading-relaxed text-[#666666]">{weighting.overallFormula}</p>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#767676]">
                Pillar by pillar
              </p>
              <p className="text-[11px] text-[#767676]">
                {weighting.pillars.length} pillars
              </p>
            </div>

            <ul className="space-y-3">
              {weighting.pillars.map((pillar, index) => {
                const band = scoreBandLabel(pillar.alignmentPct);
                return (
                  <li
                    key={pillar.pillarId}
                    className="brand-elevated-card overflow-hidden rounded-xl border border-[#E3E3E3] bg-white shadow-sm"
                  >
                    <div className="flex items-stretch">
                      <div
                        className="w-1 shrink-0"
                        style={{
                          backgroundColor: PILLAR_COLORS[index % PILLAR_COLORS.length],
                        }}
                      />
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-black">
                              {pillar.pillarLabel}
                            </p>
                            <p className="mt-1 text-xs text-[#666666]">
                              {pillar.explanation.teaser}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                              bandToneClass(pillar.alignmentPct)
                            )}
                          >
                            {pillar.alignmentPct == null
                              ? "Unresolved"
                              : `${band.shortLabel} · ${pillar.alignmentPct}%`}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-[#53565A]">
                          {pillar.explanation.ratingReason}
                        </p>

                        {pillar.explanation.questionWeightReason ? (
                          <div
                            className="mt-3 rounded-lg border px-3.5 py-3"
                            style={{
                              borderColor: "color-mix(in srgb, var(--theme-link) 22%, white)",
                              backgroundColor: DELOITTE_BRAND.tealSoft,
                            }}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-link)]">
                              {pillar.explanation.questionWeightTitle}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#53565A]">
                              {pillar.explanation.questionWeightReason}
                            </p>
                            {pillar.questionDrivers.length > 0 ? (
                              <ul className="mt-3 space-y-2">
                                {pillar.questionDrivers.map((driver) => (
                                  <li
                                    key={`${driver.prompt}-${driver.weight}`}
                                    className="rounded-md bg-white px-2.5 py-2 ring-1 ring-[#E3E3E3]"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="min-w-0 text-xs leading-snug text-[#53565A]">
                                        {driver.prompt}
                                      </p>
                                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[#666666]">
                                        Weight {driver.weight} · {driver.shareOfPillarPct}%
                                      </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-[#F5F5F5]">
                                        <div
                                          className="h-full rounded-md bg-[var(--theme-link)]"
                                          style={{
                                            width: `${Math.max(8, driver.shareOfPillarPct)}%`,
                                          }}
                                        />
                                      </div>
                                      <span
                                        className={cn(
                                          "text-[11px] font-semibold",
                                          answerTone(driver.answer)
                                        )}
                                      >
                                        {PILLAR_QUESTION_ANSWER_META[driver.answer].shortLabel}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        {pillar.explanation.weightReason ? (
                          <div className="mt-3 rounded-lg border border-[var(--theme-brand-ring)]/25 bg-[var(--theme-brand-muted)]/70 px-3.5 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-brand-hover)]">
                                {pillar.explanation.weightTitle}
                              </p>
                              <span className="text-[10px] font-semibold tabular-nums text-[#666666]">
                                {pillar.weightSharePct}% of overall
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#53565A]">
                              {pillar.explanation.weightReason}
                            </p>
                            <div className="mt-2.5 h-1.5 overflow-hidden rounded-md bg-white ring-1 ring-[var(--theme-brand-ring)]/20">
                              <div
                                className="h-full rounded-md bg-[var(--theme-brand)]"
                                style={{ width: `${Math.max(6, pillar.weightSharePct)}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MethodCard({
  icon,
  label,
  body,
  accent,
}: {
  icon: ReactNode;
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "brand-elevated-card rounded-xl border bg-white px-3.5 py-3 shadow-sm",
        accent ? "border-[var(--theme-brand-ring)]/30" : "border-[#E3E3E3]"
      )}
    >
      <div className="flex items-center gap-2 text-[var(--theme-brand)]">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#767676]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#53565A]">{body}</p>
    </div>
  );
}
