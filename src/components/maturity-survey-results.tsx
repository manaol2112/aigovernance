"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Compass,
  Layers,
  Map as MapIcon,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MaturitySurveyReport, SurveyGapItem } from "@/lib/maturity-survey-analysis";
import {
  PillarComplianceStackedChart,
  PillarMaturityRadarChart,
} from "@/components/maturity-charts";
import {
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_LEVELS,
} from "@/lib/maturity-survey-constants";
import type { MaturityLevel } from "@prisma/client";
import type { PillarMaturityRecord, RoadmapStep } from "@/lib/control-review-reports";
import { MaturityAssessmentUpsellPanel } from "@/components/maturity-assessment-upsell-panel";
import {
  MaturityDeepDiveBaselineBanner,
  MaturityDeepDiveContinuePanel,
} from "@/components/maturity-deep-dive-continue-panel";
import { MaturityPillarDeepDiveResults } from "@/components/maturity-pillar-deep-dive-results";
import type { DeepDiveContinuationState } from "@/lib/maturity-survey-continue";
import { isPillarFocusedDeepDive } from "@/lib/maturity-survey-analysis";
import { formatGapSeverity } from "@/lib/maturity-client-copy";
import { MaturityFrameworkTags } from "@/components/maturity-framework-tags";
import { getFrameworkShortLabel } from "@/lib/framework-library";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import { MaturityReportExportButton } from "@/components/maturity-report-export-button";
import { MaturityReportSharePanel } from "@/components/maturity-report-share-panel";
import { MaturityPillarComparisonPanel } from "@/components/maturity-pillar-comparison-panel";
import type { PillarComparisonRecord } from "@/lib/maturity-pillar-comparison";
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

const SEVERITY_ORDER: Record<SurveyGapItem["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const SECTION_NAV = [
  { id: "profile", label: "Profile" },
  { id: "gaps", label: "Gaps" },
  { id: "roadmap", label: "Roadmap" },
  { id: "deep-dive", label: "Deep dive" },
] as const;

function ExecutiveHeroNarrative({ report }: { report: MaturitySurveyReport }) {
  if (isPillarFocusedDeepDive(report)) {
    return (
      <p className="mt-4 text-base leading-relaxed text-slate-300 print:text-slate-700">
        {report.executiveSummary.narrative}
      </p>
    );
  }

  const org = report.organizationName ?? "Your organization";
  const {
    criticalGapCount,
    criticalGapPillarLabels,
    leadingPillarLabels,
    improvementAreaCount,
    assessmentFrameworkLabels,
  } = report.executiveSummary;
  const frameworkLabels =
    assessmentFrameworkLabels.length > 0
      ? assessmentFrameworkLabels
      : report.frameworkCodes.map(getFrameworkShortLabel);
  const maturityLabel = report.overallMaturityLabel.toLowerCase();

  return (
    <div className="mt-4 space-y-3">
      <p className="text-base leading-relaxed text-slate-300 print:text-slate-700">
        {org} achieved{" "}
        <span className="font-semibold text-white print:text-slate-900">{maturityLabel}</span> AI
        governance maturity across {report.scope.pillarsAssessed} assessed pillar
        {report.scope.pillarsAssessed === 1 ? "" : "s"}, assessed against{" "}
        <span className="font-semibold text-indigo-200 print:text-indigo-900">
          {frameworkLabels.join(", ")}
        </span>
        .{" "}
        {criticalGapCount > 0 ? (
          <>
            <span className="font-bold text-rose-200 print:text-rose-800">
              {criticalGapCount} critical gap{criticalGapCount === 1 ? "" : "s"} within the assessed
              scope need executive attention.
            </span>
            {criticalGapPillarLabels.length > 0 && (
              <>
                {" "}
                Critical gap pillars:{" "}
                <span className="font-semibold text-rose-100 print:text-rose-900">
                  {criticalGapPillarLabels.join(", ")}
                </span>
                .
              </>
            )}{" "}
          </>
        ) : improvementAreaCount > 0 ? (
          <>
            {improvementAreaCount} improvement area{improvementAreaCount === 1 ? "" : "s"} were
            identified within assessed controls.{" "}
          </>
        ) : (
          <>No material gaps were identified within the assessed scope. </>
        )}
        {leadingPillarLabels.length > 0 && (
          <>
            Leading pillars:{" "}
            <span className="font-semibold text-emerald-200 print:text-emerald-900">
              {leadingPillarLabels.join(", ")}
            </span>
            .{" "}
          </>
        )}
        {report.scope.suggestsDeepDive &&
          "Continue with a detailed pillar assessment to evaluate the remaining in-scope controls."}
        {report.scope.parentQuickScanId &&
          !report.scope.suggestsDeepDive &&
          "Compare with your baseline scan to see how pillar coverage expanded."}
      </p>
      {report.frameworkCodes.length > 0 && (
        <MaturityFrameworkTags
          frameworkCodes={report.frameworkCodes}
          max={report.frameworkCodes.length}
          className="print:hidden"
        />
      )}
    </div>
  );
}

function MaturityLevelHero({
  maturity,
  maturityLabel,
}: {
  maturity: MaturityLevel;
  maturityLabel: string;
}) {
  const guidance = MATURITY_LEVEL_GUIDANCE[maturity];

  return (
    <div className="w-full max-w-[15rem] rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-center shadow-lg shadow-black/20 backdrop-blur-sm print:border-slate-200 print:bg-slate-50 print:shadow-none">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Overall maturity
      </p>

      <div className="mt-4 flex flex-col items-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md print:shadow-none"
          style={{ backgroundColor: guidance.color }}
        >
          {guidance.step}
        </span>
        <p className="mt-3 text-2xl font-bold tracking-tight text-white print:text-slate-900">
          {maturityLabel}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400 print:text-slate-600">
          {guidance.headline}
        </p>
      </div>

      <div className="mt-5">
        <div className="flex overflow-hidden rounded-full">
          {MATURITY_LEVELS.map((level) => {
            const levelGuidance = MATURITY_LEVEL_GUIDANCE[level];
            const isActive = level === maturity;
            return (
              <div
                key={level}
                className={cn(
                  "h-1.5 flex-1 transition-opacity",
                  isActive ? "opacity-100" : "opacity-35"
                )}
                style={{ backgroundColor: levelGuidance.color }}
                title={levelGuidance.label}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] font-medium text-slate-500">
          <span>Early</span>
          <span>Leading</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
      )}
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function PriorityGapCard({ gap, rank }: { gap: SurveyGapItem; rank: number }) {
  const severityStyles = {
    critical: "border-red-200 bg-red-50/80",
    high: "border-amber-200 bg-amber-50/80",
    medium: "border-slate-200 bg-slate-50/80",
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md",
        severityStyles[gap.severity]
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                gap.severity === "critical"
                  ? "danger"
                  : gap.severity === "high"
                    ? "warning"
                    : "secondary"
              }
            >
              {formatGapSeverity(gap.severity)}
            </Badge>
            <span className="text-xs font-medium text-slate-500">{gap.pillarLabel}</span>
            <MaturityFrameworkTags frameworkCodes={gap.frameworkCodes} />
          </div>
          <p className="mt-2 font-semibold text-slate-900">{gap.controlTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{gap.summary}</p>
        </div>
      </div>
    </article>
  );
}

function PillarScoreRow({
  pillar,
  priorityFocus,
}: {
  pillar: PillarMaturityRecord;
  priorityFocus?: boolean;
}) {
  const pct = pillar.alignmentPct;
  const barColor =
    pct >= 76 ? "bg-emerald-500" : pct >= 51 ? "bg-amber-500" : pct >= 26 ? "bg-orange-500" : "bg-red-500";
  const levelColor = MATURITY_LEVEL_GUIDANCE[pillar.maturityLevel].color;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        priorityFocus ? "border-indigo-200/80 bg-indigo-50/40" : "border-slate-100 bg-white"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{pillar.pillarLabel}</p>
          {pillar.reviewedControls < pillar.totalControls && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              {pillar.reviewedControls} of {pillar.totalControls} in-scope controls rated
            </p>
          )}
          {priorityFocus && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              Most room to strengthen
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900" style={{ color: levelColor }}>
            {pillar.maturityLabel}
          </p>
          <p className="text-[10px] tabular-nums text-slate-500">{pct}% alignment</p>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UnassessedPillarRow({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        <span className="shrink-0 text-xs font-semibold text-slate-400">Not assessed</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        No rating saved — not included in this report&apos;s baseline answers.
      </p>
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
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {step.priority}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {step.pillarLabel}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-900">{step.controlTitle}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{step.action}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50/80"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-slate-100 px-6 py-6">{children}</div>}
    </section>
  );
}

export function MaturitySurveyResults({
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
  if (isPillarFocusedDeepDive(report) && report.pillarDeepDive) {
    return (
      <MaturityPillarDeepDiveResults
        surveyId={surveyId}
        report={report}
        deepDiveContinuation={deepDiveContinuation}
        quickScanReport={quickScanReport}
        pillarComparisons={pillarComparisons}
      />
    );
  }

  const maturityColor = MATURITY_LEVEL_GUIDANCE[report.overallMaturity].color;

  const sortedPillars = useMemo(
    () =>
      [...report.pillarMaturity]
        .filter((p) => p.reviewedControls > 0)
        .sort((a, b) => a.alignmentPct - b.alignmentPct),
    [report.pillarMaturity]
  );

  const profilePillars = useMemo(() => {
    const byId = new Map(report.pillarMaturity.map((pillar) => [pillar.pillarId, pillar]));
    const expected =
      report.surveyMode === "quick" || !(report.scope.focusPillarIds?.length ?? 0)
        ? RISK_PILLARS.map((pillar) => ({ id: pillar.id, label: pillar.label }))
        : report.scope.focusPillarIds!.map((id, index) => ({
            id,
            label: report.scope.focusPillarLabels?.[index] ?? byId.get(id)?.pillarLabel ?? id,
          }));

    return expected
      .map((pillar) => ({
        ...pillar,
        record: byId.get(pillar.id) ?? null,
      }))
      .sort((a, b) => {
        if (!a.record && !b.record) return 0;
        if (!a.record) return 1;
        if (!b.record) return -1;
        return a.record.alignmentPct - b.record.alignmentPct;
      });
  }, [report]);

  const sortedGaps = useMemo(
    () =>
      [...report.gaps].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      ),
    [report.gaps]
  );

  const topGaps = useMemo(() => sortedGaps.slice(0, 3), [sortedGaps]);

  const priorityFocusPillarId = sortedPillars[0]?.pillarId;
  const hasStrengths = report.executiveSummary.strengths.length > 0;

  return (
    <div className="bg-slate-950 print:bg-white">
      {/* ── VERDICT ── */}
      <ScrollSection glow="indigo" className="text-white print:bg-white print:text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(99,102,241,0.4),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <MountReveal delay={0}>
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              <Link
                href="/maturity-assessment"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to maturity assessment
              </Link>
              <MaturityReportExportButton
                surveyId={surveyId}
                organizationName={report.organizationName}
              />
            </div>
          </MountReveal>

          {/* Print-only cover attribution */}
          <div className="hidden print:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              AI Governance Maturity Report
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{report.organizationName}</p>
            {report.respondentName && (
              <p className="mt-2 text-sm text-slate-600">
                Prepared by {report.respondentName}
                {report.respondentRole ? ` · ${report.respondentRole}` : ""}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500">
              {report.surveyModeLabel} · {formatDate(new Date(report.generatedAt))}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between print:mt-4">
            <div className="max-w-2xl">
              <MountReveal delay={60}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-indigo-400/30 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/20">
                    {report.surveyModeLabel}
                  </Badge>
                  {report.organizationName && (
                    <span className="text-xs text-slate-400">{report.organizationName}</span>
                  )}
                </div>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  {report.executiveSummary.headline.split(" ").length > 6 ? (
                    <>
                      Your maturity result:{" "}
                      <ShimmerGradientText>{report.overallMaturityLabel}</ShimmerGradientText>
                    </>
                  ) : (
                    report.executiveSummary.headline
                  )}
                </h1>
              </MountReveal>

              <MountReveal delay={180}>
                <ExecutiveHeroNarrative report={report} />
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
                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {report.scope.pillarsAssessed} pillars assessed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {report.gaps.length} gap{report.gaps.length === 1 ? "" : "s"} identified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapIcon className="h-3.5 w-3.5" />
                    {report.roadmap.length} recommended actions
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-600">
                  Generated {formatDate(new Date(report.generatedAt))}
                </p>
              </MountReveal>
            </div>

            <MountReveal delay={200} className="flex shrink-0 flex-col items-center gap-4">
              <MaturityLevelHero
                maturity={report.overallMaturity}
                maturityLabel={report.overallMaturityLabel}
              />
              {report.nextMaturityTargetLabel && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Next milestone</p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: maturityColor }}>
                    {report.nextMaturityTargetLabel}
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

          {/* In-page nav */}
          <MountReveal delay={300} className="mt-10 flex flex-wrap gap-2 print:hidden">
            {SECTION_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      <div className="bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {/* ── 1. PROFILE ── */}
          <ScrollSection data-header-theme="light" glow="none" id="profile">
            <ScrollReveal variant="premium">
              <SectionHeading
                eyebrow="Your profile"
                title="Where you stand by pillar"
                description="Each baseline domain you rated shows a maturity level and alignment score. 0% means Not Implemented was selected — not a skipped question."
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  {profilePillars.map((pillar) =>
                    pillar.record && pillar.record.reviewedControls > 0 ? (
                      <PillarScoreRow
                        key={pillar.id}
                        pillar={pillar.record}
                        priorityFocus={pillar.id === priorityFocusPillarId}
                      />
                    ) : (
                      <UnassessedPillarRow key={pillar.id} label={pillar.label} />
                    )
                  )}
                </div>
                <div className="space-y-4">
                  <PillarMaturityRadarChart pillars={report.pillarMaturity} />
                  {hasStrengths && (
                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Strengths
                      </p>
                      <ul className="mt-3 space-y-2">
                        {report.executiveSummary.strengths.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </ScrollSection>

          {/* ── 2. GAPS ── */}
          <ScrollSection data-header-theme="light" glow="none" id="gaps">
            <ScrollReveal variant="premium" delay={80}>
              <SectionHeading
                eyebrow="Priority findings"
                title="Gaps to address"
                description="Highest-severity gaps from your assessment — the areas that need attention first."
              />

              {topGaps.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="mt-3 font-semibold text-slate-900">No material gaps in assessed scope</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Review your pillar profile above and continue with a deep dive for full control coverage.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topGaps.map((gap, i) => (
                    <PriorityGapCard key={`${gap.controlCode}-${i}`} gap={gap} rank={i + 1} />
                  ))}
                  {report.gaps.length > 3 && (
                    <a
                      href="#details"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      View all {report.gaps.length} gaps
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {report.executiveSummary.boardActions[0] && (
                <div className="mt-8 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                    Leadership takeaway
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">
                    {report.executiveSummary.boardActions[0]}
                  </p>
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          {/* ── 3. ROADMAP ── */}
          <ScrollSection data-header-theme="light" glow="none" id="roadmap">
            <ScrollReveal variant="premium" delay={120}>
              <SectionHeading
                eyebrow="Your plan"
                title="Remediation roadmap"
                description="Prioritized actions grouped by timeframe — use this to plan resourcing and board updates."
              />
              {report.roadmap.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <RoadmapPhaseColumn phase="immediate" steps={report.roadmapByPhase.immediate} />
                  <RoadmapPhaseColumn phase="short_term" steps={report.roadmapByPhase.short_term} />
                  <RoadmapPhaseColumn phase="medium_term" steps={report.roadmapByPhase.medium_term} />
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
                  No phased remediation actions were generated for this assessment.
                </p>
              )}

              {report.executiveSummary.boardActions.length > 1 && (
                  <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                    <SectionHeading
                      title="Recommended leadership actions"
                      description="Executive next steps for your leadership team or board."
                    />
                    <ul className="space-y-3">
                      {report.executiveSummary.boardActions.map((action, i) => (
                        <li
                          key={i}
                          className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-700"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {i + 1}
                          </span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </ScrollReveal>
          </ScrollSection>

          {/* ── 4. DEEP DIVE ── */}
          <ScrollSection data-header-theme="light" glow="none" id="deep-dive" className="print:hidden">
            <ScrollReveal variant="premium" delay={160}>
              <SectionHeading
                eyebrow="Next level"
                title="Detailed pillar assessment"
                description="Extend your baseline with full control coverage, evidence review, and pillar-by-pillar comparison."
              />

              <div className="space-y-8">
                {report.surveyMode === "deep_dive" && (
                  <MaturityDeepDiveBaselineBanner report={report} />
                )}

                {deepDiveContinuation && (
                  <MaturityDeepDiveContinuePanel
                    surveyId={surveyId}
                    report={report}
                    continuation={deepDiveContinuation}
                  />
                )}

                {pillarComparisons.length >= 2 && (
                  <MaturityPillarComparisonPanel comparisons={pillarComparisons} />
                )}

                {!deepDiveContinuation && (
                  <MaturityAssessmentUpsellPanel report={report} />
                )}

                {!deepDiveContinuation && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-6 py-5 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {report.surveyMode === "quick"
                          ? "Ready for evidence-backed validation?"
                          : "Need a full client engagement?"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {report.surveyMode === "quick"
                          ? "Detailed assessment extends self-assessment; a full assessment adds workshop evidence and sign-off."
                          : "Workshops, evidence analysis, and board-ready deliverables in a full client assessment."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild className="gap-2 rounded-xl">
                        <Link href="/assessments/new">
                          Start full assessment
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      {report.surveyMode === "deep_dive" ? (
                        <Button asChild variant="outline" className="rounded-xl">
                          <Link href="/maturity-assessment/new">New baseline scan</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </ScrollSection>

          {/* ── APPENDIX: full detail (collapsed) ── */}
          <ScrollReveal variant="premium" delay={200}>
            <CollapsibleSection
              id="details"
              title="Full analysis & evidence"
              description="Charts, per-question results, and complete gap detail — for deeper review or audit prep."
              defaultOpen={false}
            >
              <div className="space-y-8">
                <div className="grid gap-5 lg:grid-cols-2">
                  <PillarComplianceStackedChart pillars={report.pillarMaturity} />
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Assessment scope</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {report.scope.methodologyNote}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {report.frameworkCodes.map((fw) => (
                        <span
                          key={fw}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700"
                        >
                          {getFrameworkShortLabel(fw)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-sm font-bold text-slate-900">
                    Per-pillar assessment detail
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Pillar</th>
                          <th className="px-4 py-3 font-semibold">Control</th>
                          <th className="px-4 py-3 font-semibold">Maturity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.assessmentMatrix.map((row) => {
                          const color = MATURITY_LEVEL_GUIDANCE[row.maturity].color;
                          return (
                            <tr key={`${row.pillarId}-${row.controlCode}`} className="bg-white">
                              <td className="px-4 py-3 align-top">
                                <p className="font-medium text-slate-900">{row.pillarLabel}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{row.criticalQuestion}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="font-mono text-[10px] text-indigo-600">{row.controlCode}</p>
                                <p className="mt-0.5 text-xs text-slate-700">{row.controlTitle}</p>
                                {row.notes && (
                                  <p className="mt-1 text-[11px] italic text-slate-500">
                                    &ldquo;{row.notes}&rdquo;
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span
                                  className="inline-block rounded-lg px-2 py-1 text-xs font-bold"
                                  style={{ backgroundColor: `${color}18`, color }}
                                >
                                  {row.maturityLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {report.gaps.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-sm font-bold text-slate-900">Complete gap register</h3>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {sortedGaps.map((gap, i) => (
                        <div
                          key={`${gap.pillarId}-${gap.controlCode}`}
                          className="flex flex-wrap items-start gap-4 px-5 py-4"
                        >
                          <Badge
                            variant={
                              gap.severity === "critical"
                                ? "danger"
                                : gap.severity === "high"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {formatGapSeverity(gap.severity)}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-indigo-600">{gap.pillarLabel}</p>
                            <MaturityFrameworkTags frameworkCodes={gap.frameworkCodes} className="mt-1" />
                            <p className="mt-1 font-medium text-slate-900">{gap.controlTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">{gap.summary}</p>
                          </div>
                          <Badge variant="outline">{gap.maturityLabel}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
