"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Plus,
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
    <div className="bg-slate-950">
      <ScrollSection glow="emerald" className="text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_70%_-10%,rgba(134,188,37,0.35),transparent)]" />
        <FilmGrain />
        <HeroAmbientOrbs />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:px-8">
          <MountReveal delay={0}>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-shimmer-from)]">
              <Sparkles className="h-3.5 w-3.5" />
              Live client session
            </p>
          </MountReveal>

          <MountReveal delay={60}>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Guided AI Governance{" "}
              <span className="bg-gradient-to-r from-[var(--theme-brand)] to-[var(--theme-shimmer-from)] bg-clip-text text-transparent">
                Workshop
              </span>
            </h1>
          </MountReveal>

          <MountReveal delay={120}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Conduct structured workshops with clients using framework-mapped control questions,
              transparent weighted scoring, and board-ready results — distinct from self-assessment.
            </p>
          </MountReveal>

          <MountReveal delay={180}>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="shadow-lg shadow-[color-mix(in_srgb,var(--theme-brand)_25%,transparent)]">
                <Link href="/guided-workshop/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New workshop
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Sessions started on this device appear below — other clients stay private.
            </p>
          </MountReveal>

          <MountReveal delay={240}>
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
                  icon: CheckCircle2,
                  title: "11-pillar coverage",
                  desc: "Deep questions from selected framework requirements across all governance pillars.",
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
