"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  Gauge,
  Layers3,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FRAMEWORK_COLUMNS, RISK_PILLARS } from "@/lib/risk-pillars";
import { getSurveyModeMeta } from "@/lib/maturity-survey-mode";
import {
  FilmGrain,
  HeroAmbientOrbs,
  HoverLift,
  MountReveal,
  ScrollProgressBar,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
} from "@/components/maturity-landing-motion";

export type DashboardProof = {
  frameworkCount: number;
  controlCount: number;
  requirementCount: number;
};

const SERVICES = [
  {
    id: "maturity",
    step: "01",
    href: "/maturity-assessment",
    cta: "Start self-assessment",
    icon: Gauge,
    title: "Maturity assessment",
    kicker: "Self-serve",
    tagline: "Know where you stand — in one sitting.",
    description:
      "A structured diagnostic across every governance pillar. Leadership gets a scored posture, named gaps, and a 90-day focus list — without waiting on a workshop.",
    duration: getSurveyModeMeta("quick").duration,
    mode: "Self-paced",
    featured: false,
    points: [
      "One question per pillar, mapped to five frameworks",
      "Board-ready score, gap register, and roadmap",
      "No workshop required — start immediately",
    ],
  },
  {
    id: "workshop",
    step: "02",
    href: "/guided-workshop",
    cta: "Open guided workshop",
    icon: Users,
    title: "Guided workshop",
    kicker: "Live session",
    tagline: "Run the session. Leave with a client report.",
    description:
      "Your team walks the client through weighted control statements live. Every answer is explainable, saved automatically, and converted into a presentable governance report.",
    duration: "Half-day session",
    mode: "Live session",
    featured: false,
    points: [
      "Live weighted scoring you can defend in the room",
      "Pillar-by-pillar walkthrough with the client in the loop",
      "Client-presentable results the same day",
    ],
  },
  {
    id: "assessment",
    step: "03",
    href: "/assessments",
    cta: "Open full assessment",
    icon: ClipboardCheck,
    title: "Full assessment",
    kicker: "Signature engagement",
    tagline: "Evidence, validation, and delivery — end to end.",
    description:
      "The complete engagement: scope AI use cases, capture evidence, validate controls, and produce the pack you take to the board. Built for delivery, not a scan.",
    duration: "Multi-week",
    mode: "End-to-end",
    featured: true,
    points: [
      "Use-case intake, evidence, and control sign-off",
      "Workflow from discovery through deliverables",
      "Traceable to NIST, ISO 42001, EU AI Act, OECD, COSO",
    ],
  },
] as const;

const JOURNEY = [
  {
    step: "01",
    title: "Diagnose",
    body: "Self-assessment establishes a defensible baseline — where the program is mature, and where it is not.",
  },
  {
    step: "02",
    title: "Align",
    body: "The guided workshop turns that baseline into a live conversation with weighted, client-owned answers.",
  },
  {
    step: "03",
    title: "Deliver",
    body: "The full assessment operationalizes the findings — evidence, validation, and a board-ready engagement pack.",
  },
] as const;

export function GovernanceDashboard({ proof }: { proof: DashboardProof }) {
  const pillarCount = RISK_PILLARS.length;

  return (
    <div
      data-maturity-scroll
      className="h-full min-h-0 overflow-y-auto scroll-smooth bg-slate-950"
    >
      <ScrollProgressBar />

      <ScrollSection glow="emerald" className="text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_-10%,rgba(134,188,37,0.38),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(134,188,37,0.12),transparent)]" />
        <FilmGrain />
        <HeroAmbientOrbs />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24">
          <MountReveal delay={0}>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--theme-shimmer-from)]">
              <Sparkles className="h-3.5 w-3.5" />
              AI Governance and Assurance
            </p>
          </MountReveal>

          <MountReveal delay={80}>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              Three ways to govern AI.{" "}
              <ShimmerGradientText>From diagnostic to assurance.</ShimmerGradientText>
            </h1>
          </MountReveal>

          <MountReveal delay={140}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              A self-paced diagnostic, a live workshop, or a full control
              assessment with evidence and delivery — same frameworks throughout.
            </p>
          </MountReveal>

          <MountReveal delay={200}>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Layers3 className="h-3.5 w-3.5 text-[var(--theme-brand)]" />
                {proof.frameworkCount || FRAMEWORK_COLUMNS.length} frameworks
              </span>
              <span>{pillarCount} governance pillars</span>
              {proof.controlCount > 0 && (
                <span>{proof.controlCount.toLocaleString()} canonical controls</span>
              )}
              {proof.requirementCount > 0 && (
                <span>{proof.requirementCount.toLocaleString()} requirements</span>
              )}
            </div>
          </MountReveal>

          <MountReveal delay={240}>
            <div className="mt-10 hidden items-center gap-3 sm:flex">
              {SERVICES.map((service, i) => (
                <div key={service.id} className="flex items-center gap-3">
                  <a
                    href={`#${service.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-slate-300 transition-colors hover:border-[var(--theme-brand-ring)]/50 hover:text-white"
                  >
                    {service.step} {service.title}
                  </a>
                  {i < SERVICES.length - 1 && (
                    <span className="h-px w-8 bg-gradient-to-r from-white/20 to-transparent" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </MountReveal>
        </div>
      </ScrollSection>

      <div className="relative z-10 -mt-4 bg-slate-950 px-5 pb-20 sm:-mt-6 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {SERVICES.map((service, index) => (
            <ScrollReveal key={service.id} delay={index * 80}>
              <HoverLift className="h-full">
                <ServiceCard service={service} />
              </HoverLift>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <SectionSeam from="dark" to="light" />

      <div className="bg-slate-50" data-header-theme="light">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <ScrollReveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-theme-brand">
              How they connect
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Diagnose. Align. Deliver.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Each service stands alone. Together they form a single path from first
              look to signed-off controls — the same pillars, the same frameworks, the
              same language with the client.
            </p>
          </ScrollReveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {JOURNEY.map((item, index) => (
              <ScrollReveal key={item.step} delay={index * 70}>
                <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <p className="font-mono text-xs font-semibold tracking-[0.2em] text-theme-brand">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white" data-header-theme="light">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <ScrollReveal>
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mapped once. Used everywhere.
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                  NIST · ISO 42001 · EU AI Act · OECD · COSO ERM
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Every service draws from the same source-verified corpus — so a
                  self-scan, a workshop, and a full engagement stay consistent.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {FRAMEWORK_COLUMNS.map((fw) => (
                  <span
                    key={fw.code}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <span className={cn("h-2 w-2 rounded-full", fw.color)} />
                    {fw.short}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  service,
}: {
  service: (typeof SERVICES)[number];
}) {
  const Icon = service.icon;

  return (
    <article
      id={service.id}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 shadow-xl sm:p-7",
        service.featured
          ? "border-[var(--theme-brand-ring)]/50 bg-gradient-to-br from-slate-900 via-slate-900 to-[color-mix(in_srgb,var(--theme-brand)_18%,#0f172a)] ring-1 ring-[var(--theme-brand)]/30"
          : "border-white/10 bg-white/[0.06] backdrop-blur-md"
      )}
    >
      {service.featured && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--theme-brand)]/25 blur-3xl"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            service.featured
              ? "bg-[var(--theme-brand)] text-slate-950 shadow-lg shadow-[color-mix(in_srgb,var(--theme-brand)_40%,transparent)]"
              : "bg-white/10 text-[var(--theme-shimmer-from)]"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-sm font-semibold tracking-[0.18em] text-slate-500">
          {service.step}
        </span>
      </div>

      <p
        className={cn(
          "relative mt-5 text-[10px] font-bold uppercase tracking-[0.2em]",
          service.featured ? "text-[var(--theme-shimmer-from)]" : "text-slate-400"
        )}
      >
        {service.kicker}
      </p>
      <h2 className="relative mt-1.5 text-2xl font-bold tracking-tight text-white">
        {service.title}
      </h2>
      <p className="relative mt-2 text-sm font-medium text-slate-200">{service.tagline}</p>
      <p className="relative mt-3 text-sm leading-relaxed text-slate-400">{service.description}</p>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
          <Clock className="h-3 w-3" />
          {service.duration}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
          <Shield className="h-3 w-3" />
          {service.mode}
        </span>
      </div>

      <ul className="relative mt-6 space-y-2.5">
        {service.points.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--theme-brand)]" />
            {point}
          </li>
        ))}
      </ul>

      <div className="relative mt-8 flex flex-1 items-end">
        <Button
          asChild
          className={cn(
            "w-full rounded-xl",
            service.featured
              ? "bg-[var(--theme-brand)] text-slate-950 hover:bg-[var(--theme-brand-hover)]"
              : "bg-white text-slate-900 hover:bg-slate-100"
          )}
        >
          <Link href={service.href}>
            {service.cta}
            <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
