"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  LayoutList,
  SquareStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLoadingOverlay } from "@/components/brand-page-loader";
import { MaturityPortalFooterMode } from "@/components/maturity-portal-shell";
import { PillarAnswerPicker } from "@/components/pillar-answer-picker";
import { GuidedWorkshopPillarPicker } from "@/components/guided-workshop-pillar-picker";
import {
  buildPackPillarGroups,
  MaturityPackQuestionChrome,
} from "@/components/maturity-pack-question-chrome";
import { MaturityPackListView } from "@/components/maturity-pack-list-view";
import { MaturityPackReviewPanel } from "@/components/maturity-pack-review-panel";
import { toast } from "@/components/ui/toast";
import { getPackClientCopy } from "@/lib/maturity-client-copy";
import {
  computePackProgress,
  type PackAnswerRecord,
  type PackSnapshot,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";
import { packWorkshopPillarSummaries } from "@/lib/pillar-questionnaire-scoring";
import { cn } from "@/lib/utils";

type Product = "maturity" | "workshop";
type QuestionViewMode = "focus" | "list";

const QUESTION_VIEW_STORAGE_KEY = "aigov-pack-question-view";

type Props = {
  product: Product;
  sessionId: string;
  title: string;
  organizationName?: string | null;
  packName?: string | null;
  snapshots: PackSnapshot[];
  initialAnswers: PackAnswerRecord[];
  initialStepIndex?: number;
};

type WizardPhase = "pillars" | "questions" | "review";

function QuestionViewToggle({
  mode,
  onChange,
}: {
  mode: QuestionViewMode;
  onChange: (mode: QuestionViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Question layout"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {(
        [
          { id: "focus" as const, label: "Focus", icon: SquareStack },
          { id: "list" as const, label: "List", icon: LayoutList },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PackWizardPhaseStepper({
  phase,
}: {
  phase: Exclude<WizardPhase, "pillars">;
  product: Product;
}) {
  const steps = [
    { id: "questions" as const, label: "Questions" },
    { id: "review" as const, label: "Review" },
  ];
  const phaseIndex = steps.findIndex((step) => step.id === phase);

  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const active = phase === step.id;
        const done = phaseIndex > index;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active &&
                  "bg-[var(--theme-action,var(--theme-brand))] text-[var(--theme-action-on,#fff)] shadow-sm",
                done && "bg-emerald-100 text-emerald-800",
                !active && !done && "bg-slate-100 text-slate-500"
              )}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {index + 1}
                </span>
              )}
              {step.label}
            </div>
            {index < steps.length - 1 && <div className="mx-1 h-px w-6 bg-slate-200" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

export function PillarQuestionnaireWizard({
  product,
  sessionId,
  title,
  organizationName,
  snapshots,
  initialAnswers,
  initialStepIndex = 0,
}: Props) {
  const router = useRouter();
  const copy = getPackClientCopy(product);
  const [answers, setAnswers] = useState<PackAnswerRecord[]>(initialAnswers);
  const [stepIndex, setStepIndex] = useState(
    Math.min(Math.max(initialStepIndex, 0), Math.max(snapshots.length - 1, 0))
  );
  const [notesDraft, setNotesDraft] = useState("");
  const [phase, setPhase] = useState<WizardPhase>(
    product === "workshop" && initialAnswers.length === 0 ? "pillars" : "questions"
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [viewMode, setViewMode] = useState<QuestionViewMode>("focus");
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(QUESTION_VIEW_STORAGE_KEY);
      if (stored === "focus" || stored === "list") setViewMode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function updateViewMode(mode: QuestionViewMode) {
    setViewMode(mode);
    try {
      window.localStorage.setItem(QUESTION_VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  const answersById = useMemo(
    () => new Map(answers.map((answer) => [answer.questionId, answer])),
    [answers]
  );
  const progress = computePackProgress(snapshots, answers);
  const pillarGroups = useMemo(
    () => buildPackPillarGroups(snapshots, answersById),
    [snapshots, answersById]
  );
  const current = snapshots[stepIndex] ?? null;
  const currentAnswer = current ? answersById.get(current.id) ?? null : null;
  const listHref = product === "maturity" ? "/maturity-assessment" : "/guided-workshop";
  const resultsHref =
    product === "maturity"
      ? `/maturity-assessment/${sessionId}/results`
      : `/guided-workshop/${sessionId}/results`;
  const answerUrl =
    product === "maturity"
      ? `/api/maturity-surveys/${sessionId}/pack-responses`
      : `/api/guided-workshops/${sessionId}/pack-responses`;
  const sessionUrl =
    product === "maturity"
      ? `/api/maturity-surveys/${sessionId}`
      : `/api/guided-workshops/${sessionId}`;

  const pillarSummaries = packWorkshopPillarSummaries(snapshots, answers);

  useEffect(() => {
    const snapshot = snapshots[stepIndex];
    setNotesDraft(snapshot ? answersById.get(snapshot.id)?.notes ?? "" : "");
  }, [answersById, snapshots, stepIndex]);

  function goToStep(index: number) {
    if (index === stepIndex) return;
    setStepTransition(true);
    window.setTimeout(() => {
      setStepIndex(index);
      setStepTransition(false);
    }, 140);
  }

  async function saveAnswer(questionId: string, answer: PillarQuestionAnswer, notes?: string) {
    setSaving(true);
    try {
      const res = await fetch(answerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          product === "maturity"
            ? { questionId, answer, notes }
            : { questionId, answer, facilitatorNotes: notes }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save answer");
      setAnswers((currentAnswers) => {
        const next = currentAnswers.filter((item) => item.questionId !== questionId);
        next.push({ questionId, answer, notes: notes ?? null });
        return next;
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save answer.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!progress.allComplete) {
      toast("Please answer every question before submitting.", { variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(sessionUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      toast(copy.completeToast, { variant: "success" });
      router.push(resultsHref);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to submit.", { variant: "error" });
      setSubmitting(false);
    }
  }

  async function handleSaveAndExit() {
    setSavingExit(true);
    try {
      await fetch(sessionUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", currentStepIndex: stepIndex }),
      });
      toast("Progress saved.", { variant: "success" });
      router.push(listHref);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save.", { variant: "error" });
      setSavingExit(false);
    }
  }

  if (phase === "pillars" && product === "workshop") {
    return (
      <div className="relative min-h-dvh bg-slate-50">
        <MaturityPortalFooterMode mode="pack" />
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <BrandLoadingOverlay show={savingExit} label="Saving and returning" />
          <div className="mb-6 flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-800">
              <Link href={listHref}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Exit
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSaveAndExit()}>
              <Bookmark className="mr-2 h-4 w-4" /> Save & exit
            </Button>
          </div>
          <GuidedWorkshopPillarPicker
            pillars={pillarSummaries}
            overallProgressPct={progress.progressPct}
            allComplete={progress.allComplete}
            onSelectPillar={(pillarId) => {
              const index = snapshots.findIndex((snapshot) => snapshot.pillarId === pillarId);
              setStepIndex(index >= 0 ? index : 0);
              setPhase("questions");
            }}
            onReview={() => setPhase("review")}
          />
        </div>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="brand-canvas-shell relative min-h-dvh bg-slate-50">
        <MaturityPortalFooterMode mode="pack" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--theme-brand)_18%,transparent),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <BrandLoadingOverlay show={submitting} label={copy.preparingReportLabel} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-800">
              <Link href={listHref}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Exit
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              {product === "workshop" && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPhase("pillars")}>
                  Pillar overview
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setPhase("questions")}>
                Back to questions
              </Button>
            </div>
          </div>
          <MaturityPackReviewPanel
            product={product}
            snapshots={snapshots}
            answersById={answersById}
            organizationName={organizationName}
            submitting={submitting}
            onEditStep={(index) => {
              setStepIndex(index);
              setPhase("questions");
            }}
            onBackToQuestions={() => setPhase("questions")}
            onSubmit={() => void handleSubmit()}
          />
        </div>
      </div>
    );
  }

  if (!current) {
    return <p className="p-8 text-center text-slate-500">This session has no questions yet.</p>;
  }

  const nextSnapshot = snapshots[stepIndex + 1] ?? null;
  const nextAreaLabel =
    nextSnapshot && nextSnapshot.pillarId !== current.pillarId ? nextSnapshot.pillarLabel : null;
  const contentMax = viewMode === "list" ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="brand-canvas-shell relative min-h-dvh bg-slate-50">
      <MaturityPortalFooterMode mode="pack" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--theme-brand)_18%,transparent),transparent)]" />
      <div className={cn("relative mx-auto px-4 pb-32 pt-8 sm:px-6", contentMax)}>
        <BrandLoadingOverlay
          show={submitting || savingExit}
          label={savingExit ? "Saving and returning" : copy.preparingReportLabel}
        />

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-800">
            <Link href={listHref}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Exit
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <QuestionViewToggle mode={viewMode} onChange={updateViewMode} />
            {saving && <p className="text-xs font-medium text-slate-400">Saving…</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSaveAndExit()}>
              <Bookmark className="mr-1.5 h-4 w-4" /> Save & exit
            </Button>
          </div>
        </div>

        {viewMode === "focus" && <PackWizardPhaseStepper phase="questions" product={product} />}

        {viewMode === "focus" ? (
          <div className="brand-elevated-card overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/[0.08] ring-1 ring-slate-900/[0.04]">
            <MaturityPackQuestionChrome
              product={product}
              snapshots={snapshots}
              stepIndex={stepIndex}
              progressPct={progress.progressPct}
              answeredCount={progress.answered}
              answersById={answersById}
              organizationName={organizationName}
              onGoToStep={goToStep}
            />

            <div
              className={cn(
                "px-6 py-8 transition-all duration-200 sm:px-8 sm:py-9",
                stepTransition ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
              )}
            >
              {progress.allComplete && (
                <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {copy.allAnsweredBanner}
                </div>
              )}

              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-theme-brand">
                Question {stepIndex + 1} of {snapshots.length}
              </p>
              <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.7rem]">
                {current.prompt}
              </h1>
              {current.helpText && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
                  {current.helpText}
                </p>
              )}

              <div className="mt-8">
                <PillarAnswerPicker
                  variant="survey"
                  value={currentAnswer?.answer ?? null}
                  disabled={saving}
                  onChange={(answer) => {
                    void saveAnswer(current.id, answer, currentAnswer?.notes ?? notesDraft);
                  }}
                />
              </div>

              {currentAnswer && nextAreaLabel && (
                <p className="mt-5 text-sm text-slate-500">
                  Next area: <span className="font-medium text-slate-800">{nextAreaLabel}</span>
                </p>
              )}

              <label className="mt-8 block">
                <span className="text-sm font-medium text-slate-700">
                  {copy.notesLabel}{" "}
                  <span className="font-normal text-slate-400">{copy.notesHint}</span>
                </span>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  onBlur={() => {
                    if (currentAnswer) void saveAnswer(current.id, currentAnswer.answer, notesDraft);
                  }}
                  rows={3}
                  placeholder={copy.notesPlaceholder}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-inner transition-all placeholder:text-slate-400 focus:border-[var(--theme-brand)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]"
                />
              </label>
            </div>
          </div>
        ) : (
          <MaturityPackListView
            organizationName={organizationName}
            title={title}
            modeLabel={copy.modeLabel}
            snapshots={snapshots}
            pillarGroups={pillarGroups}
            answersById={answersById}
            stepIndex={stepIndex}
            progressPct={progress.progressPct}
            answeredCount={progress.answered}
            allComplete={progress.allComplete}
            saving={saving}
            notesOpenId={notesOpenId}
            notesPlaceholder={copy.notesPlaceholder}
            onSelectStep={setStepIndex}
            onAnswer={(questionId, answer, notes) => {
              void saveAnswer(questionId, answer, notes);
            }}
            onOpenNotes={setNotesOpenId}
          />
        )}

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className={cn("mx-auto flex items-center justify-between gap-3", contentMax)}>
            <div className="flex min-w-0 items-center gap-2">
              {product === "workshop" && (
                <Button type="button" variant="outline" onClick={() => setPhase("pillars")}>
                  Pillars
                </Button>
              )}
              {viewMode === "focus" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={stepIndex === 0}
                  onClick={() => goToStep(Math.max(0, stepIndex - 1))}
                  className="text-slate-600"
                >
                  Previous
                </Button>
              ) : (
                <p className="truncate text-xs text-slate-500">
                  {progress.answered} of {snapshots.length} answered · {progress.progressPct}%
                </p>
              )}
            </div>
            {viewMode === "list" || stepIndex === snapshots.length - 1 ? (
              <Button
                type="button"
                onClick={() => setPhase("review")}
                className="gap-1.5 shadow-lg shadow-slate-900/10"
                size="lg"
              >
                {progress.allComplete ? (
                  <>
                    Review your answers
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  "Review"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                disabled={!currentAnswer}
                onClick={() => goToStep(Math.min(snapshots.length - 1, stepIndex + 1))}
                className="shadow-lg shadow-slate-900/10"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
