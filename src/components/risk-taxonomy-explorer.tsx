"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  GitCompareArrows,
  Layers3,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  RiskTaxonomyPillarGroup,
  RiskTaxonomySummary,
} from "@/lib/risk-taxonomy";
import { cn, titleCase } from "@/lib/utils";

const CRITICALITY_STYLES = {
  critical: {
    badge: "border-red-200 bg-red-50 text-red-800",
    accent: "bg-red-500",
    ring: "ring-red-100",
  },
  high: {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "bg-amber-500",
    ring: "ring-amber-100",
  },
  medium: {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    accent: "bg-slate-400",
    ring: "ring-slate-100",
  },
} as const;

const COVERAGE_STYLES: Record<string, string> = {
  full: "border-emerald-200 bg-emerald-50 text-emerald-800",
  partial: "border-amber-200 bg-amber-50 text-amber-800",
  minimal: "border-slate-200 bg-slate-50 text-slate-600",
};

type Props = {
  groups: RiskTaxonomyPillarGroup[];
  summary: RiskTaxonomySummary;
};

export function RiskTaxonomyExplorer({ groups, summary }: Props) {
  const [activePillarId, setActivePillarId] = useState(groups[0]?.pillarId ?? "");
  const [query, setQuery] = useState("");

  const activeGroup = groups.find((group) => group.pillarId === activePillarId) ?? groups[0];

  const filteredRisks = useMemo(() => {
    if (!activeGroup) return [];
    const q = query.trim().toLowerCase();
    if (!q) return activeGroup.risks;

    return activeGroup.risks.filter((risk) => {
      const haystack = [
        risk.code,
        risk.statement,
        risk.category,
        risk.relatedHarm ?? "",
        ...risk.controls.map((control) => `${control.code} ${control.title}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [activeGroup, query]);

  if (groups.length === 0) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-12 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-base font-semibold text-slate-900">No risk statements in taxonomy</p>
          <p className="mt-2 text-sm text-slate-500">Seed the canonical risk library to populate this view.</p>
        </div>
      </section>
    );
  }

  const coveragePct =
    summary.totalRisks > 0
      ? Math.round((summary.mitigatedRisks / summary.totalRisks) * 100)
      : 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#f6f7f9] shadow-sm">
      <div className="border-b border-slate-200/80 bg-white px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Risk taxonomy
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Canonical AI risk statements
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Browse risks by pillar, see potential harms, and jump directly to the control workplans
              that mitigate each statement.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="bg-white">
              <Link href="/matrix">
                <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
                Open risk matrix
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat
            icon={ShieldAlert}
            label="Risk statements"
            value={summary.totalRisks}
            hint={`Across ${summary.pillarCount} pillars`}
          />
          <SummaryStat
            icon={ShieldCheck}
            label="Mitigation coverage"
            value={`${coveragePct}%`}
            hint={`${summary.mitigatedRisks} risks with linked controls`}
          />
          <SummaryStat
            icon={Shield}
            label="Control mappings"
            value={summary.totalControlLinks}
            hint="Risk-to-control links in library"
          />
          <SummaryStat
            icon={Layers3}
            label="Active pillar"
            value={activeGroup?.risks.length ?? 0}
            hint={activeGroup ? `${activeGroup.uniqueControlCount} controls in scope` : "Select a pillar"}
          />
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-slate-200/80 bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Risk pillars
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Grouped the same way as workshop facilitation and the cross-framework matrix.
            </p>
          </div>
          <nav className="max-h-[28rem] space-y-1 overflow-y-auto p-3 lg:max-h-none [scrollbar-width:thin]">
            {groups.map((group, index) => {
              const active = group.pillarId === activeGroup?.pillarId;
              const styles = CRITICALITY_STYLES[group.criticality];

              return (
                <button
                  key={group.pillarId}
                  type="button"
                  onClick={() => {
                    setActivePillarId(group.pillarId);
                    setQuery("");
                  }}
                  className={cn(
                    "relative flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all",
                    active
                      ? "border-indigo-200 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-100"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm"
                  )}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white",
                      active ? "bg-indigo-600" : styles.accent
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 pl-1">
                    <span className="block text-xs font-semibold leading-snug text-slate-900">
                      {group.pillarLabel}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {group.risks.length} risk{group.risks.length === 1 ? "" : "s"} ·{" "}
                      {group.uniqueControlCount} control{group.uniqueControlCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          {activeGroup && (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{activeGroup.pillarLabel}</h3>
                        <Badge variant="outline" className={CRITICALITY_STYLES[activeGroup.criticality].badge}>
                          {titleCase(activeGroup.criticality)} pillar
                        </Badge>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                        {activeGroup.pillarDescription}
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {activeGroup.uniqueControlCount} mitigating controls
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-100 px-5 py-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search risks, harms, or control codes in this pillar…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  {filteredRisks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                      <p className="text-sm font-medium text-slate-700">No risks match your search</p>
                      <p className="mt-1 text-xs text-slate-500">Try a different keyword or clear the filter.</p>
                    </div>
                  ) : (
                    filteredRisks.map((risk, index) => (
                      <article
                        key={risk.id}
                        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                      >
                        <div className="border-b border-slate-100 px-5 py-4">
                          <div className="flex flex-wrap items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                                  {risk.code}
                                </code>
                                <Badge variant="outline" className="text-[10px]">
                                  {titleCase(risk.category.replace(/_/g, " "))}
                                </Badge>
                                {risk.controls.length === 0 ? (
                                  <Badge variant="warning" className="text-[10px]">
                                    No linked controls
                                  </Badge>
                                ) : (
                                  <Badge variant="success" className="text-[10px]">
                                    {risk.controls.length} control{risk.controls.length === 1 ? "" : "s"}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900">
                                {risk.statement}
                              </p>
                            </div>
                          </div>
                        </div>

                        {risk.relatedHarm && (
                          <div className="border-b border-slate-100 bg-amber-50/40 px-5 py-3">
                            <div className="flex items-start gap-2 text-xs text-amber-950">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                              <div>
                                <p className="font-semibold uppercase tracking-wide text-amber-800/80">
                                  Potential harm
                                </p>
                                <p className="mt-1 leading-relaxed">{risk.relatedHarm}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="px-5 py-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Mitigating controls
                          </p>
                          {risk.controls.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              {risk.controls.map((control) => (
                                <Link
                                  key={`${risk.id}-${control.code}`}
                                  href={`/controls/${control.code}`}
                                  className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 transition-all hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <code className="text-[11px] font-mono text-indigo-700">
                                        {control.code}
                                      </code>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[9px]",
                                          COVERAGE_STYLES[control.coverage] ?? COVERAGE_STYLES.partial
                                        )}
                                      >
                                        {titleCase(control.coverage)} coverage
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-700">{control.title}</p>
                                  </div>
                                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">
                              This risk statement is not yet mapped to a canonical control workplan.
                            </p>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Shield;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}
