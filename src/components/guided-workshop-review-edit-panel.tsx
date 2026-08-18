"use client";

import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import type { MaturityLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkshopAnswerPicker } from "@/components/guided-workshop-answer-picker";
import { buildGuidedWorkshopQuestion } from "@/lib/guided-workshop-questions";
import type { SurveyStep } from "@/lib/maturity-survey-types";
import { getFrameworkShortLabel } from "@/lib/framework-library";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";

type Props = {
  step: SurveyStep;
  maturity: MaturityLevel | null;
  saving: boolean;
  showSavedHint: boolean;
  onMaturityChange: (level: MaturityLevel) => void;
  onBackToReview: () => void;
};

export function GuidedWorkshopReviewEditPanel({
  step,
  maturity,
  saving,
  showSavedHint,
  onMaturityChange,
  onBackToReview,
}: Props) {
  const question = buildGuidedWorkshopQuestion(step.control, step.pillarLabel);
  const guidance = maturity ? MATURITY_LEVEL_GUIDANCE[maturity] : null;
  const answered = maturity != null;
  const selectedStatement = question.answerOptions.find((o) => o.level === maturity)?.statement;

  return (
    <div className="pb-28">
      <button
        type="button"
        onClick={onBackToReview}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition-colors hover:text-violet-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to review
      </button>

      <div className="mb-5 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
          Editing weighted answer
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{step.pillarLabel}</p>
        <p className="mt-1 font-mono text-[10px] text-slate-500">{step.control.code}</p>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
          {question.prompt}
        </h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {step.control.frameworkCodes.map((code) => (
            <Badge key={code} variant="outline" className="text-[10px]">
              {getFrameworkShortLabel(code)}
            </Badge>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <WorkshopAnswerPicker
            value={maturity}
            disabled={saving}
            options={question.answerOptions}
            showMethodology={false}
            onChange={onMaturityChange}
          />
        </div>

        {saving && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </p>
        )}

        {showSavedHint && answered && guidance && selectedStatement && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Answer updated</p>
              <p className="mt-0.5 text-xs text-emerald-800">{selectedStatement}</p>
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
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
            size="lg"
          >
            Done — back to review
          </Button>
        </div>
      </div>
    </div>
  );
}
