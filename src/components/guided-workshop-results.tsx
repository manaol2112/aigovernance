"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquareQuote,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { GuidedWorkshopReport } from "@/lib/guided-workshop-analysis";
import {
  PillarComplianceStackedChart,
  PillarMaturityRadarChart,
} from "@/components/maturity-charts";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import { MaturityFrameworkTags } from "@/components/maturity-framework-tags";
import { MountReveal, ScrollSection } from "@/components/maturity-landing-motion";

const BAND_STYLE = {
  critical: "bg-red-100 text-red-800 border-red-200",
  developing: "bg-amber-100 text-amber-800 border-amber-200",
  strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
} as const;

const BAND_LABEL = {
  critical: "Needs attention",
  developing: "Developing",
  strong: "Strong",
} as const;

export function GuidedWorkshopResults({
  workshopId,
  report,
}: {
  workshopId: string;
  report: GuidedWorkshopReport;
}) {
  const maturityReport = report.maturityReport;

  return (
    <div className="min-h-screen bg-slate-50">
      <ScrollSection glow="indigo" className="text-white print:bg-white print:text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,rgba(139,92,246,0.5),transparent)] print:hidden" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <MountReveal>
            <Link
              href="/guided-workshop"
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-200 hover:text-white print:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              All workshops
            </Link>
          </MountReveal>

          <MountReveal delay={60}>
            <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300 print:text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              Client workshop results
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {report.organizationName}
            </h1>
            <p className="mt-2 text-lg text-violet-100/90 print:text-slate-600">
              {report.executiveSummary.headline}
            </p>
          </MountReveal>

          <MountReveal delay={120}>
            <div className="mt-8 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-sm font-medium text-violet-200 print:text-slate-500">
                  Overall weighted score
                </p>
                <p className="text-5xl font-bold tabular-nums">{report.overallScorePct}%</p>
                <Badge
                  className={cn(
                    "mt-2 border",
                    BAND_STYLE[report.overallBand]
                  )}
                >
                  {BAND_LABEL[report.overallBand]} · {report.overallMaturityLabel}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-violet-100/80 print:text-slate-600">
                {report.facilitatorName && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {report.facilitatorName}
                    {report.facilitatorRole ? ` · ${report.facilitatorRole}` : ""}
                  </span>
                )}
                {report.clientContactName && (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquareQuote className="h-4 w-4" />
                    {report.clientContactName}
                    {report.clientContactRole ? ` · ${report.clientContactRole}` : ""}
                  </span>
                )}
                <span>{formatDate(report.generatedAt)}</span>
              </div>
            </div>
          </MountReveal>

          <MountReveal delay={180}>
            <div className="mt-6">
              <MaturityFrameworkTags frameworkCodes={report.frameworkCodes} tone="dark" />
            </div>
          </MountReveal>
        </div>
      </ScrollSection>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{report.weightMethodology.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {report.weightMethodology.summary}
              </p>
              <p className="mt-2 text-xs font-medium text-amber-800">
                {report.weightMethodology.formula}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.weightMethodology.answerOptions.map((opt) => (
              <div
                key={opt.level}
                className="rounded-xl border border-slate-200/80 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-violet-800">
                    {opt.weightPct}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{opt.clientExplanation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Executive summary</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {report.executiveSummary.narrative}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Strengths
              </h3>
              <ul className="mt-2 space-y-2">
                {report.executiveSummary.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Priority areas
              </h3>
              <ul className="mt-2 space-y-2">
                {report.executiveSummary.priorityAreas.map((s) => (
                  <li key={s} className="text-sm text-slate-700">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-800">
              Client talking points
            </h3>
            <ul className="mt-2 space-y-2">
              {report.executiveSummary.clientTalkingPoints.map((point) => (
                <li key={point} className="text-sm leading-relaxed text-violet-950/90">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pillar radar</h2>
            <div className="mt-4 h-80">
              <PillarMaturityRadarChart pillars={maturityReport.pillarMaturity} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Compliance mix by pillar</h2>
            <div className="mt-4 h-80">
              <PillarComplianceStackedChart pillars={maturityReport.pillarMaturity} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">Pillar scorecard</h2>
            <p className="mt-1 text-sm text-slate-500">
              Weighted averages across framework-mapped controls discussed in the workshop
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {report.pillarScorecard.map((pillar) => {
              const guidance = MATURITY_LEVEL_GUIDANCE[pillar.maturityLevel];
              return (
                <div key={pillar.pillarId} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <div
                    className="h-10 w-1 rounded-full"
                    style={{ backgroundColor: guidance.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{pillar.pillarLabel}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {pillar.criticalQuestion}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {pillar.reviewedControls} controls · {pillar.gapCount} gaps
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-slate-900">
                      {pillar.alignmentPct}%
                    </p>
                    <Badge className={cn("mt-1 border", BAND_STYLE[pillar.band])}>
                      {BAND_LABEL[pillar.band]}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex justify-center pb-12 print:hidden">
          <Button asChild variant="outline">
            <Link href={`/guided-workshop/${workshopId}`}>Back to workshop</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
