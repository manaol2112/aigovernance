"use client";

import { ArrowRight, Check, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPackPillarGroups } from "@/components/maturity-pack-question-chrome";
import { MaturityPackPillarSectionHeader } from "@/components/maturity-pack-pillar-section-header";
import { cn } from "@/lib/utils";
import {
  PILLAR_QUESTION_ANSWER_META,
  type PackAnswerRecord,
  type PackSnapshot,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";
import { getPackClientCopy, type PackClientCopy } from "@/lib/maturity-client-copy";

type Props = {
  product?: "maturity" | "workshop";
  snapshots: PackSnapshot[];
  answersById: Map<string, PackAnswerRecord>;
  organizationName?: string | null;
  submitting?: boolean;
  onEditStep: (index: number) => void;
  onSubmit: () => void;
  onBackToQuestions?: () => void;
};

function AnswerChip({ answer }: { answer: PillarQuestionAnswer | undefined }) {
  if (!answer) {
    return (
      <span className="inline-flex items-center rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400">
        Unanswered
      </span>
    );
  }

  return (
    <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-md border border-slate-900 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/10">
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-[var(--theme-brand)]" />
      <span className="pl-1">{PILLAR_QUESTION_ANSWER_META[answer].label}</span>
      <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
    </span>
  );
}

export function MaturityPackReviewPanel({
  product = "maturity",
  snapshots,
  answersById,
  organizationName,
  submitting = false,
  onEditStep,
  onSubmit,
  onBackToQuestions,
}: Props) {
  const copy: PackClientCopy = getPackClientCopy(product);
  const answeredCount = snapshots.filter((snapshot) => answersById.has(snapshot.id)).length;
  const notesCount = snapshots.filter((snapshot) =>
    Boolean(answersById.get(snapshot.id)?.notes?.trim())
  ).length;
  const progressPct =
    snapshots.length > 0 ? Math.round((answeredCount / snapshots.length) * 100) : 0;
  const pillarGroups = buildPackPillarGroups(snapshots, answersById);
  const canSubmit = answeredCount >= snapshots.length;

  return (
    <div className="pb-28">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.28)]">
        <header className="brand-ink-surface relative bg-black px-6 py-6 text-white sm:px-8 sm:py-7">
          <span
            aria-hidden
            className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-[var(--theme-brand)]"
          />
          <div className="flex flex-wrap items-end justify-between gap-4 pl-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                {copy.modeLabel} · Review
              </p>
              <h1 className="mt-2 text-xl font-light tracking-tight sm:text-2xl">
                {copy.reviewTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                {organizationName?.trim()
                  ? `${organizationName.trim()} — ${copy.reviewDescription}`
                  : copy.reviewDescription}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-light tabular-nums tracking-tight">{progressPct}%</p>
              <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                {answeredCount} of {snapshots.length} confirmed
              </p>
              {notesCount > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {notesCount} with notes
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 h-0.5 overflow-hidden bg-white/15">
            <div
              className="h-full bg-[var(--theme-brand)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>

        <div>
          {pillarGroups.map((group, groupIndex) => (
            <section key={group.pillarId} className="border-t border-slate-200 first:border-t-0">
              <MaturityPackPillarSectionHeader
                index={groupIndex}
                totalAreas={pillarGroups.length}
                pillarId={group.pillarId}
                pillarLabel={group.pillarLabel}
                answeredCount={group.answeredCount}
                totalCount={group.totalCount}
              />

              <ul className="divide-y divide-slate-100">
                {group.questionIndices.map((index) => {
                  const snapshot = snapshots[index];
                  if (!snapshot) return null;
                  const record = answersById.get(snapshot.id);
                  const answer = record?.answer;
                  const hasNotes = Boolean(record?.notes?.trim());
                  const displayNumber = index + 1;

                  return (
                    <li key={snapshot.id} className="relative">
                      {answer && (
                        <span
                          aria-hidden
                          className="absolute bottom-3 left-0 top-3 w-0.5 bg-[var(--theme-brand)]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => onEditStep(index)}
                        className="group grid w-full gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/15 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:px-8 sm:py-5"
                      >
                        <div className="flex min-w-0 gap-3.5">
                          <span
                            className={cn(
                              "mt-0.5 w-8 shrink-0 text-[11px] font-semibold tabular-nums",
                              answer ? "text-slate-700" : "text-slate-400"
                            )}
                          >
                            {String(displayNumber).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium leading-snug tracking-tight text-slate-900">
                              {snapshot.prompt}
                            </p>
                            {hasNotes && (
                              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                                <span className="line-clamp-2">{record?.notes}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <AnswerChip answer={answer} />
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            <Pencil className="h-3 w-3" />
                            Edit
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {onBackToQuestions ? (
            <Button type="button" variant="ghost" onClick={onBackToQuestions} className="text-slate-600">
              Back to questions
            </Button>
          ) : (
            <p className="hidden text-xs text-slate-500 sm:block">
              Select any row to edit an answer
            </p>
          )}
          <Button
            type="button"
            disabled={submitting || !canSubmit}
            onClick={onSubmit}
            className="ml-auto gap-1.5 shadow-lg shadow-slate-900/10"
            size="lg"
          >
            {submitting ? (
              <>{copy.preparingReportLabel}…</>
            ) : (
              <>
                {copy.reviewSubmitLabel}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
