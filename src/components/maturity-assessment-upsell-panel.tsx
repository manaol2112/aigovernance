"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  Map,
  Mic,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import {
  buildMaturityUpsellContent,
  type UpsellDeliverable,
} from "@/lib/maturity-assessment-upsell";

const DELIVERABLE_ICONS: Record<string, typeof FileText> = {
  gap_assessment_report: ShieldCheck,
  remediation_roadmap: Map,
  risk_control_matrix: Sparkles,
  board_ready_summary: FileText,
};

const JOURNEY_ICONS = [Users, Mic, FileText, CheckCircle2, Package];

function CoverageGauge({ assessed, total, pct }: { assessed: number; total: number; pct: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
          <circle
            cx={50}
            cy={50}
            r={r}
            fill="none"
            stroke="#818cf8"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{pct}%</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400">validated</span>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">
          {assessed}
          <span className="text-lg font-normal text-slate-400"> / {total}</span>
        </p>
        <p className="mt-0.5 text-sm text-slate-400">controls assessed in this snapshot</p>
        <p className="mt-2 text-xs text-indigo-300">
          {total - assessed} remaining in the full library
        </p>
      </div>
    </div>
  );
}

function DeliverablePreviewCard({ item, locked }: { item: UpsellDeliverable; locked?: boolean }) {
  const Icon = DELIVERABLE_ICONS[item.id] ?? FileText;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 transition-all",
        locked
          ? "border-white/10 bg-white/5"
          : "border-indigo-400/30 bg-white/10 hover:border-indigo-400/50 hover:bg-white/[0.12]"
      )}
    >
      {locked && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            <Lock className="h-3 w-3" />
            Unlocked in full assessment
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
          <Icon className="h-4 w-4 text-indigo-300" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <Badge className="border-indigo-400/30 bg-indigo-500/20 text-[9px] text-indigo-200 hover:bg-indigo-500/20">
              {item.highlight}
            </Badge>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

export function MaturityAssessmentUpsellPanel({ report }: { report: MaturitySurveyReport }) {
  const content = buildMaturityUpsellContent(report);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-950 text-white shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.45),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(16,185,129,0.12),transparent)]" />

      <div className="relative px-6 py-10 sm:px-10 lg:py-14">
        {/* Header */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              {content.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {content.headline}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              {content.subheadline}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-3xl font-bold text-indigo-300">{content.hookStat.value}</p>
            <p className="mt-1 max-w-[180px] text-sm text-slate-400">{content.hookStat.label}</p>
          </div>
        </div>

        {/* Coverage gauge */}
        {report.scope.coveragePct < 100 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <CoverageGauge
              assessed={report.scope.controlsAssessed}
              total={report.scope.libraryControlCount}
              pct={report.scope.coveragePct}
            />
          </div>
        )}

        {/* Comparison */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {content.comparison.snapshot.title}
            </p>
            <ul className="mt-4 space-y-3">
              {content.comparison.snapshot.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-400">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-transparent p-5 ring-1 ring-indigo-400/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              {content.comparison.fullAssessment.title}
            </p>
            <ul className="mt-4 space-y-3">
              {content.comparison.fullAssessment.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Journey rail */}
        <div className="mt-10">
          <p className="text-sm font-semibold text-white">The engagement journey</p>
          <p className="mt-1 text-xs text-slate-400">
            From first workshop to board-ready package — in one workflow
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {content.journey.map((step, i) => {
              const Icon = JOURNEY_ICONS[i] ?? FileText;
              return (
                <div
                  key={step.id}
                  className="relative rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  {i < content.journey.length - 1 && (
                    <div
                      className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-indigo-400/40 lg:block"
                      aria-hidden
                    />
                  )}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                    <Icon className="h-4 w-4 text-indigo-300" />
                  </div>
                  <p className="mt-3 text-xs font-bold text-white">{step.label}</p>
                  <p className="text-[10px] text-indigo-300">{step.subtitle}</p>
                  <p className="mt-2 text-[11px] leading-snug text-slate-400">{step.unlocks}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deliverables */}
        <div className="mt-10">
          <p className="text-sm font-semibold text-white">What leadership receives</p>
          <p className="mt-1 text-xs text-slate-400">
            Formal deliverables generated from validated findings — not survey output
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {content.deliverables.map((d, i) => (
              <DeliverablePreviewCard key={d.id} item={d} locked={i > 0} />
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-500">
            First deliverable preview shown — all four unlock with a full engagement
          </p>
        </div>

        {/* Proof + CTA */}
        <div className="mt-10 flex flex-col gap-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <ul className="grid gap-2 sm:grid-cols-2">
            {content.proofPoints.map((point) => (
              <li key={point} className="flex gap-2 text-xs text-slate-300">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                {point}
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            >
              <Link href="/assessments/new">
                {content.cta.primary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/assessments">{content.cta.secondary}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
