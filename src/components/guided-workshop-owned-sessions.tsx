"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { formatOfTotal } from "@/lib/format-unit-count";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import type { GuidedWorkshopListItem } from "@/components/guided-workshop-list";

export function GuidedWorkshopOwnedSessions({
  workshops,
}: {
  workshops: GuidedWorkshopListItem[];
}) {
  const inProgress = workshops.filter(
    (w) => w.status === "draft" || w.status === "in_progress"
  );
  const completed = workshops.filter((w) => w.status === "completed");

  if (inProgress.length === 0 && completed.length === 0) return null;

  return (
    <div className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-brand">
          Your sessions on this device
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Only workshops started or opened in this browser appear here — other clients&apos; sessions
          stay private.
        </p>

        {inProgress.length > 0 && (
          <section className="mt-8 mb-12">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Clock className="h-5 w-5 text-theme-brand" />
              In progress — resume anytime
            </h2>
            <div className="mt-4 space-y-3">
              {inProgress.map((w) => (
                <WorkshopRow key={w.id} workshop={w} />
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section className={inProgress.length > 0 ? "" : "mt-8"}>
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
                style={{ width: `${Math.min(100, pct)}%` }}
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
