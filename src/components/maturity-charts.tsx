"use client";

import type { ControlReviewReportData, PillarMaturityRecord } from "@/lib/control-review-reports";
import { MATURITY_LABELS } from "@/lib/maturity-survey-constants";
import type { MaturityLevel } from "@prisma/client";

const COMPLIANCE = {
  aligned: "#059669",
  partial: "#d97706",
  gap: "#dc2626",
  unreviewed: "#cbd5e1",
} as const;

const MATURITY_COLORS: Record<MaturityLevel, string> = {
  not_implemented: "#94a3b8",
  initial: "#f87171",
  developing: "#fb923c",
  defined: "#facc15",
  managed: "#34d399",
  optimized: "#6366f1",
};

const CRITICALITY_WEIGHT: Record<string, number> = { critical: 3, high: 2, medium: 1 };

function shortPillarLabel(label: string): string {
  const part = label.split("&")[0]?.trim() || label;
  if (part.length <= 16) return part;
  return `${part.slice(0, 14)}…`;
}

function polar(cx: number, cy: number, radius: number, angle: number, pct: number) {
  const r = (Math.min(100, Math.max(0, pct)) / 100) * radius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
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
    .map((v, i) => {
      const p = polar(cx, cy, radius, startAngle + i * step, v);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

function weightedOverallAlignment(pillars: PillarMaturityRecord[]): number {
  const active = pillars.filter((p) => p.reviewedControls > 0);
  if (active.length === 0) return 0;
  let sum = 0;
  let weight = 0;
  for (const p of active) {
    const w = CRITICALITY_WEIGHT[p.criticality] ?? 1;
    sum += p.alignmentPct * w;
    weight += w;
  }
  return Math.round(sum / weight);
}

function pillarsAtOrAbove(pillars: PillarMaturityRecord[], minPct: number): number {
  return pillars.filter((p) => p.reviewedControls > 0 && p.alignmentPct >= minPct).length;
}

/** NIST AI RMF / ISO-style spider chart — alignment % and review coverage overlay per pillar. */
export function PillarMaturityRadarChart({
  pillars,
}: {
  pillars: PillarMaturityRecord[];
}) {
  const active = pillars.filter((p) => p.reviewedControls > 0);
  if (active.length < 3) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Sign off controls in at least three pillars to render the maturity web.
      </div>
    );
  }

  const cx = 200;
  const cy = 200;
  const maxR = 148;
  const alignment = active.map((p) => p.alignmentPct);
  const coverage = active.map((p) => p.reviewProgressPct);
  const step = (2 * Math.PI) / active.length;
  const start = -Math.PI / 2;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 shadow-lg">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
            Governance maturity web
          </p>
          <p className="text-xs text-slate-400">
            Solid: control alignment · Dashed: review coverage (signed-off / in scope)
          </p>
        </div>
        <div className="flex gap-3 text-[10px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-indigo-400" /> Alignment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border border-dashed border-emerald-400" /> Coverage
          </span>
        </div>
      </div>
      <svg viewBox="0 0 400 400" className="mx-auto h-auto w-full max-w-md">
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
        {active.map((_, i) => {
          const angle = start + i * step;
          const outer = polar(cx, cy, maxR, angle, 100);
          return (
            <line
              key={i}
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
          points={polygonPoints(cx, cy, maxR, coverage)}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.85}
        />
        <polygon
          points={polygonPoints(cx, cy, maxR, alignment)}
          fill="rgba(99,102,241,0.35)"
          stroke="#818cf8"
          strokeWidth={2.5}
        />
        {active.map((p, i) => {
          const angle = start + i * step;
          const labelR = maxR + 22;
          const pt = polar(cx, cy, labelR, angle, 100);
          const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
          return (
            <text
              key={p.pillarId}
              x={pt.x}
              y={pt.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-slate-300 text-[9px] font-medium"
            >
              <title>{p.pillarLabel}</title>
              {shortPillarLabel(p.pillarLabel)}
            </text>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-[22px] font-bold">
          {weightedOverallAlignment(active)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400 text-[9px]">
          weighted alignment
        </text>
      </svg>
    </div>
  );
}

/** Stacked compliance posture by pillar (aligned / partial / gap / not yet reviewed). */
export function PillarComplianceStackedChart({
  pillars,
}: {
  pillars: PillarMaturityRecord[];
}) {
  const rows = pillars.filter((p) => p.totalControls > 0);
  if (rows.length === 0) return null;

  const maxTotal = Math.max(...rows.map((p) => p.totalControls), 1);
  const chartH = 220;
  const barW = Math.min(48, Math.max(24, 320 / rows.length - 8));

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Compliance posture by pillar</p>
      <p className="mt-0.5 text-xs text-slate-500">Signed-off controls only · gray = not yet reviewed</p>
      <div className="mt-4 flex items-end justify-center gap-2 overflow-x-auto pb-2" style={{ minHeight: chartH + 48 }}>
        {rows.map((p) => {
          const unreviewed = Math.max(0, p.totalControls - p.reviewedControls);
          const scale = chartH / maxTotal;
          const segments = [
            { key: "aligned", count: p.alignedCount, color: COMPLIANCE.aligned },
            { key: "partial", count: p.partialCount, color: COMPLIANCE.partial },
            { key: "gap", count: p.gapCount, color: COMPLIANCE.gap },
            { key: "unreviewed", count: unreviewed, color: COMPLIANCE.unreviewed },
          ].filter((s) => s.count > 0);

          return (
            <div key={p.pillarId} className="flex shrink-0 flex-col items-center gap-2" style={{ width: barW + 8 }}>
              <div className="flex flex-col-reverse overflow-hidden rounded-lg border border-slate-100" style={{ width: barW, height: chartH }}>
                {segments.map((s) => (
                  <div
                    key={s.key}
                    style={{ height: s.count * scale, backgroundColor: s.color }}
                    title={`${s.key}: ${s.count}`}
                  />
                ))}
              </div>
              <span className="max-w-[72px] text-center text-[9px] font-medium leading-tight text-slate-600">
                {shortPillarLabel(p.pillarLabel)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-600">
        {(
          [
            ["Aligned", COMPLIANCE.aligned],
            ["Partial", COMPLIANCE.partial],
            ["Gap", COMPLIANCE.gap],
            ["Not reviewed", COMPLIANCE.unreviewed],
          ] as const
        ).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal benchmark — pillar alignment vs enterprise targets (Managed ≥76%, Defined ≥51%). */
export function PillarAlignmentBenchmarkChart({
  pillars,
}: {
  pillars: PillarMaturityRecord[];
}) {
  const rows = [...pillars]
    .filter((p) => p.reviewedControls > 0)
    .sort((a, b) => b.alignmentPct - a.alignmentPct);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
        No signed-off pillars to benchmark yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Pillar alignment benchmark</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Compared to maturity thresholds · {MATURITY_LABELS.managed} ≥76% · {MATURITY_LABELS.defined} ≥51%
      </p>
      <div className="relative mt-5 space-y-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0">
          <div className="absolute bottom-0 top-0 w-px bg-amber-200/80" style={{ left: "51%" }} />
          <div className="absolute bottom-0 top-0 w-px bg-emerald-200/80" style={{ left: "76%" }} />
        </div>
        {rows.map((p) => (
          <div key={p.pillarId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_3rem] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-800" title={p.pillarLabel}>
                {shortPillarLabel(p.pillarLabel)}
              </p>
              <p className="text-[10px] text-slate-500">{p.maturityLabel}</p>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                style={{ width: `${p.alignmentPct}%` }}
              />
            </div>
            <span className="text-right text-xs font-bold tabular-nums text-slate-900">{p.alignmentPct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Maturity level distribution — donut of pillars by achieved maturity band. */
export function MaturityLevelDistributionChart({
  pillars,
}: {
  pillars: PillarMaturityRecord[];
}) {
  const reviewed = pillars.filter((p) => p.reviewedControls > 0);
  if (reviewed.length === 0) return null;

  const counts = new Map<MaturityLevel, number>();
  for (const p of reviewed) {
    counts.set(p.maturityLevel, (counts.get(p.maturityLevel) ?? 0) + 1);
  }

  const segments = (Object.keys(MATURITY_COLORS) as MaturityLevel[])
    .map((level) => ({ level, count: counts.get(level) ?? 0 }))
    .filter((s) => s.count > 0);

  const total = reviewed.length;
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Maturity band distribution</p>
      <p className="mt-0.5 text-xs text-slate-500">Pillars by achieved maturity level (signed-off controls)</p>
      <div className="mt-4 flex items-center gap-6">
        <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
          {segments.map(({ level, count }) => {
            const dash = (count / total) * circumference;
            const el = (
              <circle
                key={level}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={MATURITY_COLORS[level]}
                strokeWidth={14}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += dash;
            return el;
          })}
          <text x={cx} y={cy + 4} textAnchor="middle" className="fill-slate-900 text-lg font-bold">
            {total}
          </text>
        </svg>
        <div className="grid flex-1 gap-1.5">
          {segments.map(({ level, count }) => (
            <div key={level} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MATURITY_COLORS[level] }} />
                {MATURITY_LABELS[level]}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PillarDetailCard({ pillar }: { pillar: PillarMaturityRecord }) {
  const unreviewed = Math.max(0, pillar.totalControls - pillar.reviewedControls);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="h-1" style={{ backgroundColor: MATURITY_COLORS[pillar.maturityLevel] }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-slate-900">{pillar.pillarLabel}</p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: `${MATURITY_COLORS[pillar.maturityLevel]}22`,
              color: MATURITY_COLORS[pillar.maturityLevel],
            }}
          >
            {pillar.maturityLabel}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{pillar.pillarDescription}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-lg font-bold tabular-nums text-slate-900">{pillar.alignmentPct}%</p>
            <p className="text-[9px] uppercase text-slate-500">Aligned</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-lg font-bold tabular-nums text-slate-900">{pillar.reviewProgressPct}%</p>
            <p className="text-[9px] uppercase text-slate-500">Reviewed</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-lg font-bold tabular-nums text-slate-900">{pillar.gapCount + pillar.partialCount}</p>
            <p className="text-[9px] uppercase text-slate-500">Gaps</p>
          </div>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
          {pillar.alignedCount > 0 && (
            <div style={{ width: `${(pillar.alignedCount / pillar.totalControls) * 100}%`, backgroundColor: COMPLIANCE.aligned }} />
          )}
          {pillar.partialCount > 0 && (
            <div style={{ width: `${(pillar.partialCount / pillar.totalControls) * 100}%`, backgroundColor: COMPLIANCE.partial }} />
          )}
          {pillar.gapCount > 0 && (
            <div style={{ width: `${(pillar.gapCount / pillar.totalControls) * 100}%`, backgroundColor: COMPLIANCE.gap }} />
          )}
          {unreviewed > 0 && (
            <div style={{ width: `${(unreviewed / pillar.totalControls) * 100}%`, backgroundColor: COMPLIANCE.unreviewed }} />
          )}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          {pillar.reviewedControls} of {pillar.totalControls} controls signed off · {pillar.criticality} criticality
        </p>
      </div>
    </div>
  );
}

export function MaturityGovernanceDashboard({ report }: { report: ControlReviewReportData }) {
  const pillars = report.pillarMaturity;
  const reviewedPillars = pillars.filter((p) => p.reviewedControls > 0);
  const overall = weightedOverallAlignment(pillars);
  const atManaged = pillarsAtOrAbove(pillars, 76);
  const atRisk = reviewedPillars.filter(
    (p) => p.gapCount + p.partialCount > p.alignedCount && p.reviewedControls > 0
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Weighted alignment", value: `${overall}%`, sub: "Criticality-weighted across pillars" },
          {
            label: "Pillars at Managed+",
            value: `${atManaged}/${reviewedPillars.length || pillars.length}`,
            sub: "≥76% aligned controls",
          },
          {
            label: "Review completion",
            value: `${report.reviewStats.reviewCompletePct}%`,
            sub: `${report.reviewStats.confirmed} controls signed off`,
          },
          {
            label: "Pillars needing attention",
            value: String(atRisk),
            sub: "Gaps exceed aligned controls",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{kpi.value}</p>
            <p className="mt-1 text-[11px] text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PillarMaturityRadarChart pillars={pillars} />
        <PillarComplianceStackedChart pillars={pillars} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PillarAlignmentBenchmarkChart pillars={pillars} />
        </div>
        <MaturityLevelDistributionChart pillars={pillars} />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">Pillar detail</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pillars.map((p) => (
            <PillarDetailCard key={p.pillarId} pillar={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
