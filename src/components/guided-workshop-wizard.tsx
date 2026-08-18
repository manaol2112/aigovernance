"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Users,
} from "lucide-react";
import type { GuidedWorkshop, MaturityLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkshopAnswerPicker } from "@/components/guided-workshop-answer-picker";
import {
  GuidedWorkshopQuestionChrome,
  WORKSHOP_QUESTION_CARD,
} from "@/components/guided-workshop-question-chrome";
import { MaturitySurveyReviewPanel } from "@/components/maturity-survey-review-panel";
import { GuidedWorkshopReviewEditPanel } from "@/components/guided-workshop-review-edit-panel";
import { buildGuidedWorkshopQuestion } from "@/lib/guided-workshop-questions";
import {
  computeSurveyProgress,
  buildSurveyResponsesByStepKey,
  surveyStepResponseKeyFromStep,
  isStepAnswered,
} from "@/lib/maturity-survey-progress";
import type { SurveyPillarGroup, SurveyStep } from "@/lib/maturity-survey-types";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type WorkshopResponse = {
  controlId: string;
  pillarId: string;
  maturity: MaturityLevel;
  facilitatorNotes: string | null;
};

type WorkshopBundle = {
  workshop: GuidedWorkshop & { responses: WorkshopResponse[] };
  catalog: SurveyPillarGroup[];
};

type WizardPhase = "questions" | "review";

export function GuidedWorkshopWizard({ initial }: { initial: WorkshopBundle }) {
  const router = useRouter();
  const workshop = initial.workshop;
  const questionAnchorRef = useRef<HTMLDivElement>(null);

  const [responseList, setResponseList] = useState<WorkshopResponse[]>(initial.workshop.responses);
  const [stepIndex, setStepIndex] = useState(workshop.currentStepIndex ?? 0);
  const [phase, setPhase] = useState<WizardPhase>("questions");
  const [reviewEditStepIndex, setReviewEditStepIndex] = useState<number | null>(null);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(
    () => computeSurveyProgress(initial.catalog, responseList),
    [initial.catalog, responseList]
  );

  const responsesByStepKey = useMemo(
    () => buildSurveyResponsesByStepKey(responseList),
    [responseList]
  );

  const reviewResponsesByStepKey = useMemo(
    () =>
      new Map(
        [...responsesByStepKey.entries()].map(([k, r]) => {
          const wr = responseList.find(
            (resp) => `${resp.pillarId}:${resp.controlId}` === k
          );
          return [k, { ...r, notes: wr?.facilitatorNotes ?? null }];
        })
      ),
    [responsesByStepKey, responseList]
  );

  const steps = progress.steps;
  const currentStep = steps[stepIndex];

  function openReviewEdit(index: number) {
    setShowSavedHint(false);
    setReviewEditStepIndex(index);
  }

  const editStep = reviewEditStepIndex != null ? steps[reviewEditStepIndex] : null;
  const editResponse = editStep
    ? responsesByStepKey.get(surveyStepResponseKeyFromStep(editStep))
    : undefined;

  const saveStepIndex = useCallback(
    async (index: number) => {
      await fetch(`/api/guided-workshops/${workshop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStepIndex: index }),
      }).catch(() => {});
    },
    [workshop.id]
  );

  const saveResponse = useCallback(
    async (
      step: SurveyStep,
      maturity: MaturityLevel,
      facilitatorNotes?: string,
      stepOverride?: number
    ) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/guided-workshops/${workshop.id}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            controlId: step.control.id,
            pillarId: step.pillarId,
            maturity,
            facilitatorNotes,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Failed to save");
        }
        const saved = await res.json();
        setResponseList((prev) => {
          const key = surveyStepResponseKeyFromStep(step);
          const filtered = prev.filter(
            (r) => `${r.pillarId}:${r.controlId}` !== key
          );
          return [
            ...filtered,
            {
              controlId: saved.controlId,
              pillarId: saved.pillarId,
              maturity: saved.maturity,
              facilitatorNotes: saved.facilitatorNotes,
            },
          ];
        });
        const nextIndex = stepOverride ?? stepIndex;
        await saveStepIndex(nextIndex);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to save response.", { variant: "error" });
      } finally {
        setSaving(false);
      }
    },
    [workshop.id, stepIndex, saveStepIndex]
  );

  function goToStep(index: number) {
    const clamped = Math.max(0, Math.min(index, steps.length - 1));
    setStepIndex(clamped);
    setPhase("questions");
    setReviewEditStepIndex(null);
    void saveStepIndex(clamped);
    questionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleNext() {
    if (!currentStep) return;
    const key = surveyStepResponseKeyFromStep(currentStep);
    if (!responsesByStepKey.has(key)) {
      toast("Select a maturity level before continuing.", { variant: "error" });
      return;
    }

    if (stepIndex >= steps.length - 1) {
      setPhase("review");
      questionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    goToStep(stepIndex + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guided-workshops/${workshop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Submit failed");
      }
      toast("Workshop complete — generating client report.", { variant: "success" });
      router.push(`/guided-workshop/${workshop.id}/results`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to submit.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const currentResponse = currentStep
    ? responseList.find(
        (r) =>
          r.pillarId === currentStep.pillarId && r.controlId === currentStep.control.id
      )
    : undefined;

  const currentQuestion = useMemo(
    () =>
      currentStep
        ? buildGuidedWorkshopQuestion(currentStep.control, currentStep.pillarLabel)
        : null,
    [currentStep]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/guided-workshop"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Workshops
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-slate-900">{workshop.title}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div ref={questionAnchorRef} className="mb-6">
          <div className="mb-4 flex items-center justify-center gap-2">
            {(["questions", "review"] as const).map((p, i) => {
              const active = phase === p;
              const done = phase === "review" && p === "questions";
              return (
                <div key={p} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      active && "bg-violet-600 text-white shadow-sm",
                      done && "bg-emerald-100 text-emerald-800",
                      !active && !done && "bg-slate-100 text-slate-500"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                        {i + 1}
                      </span>
                    )}
                    {p === "questions" ? "Facilitation" : "Review & submit"}
                  </div>
                  {i === 0 && <div className="mx-1 h-px w-6 bg-slate-200" aria-hidden />}
                </div>
              );
            })}
          </div>

          {phase === "questions" && (
            <GuidedWorkshopQuestionChrome
              steps={steps}
              stepIndex={stepIndex}
              progressPct={progress.progressPct}
              answeredStepCount={progress.answeredStepCount}
              responsesByStepKey={responsesByStepKey}
              organizationName={workshop.organizationName}
              facilitatorName={workshop.facilitatorName}
              onGoToStep={goToStep}
            />
          )}
        </div>

        {phase === "review" && reviewEditStepIndex === null && (
          <MaturitySurveyReviewPanel
            steps={steps}
            responsesByStepKey={reviewResponsesByStepKey}
            organizationName={workshop.organizationName}
            onEditStep={openReviewEdit}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        {phase === "review" && reviewEditStepIndex !== null && editStep && (
          <GuidedWorkshopReviewEditPanel
            step={editStep}
            maturity={editResponse?.maturity ?? null}
            saving={saving}
            showSavedHint={showSavedHint}
            onMaturityChange={(level) => {
              void saveResponse(editStep, level, undefined, reviewEditStepIndex ?? undefined).then(
                () => setShowSavedHint(true)
              );
            }}
            onBackToReview={() => setReviewEditStepIndex(null)}
          />
        )}

        {phase === "questions" && currentStep && currentQuestion && (
          <div className={WORKSHOP_QUESTION_CARD}>
            <div className="mb-6">
              <Badge variant="outline" className="mb-3 font-mono text-[10px]">
                {currentQuestion.controlCode}
              </Badge>
              <h3 className="text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                {currentQuestion.prompt}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {currentQuestion.requirementContext}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {currentQuestion.frameworkLabels.map((label) => (
                  <Badge key={label} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                    {label}
                  </Badge>
                ))}
                {currentQuestion.ownerRole && (
                  <span className="text-xs text-slate-500">
                    Typical owner:{" "}
                    <span className="font-medium text-slate-700">{currentQuestion.ownerRole}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-800">
                Facilitator guide
              </p>
              <p className="mt-1 text-sm leading-relaxed text-violet-950/80">
                {currentQuestion.facilitationTip}
              </p>
            </div>

            <WorkshopAnswerPicker
              value={currentResponse?.maturity ?? null}
              onChange={(level) => void saveResponse(currentStep, level)}
              disabled={saving}
              options={currentQuestion.answerOptions}
            />

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0 || saving}
                onClick={() => goToStep(stepIndex - 1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                type="button"
                onClick={() => void handleNext()}
                disabled={saving || !isStepAnswered(currentStep, responsesByStepKey)}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {stepIndex >= steps.length - 1 ? (
                  <>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Review answers
                  </>
                ) : (
                  <>
                    Next control
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
