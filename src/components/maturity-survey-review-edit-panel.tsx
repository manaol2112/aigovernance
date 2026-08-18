"use client";

import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import type { MaturityLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { MaturityLevelPicker } from "@/components/maturity-level-picker";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import type { SurveyStep } from "@/lib/maturity-survey-types";
import type { SurveyMode } from "@/lib/maturity-survey-mode";
import { cn } from "@/lib/utils";

type Props = {
  step: SurveyStep;
  mode: SurveyMode;
  maturity: MaturityLevel | null;
  notes: string;
  saving: boolean;
  savingNotes: boolean;
  showSavedHint: boolean;
  onMaturityChange: (level: MaturityLevel) => void;
  onNotesChange: (notes: string) => void;
  onNotesBlur: () => void;
  onBackToReview: () => void;
};

export function MaturitySurveyReviewEditPanel({
  step,
  mode,
  maturity,
  notes,
  saving,
  savingNotes,
  showSavedHint,
  onMaturityChange,
  onNotesChange,
  onNotesBlur,
  onBackToReview,
}: Props) {
  const criticalQ = getPillarCriticalQuestion(step.pillarId);
  const guidance = maturity ? MATURITY_LEVEL_GUIDANCE[maturity] : null;
  const answered = maturity != null;

  return (
    <div className="pb-28">
      <button
        type="button"
        onClick={onBackToReview}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to review
      </button>

      <div className="mb-5 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Editing answer
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{step.pillarLabel}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Update your rating or notes, then return to the review summary.
        </p>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
        )}
      >
        {mode === "quick" ? (
          <>
            <h1 className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
              {criticalQ?.prompt}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{criticalQ?.subtitle}</p>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] text-indigo-600">{step.control.code}</p>
            <h1 className="mt-3 text-xl font-semibold leading-snug text-slate-900">
              {step.control.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.control.description}</p>
          </>
        )}

        <div className="mt-6 border-t border-slate-100 pt-6">
          <MaturityLevelPicker
            value={maturity}
            disabled={saving}
            variant="survey"
            showGoodLooksLikeHints={mode === "quick"}
            onChange={onMaturityChange}
          />
        </div>

        {answered && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <label htmlFor="review-edit-notes" className="text-sm font-medium text-slate-700">
              Optional context{" "}
              <span className="font-normal text-slate-400">(visible in your report)</span>
            </label>
            <textarea
              id="review-edit-notes"
              rows={3}
              value={notes}
              disabled={savingNotes}
              placeholder="Add context for leadership — e.g. current state, blockers, or owners."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              onChange={(e) => onNotesChange(e.target.value)}
              onBlur={onNotesBlur}
            />
            {savingNotes && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving notes…
              </p>
            )}
          </div>
        )}

        {saving && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </p>
        )}

        {showSavedHint && answered && guidance && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Answer updated</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                {guidance.label} — {guidance.headline}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl justify-end">
          <Button
            type="button"
            onClick={onBackToReview}
            disabled={!answered || saving}
            className="gap-1.5 shadow-lg shadow-indigo-500/15"
            size="lg"
          >
            Done — back to review
          </Button>
        </div>
      </div>
    </div>
  );
}
