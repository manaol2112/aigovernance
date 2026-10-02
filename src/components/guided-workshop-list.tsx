"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FilmGrain,
  HeroAmbientOrbs,
  MountReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
  StickyScrollCTA,
} from "@/components/maturity-landing-motion";
import { ClientOwnedSessionsPanel } from "@/components/client-owned-sessions-panel";

export type GuidedWorkshopListItem = {
  id: string;
  title: string;
  organizationName: string | null;
  facilitatorName: string | null;
  status: string;
  frameworkCodes: string[];
  responseCount: number;
  totalQuestions: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  submittedAt: Date | string | null;
};

export function GuidedWorkshopLanding() {
  return (
    <div className="brand-canvas-shell bg-slate-950">
      <StickyScrollCTA href="/guided-workshop/new" label="Start a guided workshop" />

      <ScrollSection glow="emerald" className="brand-ink-surface text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_-10%,rgba(134,188,37,0.35),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(16,185,129,0.1),transparent)]" />
        <FilmGrain />
        <HeroAmbientOrbs />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:px-8 lg:pb-32">
          <MountReveal delay={0}>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-shimmer-from)]">
              <Sparkles className="h-3.5 w-3.5" />
              Live client session · Board-ready output
            </p>
          </MountReveal>

          <MountReveal delay={60}>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.25rem]">
              Run a{" "}
              <ShimmerGradientText>guided AI governance workshop</ShimmerGradientText>
            </h1>
          </MountReveal>

          <MountReveal delay={140}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              Walk clients through structured, framework-mapped questions with transparent scoring —
              distinct from self-assessment, and ready for leadership follow-up.
            </p>
          </MountReveal>

          <MountReveal delay={220}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="group h-12 gap-2 rounded-xl bg-white px-8 text-base font-semibold text-slate-900 shadow-xl shadow-black/20 transition-all hover:scale-[1.02] hover:bg-slate-100"
              >
                <Link href="/guided-workshop/new">
                  Start a guided workshop
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
              >
                <a href="#in-progress">Resume saved progress</a>
              </Button>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Facilitated live
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Private to this device
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Framework-aligned
              </span>
            </p>
          </MountReveal>

          <MountReveal delay={320}>
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Live with the client",
                  desc: "Your team walks the client through each control — not a self-service survey.",
                },
                {
                  icon: Scale,
                  title: "Weighted scoring",
                  desc: "Every answer maps to a defined weight you can explain live and in the report.",
                },
                {
                  icon: Clock,
                  title: "Session-ready output",
                  desc: "Capture answers and notes for a board-ready workshop summary.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <item.icon className="h-5 w-5 text-[var(--theme-brand)]" />
                  <p className="mt-3 font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />
      <ClientOwnedSessionsPanel kind="workshop" />
    </div>
  );
}
