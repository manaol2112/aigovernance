"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PackReport } from "@/lib/pillar-questionnaire-scoring";
import { cn } from "@/lib/utils";

export function PillarQuestionnaireResults({
  report,
  backHref,
  backLabel,
}: {
  report: PackReport;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-full bg-slate-950 text-white print:bg-white print:text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#86BC25]">
          Pillar questionnaire
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{report.organizationName}</h1>
        <p className="mt-2 text-slate-400">{report.title}</p>
        {report.packName && <p className="mt-1 text-sm text-slate-500">{report.packName}</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="Overall score" value={report.overallScorePct == null ? "—" : `${report.overallScorePct}%`} />
          <Stat label="Gaps" value={String(report.gaps.length)} />
          <Stat label="Follow-ups" value={String(report.followUps.length)} />
        </div>

        <div className="mt-12 space-y-3">
          {report.pillarScores.map((pillar) => (
            <div key={pillar.pillarId} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{pillar.pillarLabel}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {pillar.yesCount} yes · {pillar.partialCount} partial · {pillar.noCount} no ·{" "}
                    {pillar.dontKnowCount} don’t know
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums text-[#86BC25]">
                  {pillar.alignmentPct == null ? "—" : `${pillar.alignmentPct}%`}
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#86BC25]"
                  style={{ width: `${pillar.alignmentPct ?? 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <FindingList title="Strengths" items={report.strengths} empty="No Yes answers yet." />
        <FindingList title="Partials" items={report.partials} empty="No partial answers." />
        <FindingList title="Gaps" items={report.gaps} empty="No No answers." />
        <FindingList
          title="Follow-ups (Don’t know)"
          items={report.followUps}
          empty="No unanswered knowledge gaps."
        />

        <p className="mt-10 text-xs leading-relaxed text-slate-500">
          Don’t know answers are excluded from pillar percentages. This report is not a framework
          clause mapping.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function FindingList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ pillarLabel: string; prompt: string; summary: string }>;
  empty: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.pillarLabel}-${index}`}
              className={cn("rounded-xl border border-white/10 bg-white/5 px-4 py-3")}
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.pillarLabel}</p>
              <p className="mt-1 text-sm">{item.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
