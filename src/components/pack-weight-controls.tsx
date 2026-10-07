"use client";

import { cn } from "@/lib/utils";
import {
  PACK_WEIGHT_MAX,
  PACK_WEIGHT_MIN,
  sumWeights,
  weightSharePct,
} from "@/lib/pack-weights";

const WEIGHT_STOPS = Array.from(
  { length: PACK_WEIGHT_MAX - PACK_WEIGHT_MIN + 1 },
  (_, index) => PACK_WEIGHT_MIN + index
);

const PILLAR_BAR_COLORS = [
  "bg-[#86BC25]",
  "bg-[#26890D]",
  "bg-[#0D8390]",
  "bg-[#0076A8]",
  "bg-[#012169]",
  "bg-[#53565A]",
  "bg-[#BBBCBC]",
  "bg-[#DA291C]",
  "bg-[#ED8B00]",
  "bg-[#43B02A]",
  "bg-[#046A38]",
];

export function PackPillarWeightMixer({
  pillars,
  onChange,
  disabled,
}: {
  pillars: Array<{ pillarId: string; pillarLabel: string; weight: number }>;
  onChange: (pillarId: string, weight: number) => void;
  disabled?: boolean;
}) {
  const total = sumWeights(pillars.map((pillar) => pillar.weight));

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
        <div className="flex h-3 w-full">
          {pillars.map((pillar, index) => {
            const share = weightSharePct(pillar.weight, total);
            if (share <= 0) return null;
            return (
              <div
                key={pillar.pillarId}
                title={`${pillar.pillarLabel}: ${share}%`}
                className={cn(
                  "h-full transition-all duration-300",
                  PILLAR_BAR_COLORS[index % PILLAR_BAR_COLORS.length]
                )}
                style={{ width: `${share}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {pillars.map((pillar, index) => {
          const share = weightSharePct(pillar.weight, total);
          return (
            <div key={pillar.pillarId} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-900">{pillar.pillarLabel}</span>
                  <span className="text-[11px] tabular-nums text-slate-500">
                    {share}% of overall
                  </span>
                </div>
                <input
                  type="range"
                  min={PACK_WEIGHT_MIN}
                  max={PACK_WEIGHT_MAX}
                  step={1}
                  value={pillar.weight}
                  disabled={disabled}
                  onChange={(event) => onChange(pillar.pillarId, Number(event.target.value))}
                  className="mt-2 w-full accent-[#86BC25]"
                  aria-label={`${pillar.pillarLabel} weight`}
                />
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    PILLAR_BAR_COLORS[index % PILLAR_BAR_COLORS.length]
                  )}
                />
                <span className="w-8 text-center text-sm font-bold tabular-nums text-slate-900">
                  {pillar.weight}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionWeightPicker({
  value,
  sharePct,
  onChange,
  disabled,
}: {
  value: number;
  sharePct: number;
  onChange: (weight: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Question weight
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
            {sharePct}% of this pillar
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {WEIGHT_STOPS.map((stop) => (
            <button
              key={stop}
              type="button"
              disabled={disabled}
              onClick={() => onChange(stop)}
              className={cn(
                "h-7 min-w-7 rounded-lg px-1.5 text-xs font-semibold tabular-nums transition-colors",
                value === stop
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              )}
            >
              {stop}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-full rounded-full bg-[#86BC25] transition-all duration-300"
          style={{ width: `${Math.max(8, sharePct)}%` }}
        />
      </div>
    </div>
  );
}
