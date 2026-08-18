"use client";

import Link from "next/link";
import { ArrowRight, Clock, PlayCircle } from "lucide-react";
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
  if (surveys.length === 0) return null;

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
                Saved progress
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Pick up an in-progress diagnostic
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Answers are saved automatically. Resume anytime — or start a new baseline below.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/maturity-assessment/new">Start a new baseline</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => {
              const modeMeta = getSurveyModeMeta(survey.surveyMode);
              const totalQuestions = survey.totalQuestions ?? 0;
              const responseCount = survey.responseCount ?? 0;
              const progressPct =
                totalQuestions > 0
                  ? Math.round((responseCount / totalQuestions) * 100)
                  : 0;
              const href =
                survey.status === "completed"
                  ? `/maturity-assessment/${survey.id}/results`
                  : `/maturity-assessment/${survey.id}`;

              return (
                <Link
                  key={survey.id}
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
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {modeMeta.label}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {formatOfTotal(responseCount, totalQuestions, "answered")}
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(survey.updatedAt ?? survey.createdAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors group-hover:text-indigo-700"
                      )}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Continue
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </ScrollSection>
  );
}
