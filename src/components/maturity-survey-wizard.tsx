"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import type { MaturityLevel, MaturityDocumentStatus, MaturitySurvey } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaturityLevelPicker } from "@/components/maturity-level-picker";
import { MaturitySurveyReviewPanel } from "@/components/maturity-survey-review-panel";
import { MaturitySurveyReviewEditPanel } from "@/components/maturity-survey-review-edit-panel";
import {
  MaturitySurveyQuestionChrome,
  SURVEY_QUESTION_CARD,
} from "@/components/maturity-survey-question-chrome";
import {
  MaturityDocumentationChecklist,
  type DocumentResponseState,
} from "@/components/maturity-documentation-checklist";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import { cn } from "@/lib/utils";
import { getSurveyModeMeta, type SurveyMode } from "@/lib/maturity-survey-mode";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import { computeSurveyProgress, isStepAnswered, buildSurveyResponsesByStepKey, surveyStepResponseKeyFromStep, findStepCatalogIndex } from "@/lib/maturity-survey-progress";
import {
  buildWizardProgress,
  isDeepDiveQuestionsComplete,
  resolveInitialWizardStepIndex,
} from "@/lib/maturity-survey-wizard-state";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import type { SurveyStep } from "@/lib/maturity-survey-types";
import {
  buildDocumentationChecklistGroups,
  countDocumentationChecklistItems,
  isDocumentationChecklistComplete,
} from "@/lib/maturity-survey-documents";
import { toast } from "@/components/ui/toast";
import { BrandLoadingOverlay } from "@/components/brand-page-loader";
import { CLIENT_TERMS } from "@/lib/maturity-client-copy";
import {
  formatOfTotal,
  formatRemainingUnit,
  formatUnitCount,
} from "@/lib/format-unit-count";

type SurveyResponse = {
  controlId: string;
  pillarId: string;
  maturity: MaturityLevel;
  notes: string | null;
};

type WizardPhase = "questions" | "review" | "documentation";

function WizardPhaseStepper({
  phase,
  showDocumentation,
  showReview,
}: {
  phase: WizardPhase;
  showDocumentation: boolean;
  showReview: boolean;
}) {
  if (!showDocumentation && !showReview) return null;

  const steps = [
    { id: "questions" as const, label: "Questions" },
    ...(showReview ? [{ id: "review" as const, label: "Review" }] : []),
    ...(showDocumentation ? [{ id: "documentation" as const, label: "Documentation" }] : []),
  ];

  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const active = phase === step.id;
        const stepOrder = steps.map((s) => s.id);
        const phaseIndex = stepOrder.indexOf(phase);
        const done = phaseIndex > i;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active && "bg-indigo-600 text-white shadow-sm",
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
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <div className="mx-1 h-px w-6 bg-slate-200" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

type SurveyBundle = {
  survey: MaturitySurvey & {
    surveyMode: SurveyMode;
    parentSurveyId: string | null;
    focusPillarIds: string[];
    responses: SurveyResponse[];
    documentResponses: DocumentResponseState[];
  };
  catalog: SurveyPillarGroup[];
  seededControlIds: string[];
  focusPillarLabels: string[];
};

export function MaturitySurveyWizard({ initial }: { initial: SurveyBundle }) {
  const router = useRouter();
  const survey = initial.survey;
  const mode = (survey.surveyMode ?? "quick") as SurveyMode;
  const modeMeta = getSurveyModeMeta(mode);
  const questionAnchorRef = useRef<HTMLDivElement>(null);
  const seededControlIds = useMemo(
    () => new Set(initial.seededControlIds),
    [initial.seededControlIds]
  );
  const focusPillarLabels = initial.focusPillarLabels;
  const showDocumentationPhase = mode === "deep_dive";
  const showReviewPhase = mode === "quick";

  const checklistPillarIds = useMemo(() => {
    if (survey.focusPillarIds.length > 0) return survey.focusPillarIds;
    return initial.catalog.map((group) => group.pillarId);
  }, [survey.focusPillarIds, initial.catalog]);

  const documentationGroups = useMemo(
    () => buildDocumentationChecklistGroups(checklistPillarIds),
    [checklistPillarIds]
  );

  const totalDocumentationItems = countDocumentationChecklistItems(documentationGroups);

  const [responseList, setResponseList] = useState<SurveyResponse[]>(initial.survey.responses);
  const [documentList, setDocumentList] = useState<DocumentResponseState[]>(
    initial.survey.documentResponses
  );
  const [phase, setPhase] = useState<WizardPhase>("questions");
  const [reviewEditStepIndex, setReviewEditStepIndex] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const didInitStepRef = useRef(false);

  const progress = useMemo(
    () => buildWizardProgress(initial.catalog, responseList),
    [initial.catalog, responseList]
  );

  const { steps, totalSteps, allComplete, unansweredSteps, navigationSteps, progressPct, answeredStepCount } =
    progress;

  /** INVARIANT: stable catalog steps only — never navigationSteps (see maturity-survey-wizard-state.ts). */
  const wizardSteps = steps;
  const deepDiveQuestionsComplete = isDeepDiveQuestionsComplete(
    mode,
    progress,
    seededControlIds.size
  );

  const documentationComplete = useMemo(
    () => isDocumentationChecklistComplete(documentationGroups, documentList),
    [documentationGroups, documentList]
  );

  const documentationAnsweredCount = documentList.length;
  const documentationProgressPct =
    totalDocumentationItems > 0
      ? Math.round((documentationAnsweredCount / totalDocumentationItems) * 100)
      : 0;

  useEffect(() => {
    didInitStepRef.current = false;
    setReviewEditStepIndex(null);
  }, [survey.id]);

  useEffect(() => {
    if (phase !== "questions") return;
    if (wizardSteps.length === 0) return;
    if (didInitStepRef.current) return;

    const savedCatalogIndex = survey.currentStepIndex ?? 0;
    const initialIndex = resolveInitialWizardStepIndex(
      steps,
      navigationSteps,
      savedCatalogIndex
    );

    setStepIndex(initialIndex);
    didInitStepRef.current = true;
  }, [survey.id, phase, wizardSteps.length, navigationSteps, steps, survey.currentStepIndex]);

  useEffect(() => {
    if (wizardSteps.length === 0) return;
    if (stepIndex >= wizardSteps.length) {
      setStepIndex(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, stepIndex]);

  const current = wizardSteps[stepIndex] ?? null;
  const isLastStep = wizardSteps.length > 0 && stepIndex >= wizardSteps.length - 1;

  const responsesByStepKey = useMemo(
    () => buildSurveyResponsesByStepKey(responseList),
    [responseList]
  );

  const currentAnswered = current ? isStepAnswered(current, responsesByStepKey) : false;
  const existing = current
    ? responsesByStepKey.get(surveyStepResponseKeyFromStep(current))
    : undefined;
  const criticalQ = current ? getPillarCriticalQuestion(current.pillarId) : null;
  const selectedGuidance =
    existing?.maturity != null ? MATURITY_LEVEL_GUIDANCE[existing.maturity] : null;

  useEffect(() => {
    if (reviewEditStepIndex != null) {
      const editStep = wizardSteps[reviewEditStepIndex];
      if (!editStep) return;
      const editResponse = responsesByStepKey.get(surveyStepResponseKeyFromStep(editStep));
      setNotesDraft(editResponse?.notes ?? "");
      return;
    }
    setNotesDraft(existing?.notes ?? "");
  }, [
    reviewEditStepIndex,
    wizardSteps,
    responsesByStepKey,
    current?.control.id,
    current?.pillarId,
    existing?.notes,
  ]);

  const scrollToQuestion = useCallback(() => {
    questionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const persistStepIndex = useCallback(
    async (index: number) => {
      await fetch(`/api/maturity-surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStepIndex: index }),
      });
    },
    [survey.id]
  );

  async function saveResponse(
    patch: Partial<Pick<SurveyResponse, "maturity" | "notes">>,
    stepOverride?: SurveyStep
  ) {
    const step = stepOverride ?? current;
    if (!step) return;
    const stepKey = surveyStepResponseKeyFromStep(step);
    const stepExisting = responsesByStepKey.get(stepKey);
    const maturity = patch.maturity ?? stepExisting?.maturity;
    if (!maturity) return;

    setSaving(true);
    setShowSavedHint(false);
    try {
      const res = await fetch(`/api/maturity-surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlId: step.control.id,
          pillarId: step.pillarId,
          maturity,
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();

      setResponseList((prev) => {
        const next = prev.filter(
          (response) =>
            !(
              response.controlId === saved.controlId &&
              response.pillarId === saved.pillarId
            )
        );
        next.push({
          controlId: saved.controlId,
          pillarId: saved.pillarId,
          maturity: saved.maturity,
          notes: saved.notes,
        });
        return next;
      });

      setShowSavedHint(true);
    } catch {
      toast("Failed to save response.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes(notes: string, stepOverride?: SurveyStep) {
    const step = stepOverride ?? current;
    if (!step) return;
    const stepKey = surveyStepResponseKeyFromStep(step);
    const stepExisting = responsesByStepKey.get(stepKey);
    if (!stepExisting?.maturity) return;
    const trimmed = notes.trim();
    if ((stepExisting.notes ?? "") === trimmed) return;

    setSavingNotes(true);
    try {
      const res = await fetch(`/api/maturity-surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlId: step.control.id,
          pillarId: step.pillarId,
          maturity: stepExisting.maturity,
          notes: trimmed,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setResponseList((prev) => {
        const next = prev.filter(
          (response) =>
            !(
              response.controlId === saved.controlId &&
              response.pillarId === saved.pillarId
            )
        );
        next.push({
          controlId: saved.controlId,
          pillarId: saved.pillarId,
          maturity: saved.maturity,
          notes: saved.notes,
        });
        return next;
      });
    } catch {
      toast("Failed to save notes.", { variant: "error" });
    } finally {
      setSavingNotes(false);
    }
  }

  async function saveDocumentStatus(input: {
    documentId: string;
    pillarId: string;
    status: MaturityDocumentStatus;
  }) {
    setSavingDocumentId(input.documentId);
    try {
      const res = await fetch(`/api/maturity-surveys/${survey.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();

      setDocumentList((prev) => {
        const next = prev.filter((item) => item.documentId !== saved.documentId);
        next.push({
          documentId: saved.documentId,
          pillarId: saved.pillarId,
          status: saved.status,
        });
        return next;
      });
    } catch {
      toast("Failed to save document status.", { variant: "error" });
    } finally {
      setSavingDocumentId(null);
    }
  }

  async function goToStep(index: number) {
    if (wizardSteps.length === 0) return;
    const clamped = Math.max(0, Math.min(index, wizardSteps.length - 1));
    if (clamped === stepIndex) return;

    if (existing?.maturity && notesDraft !== (existing.notes ?? "")) {
      await saveNotes(notesDraft);
    }

    setStepTransition(true);
    setShowSavedHint(false);
    await new Promise((r) => setTimeout(r, 120));
    setStepIndex(clamped);
    const catalogIndex = findStepCatalogIndex(steps, wizardSteps[clamped]!);
    await persistStepIndex(catalogIndex >= 0 ? catalogIndex : clamped);
    setStepTransition(false);
    requestAnimationFrame(() => scrollToQuestion());
  }

  async function handleContinue() {
    if (!currentAnswered) return;
    if (isLastStep) return;
    await goToStep(stepIndex + 1);
  }

  function handleGoToReview() {
    if (!deepDiveQuestionsComplete) return;
    setReviewEditStepIndex(null);
    setPhase("review");
    requestAnimationFrame(() => scrollToQuestion());
  }

  function handleEditFromReview(index: number) {
    setReviewEditStepIndex(index);
    setStepIndex(index);
    setShowSavedHint(false);
    requestAnimationFrame(() => scrollToQuestion());
  }

  async function handleBackToReviewList() {
    if (reviewEditStepIndex == null) return;
    const editStep = wizardSteps[reviewEditStepIndex];
    if (editStep) {
      const editResponse = responsesByStepKey.get(surveyStepResponseKeyFromStep(editStep));
      if (editResponse?.maturity && notesDraft !== (editResponse.notes ?? "")) {
        await saveNotes(notesDraft, editStep);
      }
    }
    setReviewEditStepIndex(null);
    setShowSavedHint(false);
    requestAnimationFrame(() => scrollToQuestion());
  }

  function handleGoToDocumentation() {
    if (!deepDiveQuestionsComplete) return;
    setPhase("documentation");
    requestAnimationFrame(() => scrollToQuestion());
  }

  async function handleSubmit() {
    if (showDocumentationPhase && !documentationComplete) {
      toast("Please set a status for each document in the checklist.", { variant: "error" });
      return;
    }

    if (!showDocumentationPhase && !deepDiveQuestionsComplete) {
      const labels = unansweredSteps.map((s) => s.pillarLabel).slice(0, 3);
      toast(
        labels.length > 0
          ? `Still need answers for: ${labels.join(", ")}${unansweredSteps.length > 3 ? "…" : ""}`
          : "Please answer all questions first.",
        { variant: "error" }
      );
      if (unansweredSteps[0]) {
        const idx = wizardSteps.findIndex(
          (step) =>
            step.pillarId === unansweredSteps[0]!.pillarId &&
            step.control.id === unansweredSteps[0]!.control.id
        );
        if (idx >= 0) void goToStep(idx);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/maturity-surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submit failed");
      }
      toast("Assessment complete.", { variant: "success" });
      router.push(`/maturity-assessment/${survey.id}/results`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to submit.", { variant: "error" });
      setSubmitting(false);
    }
  }

  if (phase === "review") {
    const reviewEditStep =
      reviewEditStepIndex != null ? wizardSteps[reviewEditStepIndex] ?? null : null;
    const reviewEditKey = reviewEditStep
      ? surveyStepResponseKeyFromStep(reviewEditStep)
      : null;
    const reviewEditResponse = reviewEditKey
      ? responsesByStepKey.get(reviewEditKey)
      : undefined;

    return (
      <div className="mx-auto max-w-2xl">
        <BrandLoadingOverlay show={submitting} label="Preparing your report" />
        <div ref={questionAnchorRef} className="scroll-mt-6" />

        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-slate-500">
            <Link href="/maturity-assessment">
              <ArrowLeft className="mr-1 h-4 w-4" /> Exit
            </Link>
          </Button>

          <WizardPhaseStepper
            phase="review"
            showDocumentation={showDocumentationPhase}
            showReview={showReviewPhase}
          />
        </div>

        {reviewEditStep ? (
          <MaturitySurveyReviewEditPanel
            step={reviewEditStep}
            mode={mode}
            maturity={reviewEditResponse?.maturity ?? null}
            notes={notesDraft}
            saving={saving}
            savingNotes={savingNotes}
            showSavedHint={showSavedHint}
            onMaturityChange={(level) => void saveResponse({ maturity: level }, reviewEditStep)}
            onNotesChange={setNotesDraft}
            onNotesBlur={() => void saveNotes(notesDraft, reviewEditStep)}
            onBackToReview={() => void handleBackToReviewList()}
          />
        ) : (
          <MaturitySurveyReviewPanel
            steps={wizardSteps}
            responsesByStepKey={responsesByStepKey}
            organizationName={survey.organizationName}
            submitting={submitting}
            onEditStep={handleEditFromReview}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    );
  }

  if (phase === "documentation") {
    return (
      <div className="mx-auto max-w-2xl pb-28">
        <BrandLoadingOverlay show={submitting} label="Preparing your report" />
        <div ref={questionAnchorRef} className="scroll-mt-6" />

        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-slate-500">
            <Link href="/maturity-assessment">
              <ArrowLeft className="mr-1 h-4 w-4" /> Exit
            </Link>
          </Button>

          <WizardPhaseStepper phase="documentation" showDocumentation={showDocumentationPhase} showReview={showReviewPhase} />

          <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white px-4 py-4 shadow-sm">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
              <ClipboardList className="h-3.5 w-3.5" />
              Documentation checklist
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              What do you have in place?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Review expected artifacts for your assessed pillar
              {focusPillarLabels.length === 1 ? ` (${focusPillarLabels[0]})` : "s"} and mark the
              current status of each document.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-600">
              {formatOfTotal(documentationAnsweredCount, totalDocumentationItems, "documents reviewed")}
            </p>
            <p className="text-sm tabular-nums text-indigo-600">{documentationProgressPct}%</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${documentationProgressPct}%` }}
            />
          </div>
        </div>

        {documentationComplete && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Checklist complete — ready to view your results.
          </div>
        )}

        <MaturityDocumentationChecklist
          groups={documentationGroups}
          responses={documentList}
          savingDocumentId={savingDocumentId}
          onStatusChange={saveDocumentStatus}
        />

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setPhase("questions")}>
              Back to questions
            </Button>
            <Button
              type="button"
              disabled={submitting || !documentationComplete}
              onClick={handleSubmit}
              className="gap-1.5"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Finalizing your report…
                </>
              ) : (
                <>
                  View results
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (totalSteps === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-slate-500">
        No survey questions in scope for the selected frameworks.
      </div>
    );
  }

  const readyForDocumentation = deepDiveQuestionsComplete && showDocumentationPhase;

  if (readyForDocumentation && mode === "deep_dive" && totalSteps === 0) {
    return (
      <div className="mx-auto max-w-2xl pb-28">
        <div ref={questionAnchorRef} className="scroll-mt-6" />

        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-slate-500">
            <Link href="/maturity-assessment">
              <ArrowLeft className="mr-1 h-4 w-4" /> Exit
            </Link>
          </Button>

          <WizardPhaseStepper phase="questions" showDocumentation={showDocumentationPhase} showReview={showReviewPhase} />

          {mode === "deep_dive" && survey.parentSurveyId && (
            <div className="mb-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {CLIENT_TERMS.detailedPillarAssessment}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {focusPillarLabels.length > 0
                  ? `Focused on ${focusPillarLabels.join(", ")}`
                  : "Building on your baseline scan"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {formatUnitCount(seededControlIds.size, "baseline answer", "baseline answers")}{" "}
                carried forward — only new follow-up questions remain.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Control questions complete</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {mode === "deep_dive"
                ? "Your baseline answers were carried forward. Continue to the documentation checklist to finish this deep dive."
                : "All control questions are answered. You can view your results or continue to documentation."}
            </p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl justify-end">
            <Button type="button" onClick={handleGoToDocumentation} className="gap-1.5" size="lg">
              Continue to documentation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-slate-500">
        No survey questions in scope for the selected frameworks.
      </div>
    );
  }

  const nextStep = !isLastStep ? wizardSteps[stepIndex + 1] : null;

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <BrandLoadingOverlay show={submitting} label="Preparing your report" />
      <div ref={questionAnchorRef} className="scroll-mt-6" />

      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-slate-500">
          <Link href="/maturity-assessment">
            <ArrowLeft className="mr-1 h-4 w-4" /> Exit
          </Link>
        </Button>

        {mode === "deep_dive" && survey.parentSurveyId && (
          <div className="mb-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {CLIENT_TERMS.detailedPillarAssessment}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {focusPillarLabels.length > 0
                ? `Focused on ${focusPillarLabels.join(", ")}`
                : "Building on your baseline scan"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {formatUnitCount(seededControlIds.size, "baseline answer", "baseline answers")}{" "}
              carried forward. After the control questions, you&apos;ll review a documentation
              checklist for what you have in place.
            </p>
          </div>
        )}

        <WizardPhaseStepper phase="questions" showDocumentation={showDocumentationPhase} showReview={showReviewPhase} />

        <div className="mt-4">
          <MaturitySurveyQuestionChrome
            steps={wizardSteps}
            stepIndex={stepIndex}
            progressPct={progressPct}
            answeredStepCount={answeredStepCount}
            responsesByStepKey={responsesByStepKey}
            organizationName={survey.organizationName}
            modeLabel={modeMeta.label}
            onGoToStep={(index) => void goToStep(index)}
          />
        </div>
      </div>

      {readyForDocumentation && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <ClipboardList className="h-4 w-4 shrink-0" />
          All control questions answered — continue to the documentation checklist next.
        </div>
      )}

      {allComplete && !showDocumentationPhase && !showReviewPhase && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All questions answered — you can view your results.
        </div>
      )}

      <div
        key={stepIndex}
        className={cn(
          SURVEY_QUESTION_CARD,
          "mt-5 transition-all duration-300",
          stepTransition ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
        )}
      >
        {mode === "quick" ? (
          <>
            <h1 className="text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">
              {criticalQ?.prompt}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{criticalQ?.subtitle}</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[10px] font-medium text-indigo-600">{current.control.code}</p>
              {seededControlIds.has(current.control.id) && (
                <Badge variant="success" className="text-[10px]">
                  {CLIENT_TERMS.fromBaseline}
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-slate-900">
              {current.control.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{current.control.description}</p>
          </>
        )}

        <div className="mt-8 border-t border-slate-100 pt-8">
          <MaturityLevelPicker
            value={existing?.maturity ?? null}
            disabled={saving}
            variant="survey"
            guideInitiallyOpen={stepIndex === 0}
            showGoodLooksLikeHints={mode === "quick"}
            onChange={(level) => {
              void saveResponse({ maturity: level });
            }}
          />
        </div>

        {currentAnswered && (
          <div className="mt-8 border-t border-slate-100 pt-8">
            <label htmlFor="question-notes" className="text-sm font-medium text-slate-700">
              Optional context{" "}
              <span className="font-normal text-slate-400">(visible in your report)</span>
            </label>
            <textarea
              id="question-notes"
              rows={3}
              value={notesDraft}
              disabled={savingNotes}
              placeholder="Add context for leadership — e.g. current state, blockers, or owners."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => void saveNotes(notesDraft)}
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

        {showSavedHint && currentAnswered && selectedGuidance && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-900">Answer saved</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                {selectedGuidance.label} — {selectedGuidance.headline}
              </p>
              {isLastStep && showReviewPhase ? (
                <p className="mt-2 text-xs text-emerald-700/80">
                  Final pillar complete — review all answers before submitting your baseline report.
                </p>
              ) : (
                nextStep && (
                  <p className="mt-2 text-xs text-emerald-700/80">
                    Up next: <span className="font-medium">{nextStep.pillarLabel}</span>
                  </p>
                )
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={stepIndex === 0}
            onClick={() => goToStep(stepIndex - 1)}
            className="text-slate-600"
          >
            Previous pillar
          </Button>

          <div className="flex flex-col items-end gap-1">
            {!deepDiveQuestionsComplete && isLastStep && currentAnswered && (
              <p className="text-[11px] text-amber-600">
                {formatRemainingUnit(unansweredSteps.length, "question")}
              </p>
            )}
            {readyForDocumentation ? (
              <Button
                type="button"
                onClick={handleGoToDocumentation}
                className="gap-1.5"
                size="lg"
              >
                Continue to documentation
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : showReviewPhase && isLastStep && currentAnswered && deepDiveQuestionsComplete ? (
              <Button
                type="button"
                onClick={handleGoToReview}
                className="gap-1.5 shadow-lg shadow-indigo-500/15"
                size="lg"
              >
                Review your answers
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : !showReviewPhase && deepDiveQuestionsComplete ? (
              <Button
                type="button"
                disabled={submitting || !deepDiveQuestionsComplete}
                onClick={handleSubmit}
                className="gap-1.5"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Finalizing your report…
                  </>
                ) : (
                  <>
                    View results
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleContinue}
                disabled={!currentAnswered || saving}
                className={cn(
                  "gap-1.5 transition-all",
                  showSavedHint && currentAnswered && "ring-2 ring-indigo-300 ring-offset-2"
                )}
                size="lg"
              >
                {currentAnswered ? "Next pillar" : "Select a maturity level"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
