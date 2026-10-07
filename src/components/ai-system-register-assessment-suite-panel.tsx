"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  List,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { registerFetch } from "@/lib/ai-system-register-actor-client";
import {
  ASSESSMENT_MODULE_QUESTIONS,
  MODULE_RISK_RATING_OPTIONS,
  emptyModuleState,
  findNextTriggeredAssessment,
  isModuleRiskRating,
  isTriggeredAssessmentDone,
  type AssessmentModuleState,
  type AssessmentSuiteState,
  type AssessmentTriggerResult,
  type ModuleAnswerValue,
  type ModuleRiskRating,
  type RegisterAssessmentTypeId,
} from "@/lib/ai-system-register-assessment-triggers";
import { cn, titleCase } from "@/lib/utils";

const MODULE_OPTIONS: Array<{ value: ModuleAnswerValue; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
  { value: "na", label: "N/A" },
];

function scrollAdminMainToTop() {
  document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
}

function statusMeta(
  assessmentType: RegisterAssessmentTypeId,
  module: AssessmentModuleState | undefined,
  formalRiskStatus: string
): { label: string; className: string } {
  if (assessmentType === "formal_risk") {
    if (formalRiskStatus === "completed") {
      return { label: "Completed", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    }
    if (formalRiskStatus === "stale") {
      return { label: "Stale", className: "bg-amber-50 text-amber-900 border-amber-200" };
    }
    if (formalRiskStatus === "in_progress") {
      return { label: "In progress", className: "bg-sky-50 text-sky-900 border-sky-200" };
    }
    return { label: "Not started", className: "bg-slate-50 text-slate-600 border-slate-200" };
  }
  const status = module?.status ?? "not_started";
  if (status === "completed") {
    return { label: "Completed", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (status === "waived") {
    return { label: "Waived", className: "bg-violet-50 text-violet-900 border-violet-200" };
  }
  if (status === "stale") {
    return {
      label: "Needs re-affirmation",
      className: "bg-amber-50 text-amber-900 border-amber-200",
    };
  }
  if (status === "in_progress") {
    return { label: "In progress", className: "bg-sky-50 text-sky-900 border-sky-200" };
  }
  return { label: "Not started", className: "bg-slate-50 text-slate-600 border-slate-200" };
}

function actionLabel(
  assessmentType: RegisterAssessmentTypeId,
  module: AssessmentModuleState | undefined,
  formalRiskStatus: string
): { label: string; kind: "start" | "continue" | "view" } {
  if (assessmentType === "formal_risk") {
    if (formalRiskStatus === "in_progress") return { label: "Continue final rating", kind: "continue" };
    if (formalRiskStatus === "completed" || formalRiskStatus === "stale") {
      return { label: "View", kind: "view" };
    }
    return { label: "Finalize rating", kind: "start" };
  }
  const status = module?.status ?? "not_started";
  if (status === "in_progress") return { label: "Continue", kind: "continue" };
  if (status === "completed" || status === "waived") return { label: "View", kind: "view" };
  return { label: "Start", kind: "start" };
}

type HandoffState = {
  completedType: RegisterAssessmentTypeId;
  completedTitle: string;
  next: AssessmentTriggerResult | null;
};

export function AiSystemRegisterAssessmentSuitePanel({
  systemId,
  formalRiskStatus,
  onOpenFormalRisk,
  justCompletedType,
  onConsumeJustCompleted,
  initialSuite,
}: {
  systemId: string;
  formalRiskStatus: string;
  onOpenFormalRisk: () => void;
  justCompletedType?: RegisterAssessmentTypeId | null;
  onConsumeJustCompleted?: () => void;
  initialSuite?: unknown;
}) {
  const [suite, setSuite] = useState<AssessmentSuiteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<RegisterAssessmentTypeId | null>(null);
  const [answers, setAnswers] = useState<Record<string, ModuleAnswerValue>>({});
  const [notes, setNotes] = useState("");
  const [waiveReason, setWaiveReason] = useState("");
  const [riskRating, setRiskRating] = useState<ModuleRiskRating | null>(null);
  const [riskRatingRationale, setRiskRatingRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const onConsumeJustCompletedRef = useRef(onConsumeJustCompleted);
  onConsumeJustCompletedRef.current = onConsumeJustCompleted;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${systemId}/assessment-suite`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load assessment suite");
      setSuite(data as AssessmentSuiteState);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load assessment suite.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialSuite || suite) return;
  }, [initialSuite, suite]);

  useEffect(() => {
    if (!justCompletedType || !suite) return;
    const completedType = justCompletedType;
    const completed = suite.triggered.find((item) => item.assessmentType === completedType);
    setActiveType(null);
    setHandoff({
      completedType,
      completedTitle: completed?.title ?? "Assessment",
      next: findNextTriggeredAssessment(suite, formalRiskStatus, completedType),
    });
    onConsumeJustCompletedRef.current?.();
    requestAnimationFrame(() => scrollAdminMainToTop());
  }, [justCompletedType, suite, formalRiskStatus]);

  const active = useMemo(
    () => suite?.triggered.find((item) => item.assessmentType === activeType) ?? null,
    [suite, activeType]
  );

  function openAssessment(type: RegisterAssessmentTypeId) {
    setHandoff(null);
    if (type === "formal_risk") {
      onOpenFormalRisk();
      return;
    }
    const moduleState = suite?.modules[type] ?? emptyModuleState();
    setActiveType(type);
    setAnswers({ ...moduleState.answers });
    setNotes(moduleState.notes ?? "");
    setWaiveReason(moduleState.waivedReason ?? "");
    setRiskRating(isModuleRiskRating(moduleState.riskRating) ? moduleState.riskRating : null);
    setRiskRatingRationale(moduleState.riskRatingRationale ?? "");
    requestAnimationFrame(() => scrollAdminMainToTop());
  }

  function closeWorkspace() {
    setActiveType(null);
    requestAnimationFrame(() => scrollAdminMainToTop());
  }

  async function saveModule(action: "save_module" | "complete" | "waive") {
    if (!activeType || activeType === "formal_risk") return;
    if ((action === "complete" || action === "waive") && !isModuleRiskRating(riskRating)) {
      toast("Assign a risk rating for this assessment before finishing.", { variant: "error" });
      return;
    }
    if (
      (action === "complete" || action === "waive") &&
      riskRatingRationale.trim().length < 20
    ) {
      toast("Add a rating rationale (at least 20 characters) before finishing.", {
        variant: "error",
      });
      return;
    }
    if (action === "waive" && !waiveReason.trim()) {
      toast("Waiver rationale is required.", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${systemId}/assessment-suite`, {
        method: "POST",
        body: JSON.stringify({
          action,
          assessmentType: activeType,
          answers,
          notes,
          waivedReason: waiveReason,
          riskRating,
          riskRatingRationale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save assessment");
      const nextSuite = data as AssessmentSuiteState;
      setSuite(nextSuite);

      if (action === "complete" || action === "waive") {
        const completed = nextSuite.triggered.find((item) => item.assessmentType === activeType);
        const next = findNextTriggeredAssessment(nextSuite, formalRiskStatus, activeType);
        setActiveType(null);
        setHandoff({
          completedType: activeType,
          completedTitle: completed?.title ?? "Assessment",
          next,
        });
        toast(action === "complete" ? "Assessment completed." : "Assessment waived.", {
          variant: "success",
        });
        requestAnimationFrame(() => scrollAdminMainToTop());
      } else {
        toast("Progress saved.", { variant: "success" });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Save failed.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const requiredCount = suite?.triggered.filter((item) => item.priority === "required").length ?? 0;
  const completedCount =
    suite?.triggered.filter((item) => isTriggeredAssessmentDone(item, suite, formalRiskStatus))
      .length ?? 0;
  const remainingRequired =
    suite?.triggered.filter(
      (item) =>
        item.priority === "required" && !isTriggeredAssessmentDone(item, suite, formalRiskStatus)
    ).length ?? 0;

  const questions =
    active && active.assessmentType !== "formal_risk"
      ? ASSESSMENT_MODULE_QUESTIONS[
          active.assessmentType as Exclude<RegisterAssessmentTypeId, "formal_risk">
        ]
      : [];
  const answeredCount = questions.filter((question) => answers[question.id]).length;

  const handoffCard = handoff ? (
    <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 shadow-sm">
      <div className="px-6 py-6 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {handoff.next ? "Nice progress" : "Suite complete"}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
              {handoff.completedTitle} is done
            </h3>
            {handoff.next ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Next up:{" "}
                  <span className="font-semibold text-slate-900">{handoff.next.title}</span>
                  {handoff.next.priority === "required" ? " (required)" : " (recommended)"}.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="rounded-xl"
                    onClick={() => openAssessment(handoff.next!.assessmentType)}
                  >
                    Continue to next assessment
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setHandoff(null)}
                  >
                    <List className="h-4 w-4" />
                    Stay on assessment list
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  All triggered assessments for this use case are complete or waived.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 rounded-xl"
                  onClick={() => setHandoff(null)}
                >
                  <List className="h-4 w-4" />
                  Review assessment list
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Focused workspace — replaces the suite list so the user never scrolls past it.
  if (active && active.assessmentType !== "formal_risk") {
    return (
      <section className="space-y-4 pb-28">
        <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={closeWorkspace}
            >
              <List className="h-4 w-4" />
              All assessments
            </Button>
            <p className="text-xs text-slate-500">
              {completedCount}/{suite?.triggered.length ?? 0} suite complete
              {remainingRequired > 0
                ? ` · ${remainingRequired} required remaining`
                : ""}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Assessment workspace
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {active.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      active.priority === "required"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    )}
                  >
                    {active.priority}
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                  {active.description}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Progress
                </p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {answeredCount}/{questions.length}
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-300"
                style={{
                  width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-3 px-5 py-5 sm:px-7">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-4 sm:px-5"
              >
                <p className="text-sm font-semibold text-slate-900">
                  <span className="mr-2 font-mono text-[11px] text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {question.prompt}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MODULE_OPTIONS.map((option) => {
                    const selected = answers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option.value,
                          }))
                        }
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <label className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
              <span className="text-sm font-semibold text-slate-700">Notes / evidence pointers</span>
              <textarea
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Link to DPIA, model card, fairness report, ticket IDs…"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-5 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Required · Assessment risk rating
              </p>
              <h4 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
                Rate residual risk for this assessment
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                This rating becomes an input to the final Formal AI Risk Assessment. Complete or
                waive only after you assign a rating.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {MODULE_RISK_RATING_OPTIONS.map((option) => {
                  const selected = riskRating === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRiskRating(option.value)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left transition",
                        selected
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span
                        className={cn(
                          "mt-1 block text-xs leading-relaxed",
                          selected ? "text-slate-300" : "text-slate-500"
                        )}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Rating rationale (required to complete / waive)
                <textarea
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                  rows={2}
                  value={riskRatingRationale}
                  onChange={(event) => setRiskRatingRationale(event.target.value)}
                  placeholder="Why this residual rating for this assessment area (min. 20 characters)…"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Waiver (optional)
              </p>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="If waiving, explain why this assessment is not applicable…"
                value={waiveReason}
                onChange={(event) => setWaiveReason(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={closeWorkspace}
            >
              <ArrowLeft className="h-4 w-4" />
              All assessments
            </Button>
            <p className="hidden text-xs text-slate-500 sm:block">
              {answeredCount} of {questions.length} answered
              {riskRating ? ` · Rated ${riskRating}` : " · Rating required to finish"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={saving}
                onClick={() => void saveModule("save_module")}
              >
                Save progress
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={saving || !riskRating || riskRatingRationale.trim().length < 20}
                onClick={() => void saveModule("complete")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-slate-500"
                disabled={
                  saving ||
                  !waiveReason.trim() ||
                  !riskRating ||
                  riskRatingRationale.trim().length < 20
                }
                onClick={() => void saveModule("waive")}
              >
                Waive
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {handoffCard}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Auto-determined assessment suite
              </p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">
                Required assessments for this use case
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                Complete detailed assessments first. The Formal AI Risk Assessment is last — it
                consolidates those findings into overall inherent / residual risk and treatment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Progress
                </p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {completedCount}/{suite?.triggered.length ?? 0}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
          {remainingRequired > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              {remainingRequired} required assessment{remainingRequired === 1 ? "" : "s"} still open
            </p>
          ) : requiredCount > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All required assessments are complete
            </p>
          ) : null}
        </div>

        <div className="px-6 py-5 sm:px-7">
          {loading && !suite ? (
            <p className="text-sm text-slate-500">Determining assessments…</p>
          ) : !suite?.triggered.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500">
              No specialized assessments triggered yet. Complete the register profile (data,
              decisions, model, criticality) to generate the suite. A baseline formal risk
              assessment is usually recommended.
            </div>
          ) : (
            <ul className="space-y-3">
              {suite.triggered.map((item) => {
                const moduleState = suite.modules[item.assessmentType];
                const status = statusMeta(
                  item.assessmentType,
                  moduleState,
                  formalRiskStatus
                );
                const action = actionLabel(
                  item.assessmentType,
                  moduleState,
                  formalRiskStatus
                );
                const done = isTriggeredAssessmentDone(item, suite, formalRiskStatus);
                const isNext = handoff?.next?.assessmentType === item.assessmentType;
                return (
                  <li key={item.assessmentType}>
                    <button
                      type="button"
                      onClick={() => openAssessment(item.assessmentType)}
                      className={cn(
                        "group flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition sm:px-5",
                        done
                          ? "border-emerald-100 bg-emerald-50/30 hover:border-emerald-200 hover:bg-emerald-50/50"
                          : isNext
                            ? "border-slate-900 bg-white shadow-md shadow-slate-900/10 ring-2 ring-slate-900/10"
                            : "border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                          done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white"
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : item.assessmentType === "formal_risk" ? (
                          <Shield className="h-4 w-4" />
                        ) : (
                          <ClipboardList className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              done ? "text-slate-700" : "text-slate-950"
                            )}
                          >
                            {item.title}
                          </span>
                          {item.assessmentType === "formal_risk" ? (
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-900">
                              Final
                            </span>
                          ) : null}
                          {!done && item.assessmentType !== "formal_risk" ? (
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                item.priority === "required"
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              )}
                            >
                              {item.priority}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              status.className
                            )}
                          >
                            {status.label}
                          </span>
                          {isNext ? (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Next up
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </span>
                        {moduleState?.riskRating ? (
                          <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                            Rated
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 capitalize">
                              {moduleState.riskRating}
                            </span>
                          </span>
                        ) : item.assessmentType !== "formal_risk" && !done ? (
                          <span className="mt-2 block text-[11px] font-medium text-amber-800">
                            Risk rating required to complete
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "mt-1 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          action.kind === "view"
                            ? "border border-slate-200 bg-white text-slate-600 group-hover:border-slate-300"
                            : "bg-slate-900 text-white"
                        )}
                      >
                        {action.label}
                        {action.kind !== "view" ? (
                          <ChevronRight className="h-3.5 w-3.5" />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {suite ? (
        <p className="text-[11px] text-slate-400">
          Suite computed {new Date(suite.computedAt).toLocaleString()} ·{" "}
          {titleCase(`${requiredCount} required`)} /{" "}
          {suite.triggered.length - requiredCount} recommended
        </p>
      ) : null}
    </section>
  );
}
