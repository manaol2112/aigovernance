"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, titleCase } from "@/lib/utils";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import type { PillarMatrixRow } from "@/lib/risk-control-matrix";

function CoverageCell({
  frameworkCode,
  data,
}: {
  frameworkCode: string;
  data: { count: number; requirements: Array<{ clauseId: string; title: string; coverage: string }> };
}) {
  if (data.count === 0) {
    return (
      <td className="border-b border-slate-100 px-3 py-4 text-center">
        <span className="inline-block h-2 w-2 rounded-full bg-slate-200" title="No coverage" />
      </td>
    );
  }

  const intensity =
    data.count >= 5 ? "bg-emerald-500" : data.count >= 3 ? "bg-emerald-400" : "bg-emerald-300";

  return (
    <td className="border-b border-slate-100 px-3 py-4 text-center">
      <div className="group/cell relative inline-flex flex-col items-center">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white transition-transform duration-150 group-hover/cell:scale-105",
            intensity
          )}
        >
          {data.count}
        </span>
        <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl group-hover/cell:block">
          <div className="text-xs font-semibold text-slate-500">{frameworkCode}</div>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {data.requirements.slice(0, 8).map((req) => (
              <li key={req.clauseId} className="text-xs text-slate-700">
                <code className="font-mono text-[10px] text-slate-500">{req.clauseId}</code>
                <div className="truncate">{req.title}</div>
              </li>
            ))}
            {data.requirements.length > 8 && (
              <li className="text-xs text-slate-400">+{data.requirements.length - 8} more</li>
            )}
          </ul>
        </div>
      </div>
    </td>
  );
}

function PillarRow({ row }: { row: PillarMatrixRow }) {
  const [expanded, setExpanded] = useState(false);

  const criticalityVariant =
    row.pillar.criticality === "critical"
      ? "danger"
      : row.pillar.criticality === "high"
        ? "warning"
        : "secondary";

  return (
    <>
      <tr className="group/row transition-colors hover:bg-slate-50/80">
        <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-4 group-hover/row:bg-slate-50/80">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-start gap-2 text-left"
          >
            {expanded ? (
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{row.pillar.label}</span>
                <Badge variant={criticalityVariant}>{titleCase(row.pillar.criticality)}</Badge>
                {row.crossFrameworkScore >= 4 && (
                  <Badge variant="success">{row.crossFrameworkScore}/5 frameworks</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{row.pillar.description}</p>
            </div>
          </button>
        </td>
        {FRAMEWORK_COLUMNS.map((fw) => (
          <CoverageCell
            key={fw.code}
            frameworkCode={fw.code}
            data={row.frameworkCoverage[fw.code] ?? { count: 0, requirements: [] }}
          />
        ))}
        <td className="border-b border-slate-100 px-4 py-4">
          <div className="flex flex-wrap gap-1">
            {row.controls.slice(0, 3).map((c) => (
              <Link
                key={c.code}
                href={`/controls/${c.code}`}
                className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-white hover:bg-slate-700"
              >
                {c.code.replace("CTRL-", "")}
              </Link>
            ))}
            {row.controls.length > 3 && (
              <span className="text-xs text-slate-400">+{row.controls.length - 3}</span>
            )}
            {row.controls.length === 0 && (
              <span className="text-xs text-slate-300">—</span>
            )}
          </div>
        </td>
        <td className="border-b border-slate-100 px-4 py-4 text-center">
          <span className="text-sm font-semibold text-slate-700">{row.totalRequirements}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={FRAMEWORK_COLUMNS.length + 3} className="border-b border-slate-100 px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Risk Statements ({row.risks.length})
                </h4>
                <ul className="mt-2 space-y-2">
                  {row.risks.map((risk) => (
                    <li key={risk.code} className="rounded-lg border border-slate-200 bg-white p-3">
                      <code className="text-[10px] font-mono text-slate-500">{risk.code}</code>
                      <p className="mt-1 text-xs text-slate-700">{risk.statement}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Canonical Controls ({row.controls.length})
                </h4>
                <ul className="mt-2 space-y-2">
                  {row.controls.map((ctrl) => (
                    <li key={ctrl.code}>
                      <Link
                        href={`/controls/${ctrl.code}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
                      >
                        <div>
                          <code className="text-[10px] font-mono text-slate-500">{ctrl.code}</code>
                          <div className="text-sm font-medium text-slate-900">{ctrl.title}</div>
                          <div className="text-xs text-slate-500">{ctrl.ownerRole}</div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Framework Requirements by Pillar
                </h4>
                <div className="mt-2 space-y-3">
                  {FRAMEWORK_COLUMNS.map((fw) => {
                    const cov = row.frameworkCoverage[fw.code];
                    if (!cov || cov.count === 0) return null;
                    return (
                      <div key={fw.code} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", fw.color)} />
                          <span className="text-xs font-semibold">{fw.short}</span>
                          <Badge variant="secondary">{cov.count}</Badge>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {cov.requirements.map((req) => (
                            <li key={req.clauseId} className="text-xs text-slate-600">
                              <code className="font-mono text-[10px]">{req.clauseId}</code>
                              {" · "}
                              {req.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RiskControlMatrixTable({ rows }: { rows: PillarMatrixRow[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-950 text-white">
              <th className="sticky left-0 z-20 bg-slate-950 px-4 py-4 text-left font-semibold">
                Risk Pillar
              </th>
              {FRAMEWORK_COLUMNS.map((fw) => (
                <th key={fw.code} className="px-3 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn("h-1.5 w-8 rounded-full", fw.color)} />
                    <span className="text-xs font-semibold">{fw.short}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-4 text-left font-semibold">Controls</th>
              <th className="px-4 py-4 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PillarRow key={row.pillar.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span>Coverage intensity:</span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-300" /> 1–2 reqs
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-400" /> 3–4 reqs
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-500" /> 5+ reqs
        </span>
        <span className="ml-auto">Hover cells for requirement details · Click rows to expand</span>
      </div>
    </div>
  );
}

export function MatrixHeatmapLegend() {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {FRAMEWORK_COLUMNS.map((fw) => (
        <div key={fw.code} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className={cn("h-3 w-3 rounded-full", fw.color)} />
          <span className="text-xs font-medium text-slate-700">{fw.short}</span>
        </div>
      ))}
    </div>
  );
}
