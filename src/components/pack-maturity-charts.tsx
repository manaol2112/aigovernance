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

export function PackPillarRadarChart({
  pillars,
  variant = "light",
}: {
  pillars: PackPillarScore[];
  variant?: "light" | "dark";
}) {
  const active = pillars.filter((pillar) => pillar.scoredCount > 0);
  if (active.length < 3) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white px-6 py-10 text-center text-sm leading-relaxed text-slate-500">
        Complete questions in at least three pillars to see your profile shape.
      </div>
    );
  }

  const cx = 200;
  const cy = 200;
  const maxR = 148;
  const alignment = active.map((pillar) => pillar.alignmentPct ?? 0);
  const step = (2 * Math.PI) / active.length;
  const start = -Math.PI / 2;
  const isLight = variant === "light";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        isLight
          ? "border-slate-200/90 bg-white shadow-sm"
          : "border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 shadow-lg"
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.18em]",
            isLight ? "text-slate-400" : "text-indigo-300"
          )}
        >
          Profile by pillar
        </p>
        <span className={cn("text-[10px]", isLight ? "text-slate-400" : "text-slate-300")}>
          Stronger toward the edge
        </span>
      </div>
      <svg viewBox="0 0 400 400" className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Governance posture by pillar">
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={polygonPoints(cx, cy, maxR, Array(active.length).fill(ring), start)}
            fill="none"
            stroke={isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)"}
            strokeWidth={1}
          />
        ))}
        {active.map((pillar, index) => {
          const angle = start + index * step;
          const labelPoint = polar(cx, cy, maxR + 28, angle, 100);
          return (
            <g key={pillar.pillarId}>
              <line
                x1={cx}
                y1={cy}
                x2={polar(cx, cy, maxR, angle, 100).x}
                y2={polar(cx, cy, maxR, angle, 100).y}
                stroke={isLight ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.06)"}
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn("text-[9px] font-medium", isLight ? "fill-slate-500" : "fill-slate-300")}
              >
                {shortPillarLabel(pillar.pillarLabel)}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPoints(cx, cy, maxR, alignment, start)}
          fill={isLight ? "rgba(79,70,229,0.12)" : "rgba(99,102,241,0.35)"}
          stroke={isLight ? "#6366f1" : "#818cf8"}
          strokeWidth={isLight ? 1.5 : 2}
        />
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
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
        Response mix
      </p>
      <MixBar counts={totals} className="mt-4 h-2" />
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5">
        {MIX_SEGMENTS.map((segment) => (
          <p key={segment.key} className="text-[13px] text-slate-500">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label}
            <span className="ml-1.5 font-medium tabular-nums text-slate-800">
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
