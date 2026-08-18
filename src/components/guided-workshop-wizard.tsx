"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  Clock,
  Layers3,
} from "lucide-react";
import type { GuidedWorkshop, MaturityLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkshopAnswerPicker, WorkshopDiscussionGuide } from "@/components/guided-workshop-answer-picker";
import {
  GuidedWorkshopQuestionChrome,
  WORKSHOP_QUESTION_CARD,
} from "@/components/guided-workshop-question-chrome";
import { MaturitySurveyReviewPanel } from "@/components/maturity-survey-review-panel";
import { GuidedWorkshopReviewEditPanel } from "@/components/guided-workshop-review-edit-panel";
import { GuidedWorkshopBriefingPanel } from "@/components/guided-workshop-briefing";
import { GuidedWorkshopPillarPicker } from "@/components/guided-workshop-pillar-picker";
import { GuidedWorkshopPillarCompletePanel } from "@/components/guided-workshop-pillar-complete-panel";
import { buildGuidedWorkshopBriefing } from "@/lib/guided-workshop-briefing";
import { buildGuidedWorkshopQuestion } from "@/lib/guided-workshop-questions";
import {
  computeSurveyProgress,
  buildSurveyResponsesByStepKey,
  surveyStepResponseKeyFromStep,
  isStepAnswered,
} from "@/lib/maturity-survey-progress";
import type { SurveyPillarGroup, SurveyStep } from "@/lib/maturity-survey-types";
import {
  buildWorkshopPillarSummaries,
  getAdjacentStepIndexInPillar,
  isLastStepInPillar,
  resolveInitialWorkshopPhase,
  resolveInitialWorkshopStepIndex,
  resolvePillarEntryStepIndex,
  type GuidedWorkshopWizardPhase,
} from "@/lib/guided-workshop-wizard-state";
import { cn, formatDateTime } from "@/lib/utils";
import { formatOfTotal } from "@/lib/format-unit-count";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
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

type WizardPhase = GuidedWorkshopWizardPhase;

export function GuidedWorkshopWizard({ initial }: { initial: WorkshopBundle }) {
  const router = useRouter();
  const workshop = initial.workshop;
  const questionAnchorRef = useRef<HTMLDivElement>(null);
  const isResume = initial.workshop.responses.length > 0;
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false);
  const [completedPillarId, setCompletedPillarId] = useState<string | null>(null);

  const initialProgress = useMemo(
    () => computeSurveyProgress(initial.catalog, initial.workshop.responses),
    [initial.catalog, initial.workshop.responses]
  );

  const [responseList, setResponseList] = useState<WorkshopResponse[]>(initial.workshop.responses);
  const [stepIndex, setStepIndex] = useState(() =>
    resolveInitialWorkshopStepIndex(
      initial.catalog,
      initial.workshop.responses,
      workshop.currentStepIndex ?? 0
    )
  );
  const [phase, setPhase] = useState<WizardPhase>(() =>
    resolveInitialWorkshopPhase(initial.workshop.responses, initialProgress)
  );
  const [reviewEditStepIndex, setReviewEditStepIndex] = useState<number | null>(null);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date>(
    () => new Date(workshop.updatedAt ?? workshop.createdAt)
  );

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

  const briefing = useMemo(
    () =>
      buildGuidedWorkshopBriefing({
        catalog: initial.catalog,
        organizationName: workshop.organizationName,
        facilitatorName: workshop.facilitatorName,
        clientContactName: workshop.clientContactName,
        frameworkCodes: workshop.frameworkCodes,
      }),
    [initial.catalog, workshop]
  );

  const steps = progress.steps;
  const currentStep = steps[stepIndex];

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

  const pillarSummaries = useMemo(
    () => buildWorkshopPillarSummaries(initial.catalog, steps, responseList),
    [initial.catalog, steps, responseList]
  );

  const currentPillarSummary = currentStep
    ? pillarSummaries.find((p) => p.pillarId === currentStep.pillarId)
    : undefined;
  const nextStepInPillar =
    currentStep != null ? getAdjacentStepIndexInPillar(steps, stepIndex, "next") : null;
  const prevStepInPillar =
    currentStep != null ? getAdjacentStepIndexInPillar(steps, stepIndex, "prev") : null;
  const atLastControlInPillar = currentStep != null && isLastStepInPillar(steps, stepIndex);
  const currentAnswered = currentStep
    ? isStepAnswered(currentStep, responsesByStepKey)
    : false;
  const completedPillarSummary = completedPillarId
    ? pillarSummaries.find((p) => p.pillarId === completedPillarId)
    : undefined;
  const completedPillarCount = pillarSummaries.filter((p) => p.isComplete).length;
  const nextPillarStep = nextStepInPillar != null ? steps[nextStepInPillar] : null;
  const selectedGuidance =
    currentResponse?.maturity != null
      ? MATURITY_LEVEL_GUIDANCE[currentResponse.maturity]
      : null;

  const scrollToWizardTop = useCallback(() => {
    questionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const saveProgress = useCallback(
    async (options?: { exit?: boolean; stepOverride?: number }) => {
      const index = options?.stepOverride ?? stepIndex;
      if (options?.exit) setSavingExit(true);
      try {
        const res = await fetch(`/api/guided-workshops/${workshop.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", currentStepIndex: index }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Failed to save progress");
        }
        setLastSavedAt(new Date());
        if (options?.exit) {
          toast("Progress saved. Resume anytime from Workshops.", { variant: "success" });
          router.push("/guided-workshop");
          router.refresh();
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to save progress.", { variant: "error" });
      } finally {
        if (options?.exit) setSavingExit(false);
      }
    },
    [workshop.id, stepIndex, router]
  );

  function beginWorkshop() {
    void saveProgress({ stepOverride: stepIndex });
    setPhase("pillarSelect");
    scrollToWizardTop();
  }

  function openPillarSelect() {
    setCompletedPillarId(null);
    setPhase("pillarSelect");
    setShowSavedHint(false);
    requestAnimationFrame(() => scrollToWizardTop());
  }

  function showPillarComplete(pillarId: string) {
    setCompletedPillarId(pillarId);
    setPhase("pillarComplete");
    setShowSavedHint(false);
    requestAnimationFrame(() => scrollToWizardTop());
  }

  function goToPillar(pillarId: string) {
    const index = resolvePillarEntryStepIndex(steps, pillarId, responseList);
    goToStep(index);
  }

  function goToReview() {
    setPhase("review");
    setShowSavedHint(false);
    setReviewEditStepIndex(null);
    requestAnimationFrame(() => scrollToWizardTop());
  }

  function handleSaveAndExit() {
    void saveProgress({ exit: true, stepOverride: stepIndex });
  }

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
      const key = surveyStepResponseKeyFromStep(step);
      const previous = responseList.find(
        (r) => `${r.pillarId}:${r.controlId}` === key
      );

      setShowSavedHint(false);
      setResumeBannerDismissed(true);
      setResponseList((prev) => {
        const filtered = prev.filter((r) => `${r.pillarId}:${r.controlId}` !== key);
        return [
          ...filtered,
          {
            controlId: step.control.id,
            pillarId: step.pillarId,
            maturity,
            facilitatorNotes: facilitatorNotes ?? previous?.facilitatorNotes ?? null,
          },
        ];
      });

      (document.activeElement as HTMLElement | null)?.blur?.();

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
        setLastSavedAt(new Date());
        setShowSavedHint(true);
      } catch (e) {
        setResponseList((prev) => {
          const filtered = prev.filter((r) => `${r.pillarId}:${r.controlId}` !== key);
          if (previous) return [...filtered, previous];
          return filtered;
        });
        toast(e instanceof Error ? e.message : "Failed to save response.", { variant: "error" });
      }
    },
    [workshop.id, stepIndex, saveStepIndex, responseList]
  );

  function goToStep(index: number) {
    const clamped = Math.max(0, Math.min(index, steps.length - 1));
    if (clamped === stepIndex) return;
    setStepIndex(clamped);
    setPhase("questions");
    setReviewEditStepIndex(null);
    setShowSavedHint(false);
    void saveStepIndex(clamped);
    requestAnimationFrame(() => scrollToWizardTop());
  }

  async function handleNext() {
    if (!currentStep) return;
    const key = surveyStepResponseKeyFromStep(currentStep);
    if (!responsesByStepKey.has(key)) {
      toast("Select a maturity level before continuing.", { variant: "error" });
      return;
    }

    if (nextStepInPillar != null) {
      goToStep(nextStepInPillar);
      return;
    }

    showPillarComplete(currentStep.pillarId);
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

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white pb-32">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/guided-workshop"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Workshops
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">{workshop.title}</p>
              <p className="flex items-center justify-end gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3 shrink-0" />
                Saved {formatDateTime(lastSavedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingExit || submitting}
              onClick={handleSaveAndExit}
              className="shrink-0"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              {savingExit ? "Saving…" : "Save & exit"}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto max-w-5xl px-4 py-8 sm:px-6",
          (phase === "questions" || phase === "pillarSelect" || phase === "pillarComplete") &&
            "pb-32"
        )}
      >
        <div ref={questionAnchorRef} className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {(
              [
                ["briefing", "Overview"],
                ["pillarSelect", "Choose pillar"],
                ["questions", "Facilitation"],
                ["review", "Review & submit"],
              ] as const
            ).map(([p, label], i, arr) => {
              const phaseOrder: Record<WizardPhase, number> = {
                briefing: 0,
                pillarSelect: 1,
                questions: 2,
                pillarComplete: 2,
                review: 3,
              };
              const currentOrder = phaseOrder[phase];
              const stepOrder = phaseOrder[p];
              const active = phase === p || (p === "questions" && phase === "pillarComplete");
              const done = currentOrder > stepOrder;
              return (
                <div key={p} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      active && "bg-theme-brand text-white shadow-sm",
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
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">
                      {p === "pillarSelect" ? "Pillar" : label.split(" ")[0]}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="mx-1 h-px w-4 bg-slate-200 sm:w-6" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>

          {phase === "questions" && (
            <div className="sticky top-0 z-20 -mx-4 bg-gradient-to-b from-slate-50 via-slate-50/95 to-transparent px-4 pb-2 pt-1 sm:-mx-6 sm:px-6">
              <GuidedWorkshopQuestionChrome
                steps={steps}
                stepIndex={stepIndex}
                progressPct={currentPillarSummary?.progressPct ?? progress.progressPct}
                answeredStepCount={currentPillarSummary?.answeredCount ?? progress.answeredStepCount}
                totalStepCount={currentPillarSummary?.controlCount ?? progress.totalSteps}
                organizationName={workshop.organizationName}
                facilitatorName={workshop.facilitatorName}
                onChoosePillar={openPillarSelect}
              />
            </div>
          )}
        </div>

        {isResume && phase !== "briefing" && phase !== "pillarSelect" && !resumeBannerDismissed && (
          <div className="mb-6 rounded-2xl border border-[var(--theme-brand-ring)] bg-theme-brand-muted/60 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Welcome back</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatOfTotal(progress.answeredStepCount, progress.totalSteps, "answered")}. Work
                  through pillars in any order — use Choose pillar to switch focus anytime.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-theme-brand">
                    {progress.progressPct}%
                  </p>
                  <p className="text-[11px] font-medium text-theme-brand/80">session progress</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-slate-500"
                  onClick={() => setResumeBannerDismissed(true)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === "pillarComplete" && completedPillarSummary && (
          <GuidedWorkshopPillarCompletePanel
            pillar={completedPillarSummary}
            completedPillarCount={completedPillarCount}
            totalPillarCount={pillarSummaries.length}
            overallProgressPct={progress.progressPct}
            allWorkshopComplete={progress.allComplete}
            onChooseNextPillar={openPillarSelect}
            onReview={progress.allComplete ? goToReview : undefined}
          />
        )}

        {phase === "pillarSelect" && (
          <GuidedWorkshopPillarPicker
            pillars={pillarSummaries}
            overallProgressPct={progress.progressPct}
            allComplete={progress.allComplete}
            onSelectPillar={goToPillar}
            onReview={progress.allComplete ? goToReview : undefined}
          />
        )}

        {phase === "briefing" && (
          <GuidedWorkshopBriefingPanel
            briefing={briefing}
            onBegin={beginWorkshop}
            onSaveExit={handleSaveAndExit}
            savingExit={savingExit}
          />
        )}

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
            saving={false}
            showSavedHint={showSavedHint}
            onMaturityChange={(level) => {
              void saveResponse(editStep, level, undefined, reviewEditStepIndex ?? undefined);
            }}
            onBackToReview={() => setReviewEditStepIndex(null)}
          />
        )}

        {phase === "questions" && currentStep && currentQuestion && (
          <div className={cn(WORKSHOP_QUESTION_CARD, "pb-4")}>
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
              <div className="mt-4">
                {currentQuestion.ownerRole && (
                  <span className="text-xs text-slate-500">
                    Typical owner:{" "}
                    <span className="font-medium text-slate-700">{currentQuestion.ownerRole}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6">
              <WorkshopDiscussionGuide
                pillarLabel={currentStep.pillarLabel}
                facilitationTip={currentQuestion.facilitationTip}
                frameworkLabels={currentQuestion.frameworkLabels}
              />
            </div>

            <div className="mt-6">
              <WorkshopAnswerPicker
                value={currentResponse?.maturity ?? null}
                onChange={(level) => void saveResponse(currentStep, level)}
                options={currentQuestion.answerOptions}
              />
            </div>

            {showSavedHint && currentAnswered && selectedGuidance && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-emerald-900">Answer saved</p>
                  <p className="mt-0.5 text-xs text-emerald-800">
                    {selectedGuidance.label} — {selectedGuidance.headline}
                  </p>
                  {atLastControlInPillar ? (
                    <p className="mt-2 text-xs text-emerald-700/80">
                      Last control in this pillar — continue to see a completion summary before
                      choosing your next focus.
                    </p>
                  ) : (
                    nextPillarStep && (
                      <p className="mt-2 text-xs text-emerald-700/80">
                        Up next in this pillar:{" "}
                        <span className="font-medium">{nextPillarStep.control.title}</span>
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(phase === "questions" || phase === "pillarSelect" || phase === "pillarComplete") && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            {phase === "pillarComplete" ? (
              <p className="text-sm text-slate-600">
                Pillar finished — continue when you&apos;re ready.
              </p>
            ) : phase === "questions" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={prevStepInPillar == null}
                    onClick={() => prevStepInPillar != null && goToStep(prevStepInPillar)}
                    className="text-slate-600"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openPillarSelect}
                    className="text-slate-600"
                  >
                    <Layers3 className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Choose pillar</span>
                    <span className="sm:hidden">Pillars</span>
                  </Button>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void handleNext()}
                  disabled={!currentAnswered || savingExit}
                  className="gap-1.5 shadow-lg shadow-[color-mix(in_srgb,var(--theme-brand)_15%,transparent)]"
                >
                  {atLastControlInPillar ? (
                    progress.allComplete ? (
                      <>
                        <ClipboardList className="h-4 w-4" />
                        Review answers
                      </>
                    ) : (
                      <>
                        Choose next pillar
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )
                  ) : (
                    <>
                      Next control
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            ) : phase === "pillarSelect" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (responseList.length > 0) {
                      setPhase("questions");
                    } else {
                      setPhase("briefing");
                    }
                  }}
                  className="text-slate-600"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {progress.allComplete && (
                  <Button type="button" size="lg" onClick={goToReview} className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Review answers
                  </Button>
                )}
              </>
            ) : null}
            {phase === "pillarComplete" && (
              <Button type="button" size="lg" onClick={openPillarSelect} className="ml-auto gap-2">
                <Layers3 className="h-4 w-4" />
                Back to pillar list
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
