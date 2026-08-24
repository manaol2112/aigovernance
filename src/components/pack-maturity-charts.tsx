"use client";

import {
  PACK_POSTURE_STEPS,
  type PackPillarScore,
  type PackPostureTone,
} from "@/lib/pillar-questionnaire-scoring";
import { PACK_ASSESSMENT_COPY } from "@/lib/maturity-client-copy";
import { cn } from "@/lib/utils";

const ANSWER_COLORS = {
  yes: "#2d6a4f",
  partial: "#b08968",
  no: "#9b4a43",
  dontKnow: "#9aa1ab",
} as const;

const MIX_SEGMENTS = [
  { key: "yes" as const, label: "In place", color: ANSWER_COLORS.yes },
  { key: "partial" as const, label: "Underway", color: ANSWER_COLORS.partial },
  { key: "no" as const, label: "Not yet in place", color: ANSWER_COLORS.no },
  { key: "dontKnow" as const, label: "To confirm", color: ANSWER_COLORS.dontKnow },
];

const CRITICALITY_WEIGHT: Record<string, number> = { critical: 3, high: 2, medium: 1 };

function MixBar({
  counts,
  className,
}: {
  counts: { yes: number; partial: number; no: number; dontKnow: number };
  className?: string;
}) {
  const total = counts.yes + counts.partial + counts.no + counts.dontKnow;
  const segments = MIX_SEGMENTS.map((segment) => ({
    ...segment,
    count: counts[segment.key],
  })).filter((segment) => segment.count > 0);

  return (
    <div className={cn("flex overflow-hidden rounded-full bg-slate-100", className ?? "h-2.5")}>
      {total === 0 ? (
        <div className="h-full w-full bg-slate-100" />
      ) : (
        segments.map((segment) => (
          <div
            key={segment.key}
            className="h-full"
            style={{
              width: `${(segment.count / total) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))
      )}
    </div>
  );
}

function shortPillarLabel(label: string): string {
  const part = label.split("&")[0]?.trim() || label;
  if (part.length <= 16) return part;
  return `${part.slice(0, 14)}…`;
}

function polar(cx: number, cy: number, radius: number, angle: number, pct: number) {
  const r = (Math.min(100, Math.max(0, pct)) / 100) * radius;
  return {
    x: (cx + r * Math.cos(angle)).toFixed(2),
    y: (cy + r * Math.sin(angle)).toFixed(2),
  };
}

function polygonPoints(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  startAngle = -Math.PI / 2
): string {
  const step = (2 * Math.PI) / values.length;
  return values
    .map((value, index) => {
      const point = polar(cx, cy, radius, startAngle + index * step, value);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function weightedPackAlignment(pillars: PackPillarScore[]): number {
  const active = pillars.filter((pillar) => pillar.scoredCount > 0 && pillar.alignmentPct != null);
  if (active.length === 0) return 0;
  let sum = 0;
  let weight = 0;
  for (const pillar of active) {
    const w = CRITICALITY_WEIGHT[pillar.criticality] ?? 1;
    sum += (pillar.alignmentPct ?? 0) * w;
    weight += w;
  }
  return Math.round(sum / weight);
}

export function PackPostureMeter({
  tone,
  size = "md",
}: {
  tone: PackPostureTone | null;
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={cn("flex overflow-hidden rounded-full", height)} aria-hidden>
      {PACK_POSTURE_STEPS.map((step) => {
        const active = tone === step.tone;
        return (
          <div
            key={step.tone}
            className="flex-1 transition-opacity duration-500"
            style={{ backgroundColor: step.color, opacity: active ? 1 : 0.28 }}
            title={step.shortLabel}
          />
        );
      })}
    </div>
  );
}

export function PackPostureLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {PACK_POSTURE_STEPS.map((step) => (
        <span key={step.tone} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: step.color }} />
          {step.shortLabel}
        </span>
      ))}
    </div>
  );
}

/** Spider chart — same dark maturity web as the framework-driven results. */
export function PackPillarRadarChart({
  pillars,
  accent = "indigo",
}: {
  pillars: PackPillarScore[];
  /** `brand` uses Deloitte green accents for workshop client reports. */
  accent?: "indigo" | "brand";
}) {
  const active = pillars.filter((pillar) => pillar.scoredCount > 0);
  if (active.length < 3) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Complete questions in at least three pillars to render the maturity web.
      </div>
    );
  }

  const isBrand = accent === "brand";
  const fillColor = isBrand ? "rgba(134,188,37,0.32)" : "rgba(99,102,241,0.35)";
  const strokeColor = isBrand ? "#86bc25" : "#818cf8";
  const labelAccent = isBrand ? "text-[var(--theme-shimmer-from)]" : "text-indigo-300";
  const shellBg = isBrand
    ? "border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950";

  const cx = 200;
  const cy = 200;
  const maxR = 148;
  const alignment = active.map((pillar) => pillar.alignmentPct ?? 0);
  const coverage = active.map((pillar) =>
    pillar.questionCount > 0
      ? Math.round((pillar.answeredCount / pillar.questionCount) * 100)
      : 0
  );
  const step = (2 * Math.PI) / active.length;
  const start = -Math.PI / 2;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-4 shadow-lg", shellBg)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className={cn("text-[11px] font-semibold uppercase tracking-wider", labelAccent)}>
          Governance maturity web
        </p>
        <div className="flex gap-3 text-[10px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded bg-indigo-400"
              style={isBrand ? { backgroundColor: strokeColor } : undefined}
            />
            Posture
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border border-dashed border-emerald-400" />
            Answered
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 400 400"
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="Governance posture by pillar"
      >
        {[25, 50, 75, 100].map((ring) => (
          <circle
            key={ring}
            cx={cx}
            cy={cy}
            r={(ring / 100) * maxR}
            fill="none"
            stroke="rgba(148,163,184,0.2)"
            strokeWidth={1}
          />
        ))}
        {active.map((_, index) => {
          const angle = start + index * step;
          const outer = polar(cx, cy, maxR, angle, 100);
          return (
            <line
              key={index}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={polygonPoints(cx, cy, maxR, coverage, start)}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.85}
        />
        <polygon
          points={polygonPoints(cx, cy, maxR, alignment, start)}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2.5}
        />
        {active.map((pillar, index) => {
          const angle = start + index * step;
          const pt = polar(cx, cy, maxR + 22, angle, 100);
          const anchor =
            Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
          return (
            <text
              key={pillar.pillarId}
              x={pt.x}
              y={pt.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-slate-300 text-[9px] font-medium"
            >
              <title>{pillar.pillarLabel}</title>
              {shortPillarLabel(pillar.pillarLabel)}
            </text>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-[22px] font-bold">
          {weightedPackAlignment(active)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400 text-[9px]">
          weighted posture
        </text>
      </svg>
    </div>
  );
}

export function PackAnswerStackedChart({ pillars }: { pillars: PackPillarScore[] }) {
  const rows = pillars.filter((pillar) => pillar.questionCount > 0);
  if (rows.length === 0) return null;

  const totals = rows.reduce(
    (sum, pillar) => ({
      yes: sum.yes + pillar.yesCount,
      partial: sum.partial + pillar.partialCount,
      no: sum.no + pillar.noCount,
      dontKnow: sum.dontKnow + pillar.dontKnowCount,
    }),
    { yes: 0, partial: 0, no: 0, dontKnow: 0 }
  );
  const total = totals.yes + totals.partial + totals.no + totals.dontKnow;
  if (total === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Response mix</p>
      <p className="mt-0.5 text-xs text-slate-500">How answers landed across assessed pillars</p>
      <MixBar counts={totals} className="mt-4 h-2.5" />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {MIX_SEGMENTS.map((segment) => (
          <p key={segment.key} className="text-[12px] text-slate-500">
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            {segment.label}
            <span className="ml-1.5 font-semibold tabular-nums text-slate-900">
              {totals[segment.key]}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function PackScoreHero({
  scoreLabel,
  scoreTone,
  scoreHeroNote,
}: {
  scoreLabel: string;
  scoreTone: PackPostureTone | null;
  scoreHeroNote?: string;
}) {
  const active = PACK_POSTURE_STEPS.find((step) => step.tone === scoreTone);

  return (
    <div className="w-full max-w-[16rem] rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-center shadow-lg shadow-black/20 backdrop-blur-sm print:border-slate-200 print:bg-slate-50 print:shadow-none">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Overall posture
      </p>
      <div className="mt-4 flex flex-col items-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md print:shadow-none"
          style={{ backgroundColor: active?.color ?? "#94a3b8" }}
        >
          {active?.shortLabel.slice(0, 1) ?? "—"}
        </span>
        <p className="mt-3 text-lg font-bold tracking-tight text-white print:text-slate-900">
          {scoreLabel}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400 print:text-slate-600">
          {scoreHeroNote ?? PACK_ASSESSMENT_COPY.scoreHeroNote}
        </p>
      </div>
      <div className="mt-5">
        <PackPostureMeter tone={scoreTone} />
        <div className="mt-1.5 flex justify-between text-[9px] font-medium text-slate-500">
          <span>Early</span>
          <span>Strong</span>
        </div>
      </div>
    </div>
  );
}
