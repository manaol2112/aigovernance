"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import {
  PACK_POSTURE_STEPS,
  computePackOverallScorePct,
  describePackPillarRating,
  scoreBandLabel,
  type PackPillarScore,
  type PackPostureTone,
} from "@/lib/pillar-questionnaire-scoring";
import { PACK_ASSESSMENT_COPY } from "@/lib/maturity-client-copy";
import { cn } from "@/lib/utils";

/** Deloitte-aligned functional palette (green / amber / red / gray). */
const ANSWER_COLORS = {
  yes: "#046A38",
  partial: "#ED8B00",
  no: "#DA291C",
  dontKnow: "#767676",
} as const;

const MIX_SEGMENTS = [
  { key: "yes" as const, label: "Operating", color: ANSWER_COLORS.yes },
  { key: "partial" as const, label: "In progress", color: ANSWER_COLORS.partial },
  { key: "no" as const, label: "Open gap", color: ANSWER_COLORS.no },
  { key: "dontKnow" as const, label: "Unresolved", color: ANSWER_COLORS.dontKnow },
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

function PackPillarHoverCard({ pillar }: { pillar: PackPillarScore }) {
  const band = scoreBandLabel(pillar.alignmentPct);
  const explanation = describePackPillarRating(pillar);
  const answerBits = [
    pillar.yesCount > 0 ? `${pillar.yesCount} Yes` : null,
    pillar.partialCount > 0 ? `${pillar.partialCount} Partial` : null,
    pillar.noCount > 0 ? `${pillar.noCount} No` : null,
    pillar.dontKnowCount > 0 ? `${pillar.dontKnowCount} Don’t know` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-white/15 bg-black/90 px-3.5 py-3 shadow-lg ring-1 ring-[var(--theme-brand)]/25">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-brand)]">
            How this rating was calculated
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{pillar.pillarLabel}</p>
        </div>
        <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white">
          {pillar.alignmentPct == null
            ? "Unresolved"
            : `${band.shortLabel} · ${pillar.alignmentPct}%`}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{explanation.ratingReason}</p>
      {answerBits.length > 0 ? (
        <p className="mt-2 text-[11px] text-slate-400">
          Answer mix:{" "}
          <span className="font-medium text-slate-200">{answerBits.join(" · ")}</span>
        </p>
      ) : null}
      {pillar.contributionPct != null ? (
        <p className="mt-1.5 text-[11px] text-slate-400">
          Contribution to overall:{" "}
          <span className="font-medium tabular-nums text-slate-200">
            {pillar.contributionPct} pts
          </span>
          {pillar.weightSharePct != null ? (
            <span className="text-slate-500">
              {" "}
              · {pillar.weightSharePct}% of weighting
            </span>
          ) : null}
        </p>
      ) : null}
      {explanation.questionWeightReason ? (
        <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-slate-400">
          {explanation.questionWeightReason}
        </p>
      ) : null}
    </div>
  );
}

/** Spider chart — same dark maturity web as the framework-driven results. */
export function PackPillarRadarChart({
  pillars,
  overallScorePct,
  accent = "brand",
}: {
  pillars: PackPillarScore[];
  /** Official overall % from the report — must match the scoring guide / hero. */
  overallScorePct?: number | null;
  /** Prefer `brand` (Deloitte green). `indigo` kept for legacy call sites. */
  accent?: "indigo" | "brand";
}) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const titleId = useId();
  const active = useMemo(
    () => pillars.filter((pillar) => pillar.scoredCount > 0),
    [pillars]
  );
  const hovered = active.find((pillar) => pillar.pillarId === hoveredId) ?? null;

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (active.length < 3) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Complete questions in at least three pillars to render the maturity web.
      </div>
    );
  }

  const isBrand = accent !== "indigo";
  const fillColor = isBrand ? "rgba(134,188,37,0.28)" : "rgba(99,102,241,0.35)";
  const strokeColor = isBrand ? "#86bc25" : "#818cf8";
  const labelAccent = "text-[var(--theme-brand)]";
  const shellBg = "brand-ink-surface border-slate-700/80 bg-black";

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
  const overallPct =
    overallScorePct !== undefined
      ? overallScorePct
      : computePackOverallScorePct(active);

  const legend = (
    <div className="flex gap-3 text-[10px] text-slate-300">
      <span className="flex items-center gap-1.5">
        <span
          className="h-0.5 w-4 rounded"
          style={{ backgroundColor: strokeColor }}
        />
        Posture
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded border border-dashed border-white/50" />
        Answered
      </span>
    </div>
  );

  const chartSvg = (size: "default" | "large") => (
    <div
      className={cn("relative mx-auto w-full", size === "large" ? "max-w-3xl" : "max-w-md")}
      onMouseLeave={() => setHoveredId(null)}
    >
      <svg
        viewBox="0 0 400 400"
        className="h-auto w-full"
        role="img"
        aria-label="Governance posture by pillar. Hover a pillar to see how its rating was calculated."
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
        {active.map((pillar, index) => {
          const angle = start + index * step;
          const outer = polar(cx, cy, maxR, angle, 100);
          return (
            <line
              key={`spoke-${pillar.pillarId}`}
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
          stroke="#86bc25"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={hoveredId ? 0.45 : 0.85}
        />
        <polygon
          points={polygonPoints(cx, cy, maxR, alignment, start)}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2.5}
          opacity={hoveredId ? 0.75 : 1}
        />
        {active.map((pillar, index) => {
          const angle = start + index * step;
          const tip = polar(cx, cy, maxR, angle, pillar.alignmentPct ?? 0);
          const labelPt = polar(cx, cy, maxR + 22, angle, 100);
          const hit = polar(cx, cy, maxR * 0.72, angle, 100);
          const anchor =
            Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
          const isHovered = hoveredId === pillar.pillarId;
          const dimmed = hoveredId != null && !isHovered;
          return (
            <g
              key={pillar.pillarId}
              onMouseEnter={() => setHoveredId(pillar.pillarId)}
              onFocus={() => setHoveredId(pillar.pillarId)}
              className="cursor-pointer"
            >
              <circle
                cx={hit.x}
                cy={hit.y}
                r={size === "large" ? 28 : 22}
                fill="transparent"
                className="outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${pillar.pillarLabel}: ${
                  pillar.alignmentPct == null
                    ? "Unresolved"
                    : `${scoreBandLabel(pillar.alignmentPct).shortLabel}, ${pillar.alignmentPct}%`
                }. Hover or focus for rating calculation.`}
              />
              <circle
                cx={tip.x}
                cy={tip.y}
                r={isHovered ? 6 : 3.5}
                fill={isHovered ? strokeColor : "#ffffff"}
                stroke={strokeColor}
                strokeWidth={isHovered ? 2 : 1}
                opacity={dimmed ? 0.35 : 1}
                className="transition-all duration-150"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={cn(
                  "font-medium transition-colors duration-150",
                  size === "large" ? "text-[11px]" : "text-[9px]",
                  isHovered ? "fill-white" : dimmed ? "fill-slate-600" : "fill-slate-300"
                )}
              >
                {shortPillarLabel(pillar.pillarLabel)}
              </text>
            </g>
          );
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className={cn(
            "pointer-events-none fill-white font-light",
            size === "large" ? "text-[28px]" : "text-[22px]"
          )}
        >
          {overallPct == null ? "—" : `${overallPct}%`}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="pointer-events-none fill-slate-400 text-[9px]"
        >
          overall result
        </text>
      </svg>
    </div>
  );

  const hoverPanel = (
    <div className="mt-3 min-h-[7.5rem] print:hidden">
      {hovered ? (
        <PackPillarHoverCard pillar={hovered} />
      ) : (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-4 py-5 text-center">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Hover a pillar on the web to see how its Early / Building / Established / Strong
            rating was calculated.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={cn("relative rounded-2xl border p-4 shadow-lg", shellBg)}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider", labelAccent)}>
            Governance maturity web
          </p>
          <div className="flex items-center gap-3">
            {legend}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
              aria-expanded={expanded}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand
            </button>
          </div>
        </div>
        {chartSvg("default")}
        {hoverPanel}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setExpanded(false)}
        >
          <div
            className={cn(
              "relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border p-5 shadow-2xl sm:p-8",
              shellBg
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p
                  id={titleId}
                  className={cn("text-[11px] font-semibold uppercase tracking-wider", labelAccent)}
                >
                  Governance maturity web
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Hover a pillar to inspect how its rating was calculated
                </p>
              </div>
              <div className="flex items-center gap-2">
                {legend}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Original size
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close expanded chart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {chartSvg("large")}
            {hoverPanel}
          </div>
        </div>
      )}
    </>
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
  overallScorePct,
  scoreHeroNote,
}: {
  scoreLabel: string;
  scoreTone: PackPostureTone | null;
  overallScorePct?: number | null;
  scoreHeroNote?: string;
}) {
  const active = PACK_POSTURE_STEPS.find((step) => step.tone === scoreTone);

  return (
    <div className="relative w-full max-w-[16rem] overflow-hidden rounded-xl border border-white/15 bg-white/[0.04] p-5 text-center print:border-slate-200 print:bg-slate-50">
      <span
        aria-hidden
        className="absolute bottom-4 left-0 top-4 w-0.5 rounded-r-full bg-[var(--theme-brand)]"
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-brand)]">
        Overall result
      </p>
      <div className="mt-4 flex flex-col items-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-md text-sm font-semibold text-white"
          style={{ backgroundColor: active?.color ?? "#53565A" }}
        >
          {active?.shortLabel.slice(0, 1) ?? "—"}
        </span>
        <p className="mt-3 text-lg font-light tracking-tight text-white print:text-slate-900">
          {scoreLabel}
        </p>
        {overallScorePct != null ? (
          <p className="mt-1 text-2xl font-light tabular-nums tracking-tight text-white print:text-slate-900">
            {overallScorePct}%
          </p>
        ) : null}
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
