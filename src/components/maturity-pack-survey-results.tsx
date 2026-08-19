"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Compass,
  HelpCircle,
  Layers,
  Map as MapIcon,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PackAnswerStackedChart,
  PackPillarRadarChart,
  PackPostureLegend,
  PackPostureMeter,
  PackScoreHero,
} from "@/components/pack-maturity-charts";
import {
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
  handleMaturitySectionNav,
} from "@/components/maturity-landing-motion";
import { MaturityPortalFooterMode } from "@/components/maturity-portal-shell";
import { MaturityReportExportButton } from "@/components/maturity-report-export-button";
import { MaturityReportSharePanel } from "@/components/maturity-report-share-panel";
import {
  buildPackRoadmap,
  derivePackExecutiveSummary,
  groupPackRoadmapByPhase,
  scoreBandLabel,
  type PackPillarScore,
  type PackReport,
  type PackRoadmapPhase,
  type PackRoadmapStep,
} from "@/lib/pillar-questionnaire-scoring";
import {
  getPackClientCopy,
  type PackClientCopy,
} from "@/lib/maturity-client-copy";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import { cn, formatDate } from "@/lib/utils";

const ROADMAP_PHASE_META: Record<
  PackRoadmapPhase,
  { label: string; subtitle: string; style: string; icon: typeof AlertTriangle }
> = {
  immediate: {
    label: "0–90 days",
    subtitle: "Priority improvements",
    style: "border-rose-200/80 bg-rose-50/50",
    icon: AlertTriangle,
  },
  short_term: {
    label: "3–6 months",
    subtitle: "Areas underway",
    style: "border-amber-200/80 bg-amber-50/50",
    icon: TrendingUp,
  },
  medium_term: {
    label: "6–12 months",
    subtitle: "Items to confirm",
    style: "border-slate-200/80 bg-slate-50/70",
    icon: Compass,
  },
};

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

function PackPillarScoreRow({
  pillar,
  priorityFocus,
  gapCount,
  partialCount,
}: {
  pillar: PackPillarScore;
  priorityFocus?: boolean;
  gapCount: number;
  partialCount: number;
}) {
  const [open, setOpen] = useState(false);
  const meta = RISK_PILLARS.find((item) => item.id === pillar.pillarId);
  const posture = scoreBandLabel(pillar.alignmentPct);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow",
        priorityFocus ? "border-amber-200/90 ring-1 ring-amber-100" : "border-slate-200/90"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50/80"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {priorityFocus && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Priority
              </span>
            )}
            <p className="truncate text-sm font-medium text-slate-900">{pillar.pillarLabel}</p>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-700">
            {pillar.alignmentPct == null ? "To confirm" : posture.shortLabel}
          </span>
        </div>
        <div className="mt-2">
          <PackPostureMeter tone={pillar.alignmentPct == null ? null : posture.tone} size="sm" />
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          {meta && (
            <p className="text-xs leading-relaxed text-slate-500">{meta.description}</p>
          )}
          <p className="text-xs text-slate-500">
            {pillar.yesCount} in place · {pillar.partialCount} underway · {pillar.noCount} not yet
            in place
            {pillar.dontKnowCount > 0 ? ` · ${pillar.dontKnowCount} to confirm` : ""}
          </p>
          {(gapCount > 0 || partialCount > 0) && (
            <p className="text-xs text-slate-600">
              {gapCount > 0 && `${gapCount} priority improvement${gapCount === 1 ? "" : "s"}`}
              {gapCount > 0 && partialCount > 0 && " · "}
              {partialCount > 0 && `${partialCount} area${partialCount === 1 ? "" : "s"} underway`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FindingCard({
  item,
  rank,
}: {
  item: { pillarLabel: string; prompt: string; summary: string };
  rank: number;
}) {
  return (
    <article className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-600">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
            {item.pillarLabel}
          </p>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-900">{item.summary}</p>
        </div>
      </div>
    </article>
  );
}

function PackRoadmapPhaseColumn({
  phase,
  steps,
}: {
  phase: PackRoadmapPhase;
  steps: PackRoadmapStep[];
}) {
  const meta = ROADMAP_PHASE_META[phase];
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
            key={`${phase}-${step.priority}-${step.summary}`}
            className="rounded-xl border border-white/60 bg-white/70 p-3.5"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {step.priority}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {step.pillarLabel}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900">{step.summary}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.action}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MaturityPackSurveyResults({
  sessionId,
  report,
  backHref,
  backLabel,
  product = "maturity",
}: {
  sessionId: string;
  report: PackReport;
  backHref: string;
  backLabel: string;
  product?: "maturity" | "workshop";
}) {
  const copy: PackClientCopy = getPackClientCopy(product);
  const exportUrl =
    product === "maturity"
      ? `/api/maturity-surveys/${sessionId}/export`
      : `/api/guided-workshops/${sessionId}/export`;
  const exportFilenamePrefix = product === "maturity" ? "maturity-report" : "workshop-report";
  const isWorkshop = product === "workshop";
  const summary = useMemo(() => derivePackExecutiveSummary(report), [report]);
  const roadmap = useMemo(() => buildPackRoadmap(report), [report]);
  const roadmapByPhase = useMemo(() => groupPackRoadmapByPhase(roadmap), [roadmap]);

  const sortedPillars = useMemo(
    () =>
      [...report.pillarScores]
        .filter((pillar) => pillar.questionCount > 0)
        .sort((left, right) => (left.alignmentPct ?? 0) - (right.alignmentPct ?? 0)),
    [report.pillarScores]
  );

  const gapsByPillar = useMemo(() => {
    const map = new Map<string, number>();
    for (const gap of report.gaps) {
      map.set(gap.pillarLabel, (map.get(gap.pillarLabel) ?? 0) + 1);
    }
    return map;
  }, [report.gaps]);

  const partialsByPillar = useMemo(() => {
    const map = new Map<string, number>();
    for (const partial of report.partials) {
      map.set(partial.pillarLabel, (map.get(partial.pillarLabel) ?? 0) + 1);
    }
    return map;
  }, [report.partials]);

  const priorityPillarId = useMemo(() => {
    const withGaps = sortedPillars.filter((pillar) => (gapsByPillar.get(pillar.pillarLabel) ?? 0) > 0);
    if (withGaps.length > 0) return withGaps[0]?.pillarId;

    const needsAttention = sortedPillars.filter((pillar) => {
      if (pillar.alignmentPct == null) return pillar.dontKnowCount > 0;
      return pillar.alignmentPct < 51;
    });
    return needsAttention[0]?.pillarId;
  }, [sortedPillars, gapsByPillar]);

  const hasStrengths = report.strengths.length > 0;
  const hasRoadmap = roadmap.length > 0;

  const sectionNav = useMemo(() => {
    const items: Array<{ id: string; label: string }> = [
      { id: "profile", label: "Profile" },
    ];
    if (hasStrengths) items.push({ id: "strengths", label: "Strengths" });
    items.push({ id: "gaps", label: "Priorities" });
    items.push({ id: "partials", label: "Underway" });
    items.push({ id: "follow-ups", label: "To confirm" });
    if (hasRoadmap) items.push({ id: "roadmap", label: "Next steps" });
    return items;
  }, [hasRoadmap, hasStrengths]);

  return (
    <div className="bg-slate-950 print:bg-white">
      <MaturityPortalFooterMode mode="hidden" />
      <ScrollSection glow={isWorkshop ? "emerald" : "indigo"} className="text-white print:bg-white print:text-slate-900">
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            isWorkshop
              ? "bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(134,188,37,0.35),transparent)]"
              : "bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(99,102,241,0.4),transparent)]"
          )}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <MountReveal delay={0}>
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              <Link
                href={backHref}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to {backLabel.toLowerCase()}
              </Link>
              <MaturityReportExportButton
                exportUrl={exportUrl}
                filenamePrefix={exportFilenamePrefix}
                organizationName={report.organizationName}
              />
            </div>
          </MountReveal>

          <div className="hidden print:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {copy.printTitle}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{report.organizationName}</p>
            {report.title && <p className="mt-1 text-sm text-slate-600">{report.title}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Generated {formatDate(new Date(report.generatedAt))}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between print:mt-4">
            <div className="max-w-2xl">
              <MountReveal delay={60}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      isWorkshop
                        ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20"
                        : "border-indigo-400/30 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/20"
                    )}
                  >
                    {copy.reportBadge}
                  </Badge>
                  {report.organizationName && (
                    <span className="text-xs text-slate-400">{report.organizationName}</span>
                  )}
                </div>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  {report.organizationName ? (
                    <>
                      {report.organizationName}
                      <span className="mt-2 block text-2xl font-semibold sm:text-3xl">
                        <ShimmerGradientText>{summary.scoreLabel}</ShimmerGradientText>
                        <span className="text-slate-300"> {copy.heroPostureSuffix}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      Your{" "}
                      <ShimmerGradientText>{summary.scoreLabel.toLowerCase()}</ShimmerGradientText>{" "}
                      {copy.heroPostureSuffix}
                    </>
                  )}
                </h1>
                {summary.headline && (
                  <p className="mt-3 text-base text-slate-400 print:text-slate-600">{summary.headline}</p>
                )}
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-4 text-base leading-relaxed text-slate-300 print:text-slate-700">
                  {summary.narrative}
                </p>
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {summary.pillarsAssessed} pillars assessed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {report.gaps.length} {copy.heroStatPriorities}
                  </span>
                  {hasRoadmap && (
                    <span className="flex items-center gap-1.5">
                      <MapIcon className="h-3.5 w-3.5" />
                      {roadmap.length} recommended actions
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {report.followUps.length} {copy.heroStatToConfirm}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-600">
                  Generated {formatDate(new Date(report.generatedAt))}
                </p>
              </MountReveal>
            </div>

            <MountReveal delay={200} className="flex shrink-0 flex-col items-center gap-4">
              <PackScoreHero
                scoreLabel={summary.scoreLabel}
                scoreTone={report.overallScorePct == null ? null : summary.scoreTone}
                scoreHeroNote={copy.scoreHeroNote}
              />
              <MaturityReportSharePanel
                sessionId={sessionId}
                resultsBasePath={product === "workshop" ? "/guided-workshop" : "/maturity-assessment"}
                organizationName={report.organizationName}
                surveyModeLabel={copy.reportBadge}
                shareSummary={copy.shareSummary}
                className="w-full max-w-xs"
              />
            </MountReveal>
          </div>

          <MountReveal delay={300} className="mt-10 flex flex-wrap gap-2 print:hidden">
            {sectionNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => handleMaturitySectionNav(event, item.id)}
                className={cn(
                  "rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white",
                  isWorkshop
                    ? "hover:border-emerald-400/40 hover:bg-emerald-500/10"
                    : "hover:border-indigo-400/40 hover:bg-indigo-500/10"
                )}
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
          <ScrollSection data-header-theme="light" glow="none" id="profile" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow="Your profile"
                title="Where you stand"
                description={copy.postureScaleNote}
              />
              <PackPostureLegend className="mb-8" />

              <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
                <div className="space-y-2">
                  {sortedPillars.map((pillar) => (
                    <PackPillarScoreRow
                      key={pillar.pillarId}
                      pillar={pillar}
                      priorityFocus={pillar.pillarId === priorityPillarId}
                      gapCount={gapsByPillar.get(pillar.pillarLabel) ?? 0}
                      partialCount={partialsByPillar.get(pillar.pillarLabel) ?? 0}
                    />
                  ))}
                </div>
                <div className="space-y-8">
                  <PackPillarRadarChart pillars={report.pillarScores} />
                  <PackAnswerStackedChart pillars={report.pillarScores} />
                  {hasStrengths && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
                        Strengths
                      </p>
                      <ul className="mt-4 space-y-3">
                        {report.strengths.slice(0, 3).map((strength, index) => (
                          <li key={`${strength.pillarLabel}-${index}`} className="text-sm leading-relaxed text-slate-600">
                            <span className="font-medium text-slate-800">{strength.pillarLabel}.</span>{" "}
                            {strength.summary}
                          </li>
                        ))}
                      </ul>
                      {report.strengths.length > 3 && (
                        <a
                          href="#strengths"
                          onClick={(event) => handleMaturitySectionNav(event, "strengths")}
                          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          View all {report.strengths.length} strengths
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </ScrollSection>

          {hasStrengths && (
            <ScrollSection data-header-theme="light" glow="none" id="strengths" className="print:break-inside-avoid">
              <ScrollReveal variant="premium" instant>
                <SectionHeading
                  eyebrow={copy.sectionStrengthsEyebrow}
                  title={copy.sectionStrengthsTitle}
                  description={copy.sectionStrengthsDescription}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.strengths.map((strength, index) => (
                    <FindingCard key={`${strength.pillarLabel}-${index}`} item={strength} rank={index + 1} />
                  ))}
                </div>
              </ScrollReveal>
            </ScrollSection>
          )}

          <ScrollSection data-header-theme="light" glow="none" id="gaps" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionPrioritiesEyebrow}
                title={copy.sectionPriorities}
                description={copy.sectionPrioritiesDescription}
              />
              {report.gaps.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-relaxed text-emerald-950">
                    No priority improvements were identified. Review areas underway and items to confirm for remaining nuance.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.gaps.map((gap, index) => (
                    <FindingCard key={`${gap.pillarLabel}-${index}`} item={gap} rank={index + 1} />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="partials" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionImprovementsEyebrow}
                title="Areas underway"
                description={copy.sectionImprovementsDescription}
              />
              {report.partials.length === 0 ? (
                <p className="text-sm text-slate-500">No areas underway were identified in this assessment.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.partials.map((partial, index) => (
                    <FindingCard key={`${partial.pillarLabel}-${index}`} item={partial} rank={index + 1} />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          <ScrollSection data-header-theme="light" glow="none" id="follow-ups" className="print:break-inside-avoid">
            <ScrollReveal variant="premium" instant>
              <SectionHeading
                eyebrow={copy.sectionToConfirmEyebrow}
                title="To confirm"
                description={copy.sectionToConfirmDescription}
              />
              {report.followUps.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing left to confirm in this assessment.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.followUps.map((followUp, index) => (
                    <FindingCard key={`${followUp.pillarLabel}-${index}`} item={followUp} rank={index + 1} />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </ScrollSection>

          {hasRoadmap && (
            <ScrollSection data-header-theme="light" glow="none" id="roadmap" className="print:break-inside-avoid">
              <ScrollReveal variant="premium" instant>
                <SectionHeading
                  eyebrow={copy.sectionRoadmapEyebrow}
                  title={copy.sectionRoadmapTitle}
                  description={copy.sectionRoadmapDescription}
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <PackRoadmapPhaseColumn phase="immediate" steps={roadmapByPhase.immediate} />
                  <PackRoadmapPhaseColumn phase="short_term" steps={roadmapByPhase.short_term} />
                  <PackRoadmapPhaseColumn phase="medium_term" steps={roadmapByPhase.medium_term} />
                </div>
              </ScrollReveal>
            </ScrollSection>
          )}

          <footer className="border-t border-slate-200 pt-8 print:mt-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {copy.aboutReportTitle}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              {copy.aboutReport}
            </p>
            <p className="mt-4 text-[11px] text-slate-400">
              {copy.printConfidential}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
