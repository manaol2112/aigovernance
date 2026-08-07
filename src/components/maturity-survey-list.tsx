"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Layers,
  Lock,
  Map,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
import { SURVEY_MODE_META } from "@/lib/maturity-survey-mode";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import {
  FilmGrain,
  HeroAmbientOrbs,
  HoverLift,
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
  StickyScrollCTA,
} from "@/components/maturity-landing-motion";
import { MaturityReportPreviewShowcase } from "@/components/maturity-report-preview-showcase";

const CURIOSITY_HOOKS = [
  {
    question: "Can your board articulate your AI governance posture today?",
    detail: "Regulators and audit committees expect documented evidence — not informal assurance.",
  },
  {
    question: "Which governance pillar warrants investment first?",
    detail: "Pillar-level scoring surfaces priorities leaders often misjudge without a structured view.",
  },
  {
    question: "How aligned is your program with ISO 42001 and the EU AI Act?",
    detail: "A maturity baseline replaces self-assurance with framework-mapped insight you can defend.",
  },
];

function FrameworkMarquee() {
  const items = [...FRAMEWORK_COLUMNS, ...FRAMEWORK_COLUMNS];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max gap-5 animate-maturity-marquee">
        {items.map((fw, i) => (
          <div
            key={`${fw.code}-${i}`}
            className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm"
          >
            <span className={cn("h-2 w-2 rounded-full", fw.color)} />
            <span className="text-xs font-medium text-slate-300">{fw.short}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Public marketing landing — conversion-focused, no internal stats or survey list. */
export function MaturityAssessmentLanding() {
  return (
    <div className="bg-slate-950">
      <StickyScrollCTA />

      {/* ── HERO ── */}
      <ScrollSection glow="indigo" className="text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_-10%,rgba(99,102,241,0.45),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(16,185,129,0.1),transparent)]" />
        <FilmGrain />
        <HeroAmbientOrbs />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:px-8 lg:pb-32">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <MountReveal delay={0}>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI governance diagnostic · Board-ready output
                </p>
              </MountReveal>

              <MountReveal delay={60}>
                <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.25rem]">
                  Establish a{" "}
                  <ShimmerGradientText>defensible AI governance baseline</ShimmerGradientText>
                </h1>
              </MountReveal>

              <MountReveal delay={140}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
                  A structured maturity diagnostic across ten risk pillars — aligned to NIST AI RMF,
                  ISO 42001, and the EU AI Act — so leadership can prioritize investment with
                  evidence, not assumptions.
                </p>
              </MountReveal>

              <MountReveal delay={220}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    asChild
                    size="lg"
                    className="group h-12 gap-2 rounded-xl bg-white px-8 text-base font-semibold text-slate-900 shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:bg-slate-100"
                  >
                    <Link href="/maturity-assessment/new">
                      Start your maturity diagnostic
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />~10 minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Confidential
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Framework-aligned
                  </span>
                </p>
              </MountReveal>
            </div>

            <MaturityReportPreviewShowcase />
          </div>

          <MountReveal delay={400} className="mt-16 lg:mt-20">
            <FrameworkMarquee />
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="dark" />

      {/* ── CURIOSITY ── */}
      <ScrollSection glow="emerald" className="border-y border-white/5 bg-slate-900 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="premium" className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Three questions boards are already asking
            </h2>
            <p className="mt-3 text-slate-400">
              A structured baseline helps you answer each with evidence leadership can stand behind.
            </p>
          </ScrollReveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {CURIOSITY_HOOKS.map((hook, i) => (
              <ScrollReveal key={hook.question} variant="premium" delay={i * 100}>
                <div className="group h-full rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.06]">
                  <span className="text-3xl font-black text-white/10 transition-colors group-hover:text-indigo-500/20">
                    ?
                  </span>
                  <p className="mt-3 text-base font-semibold leading-snug text-white">
                    {hook.question}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{hook.detail}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      {/* ── WHAT YOU UNLOCK ── */}
      <ScrollSection glow="none" data-header-theme="light" className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <ScrollReveal variant="premium">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                What you&apos;ll walk away with
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Not a survey.
                <br />
                <span className="text-indigo-600">A decision-ready brief.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Finish in one sitting and receive a personalized package your leadership team can
                act on — maturity score, pillar heatmap, prioritized gaps, and a phased remediation
                roadmap.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: Gauge, text: "Weighted maturity score across 10 governance pillars" },
                  { icon: BarChart3, text: "Visual heatmap — see strengths and blind spots clearly" },
                  { icon: Map, text: "90-day, 6-month, and 12-month remediation roadmap" },
                  { icon: FileText, text: "Executive narrative ready for board or audit committee" },
                ].map((item) => (
                  <li key={item.text} className="flex gap-3 text-sm text-slate-700">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <item.icon className="h-4 w-4" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal variant="premium" delay={120}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["quick", "deep_dive"] as SurveyMode[]).map((mode) => {
                  const meta = SURVEY_MODE_META[mode];
                  const Icon = mode === "quick" ? Zap : Layers;
                  const featured = mode === "quick";
                  return (
                    <HoverLift key={mode}>
                      <Link
                        href="/maturity-assessment/new"
                        className={cn(
                          "group block h-full rounded-2xl border p-5 transition-all",
                          featured
                            ? "border-indigo-200 bg-white shadow-lg shadow-indigo-100/60 ring-1 ring-indigo-100"
                            : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                        )}
                      >
                        {featured && (
                          <span className="mb-3 inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Start here
                          </span>
                        )}
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            featured ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 font-bold text-slate-900">{meta.label}</p>
                        <p className="mt-1 text-xs font-medium text-indigo-600">
                          {meta.duration}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          {meta.description}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                          Choose this path <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </HoverLift>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </ScrollSection>

      {/* ── HOW IT WORKS (minimal) ── */}
      <ScrollSection glow="none" data-header-theme="light" id="how-it-works" className="border-t border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="premium" className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Three steps. Ten minutes.</h2>
          </ScrollReveal>
          <div className="mt-10 flex flex-col items-center gap-0 md:flex-row md:justify-center md:gap-0">
            {[
              { n: "1", label: "Answer", sub: "Plain-language questions per pillar" },
              { n: "2", label: "Score", sub: "Structured maturity profile" },
              { n: "3", label: "Act", sub: "Gaps + roadmap delivered" },
            ].map((step, i) => (
              <ScrollReveal key={step.n} variant="premium" delay={i * 80} className="flex items-center">
                <div className="flex flex-col items-center px-8 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
                    {step.n}
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{step.label}</p>
                  <p className="mt-1 max-w-[140px] text-xs text-slate-500">{step.sub}</p>
                </div>
                {i < 2 && (
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-300 md:block" />
                )}
              </ScrollReveal>
            ))}
          </div>
        </div>
      </ScrollSection>

      <SectionSeam from="light" to="dark" />

      {/* ── FINAL CTA ── */}
      <ScrollSection glow="indigo" className="bg-slate-950 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(99,102,241,0.35),transparent)]" />
        <FilmGrain />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <ScrollReveal variant="premium">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Build the baseline
              <span className="mt-1 block text-indigo-400">your stakeholders expect.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-400">
              Move from fragmented assurance to a documented maturity view — pillar scores, prioritized
              gaps, and a roadmap your leadership team can act on in a single working session.
            </p>
            <Button
              asChild
              size="lg"
              className="group mt-10 h-14 gap-2 rounded-xl bg-indigo-500 px-10 text-base font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:bg-indigo-400"
            >
              <Link href="/maturity-assessment/new">
                Start your maturity diagnostic
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="mt-5 text-xs text-slate-600">
              Results are private · Mapped to NIST AI RMF, ISO 42001, EU AI Act, OECD & COSO
            </p>
          </ScrollReveal>
        </div>
      </ScrollSection>
    </div>
  );
}

// ── Legacy exports (admin / compat) ──────────────────────────────────────────

export type MaturitySurveyListItem = {
  id: string;
  title: string;
  organizationName: string | null;
  status: import("@prisma/client").MaturitySurveyStatus;
  surveyMode: SurveyMode;
  frameworkCodes: string[];
  responseCount: number;
  totalQuestions: number;
  createdAt: Date | string;
  submittedAt: Date | string | null;
};

/** @deprecated Public landing no longer shows survey inventory */
export function MaturitySurveyListHero(_props: { total: number; completed: number }) {
  return <MaturityAssessmentLanding />;
}

/** @deprecated Use admin-only list if needed in future */
export function MaturitySurveyCard() {
  return null;
}

export function MaturitySurveyEmptyState() {
  return null;
}
