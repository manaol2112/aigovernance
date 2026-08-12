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
    <ScrollSection className="border-b border-white/5 bg-slate-900/80 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="premium">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Continue where you left off
              </p>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                In-progress assessments
              </h2>
            </div>
            <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
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
                  className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all hover:border-indigo-400/40 hover:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {survey.organizationName ?? survey.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{survey.title}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {modeMeta.label}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {formatOfTotal(responseCount, totalQuestions, "answered")}
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(survey.updatedAt ?? survey.createdAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 transition-colors group-hover:text-indigo-200"
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
