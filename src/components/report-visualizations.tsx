"use client";

import type { ControlReviewReportData } from "@/lib/control-review-reports";
import type { MaturityLevel } from "@prisma/client";
import { MATURITY_LABELS } from "@/lib/control-review-reports";

const COMPLIANCE_COLORS = {
  aligned: "#059669",
  partial: "#d97706",
  gap: "#dc2626",
  not_assessed: "#94a3b8",
};

export function ComplianceDonutChart({ report }: { report: ControlReviewReportData }) {
  const counts = {
    aligned: report.executiveSummary.alignedControls,
    partial: report.executiveSummary.partialControls,
    gap: report.executiveSummary.gapControls,
    not_assessed: Math.max(
      0,
      report.reviewedControls.length -
        report.executiveSummary.alignedControls -
        report.executiveSummary.partialControls -
        report.executiveSummary.gapControls
    ),
  };
  const total = report.reviewedControls.length || 1;
  const segments = (Object.entries(counts) as Array<[keyof typeof counts, number]>).filter(
    ([, v]) => v > 0
  );

  let offset = 0;
  const r = 54;
  const cx = 72;
  const cy = 72;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
      <svg viewBox="0 0 144 144" className="h-36 w-36 shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        {segments.map(([key, value]) => {
          const dash = (value / total) * circumference;
          const el = (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={COMPLIANCE_COLORS[key]}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 text-[18px] font-bold">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
          controls
        </text>
      </svg>
      <div className="grid w-full gap-2 sm:max-w-xs">
        {segments.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COMPLIANCE_COLORS[key] }}
              />
              <span className="capitalize text-slate-600">{key.replace("_", " ")}</span>
            </div>
            <span className="font-semibold tabular-nums text-slate-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewProgressRing({
  confirmed,
  total,
}: {
  confirmed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const r = 46;
  const c = 2 * Math.PI * r;
  const filled = (pct / 100) * c;

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="url(#progressGrad)"
          strokeWidth="10"
          strokeDasharray={`${filled} ${c}`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold tabular-nums text-slate-900">{pct}%</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Reviewed</p>
      </div>
    </div>
  );
}

const MATURITY_HEAT: Record<MaturityLevel, string> = {
  not_implemented: "#e2e8f0",
  initial: "#fecaca",
  developing: "#fed7aa",
  defined: "#fde68a",
  managed: "#a7f3d0",
  optimized: "#c7d2fe",
};

export function PillarMaturityHeatmap({
  pillars,
}: {
  pillars: ControlReviewReportData["pillarMaturity"];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {pillars.map((p) => (
        <div
          key={p.pillarId}
          className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: MATURITY_HEAT[p.maturityLevel] }}
          />
          <p className="pr-2 text-sm font-semibold leading-snug text-slate-900">{p.pillarLabel}</p>
          <p className="mt-2 text-xs font-medium text-indigo-700">{p.maturityLabel}</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{p.alignmentPct}%</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">aligned</p>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              {p.reviewedControls}/{p.totalControls} signed off
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${p.reviewProgressPct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaturityLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(MATURITY_LABELS) as MaturityLevel[]).map((level) => (
        <span
          key={level}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MATURITY_HEAT[level] }} />
          {MATURITY_LABELS[level]}
        </span>
      ))}
    </div>
  );
}

export function RoadmapTimeline({
  steps,
}: {
  steps: ControlReviewReportData["roadmap"];
}) {
  const phases = ["immediate", "short_term", "medium_term"] as const;
  const groups = phases
    .map((phase) => ({
      phase,
      label: steps.find((s) => s.phase === phase)?.phaseLabel ?? phase,
      items: steps.filter((s) => s.phase === phase),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {groups.map((group, gi) => (
        <div key={group.phase}>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {gi + 1}
            </span>
            <h4 className="text-sm font-semibold text-slate-900">{group.label}</h4>
          </div>
          <div className="relative ml-4 space-y-3 border-l-2 border-indigo-100 pl-8">
            {group.items.map((step) => (
              <div
                key={step.priority}
                className="relative rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <span className="absolute -left-[41px] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-[10px] font-bold text-white shadow">
                  {step.priority}
                </span>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-700">{step.controlCode}</span>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">{step.controlTitle}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{step.pillarLabel}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.action}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
