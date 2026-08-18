"use client";

import { ArrowRight, CheckCircle2, ChevronRight, MessageSquare, Pencil } from "lucide-react";
import type { MaturityLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import type { SurveyStep } from "@/lib/maturity-survey-types";
import { surveyStepResponseKeyFromStep } from "@/lib/maturity-survey-progress";
import { formatUnitCount } from "@/lib/format-unit-count";

type ReviewResponse = {
  controlId: string;
  pillarId: string;
  maturity?: MaturityLevel;
  notes?: string | null;
};

type Props = {
  steps: SurveyStep[];
  responsesByStepKey: Map<string, ReviewResponse>;
  organizationName?: string | null;
  submitting?: boolean;
  onEditStep: (index: number) => void;
  onSubmit: () => void;
};

const MATURITY_BADGE: Record<string, "danger" | "warning" | "secondary" | "success"> = {
  not_implemented: "danger",
  initial: "danger",
  developing: "warning",
  defined: "secondary",
  managed: "success",
  optimized: "success",
};

export function MaturitySurveyReviewPanel({
  steps,
  responsesByStepKey,
  organizationName,
  submitting = false,
  onEditStep,
  onSubmit,
}: Props) {
  const answeredCount = steps.filter((step) =>
    responsesByStepKey.has(surveyStepResponseKeyFromStep(step))
  ).length;
  const notesCount = steps.filter((step) => {
    const response = responsesByStepKey.get(surveyStepResponseKeyFromStep(step));
    return Boolean(response?.notes?.trim());
  }).length;

  return (
    <div className="pb-28">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 px-6 py-8 text-white shadow-xl shadow-indigo-900/20 sm:px-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Final review
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Review your baseline answers
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100/90">
            You&apos;ve answered every pillar for{" "}
            <span className="font-medium text-white">
              {organizationName?.trim() || "your organization"}
            </span>
            . Confirm each rating below — tap any pillar to edit before we generate your maturity
            report.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-200">
                Pillars assessed
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {answeredCount}
                <span className="text-sm font-normal text-indigo-200"> / {steps.length}</span>
              </p>
            </div>
            {notesCount > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-200">
                  With context notes
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{notesCount}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const response = responsesByStepKey.get(surveyStepResponseKeyFromStep(step));
          const maturity = response?.maturity;
          const guidance = maturity ? MATURITY_LEVEL_GUIDANCE[maturity] : null;
          const criticalQ = getPillarCriticalQuestion(step.pillarId);
          const hasNotes = Boolean(response?.notes?.trim());

          return (
            <button
              key={`${step.pillarId}-${step.control.id}`}
              type="button"
              onClick={() => onEditStep(index)}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all",
                "border-slate-200/90 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              )}
            >
              <div
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{ backgroundColor: `${guidance?.color ?? "#94a3b8"}22` }}
                aria-hidden
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: guidance?.color ?? "#94a3b8" }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{step.pillarLabel}</p>
                  {maturity && (
                    <Badge variant={MATURITY_BADGE[maturity] ?? "secondary"} className="text-[10px]">
                      {guidance?.label ?? maturity}
                    </Badge>
                  )}
                  {hasNotes && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <MessageSquare className="h-3 w-3" />
                      Notes
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {criticalQ?.prompt ?? step.control.title}
                </p>
                {guidance && (
                  <p className="mt-2 text-xs text-slate-600">{guidance.headline}</p>
                )}
              </div>

              <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5" />
                Edit
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm leading-relaxed text-emerald-900">
          {formatUnitCount(steps.length, "pillar", "pillars")} captured across your selected
          frameworks. Submit when you&apos;re satisfied — you can always run a deeper assessment
          later from your results.
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="hidden text-xs text-slate-500 sm:block">
            Tap any pillar above to change your answer
          </p>
          <Button
            type="button"
            disabled={submitting || answeredCount < steps.length}
            onClick={onSubmit}
            className="ml-auto gap-1.5 shadow-lg shadow-indigo-500/20"
            size="lg"
          >
            {submitting ? (
              <>Finalizing your report…</>
            ) : (
              <>
                Submit & view results
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
