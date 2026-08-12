"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import type { DeepDiveContinuationState } from "@/lib/maturity-survey-continue";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import type { RoadmapStep } from "@/lib/control-review-reports";
import { MaturityDeepDiveContinuePanel } from "@/components/maturity-deep-dive-continue-panel";
import { MaturityAssessmentUpsellPanel } from "@/components/maturity-assessment-upsell-panel";
import { MaturityFrameworkTags } from "@/components/maturity-framework-tags";
import { MaturityReportExportButton } from "@/components/maturity-report-export-button";
import { MaturityReportSharePanel } from "@/components/maturity-report-share-panel";
import { MaturityPillarComparisonPanel } from "@/components/maturity-pillar-comparison-panel";
import type { PillarComparisonRecord } from "@/lib/maturity-pillar-comparison";
import { MaturityFindingEngagementHelp } from "@/components/maturity-finding-engagement-help";
import {
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
} from "@/components/maturity-landing-motion";

const PHASE_META: Record<
  RoadmapStep["phase"],
  { label: string; subtitle: string; style: string; icon: typeof AlertTriangle }
> = {
  immediate: {
    label: "Immediate",
    subtitle: "0–90 days",
    style: "border-red-200/80 bg-gradient-to-br from-red-50 to-white",
    icon: AlertTriangle,
  },
  short_term: {
    label: "Near term",
    subtitle: "3–6 months",
    style: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    icon: TrendingUp,
  },
  medium_term: {
    label: "Strategic",
    subtitle: "6–12 months",
    style: "border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-white",
    icon: Compass,
  },
};

const DOC_STATUS_STYLE = {
  establish: { badge: "danger" as const, ring: "border-red-200/80 bg-red-50/50" },
  review: { badge: "warning" as const, ring: "border-amber-200/80 bg-amber-50/50" },
  maintain: { badge: "success" as const, ring: "border-emerald-200/80 bg-emerald-50/40" },
};

const RESPONSE_STATUS_STYLE = {
  documented: { badge: "success" as const, ring: "border-emerald-200/80 bg-emerald-50/40" },
  draft: { badge: "warning" as const, ring: "border-amber-200/80 bg-amber-50/50" },
  not_established: { badge: "danger" as const, ring: "border-red-200/80 bg-red-50/50" },
  not_applicable: { badge: "secondary" as const, ring: "border-slate-200 bg-slate-50/80" },
};

const COMPLIANCE_STYLE = {
  gap: { label: "Gap", badge: "danger" as const, bar: "bg-red-500" },
  partial: { label: "Partial", badge: "warning" as const, bar: "bg-amber-500" },
  aligned: { label: "Aligned", badge: "success" as const, bar: "bg-emerald-500" },
};

function PillarScoreRing({
  scorePct,
  maturityLabel,
  color,
}: {
  scorePct: number;
  maturityLabel: string;
  color: string;
}) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, scorePct)) / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={10} />
        <circle
          cx={64}
          cy={64}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums text-white">{scorePct}%</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Pillar score
        </span>
        <span className="mt-1 text-xs font-medium" style={{ color }}>
          {maturityLabel}
        </span>
      </div>
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function RoadmapPhaseColumn({
  phase,
  steps,
}: {
  phase: RoadmapStep["phase"];
  steps: RoadmapStep[];
}) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  if (steps.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", meta.style)}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
          <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li
            key={`roadmap-${phase}-${step.controlCode}`}
            className="rounded-xl border border-white/60 bg-white/70 p-3.5 backdrop-blur-sm"
          >
            <p className="font-mono text-[10px] text-indigo-600">{step.controlCode}</p>
            <p className="mt-1 text-xs font-semibold text-slate-900">{step.controlTitle}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{step.action}</p>
            <p className="mt-2 text-[10px] text-slate-400">Owner: {step.ownerHint}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MaturityPillarDeepDiveResults({
  surveyId,
  report,
  deepDiveContinuation,
  quickScanReport,
  pillarComparisons = [],
}: {
  surveyId: string;
  report: MaturitySurveyReport;
  deepDiveContinuation?: DeepDiveContinuationState | null;
  quickScanReport?: MaturitySurveyReport | null;
  pillarComparisons?: PillarComparisonRecord[];
}) {
  const pillar = report.pillarDeepDive;
  if (!pillar) return null;

  const maturityColor = MATURITY_LEVEL_GUIDANCE[pillar.maturityLevel].color;
  const parentQuickScanId = report.scope.parentQuickScanId;
  const findingsWithHelp = pillar.controlFindings.filter((c) => c.engagementGuide);

  return (
    <div className="bg-slate-950 print:bg-white">
      <ScrollSection glow="emerald" className="text-white print:bg-white print:text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_0%_0%,rgba(16,185,129,0.28),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_100%_100%,rgba(99,102,241,0.22),transparent)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <MountReveal delay={0}>
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              {parentQuickScanId ? (
                <Link
                  href={`/maturity-assessment/${parentQuickScanId}/results`}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  Back to baseline results
                </Link>
              ) : (
                <Link
                  href="/maturity-assessment"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  Back to maturity assessment
                </Link>
              )}
              <MaturityReportExportButton
                surveyId={surveyId}
                organizationName={report.organizationName}
              />
            </div>
          </MountReveal>

          <div className="hidden print:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Detailed Pillar Assessment · {report.organizationName}
            </p>
            {report.respondentName && (
              <p className="mt-2 text-sm text-slate-600">
                Prepared by {report.respondentName}
                {report.respondentRole ? ` · ${report.respondentRole}` : ""}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between print:mt-4">
            <div className="max-w-2xl">
              <MountReveal delay={60}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-emerald-400/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20">
                    Detailed pillar assessment
                  </Badge>
                  <Badge variant="outline" className="border-white/15 text-slate-300">
                    {pillar.criticality} priority
                  </Badge>
                </div>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  <ShimmerGradientText>{pillar.pillarLabel}</ShimmerGradientText>
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {pillar.pillarDescription}
                </p>
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-5 text-base leading-relaxed text-slate-300 print:text-slate-700">
                  {pillar.pathForward.narrative}
                </p>
                {report.respondentName && (
                  <p className="mt-4 text-sm text-slate-400 print:hidden">
                    Prepared by{" "}
                    <span className="font-medium text-slate-300">
                      {report.respondentName}
                      {report.respondentRole ? ` · ${report.respondentRole}` : ""}
                    </span>
                  </p>
                )}
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatTile
                    label="Controls assessed"
                    value={`${pillar.controlsAssessed}/${pillar.totalControlsInPillar}`}
                    detail={`${pillar.pillarCoveragePct}% pillar coverage`}
                  />
                  <StatTile
                    label="Gaps"
                    value={`${pillar.gapCount}`}
                    detail="initial or not implemented"
                  />
                  <StatTile
                    label="Method"
                    value="Rule-based"
                    detail="direct control scoring"
                  />
                </div>
                <p className="mt-3 text-[11px] text-slate-600">
                  Generated {formatDate(new Date(report.generatedAt))}
                </p>
              </MountReveal>
            </div>

            <MountReveal delay={200} className="flex shrink-0 flex-col items-center gap-4">
              <PillarScoreRing
                scorePct={pillar.alignmentPct}
                maturityLabel={pillar.maturityLabel}
                color={maturityColor}
              />
              {pillar.nextMaturityTargetLabel && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Next milestone for this pillar
                  </p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: maturityColor }}>
                    {pillar.nextMaturityTargetLabel}
                  </p>
                </div>
              )}
              <MaturityReportSharePanel
                surveyId={surveyId}
                organizationName={report.organizationName}
                surveyModeLabel={report.surveyModeLabel}
                className="w-full max-w-xs"
              />
            </MountReveal>
          </div>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      <div className="bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {pillar.quickScanBaseline && (
            <ScrollReveal variant="premium">
              <section className="overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                  Baseline → detailed assessment
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  How the flagship control held up
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Your baseline scan rated one representative control. This detailed assessment
                  validated maturity across every in-scope control in {pillar.pillarLabel}.
                </p>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Flagship control
                    </p>
                    <p className="mt-1 font-mono text-xs text-indigo-600">
                      {pillar.quickScanBaseline.controlCode}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pillar.quickScanBaseline.controlTitle}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Baseline scan
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {pillar.quickScanBaseline.maturityLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      After detailed assessment
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {pillar.quickScanBaseline.deepDiveMaturityLabel}
                    </p>
                    {pillar.quickScanBaseline.unchanged ? (
                      <p className="mt-1 text-xs text-slate-500">Unchanged — other controls drove the pillar score.</p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700">Updated after full pillar assessment.</p>
                    )}
                  </div>
                </div>
              </section>
            </ScrollReveal>
          )}

          <ScrollSection data-header-theme="light" glow="none" id="documentation">
            <ScrollReveal variant="premium">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  Documentation to establish
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  Expected artifacts for {pillar.pillarLabel}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                  Standard documentation organizations typically need in this pillar. Status reflects
                  what you reported in the documentation checklist.
                </p>
                {pillar.evidenceSummary && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
                      <span className="font-semibold text-slate-900">
                        {pillar.evidenceSummary.documented}
                      </span>
                      <span className="text-slate-500"> documented</span>
                    </div>
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-amber-900">
                        {pillar.evidenceSummary.missingDocumentation}
                      </span>
                      <span className="text-amber-800"> need documentation</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {pillar.documentationExpectations.map((doc) => {
                  const style = doc.responseStatus
                    ? RESPONSE_STATUS_STYLE[doc.responseStatus]
                    : DOC_STATUS_STYLE[doc.status];
                  return (
                    <article
                      key={doc.id}
                      className={cn(
                        "rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md",
                        style.ring
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                            <p className="font-semibold text-slate-900">{doc.title}</p>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {doc.description}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Typical owner: {doc.typicalOwner}
                          </p>
                          {doc.responseStatus &&
                            (doc.responseStatus === "not_established" ||
                              doc.responseStatus === "draft") && (
                              <p className="mt-2 text-xs text-amber-700">
                                Recommended: {doc.statusLabel}
                              </p>
                            )}
                        </div>
                        <Badge variant={style.badge} className="shrink-0 self-start">
                          {doc.responseLabel ?? doc.statusLabel}
                        </Badge>
                      </div>
                    </article>
                  );
                })}
              </div>

              {report.executiveSummary.boardActions[0] && (
                <div className="mt-6 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                    Recommended next step
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">
                    {report.executiveSummary.boardActions[0]}
                  </p>
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="controls">
            <ScrollReveal variant="premium" delay={80}>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  Control-level findings
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  Every control in {pillar.pillarLabel}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Sorted by priority. Each gap or partial finding includes a detailed guide on how we
                  can help you close it — from workshops to board-ready deliverables.
                </p>
              </div>

              {findingsWithHelp.length > 0 && (
                <div className="mb-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Engagement support
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {findingsWithHelp.length} finding{findingsWithHelp.length === 1 ? "" : "s"} below
                    include a tailored &ldquo;How we can help&rdquo; guide — workshop facilitation,
                    evidence validation, target-state design, and remediation deliverables mapped to{" "}
                    {pillar.pillarLabel}.
                  </p>
                  <Button asChild size="sm" className="mt-3 gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500">
                    <Link href="/assessments/new">
                      Discuss an engagement for this pillar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}

              <div className="mb-4 flex flex-wrap gap-3">
                {[
                  { key: "gap" as const, count: pillar.gapCount },
                  { key: "partial" as const, count: pillar.partialCount },
                  { key: "aligned" as const, count: pillar.alignedCount },
                ].map(({ key, count }) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  >
                    <span className={cn("h-2 w-2 rounded-full", COMPLIANCE_STYLE[key].bar)} />
                    <span className="font-semibold text-slate-900">{count}</span>
                    <span className="text-slate-500">{COMPLIANCE_STYLE[key].label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {pillar.controlFindings.map((control) => {
                  const style = COMPLIANCE_STYLE[control.compliance];
                  const color = MATURITY_LEVEL_GUIDANCE[control.maturity].color;
                  return (
                    <article
                      key={control.controlCode}
                      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] text-indigo-600">
                              {control.controlCode}
                            </span>
                            <Badge variant={style.badge}>{style.label}</Badge>
                            {control.compliance !== "aligned" && (
                              <MaturityFrameworkTags frameworkCodes={control.frameworkCodes} />
                            )}
                          </div>
                          <p className="mt-2 font-semibold text-slate-900">{control.controlTitle}</p>
                          {control.recommendation && control.compliance !== "aligned" && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                              {control.recommendation}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-400">Suggested owner: {control.ownerRole}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className="inline-block rounded-lg px-3 py-1.5 text-xs font-bold"
                            style={{ backgroundColor: `${color}18`, color }}
                          >
                            {control.maturityLabel}
                          </span>
                        </div>
                      </div>
                      {control.engagementGuide && (
                        <MaturityFindingEngagementHelp guide={control.engagementGuide} />
                      )}
                      <div className="h-1 bg-slate-100">
                        <div
                          className={cn("h-full transition-all", style.bar)}
                          style={{
                            width: `${(MATURITY_LEVEL_GUIDANCE[control.maturity].step / 6) * 100}%`,
                          }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollReveal>
          </ScrollSection>

          {report.roadmap.length > 0 && (
            <ScrollSection data-header-theme="light" glow="none" id="roadmap">
              <ScrollReveal variant="premium" delay={120}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    Path forward
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    Pillar remediation roadmap
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Sequenced actions for {pillar.pillarLabel} only — tied to specific controls you
                    rated below defined or managed maturity.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <RoadmapPhaseColumn phase="immediate" steps={report.roadmapByPhase.immediate} />
                  <RoadmapPhaseColumn phase="short_term" steps={report.roadmapByPhase.short_term} />
                  <RoadmapPhaseColumn phase="medium_term" steps={report.roadmapByPhase.medium_term} />
                </div>
              </ScrollReveal>
            </ScrollSection>
          )}

          <ScrollReveal variant="premium" delay={160}>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Evidence-based methodology</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {report.scope.methodologyNote}
                </p>
              </div>
            </div>
          </ScrollReveal>

          {pillarComparisons.length >= 2 && (
            <MaturityPillarComparisonPanel comparisons={pillarComparisons} />
          )}

          {deepDiveContinuation && quickScanReport && parentQuickScanId && (
            <ScrollReveal variant="premium" delay={200} className="print:hidden">
              <MaturityDeepDiveContinuePanel
                surveyId={parentQuickScanId}
                report={quickScanReport}
                continuation={deepDiveContinuation}
              />
            </ScrollReveal>
          )}

          <ScrollReveal variant="premium" delay={240} className="print:hidden">
            <MaturityAssessmentUpsellPanel report={report} />
          </ScrollReveal>

          <ScrollReveal variant="premium" delay={280} className="print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-6 py-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">Continue the maturity journey</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Assess another pillar from your baseline, or move to a full evidence-backed
                  assessment.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {parentQuickScanId && (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/maturity-assessment/${parentQuickScanId}/results`}>
                      Choose next pillar
                    </Link>
                  </Button>
                )}
                <Button asChild className="gap-2 rounded-xl">
                  <Link href="/assessments/new">
                    Full assessment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
