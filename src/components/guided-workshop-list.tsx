"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  PlayCircle,
  Plus,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { formatOfTotal } from "@/lib/format-unit-count";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import {
  FilmGrain,
  HeroAmbientOrbs,
  MountReveal,
  ScrollSection,
  SectionSeam,
} from "@/components/maturity-landing-motion";

export type GuidedWorkshopListItem = {
  id: string;
  title: string;
  organizationName: string | null;
  facilitatorName: string | null;
  status: string;
  frameworkCodes: string[];
  responseCount: number;
  totalQuestions: number;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
};

export function GuidedWorkshopLanding({
  workshops = [],
}: {
  workshops?: GuidedWorkshopListItem[];
}) {
  const inProgress = workshops.filter(
    (w) => w.status === "draft" || w.status === "in_progress"
  );
  const completed = workshops.filter((w) => w.status === "completed");

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
              Facilitator-led · Client-presentable output
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
          </MountReveal>

          <MountReveal delay={240}>
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Facilitator-led",
                  desc: "Your team guides the client through each control — not a self-service survey.",
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

      {(inProgress.length > 0 || completed.length > 0) && (
        <>
          <SectionSeam from="dark" to="light" />
          <div className="bg-slate-50 pb-16">
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          {inProgress.length > 0 && (
            <section className="mb-12">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Clock className="h-5 w-5 text-theme-brand" />
                In progress — resume anytime
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Each answer saves automatically. Open a workshop to continue where you left off.
              </p>
              <div className="mt-4 space-y-3">
                {inProgress.map((w) => (
                  <WorkshopRow key={w.id} workshop={w} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Completed
              </h2>
              <div className="mt-4 space-y-3">
                {completed.map((w) => (
                  <WorkshopRow key={w.id} workshop={w} />
                ))}
              </div>
            </section>
          )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorkshopRow({ workshop }: { workshop: GuidedWorkshopListItem }) {
  const pct =
    workshop.totalQuestions > 0
      ? Math.round((workshop.responseCount / workshop.totalQuestions) * 100)
      : 0;
  const href =
    workshop.status === "completed"
      ? `/guided-workshop/${workshop.id}/results`
      : `/guided-workshop/${workshop.id}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[var(--theme-brand-ring)] hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 group-hover:text-theme-brand">{workshop.title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {workshop.organizationName}
          {workshop.facilitatorName ? ` · ${workshop.facilitatorName}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {workshop.frameworkCodes.map((code) => {
            const fw = FRAMEWORK_COLUMNS.find((f) => f.code === code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", fw?.color ?? "bg-slate-400")} />
                {fw?.short ?? code}
              </span>
            );
          })}
        </div>
        {workshop.status !== "completed" && workshop.totalQuestions > 0 && (
          <div className="mt-3 max-w-md">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{formatOfTotal(workshop.responseCount, workshop.totalQuestions, "answered")}</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-theme-brand transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        {workshop.status === "completed" ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            Complete
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-theme-brand-muted px-2.5 py-1 text-xs font-semibold text-[var(--theme-brand-hover)]">
              <PlayCircle className="h-3.5 w-3.5" />
              Continue
            </span>
            <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              {formatDate(workshop.updatedAt ?? workshop.createdAt)}
            </p>
          </>
        )}
        <ArrowRight className="ml-auto mt-2 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-theme-brand" />
      </div>
    </Link>
  );
}
