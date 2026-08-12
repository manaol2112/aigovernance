"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import type { MaturityLevel, MaturityDocumentStatus, MaturitySurvey } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaturityLevelPicker } from "@/components/maturity-level-picker";
import {
  MaturityDocumentationChecklist,
  type DocumentResponseState,
} from "@/components/maturity-documentation-checklist";
import { MATURITY_LEVEL_GUIDANCE } from "@/lib/maturity-survey-constants";
import { cn } from "@/lib/utils";
import { getSurveyModeMeta, type SurveyMode } from "@/lib/maturity-survey-mode";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import { computeSurveyProgress, isStepAnswered, buildSurveyResponsesByStepKey, surveyStepResponseKeyFromStep } from "@/lib/maturity-survey-progress";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import {
  buildDocumentationChecklistGroups,
  countDocumentationChecklistItems,
  isDocumentationChecklistComplete,
} from "@/lib/maturity-survey-documents";
import { toast } from "@/components/ui/toast";
import { CLIENT_TERMS } from "@/lib/maturity-client-copy";
import {
  formatOfTotal,
  formatProgressOf,
  formatRemainingUnit,
  formatUnitCount,
} from "@/lib/format-unit-count";

type SurveyResponse = {
  controlId: string;
  pillarId: string;
  maturity: MaturityLevel;
  notes: string | null;
};

type WizardPhase = "questions" | "documentation";

function WizardPhaseStepper({
  phase,
  showDocumentation,
}: {
  phase: WizardPhase;
  showDocumentation: boolean;
}) {
  if (!showDocumentation) return null;

  const steps = [
    { id: "questions" as const, label: "Questions" },
    { id: "documentation" as const, label: "Documentation" },
  ];

  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const active = phase === step.id;
        const done = step.id === "questions" && phase === "documentation";
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
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const progress = useMemo(
    () => computeSurveyProgress(initial.catalog, responseList),
    [initial.catalog, responseList]
  );

  const { steps, totalSteps, allComplete, unansweredSteps, progressPct } = progress;

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
    if (phase !== "questions") return;
    const saved = survey.currentStepIndex ?? 0;
    const clamped = Math.min(saved, Math.max(0, totalSteps - 1));
    setStepIndex(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey.id, totalSteps, phase]);

  const current = steps[stepIndex];
  const isLastStep = stepIndex >= totalSteps - 1;

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
    setNotesDraft(existing?.notes ?? "");
  }, [current?.control.id, existing?.notes]);

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

  async function saveResponse(patch: Partial<Pick<SurveyResponse, "maturity" | "notes">>) {
    if (!current) return;
    const maturity = patch.maturity ?? existing?.maturity;
    if (!maturity) return;

    setSaving(true);
    setShowSavedHint(false);
    try {
      const res = await fetch(`/api/maturity-surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlId: current.control.id,
          pillarId: current.pillarId,
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

  async function saveNotes(notes: string) {
    if (!current || !existing?.maturity) return;
    const trimmed = notes.trim();
    if ((existing.notes ?? "") === trimmed) return;

    setSavingNotes(true);
    try {
      const res = await fetch(`/api/maturity-surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlId: current.control.id,
          pillarId: current.pillarId,
          maturity: existing.maturity,
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
    const clamped = Math.max(0, Math.min(index, totalSteps - 1));
    if (clamped === stepIndex) return;

    if (existing?.maturity && notesDraft !== (existing.notes ?? "")) {
      await saveNotes(notesDraft);
    }

    setStepTransition(true);
    setShowSavedHint(false);
    await new Promise((r) => setTimeout(r, 120));
    setStepIndex(clamped);
    await persistStepIndex(clamped);
    setStepTransition(false);
    requestAnimationFrame(() => scrollToQuestion());
  }

  async function handleContinue() {
    if (!currentAnswered) return;
    if (isLastStep) return;
    await goToStep(stepIndex + 1);
  }

  function handleGoToDocumentation() {
    if (!allComplete) return;
    setPhase("documentation");
    requestAnimationFrame(() => scrollToQuestion());
  }

  async function handleSubmit() {
    if (showDocumentationPhase && !documentationComplete) {
      toast("Please set a status for each document in the checklist.", { variant: "error" });
      return;
    }

    if (!showDocumentationPhase && !allComplete) {
      const labels = unansweredSteps.map((s) => s.pillarLabel).slice(0, 3);
      toast(
        labels.length > 0
          ? `Still need answers for: ${labels.join(", ")}${unansweredSteps.length > 3 ? "…" : ""}`
          : "Please answer all questions first.",
        { variant: "error" }
      );
      if (unansweredSteps[0]) {
        const idx = steps.findIndex(
          (s) =>
            s.pillarId === unansweredSteps[0].pillarId &&
            s.control.id === unansweredSteps[0].control.id
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
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "documentation") {
    return (
      <div className="mx-auto max-w-2xl pb-28">
        <div ref={questionAnchorRef} className="scroll-mt-6" />

        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-slate-500">
            <Link href="/maturity-assessment">
              <ArrowLeft className="mr-1 h-4 w-4" /> Exit
            </Link>
          </Button>

          <WizardPhaseStepper phase="documentation" showDocumentation={showDocumentationPhase} />

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

  if (!current || totalSteps === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-slate-500">
        No survey questions in scope for the selected frameworks.
      </div>
    );
  }

  const nextStep = !isLastStep ? steps[stepIndex + 1] : null;
  const readyForDocumentation = allComplete && showDocumentationPhase;

  return (
    <div className="mx-auto max-w-2xl pb-28">
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

        <WizardPhaseStepper phase="questions" showDocumentation={showDocumentationPhase} />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{modeMeta.label}</Badge>
          <span className="text-sm text-slate-400">
            {survey.organizationName?.trim() || "Your organization"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-600">
            {formatProgressOf(stepIndex + 1, totalSteps, "Question")}
          </p>
          <p className="text-sm tabular-nums text-indigo-600">{progressPct}% complete</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {steps.map((s, i) => {
            const done = isStepAnswered(s, responsesByStepKey);
            return (
              <button
                key={`${s.pillarId}-${s.stepIndex}`}
                type="button"
                title={s.pillarLabel}
                onClick={() => goToStep(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === stepIndex ? "w-6 bg-indigo-600" : "w-2",
                  i !== stepIndex && done && "bg-emerald-400",
                  i !== stepIndex && !done && "bg-slate-200 hover:bg-slate-300"
                )}
              />
            );
          })}
        </div>
      </div>

      {readyForDocumentation && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <ClipboardList className="h-4 w-4 shrink-0" />
          All control questions answered — continue to the documentation checklist next.
        </div>
      )}

      {allComplete && !showDocumentationPhase && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All questions answered — you can view your results.
        </div>
      )}

      <div
        key={stepIndex}
        className={cn(
          "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 sm:p-8",
          stepTransition ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          {current.pillarLabel}
        </p>

        {mode === "quick" ? (
          <>
            <h1 className="mt-3 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
              {criticalQ?.prompt}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{criticalQ?.subtitle}</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[10px] text-indigo-600">{current.control.code}</p>
              {seededControlIds.has(current.control.id) && (
                <Badge variant="success" className="text-[10px]">
                  {CLIENT_TERMS.fromBaseline}
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-xl font-semibold leading-snug text-slate-900">
              {current.control.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{current.control.description}</p>
          </>
        )}

        <div className="mt-6 border-t border-slate-100 pt-6">
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
          <div className="mt-6 border-t border-slate-100 pt-6">
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

        {showSavedHint && currentAnswered && selectedGuidance && !isLastStep && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-900">Answer saved</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                {selectedGuidance.label} — {selectedGuidance.headline}
              </p>
              {nextStep && (
                <p className="mt-2 text-xs text-emerald-700/80">
                  Up next: <span className="font-medium">{nextStep.pillarLabel}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={stepIndex === 0}
            onClick={() => goToStep(stepIndex - 1)}
          >
            Back
          </Button>

          <div className="flex flex-col items-end gap-1">
            {!allComplete && isLastStep && currentAnswered && (
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
            ) : isLastStep || allComplete ? (
              <Button
                type="button"
                disabled={submitting || !allComplete}
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
                {currentAnswered ? "Next question" : "Select an answer"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
