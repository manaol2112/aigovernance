"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { formatOfTotal } from "@/lib/format-unit-count";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import type { GuidedWorkshopListItem } from "@/components/guided-workshop-list";
import { ScrollReveal, ScrollSection } from "@/components/maturity-landing-motion";

export function GuidedWorkshopOwnedSessions({
  workshops,
}: {
  workshops: GuidedWorkshopListItem[];
}) {
  const inProgress = workshops.filter(
    (workshop) => workshop.status === "draft" || workshop.status === "in_progress"
  );
  const completed = workshops.filter((workshop) => workshop.status === "completed");

  if (inProgress.length === 0 && completed.length === 0) return null;

  return (
    <ScrollSection
      id="in-progress"
      data-header-theme="light"
      glow="none"
      className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="premium">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-brand">
                Your sessions on this device
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Resume or reopen your workshops
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Only workshops started or opened in this browser appear here. Other clients&apos;
                sessions stay private.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/guided-workshop/new">Start a new workshop</Link>
            </Button>
          </div>

          {inProgress.length > 0 && (
            <section className="mt-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4 text-theme-brand" />
                In progress
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((workshop) => (
                  <WorkshopCard key={workshop.id} workshop={workshop} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="mt-10">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Completed
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((workshop) => (
                  <WorkshopCard key={workshop.id} workshop={workshop} />
                ))}
              </div>
            </section>
          )}
        </ScrollReveal>
      </div>
    </ScrollSection>
  );
}

function WorkshopCard({ workshop }: { workshop: GuidedWorkshopListItem }) {
  const totalQuestions = workshop.totalQuestions ?? 0;
  const responseCount = workshop.responseCount ?? 0;
  const isComplete = workshop.status === "completed";
  const progressPct =
    totalQuestions > 0 ? Math.min(100, Math.round((responseCount / totalQuestions) * 100)) : 0;
  const href = isComplete
    ? `/guided-workshop/${workshop.id}/results`
    : `/guided-workshop/${workshop.id}`;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {workshop.organizationName ?? workshop.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {workshop.title}
            {workshop.facilitatorName ? ` · ${workshop.facilitatorName}` : ""}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn("shrink-0 text-[10px]", isComplete && "bg-emerald-50 text-emerald-800")}
        >
          {isComplete ? "Complete" : "Workshop"}
        </Badge>
      </div>

      {workshop.frameworkCodes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {workshop.frameworkCodes.map((code) => {
            const fw = FRAMEWORK_COLUMNS.find((column) => column.code === code);
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
      )}

      {!isComplete && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{formatOfTotal(responseCount, totalQuestions, "answered")}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--theme-brand)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          {isComplete ? "Submitted" : "Updated"}{" "}
          {formatDate(workshop.submittedAt ?? workshop.updatedAt ?? workshop.createdAt)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
            isComplete
              ? "text-emerald-700 group-hover:text-emerald-800"
              : "text-theme-brand group-hover:opacity-90"
          )}
        >
          {isComplete ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              View results
            </>
          ) : (
            <>
              <PlayCircle className="h-3.5 w-3.5" />
              Continue
            </>
          )}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
