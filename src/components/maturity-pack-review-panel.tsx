"use client";

import { ArrowRight, CheckCircle2, ChevronRight, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PILLAR_QUESTION_ANSWER_META,
  type PackAnswerRecord,
  type PackSnapshot,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";
import { formatUnitCount } from "@/lib/format-unit-count";
import { getPackClientCopy, type PackClientCopy } from "@/lib/maturity-client-copy";

const ANSWER_BADGE: Record<PillarQuestionAnswer, "success" | "warning" | "danger" | "secondary"> = {
  yes: "success",
  partial: "warning",
  no: "danger",
  dont_know: "secondary",
};

const ANSWER_DOT: Record<PillarQuestionAnswer, string> = {
  yes: "#059669",
  partial: "#d97706",
  no: "#dc2626",
  dont_know: "#94a3b8",
};

type Props = {
  product?: "maturity" | "workshop";
  snapshots: PackSnapshot[];
  answersById: Map<string, PackAnswerRecord>;
  organizationName?: string | null;
  submitting?: boolean;
  onEditStep: (index: number) => void;
  onSubmit: () => void;
};

export function MaturityPackReviewPanel({
  product = "maturity",
  snapshots,
  answersById,
  organizationName,
  submitting = false,
  onEditStep,
  onSubmit,
}: Props) {
  const copy: PackClientCopy = getPackClientCopy(product);
  const isWorkshop = product === "workshop";
  const answeredCount = snapshots.filter((snapshot) => answersById.has(snapshot.id)).length;
  const notesCount = snapshots.filter((snapshot) =>
    Boolean(answersById.get(snapshot.id)?.notes?.trim())
  ).length;

  return (
    <div className="pb-28">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border px-6 py-8 text-white shadow-xl sm:px-8",
          isWorkshop
            ? "border-emerald-400/20 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 shadow-emerald-950/20"
            : "border-indigo-200/80 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 shadow-indigo-900/20"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl",
            isWorkshop ? "bg-emerald-400/20" : "bg-indigo-400/20"
          )}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.2em]",
              isWorkshop ? "text-emerald-300" : "text-indigo-300"
            )}
          >
            Final review
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{copy.reviewTitle}</h1>
          <p
            className={cn(
              "mt-3 max-w-xl text-sm leading-relaxed",
              isWorkshop ? "text-emerald-100/90" : "text-indigo-100/90"
            )}
          >
            {isWorkshop ? (
              copy.reviewDescription
            ) : (
              <>
                You&apos;ve answered every question for{" "}
                <span className="font-medium text-white">
                  {organizationName?.trim() || "your organization"}
                </span>
                . {copy.reviewDescription}
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-200">
                Questions answered
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {answeredCount}
                <span className="text-sm font-normal text-indigo-200"> / {snapshots.length}</span>
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
        {snapshots.map((snapshot, index) => {
          const answerRecord = answersById.get(snapshot.id);
          const answer = answerRecord?.answer;
          const meta = answer ? PILLAR_QUESTION_ANSWER_META[answer] : null;
          const hasNotes = Boolean(answerRecord?.notes?.trim());

          return (
            <button
              key={snapshot.id}
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
                style={{ backgroundColor: `${answer ? ANSWER_DOT[answer] : "#94a3b8"}22` }}
                aria-hidden
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: answer ? ANSWER_DOT[answer] : "#94a3b8" }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{snapshot.pillarLabel}</p>
                  {answer && (
                    <Badge variant={ANSWER_BADGE[answer]} className="text-[10px]">
                      {meta?.label ?? answer}
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
                  {snapshot.prompt}
                </p>
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
          {formatUnitCount(snapshots.length, "question", "questions")} captured across governance
          pillars.{" "}
          {isWorkshop
            ? "Finalize when the session is complete — your client summary will highlight strengths, improvement areas, and follow-ups."
            : "Submit when you're satisfied — your report will highlight strengths, improvement areas, and recommended follow-ups."}
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="hidden text-xs text-slate-500 sm:block">
            Tap any question above to change your answer
          </p>
          <Button
            type="button"
            disabled={submitting || answeredCount < snapshots.length}
            onClick={onSubmit}
            className={cn(
              "ml-auto gap-1.5",
              isWorkshop ? "shadow-lg shadow-emerald-500/20" : "shadow-lg shadow-indigo-500/20"
            )}
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
