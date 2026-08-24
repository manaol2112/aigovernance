"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MaturitySurveyListItem } from "@/components/maturity-survey-list";
import { getSurveyModeMeta } from "@/lib/maturity-survey-mode";
import { formatOfTotal } from "@/lib/format-unit-count";
import { ScrollReveal, ScrollSection } from "@/components/maturity-landing-motion";

export function MaturitySurveyResumePanel({
  surveys,
}: {
  surveys: MaturitySurveyListItem[];
}) {
  const inProgress = surveys.filter(
    (survey) => survey.status === "draft" || survey.status === "in_progress"
  );
  const completed = surveys.filter((survey) => survey.status === "completed");

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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Your sessions on this device
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Resume or reopen your diagnostics
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Only assessments started or opened in this browser appear here. Other clients&apos;
                sessions stay private. Answers save automatically.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/maturity-assessment/new">Start a new baseline</Link>
            </Button>
          </div>

          {inProgress.length > 0 && (
            <section className="mt-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4 text-indigo-600" />
                In progress
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((survey) => (
                  <SurveyCard key={survey.id} survey={survey} />
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
                {completed.map((survey) => (
                  <SurveyCard key={survey.id} survey={survey} />
                ))}
              </div>
            </section>
          )}
        </ScrollReveal>
      </div>
    </ScrollSection>
  );
}

function SurveyCard({ survey }: { survey: MaturitySurveyListItem }) {
  const modeMeta = getSurveyModeMeta(survey.surveyMode);
  const totalQuestions = survey.totalQuestions ?? 0;
  const responseCount = survey.responseCount ?? 0;
  const isComplete = survey.status === "completed";
  const progressPct =
    totalQuestions > 0 ? Math.min(100, Math.round((responseCount / totalQuestions) * 100)) : 0;
  const href = isComplete
    ? `/maturity-assessment/${survey.id}/results`
    : `/maturity-assessment/${survey.id}`;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {survey.organizationName ?? survey.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{survey.title}</p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-[10px]",
            isComplete && "bg-emerald-50 text-emerald-800"
          )}
        >
          {isComplete ? "Complete" : modeMeta.label}
        </Badge>
      </div>

      {!isComplete && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{formatOfTotal(responseCount, totalQuestions, "answered")}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          {isComplete ? "Submitted" : "Updated"}{" "}
          {formatDate(survey.submittedAt ?? survey.updatedAt ?? survey.createdAt)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
            isComplete
              ? "text-emerald-700 group-hover:text-emerald-800"
              : "text-indigo-600 group-hover:text-indigo-700"
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
