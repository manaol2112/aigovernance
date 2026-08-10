"use client";

import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PillarComparisonRecord } from "@/lib/maturity-pillar-comparison";
import { ScrollReveal, ScrollSection } from "@/components/maturity-landing-motion";

function ComparisonRow({ record }: { record: PillarComparisonRecord }) {
  const delta = record.detailedAlignmentPct - record.baselineAlignmentPct;
  const deltaLabel =
    delta === 0 ? "Unchanged" : delta > 0 ? `+${delta}%` : `${delta}%`;

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{record.pillarLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            Baseline {record.baselineMaturityLabel} → Detailed {record.detailedMaturityLabel}
          </p>
        </div>
        <Badge
          variant={delta > 0 ? "success" : delta < 0 ? "warning" : "secondary"}
          className="shrink-0"
        >
          {deltaLabel}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400">
            <span>Baseline scan</span>
            <span>{record.baselineAlignmentPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-400 transition-all"
              style={{ width: `${record.baselineAlignmentPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-emerald-700">
            <span>Detailed assessment</span>
            <span>{record.detailedAlignmentPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${record.detailedAlignmentPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {record.gapCount} gap{record.gapCount === 1 ? "" : "s"} · {record.partialCount} partial
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
          <Link href={`/maturity-assessment/${record.childSurveyId}/results`}>
            View pillar report
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function MaturityPillarComparisonPanel({
  comparisons,
}: {
  comparisons: PillarComparisonRecord[];
}) {
  if (comparisons.length < 2) return null;

  const weakest = comparisons[0];
  const strongest = comparisons[comparisons.length - 1];

  return (
    <ScrollSection data-header-theme="light" glow="none">
      <ScrollReveal variant="premium">
        <div className="overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                <BarChart3 className="h-3.5 w-3.5" />
                Pillar comparison
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                How your detailed assessments compare
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                You&apos;ve completed detailed assessments for {comparisons.length} pillars.
                {weakest && strongest && weakest.pillarId !== strongest.pillarId && (
                  <>
                    {" "}
                    <span className="font-medium text-slate-800">{weakest.pillarLabel}</span> needs
                    the most attention ({weakest.detailedAlignmentPct}%);{" "}
                    <span className="font-medium text-slate-800">{strongest.pillarLabel}</span> is
                    strongest ({strongest.detailedAlignmentPct}%).
                  </>
                )}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "mt-8 grid gap-4",
              comparisons.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
            )}
          >
            {comparisons.map((record) => (
              <ComparisonRow key={record.pillarId} record={record} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </ScrollSection>
  );
}
