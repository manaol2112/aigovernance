"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn, titleCase } from "@/lib/utils";
import { registerFetch } from "@/lib/ai-system-register-actor-client";
import {
  AI_GOVERNANCE_RISK_STEPS,
  SCORE_0_4_OPTIONS,
  YES_NO_PARTIAL_OPTIONS,
  buildRatingRationale,
  emptyFactorScores,
  parseFactorScores,
  scoreRiskAssessment,
  stepAnswerProgress,
  type RiskAssessmentFactorScores,
  type RiskStepId,
} from "@/lib/ai-system-register-risk-assessment";
import type {
  AssessmentGap,
  ControlRecommendation,
} from "@/lib/ai-system-register-control-recommendations";
import {
  applySuiteSuggestionsToFactorScores,
  consolidateSuiteForFormalRisk,
  type SuiteRiskConsolidation,
} from "@/lib/ai-system-register-risk-consolidation";
import type { AssessmentSuiteState } from "@/lib/ai-system-register-assessment-triggers";
import { AiSystemRegisterAssessmentSuitePanel } from "@/components/ai-system-register-assessment-suite-panel";

type AssessmentRow = {
  id: string;
  version: number;
  status: string;
  factorScores: unknown;
  inherentScore: number | null;
  residualScore: number | null;
  inherentTier: string | null;
  residualTier: string | null;
  hardRulesFired: string[];
  narrative: string | null;
  completedAt: string | null;
};

type SystemContext = {
  id: string;
  decisionImpact: string;
  autonomyLevel: string;
  euAnnexIiiRelevance: string | null;
  personalDataInvolved: boolean;
  specialCategoryData: boolean;
  riskTier: string | null;
  riskSource: string;
  riskAssessmentStatus: string;
  inherentRiskTier: string | null;
  residualRiskTier: string | null;
  inherentRiskScore: number | null;
  residualRiskScore: number | null;
  riskSummary: string | null;
  manualRiskRationale: string | null;
  keyControlCodes: string[];
};

type KeyControlSummary = {
  controlCode: string;
  controlTitle: string;
  ownerRole: string;
  description?: string;
};

const TIER_BADGE: Record<string, string> = {
  prohibited: "bg-red-50 text-red-800 border-red-200",
  high: "bg-orange-50 text-orange-900 border-orange-200",
  gpai: "bg-violet-50 text-violet-900 border-violet-200",
  limited: "bg-amber-50 text-amber-900 border-amber-200",
  minimal: "bg-emerald-50 text-emerald-900 border-emerald-200",
  general: "bg-slate-50 text-slate-700 border-slate-200",
};

function scrollAdminMainToTop() {
  document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
}

function resumeStepId(scores: RiskAssessmentFactorScores): RiskStepId {
  const completed = new Set(scores.completedStepIds ?? []);
  const next = AI_GOVERNANCE_RISK_STEPS.find((step) => !completed.has(step.id));
  return next?.id ?? "findings";
}

export function AiSystemRegisterRiskPanel({
  system,
  onSystemUpdated,
}: {
  system: SystemContext;
  onSystemUpdated: () => Promise<void> | void;
}) {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [factorScores, setFactorScores] = useState<RiskAssessmentFactorScores>(emptyFactorScores());
  const [stepId, setStepId] = useState<RiskStepId>("suite_linkage");
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [manualTier, setManualTier] = useState(system.riskTier ?? "limited");
  const [manualRationale, setManualRationale] = useState(system.manualRiskRationale ?? "");
  const [savingManual, setSavingManual] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [gaps, setGaps] = useState<AssessmentGap[]>([]);
  const [recommendations, setRecommendations] = useState<ControlRecommendation[]>([]);
  const [keyControls, setKeyControls] = useState<KeyControlSummary[]>([]);
  const [selectedRecs, setSelectedRecs] = useState<string[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [acceptingRecs, setAcceptingRecs] = useState(false);
  /** Formal residual-rating wizard stays closed until opened from the assessment suite. */
  const [showFormalWizard, setShowFormalWizard] = useState(false);
  const [openingFormal, setOpeningFormal] = useState(false);
  const [justCompletedType, setJustCompletedType] = useState<"formal_risk" | null>(null);
  const [consolidation, setConsolidation] = useState<SuiteRiskConsolidation | null>(null);
  const seededFromSuiteRef = useRef(false);
  const stepTopRef = useRef<HTMLDivElement | null>(null);
  const stepChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const factorScoresRef = useRef(factorScores);
  const activeIdRef = useRef<string | null>(activeId);
  const skipAutosaveRef = useRef(true);
  const autosaveTimerRef = useRef<number | null>(null);
  const pendingFormalOpenRef = useRef(false);

  factorScoresRef.current = factorScores;
  activeIdRef.current = activeId;

  const loadAssessments = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}/risk-assessment`);
      if (!res.ok) throw new Error("Failed to load assessments");
      const rows = (await res.json()) as AssessmentRow[];
      setAssessments(rows);
      const current = rows.find((row) => row.status === "in_progress") ?? rows[0] ?? null;
      skipAutosaveRef.current = true;
      if (current) {
        setActiveId(current.id);
        setFactorScores(parseFactorScores(current.factorScores));
        setSaveState(current.status === "completed" ? "idle" : "saved");
      } else {
        setActiveId(null);
        setFactorScores(emptyFactorScores());
        setSaveState("idle");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load assessments.", {
        variant: "error",
      });
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, [system.id]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const loadSuiteConsolidation = useCallback(async () => {
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}/assessment-suite`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load assessment suite");
      const nextSuite = data as AssessmentSuiteState;
      setConsolidation(
        consolidateSuiteForFormalRisk(nextSuite, system.riskAssessmentStatus, {
          decisionImpact: system.decisionImpact,
          autonomyLevel: system.autonomyLevel,
          euAnnexIiiRelevance: system.euAnnexIiiRelevance,
          personalDataInvolved: system.personalDataInvolved,
          specialCategoryData: system.specialCategoryData,
        })
      );
    } catch (error) {
      console.error(error);
    }
  }, [system]);

  useEffect(() => {
    if (!showFormalWizard) return;
    void loadSuiteConsolidation();
  }, [showFormalWizard, loadSuiteConsolidation]);

  useEffect(() => {
    if (!showFormalWizard || !consolidation || seededFromSuiteRef.current) return;
    seededFromSuiteRef.current = true;
    skipAutosaveRef.current = true;
    setFactorScores((current) =>
      applySuiteSuggestionsToFactorScores(current, consolidation, {
        overwriteEmptyOnly: true,
        forceControlStrength: true,
      })
    );
  }, [showFormalWizard, consolidation]);

  useEffect(() => {
    setManualTier(system.riskTier ?? "limited");
    setManualRationale(system.manualRiskRationale ?? "");
  }, [system.riskTier, system.manualRiskRationale]);

  useEffect(() => {
    stepChipRefs.current[stepId]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [stepId]);

  // Seed a clear rating rationale when the user reaches the final step.
  useEffect(() => {
    if (stepId !== "findings") return;
    const existing = factorScoresRef.current.answers.findings_summary?.value;
    if (typeof existing === "string" && existing.trim()) return;
    const score = scoreRiskAssessment(factorScoresRef.current, {
      decisionImpact: system.decisionImpact,
      autonomyLevel: system.autonomyLevel,
      euAnnexIiiRelevance: system.euAnnexIiiRelevance,
      personalDataInvolved: system.personalDataInvolved,
      specialCategoryData: system.specialCategoryData,
    });
    const rationale = buildRatingRationale(factorScoresRef.current, score);
    setFactorScores((current) => ({
      ...current,
      answers: {
        ...current.answers,
        findings_summary: {
          ...current.answers.findings_summary,
          value: rationale,
        },
      },
    }));
  }, [stepId, system]);

  const refreshRecommendations = useCallback(
    async (scores: RiskAssessmentFactorScores) => {
      setLoadingRecs(true);
      try {
        const res = await registerFetch(
          `/api/ai-system-register/${system.id}/control-recommendations`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "recommend", factorScores: scores }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load recommendations");
        setGaps(data.gaps ?? []);
        setRecommendations(data.recommendations ?? []);
        setKeyControls(data.keyControls ?? []);
        setSelectedRecs((current) =>
          current.filter((code) =>
            (data.recommendations ?? []).some(
              (rec: ControlRecommendation) => rec.controlCode === code
            )
          )
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRecs(false);
      }
    },
    [system.id]
  );

  const refreshRecommendationsRef = useRef(refreshRecommendations);
  refreshRecommendationsRef.current = refreshRecommendations;

  // Keep this dependency list length stable (HMR-safe). Read refresh via ref.
  useEffect(() => {
    if (!activeId || stepId !== "treatment") return;
    const handle = window.setTimeout(() => {
      void refreshRecommendationsRef.current(factorScores);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [activeId, stepId, factorScores]);

  const liveScore = useMemo(
    () =>
      scoreRiskAssessment(factorScores, {
        decisionImpact: system.decisionImpact,
        autonomyLevel: system.autonomyLevel,
        euAnnexIiiRelevance: system.euAnnexIiiRelevance,
        personalDataInvolved: system.personalDataInvolved,
        specialCategoryData: system.specialCategoryData,
      }),
    [factorScores, system]
  );

  const activeStep = AI_GOVERNANCE_RISK_STEPS.find((step) => step.id === stepId)!;
  const stepIndex = AI_GOVERNANCE_RISK_STEPS.findIndex((step) => step.id === stepId);
  const stepProgress = stepAnswerProgress(activeStep, factorScores.answers);
  const isLastStep = stepIndex === AI_GOVERNANCE_RISK_STEPS.length - 1;
  const inProgress = Boolean(
    activeId && assessments.find((a) => a.id === activeId)?.status !== "completed"
  );

  const persistScores = useCallback(
    async (
      action: "save" | "complete",
      scores: RiskAssessmentFactorScores,
      assessmentId: string,
      opts?: { quiet?: boolean; toastOnSave?: boolean }
    ) => {
      const quiet = opts?.quiet ?? false;
      if (!quiet) setSaving(true);
      setSaveState("saving");
      try {
        const res = await registerFetch(`/api/ai-system-register/${system.id}/risk-assessment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            assessmentId,
            factorScores: scores,
            narrative:
              typeof scores.answers.findings_summary?.value === "string"
                ? scores.answers.findings_summary.value
                : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save assessment");
        skipAutosaveRef.current = true;
        setFactorScores(parseFactorScores(data.assessment.factorScores));
        setSaveState("saved");
        if (action === "complete" || opts?.toastOnSave) {
          toast(
            action === "complete"
              ? "Risk rating applied to this use case."
              : "Progress saved.",
            { variant: "success" }
          );
        }
        if (action === "complete" || !quiet) {
          await loadAssessments();
          await onSystemUpdated();
        }
        return true;
      } catch (error) {
        setSaveState("error");
        if (!quiet || action === "complete") {
          toast(error instanceof Error ? error.message : "Failed to save assessment.", {
            variant: "error",
          });
        }
        return false;
      } finally {
        if (!quiet) setSaving(false);
      }
    },
    [system.id, loadAssessments, onSystemUpdated]
  );

  // Auto-save answers shortly after each change.
  useEffect(() => {
    if (!activeId || !inProgress) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      const assessmentId = activeIdRef.current;
      if (!assessmentId) return;
      void persistScores("save", factorScoresRef.current, assessmentId, { quiet: true });
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [factorScores, activeId, inProgress, persistScores]);

  function goToStep(nextId: RiskStepId) {
    setStepId(nextId);
    requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const target = stepTopRef.current;
      if (main && target) {
        const mainRect = main.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        main.scrollTo({
          top: main.scrollTop + (targetRect.top - mainRect.top) - 16,
          behavior: "smooth",
        });
        return;
      }
      scrollAdminMainToTop();
    });
  }

  async function startAssessment(opts?: { quiet?: boolean }) {
    setSaving(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}/risk-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", factorScores: emptyFactorScores() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start assessment");
      if (!opts?.quiet) {
        toast("Risk assessment started.", { variant: "success" });
      }
      skipAutosaveRef.current = true;
      setActiveId(data.id);
      setFactorScores(parseFactorScores(data.factorScores));
      setSaveState("saved");
      setStepId("suite_linkage");
      await loadAssessments({ quiet: true });
      await onSystemUpdated();
      requestAnimationFrame(() => scrollAdminMainToTop());
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to start assessment.", {
        variant: "error",
      });
    } finally {
      setSaving(false);
      setOpeningFormal(false);
    }
  }

  async function openFormalRisk() {
    seededFromSuiteRef.current = false;
    setShowFormalWizard(true);
    setOpeningFormal(true);
    pendingFormalOpenRef.current = true;
    void loadSuiteConsolidation();
    requestAnimationFrame(() => scrollAdminMainToTop());
  }

  function reapplySuiteSuggestions() {
    if (!consolidation) return;
    skipAutosaveRef.current = true;
    setFactorScores((current) =>
      applySuiteSuggestionsToFactorScores(
        {
          ...emptyFactorScores(),
          completedStepIds: current.completedStepIds,
          findings: current.findings,
        },
        consolidation,
        { overwriteEmptyOnly: false, forceControlStrength: true }
      )
    );
    toast("Re-applied consolidated suite findings to this formal rating.", {
      variant: "success",
    });
  }

  useEffect(() => {
    if (!showFormalWizard || !pendingFormalOpenRef.current || loading) return;
    pendingFormalOpenRef.current = false;

    const currentId = activeIdRef.current;
    if (currentId) {
      const scores = factorScoresRef.current;
      setStepId(resumeStepId(scores));
      setOpeningFormal(false);
      requestAnimationFrame(() => scrollAdminMainToTop());
      return;
    }

    void startAssessment({ quiet: true });
    // startAssessment is stable enough for this open handshake; deps intentionally narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFormalWizard, loading, activeId]);

  async function persist(action: "save" | "complete") {
    if (!activeId) return;
    if (action === "complete") {
      const rationale = factorScores.answers.findings_summary?.value;
      if (typeof rationale !== "string" || !rationale.trim()) {
        toast("Add a rating rationale before applying it to this use case.", {
          variant: "error",
        });
        return;
      }
    }
    const completed = new Set(factorScores.completedStepIds ?? []);
    completed.add(stepId);
    const nextScores: RiskAssessmentFactorScores = {
      ...factorScores,
      completedStepIds: Array.from(completed) as RiskStepId[],
    };
    const ok = await persistScores(action, nextScores, activeId, {
      quiet: false,
      toastOnSave: action === "save",
    });
    if (ok && action === "complete") {
      setShowFormalWizard(false);
      setOpeningFormal(false);
      pendingFormalOpenRef.current = false;
      setJustCompletedType("formal_risk");
      requestAnimationFrame(() => scrollAdminMainToTop());
    }
  }

  async function continueToNext() {
    const completed = new Set(factorScores.completedStepIds ?? []);
    completed.add(stepId);
    const nextScores: RiskAssessmentFactorScores = {
      ...factorScores,
      completedStepIds: Array.from(completed) as RiskStepId[],
    };
    // Avoid a duplicate autosave race while we persist this step transition.
    skipAutosaveRef.current = true;
    setFactorScores(nextScores);
    if (activeId) {
      await persistScores("save", nextScores, activeId, { quiet: true });
    }
    if (!isLastStep) {
      goToStep(AI_GOVERNANCE_RISK_STEPS[stepIndex + 1].id);
    }
  }

  async function saveManualRisk(event: React.FormEvent) {
    event.preventDefault();
    setSavingManual(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskSource: "manual",
          riskTier: manualTier,
          manualRiskRationale: manualRationale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update risk");
      toast("Manual risk tier saved.", { variant: "success" });
      await onSystemUpdated();
      void data;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update risk.", {
        variant: "error",
      });
    } finally {
      setSavingManual(false);
    }
  }

  function setAnswer(questionId: string, value: string | number) {
    setFactorScores((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [questionId]: {
          ...current.answers[questionId],
          value,
        },
      },
    }));
  }

  function setAnswerNotes(questionId: string, notes: string) {
    setFactorScores((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [questionId]: {
          ...current.answers[questionId],
          notes,
        },
      },
    }));
  }

  function toggleRec(code: string) {
    setSelectedRecs((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    );
  }

  async function acceptControls(codes: string[]) {
    if (!codes.length) {
      toast("Select at least one recommended control.", { variant: "error" });
      return;
    }
    setAcceptingRecs(true);
    try {
      const res = await registerFetch(
        `/api/ai-system-register/${system.id}/control-recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept", controlCodes: codes }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept controls");
      toast(
        `${codes.length} control${codes.length === 1 ? "" : "s"} added as key controls for this use case.`,
        { variant: "success" }
      );
      setSelectedRecs([]);
      await onSystemUpdated();
      await refreshRecommendations(factorScores);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to accept controls.", {
        variant: "error",
      });
    } finally {
      setAcceptingRecs(false);
    }
  }

  async function removeKeyControl(code: string) {
    try {
      const res = await registerFetch(
        `/api/ai-system-register/${system.id}/control-recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", controlCode: code }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove control");
      toast("Removed from key controls.", { variant: "success" });
      await onSystemUpdated();
      await refreshRecommendations(factorScores);
      void data;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to remove control.", {
        variant: "error",
      });
    }
  }

  const suitePanel = (
    <AiSystemRegisterAssessmentSuitePanel
      systemId={system.id}
      formalRiskStatus={system.riskAssessmentStatus}
      onOpenFormalRisk={() => {
        void openFormalRisk();
      }}
      justCompletedType={justCompletedType}
      onConsumeJustCompleted={() => setJustCompletedType(null)}
    />
  );

  const formalChrome = (
    <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setShowFormalWizard(false);
            setOpeningFormal(false);
            pendingFormalOpenRef.current = false;
            requestAnimationFrame(() => scrollAdminMainToTop());
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          All assessments
        </Button>
        <p className="mt-3 text-sm font-semibold text-slate-950">
          Final risk rating · suite consolidation
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Ingests detailed assessment findings · progress saves automatically
        </p>
      </div>
      {activeId ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Step
          </p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">
            {activeStep.stepNumber}/{AI_GOVERNANCE_RISK_STEPS.length}
          </p>
        </div>
      ) : null}
    </div>
  );

  if (!showFormalWizard) {
    return <div className="space-y-5 pb-28">{suitePanel}</div>;
  }

  if (loading || openingFormal) {
    return (
      <div className="space-y-5 pb-28">
        {formalChrome}
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">Opening formal risk assessment…</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Preparing your guided residual rating workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!activeId) {
    return (
      <div className="space-y-5 pb-28">
        {formalChrome}
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Couldn’t open the assessment</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Try again to start the guided residual rating for this use case.
          </p>
          <Button
            type="button"
            className="mt-5 rounded-xl"
            disabled={saving}
            onClick={() => {
              setOpeningFormal(true);
              void startAssessment();
            }}
          >
            <ClipboardList className="h-4 w-4" />
            Start assessment
          </Button>
        </div>
      </div>
    );
  }

  const morePanel = (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setShowMore((value) => !value)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Manual classification & history</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Set a tier directly or reopen a previous assessment version.
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition", showMore && "rotate-180")}
        />
      </button>
      {showMore && (
        <div className="space-y-6 border-t border-slate-100 px-6 py-5">
          <form onSubmit={saveManualRisk} className="grid gap-3 lg:grid-cols-[200px_1fr_auto]">
            <select
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              value={manualTier}
              onChange={(event) => setManualTier(event.target.value)}
            >
              {["prohibited", "high", "gpai", "limited", "minimal"].map((tier) => (
                <option key={tier} value={tier}>
                  {titleCase(tier)}
                </option>
              ))}
            </select>
            <input
              required
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Rationale required"
              value={manualRationale}
              onChange={(event) => setManualRationale(event.target.value)}
            />
            <Button type="submit" disabled={savingManual} className="h-11 rounded-xl">
              {savingManual ? "Saving…" : "Save tier"}
            </Button>
          </form>

          {assessments.length > 0 && (
            <ul className="space-y-2">
              {assessments.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Version {row.version} · {titleCase(row.status.replace(/_/g, " "))}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Inherent {row.inherentTier ?? "—"} · Residual {row.residualTier ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.inherentTier && (
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
                          TIER_BADGE[row.inherentTier] ?? TIER_BADGE.general
                        )}
                      >
                        {row.inherentTier}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        const scores = parseFactorScores(row.factorScores);
                        seededFromSuiteRef.current = true;
                        setShowFormalWizard(true);
                        setOpeningFormal(false);
                        pendingFormalOpenRef.current = false;
                        setActiveId(row.id);
                        setFactorScores(scores);
                        setStepId(resumeStepId(scores));
                        setShowMore(false);
                        void loadSuiteConsolidation();
                        requestAnimationFrame(() => scrollAdminMainToTop());
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  const consolidationPanel = consolidation ? (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Inputs from detailed assessments
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
              Consolidated suite findings
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              {consolidation.summary}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={reapplySuiteSuggestions}
          >
            Re-apply suite inputs
          </Button>
        </div>
        {!consolidation.readyForFormal ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            {consolidation.requiredOpen} required detailed assessment
            {consolidation.requiredOpen === 1 ? "" : "s"} still open — finish those for a
            confident final rating.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Overall inherent
          </p>
          <p className="mt-1 text-xl font-semibold capitalize text-slate-950">
            {titleCase(consolidation.overallInherentTier)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {consolidation.overallInherentScore}/100 from suite + register signals
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
            Overall residual
          </p>
          <p className="mt-1 text-xl font-semibold capitalize text-indigo-950">
            {titleCase(consolidation.overallResidualTier)}
          </p>
          <p className="mt-0.5 text-xs text-indigo-800/80">
            {consolidation.overallResidualScore}/100 after {consolidation.controlStrengthPct}%
            control strength
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Treatment requirements
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-950">
            {consolidation.treatmentRequirements.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Mitigate / accept / complete / monitor actions identified
          </p>
        </div>
      </div>

      {consolidation.moduleFindings.length > 0 ? (
        <ul className="space-y-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          {consolidation.moduleFindings.map((module) => (
            <li
              key={module.assessmentType}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{module.shortTitle}</p>
                <p className="text-xs text-slate-500">
                  {titleCase(module.status.replace(/_/g, " "))}
                  {module.riskRating ? (
                    <>
                      <span className="mx-1.5 text-slate-300">·</span>
                      Rated {module.riskRating}
                    </>
                  ) : null}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {module.adverseCount} gap{module.adverseCount === 1 ? "" : "s"}
                  <span className="mx-1.5 text-slate-300">·</span>
                  concern {module.concernScore}/4
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                  module.theme === "people"
                    ? "border-violet-200 bg-violet-50 text-violet-900"
                    : "border-sky-200 bg-sky-50 text-sky-900"
                )}
              >
                {module.theme}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {consolidation.treatmentRequirements.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Identified treatment requirements
          </p>
          <ul className="mt-2 space-y-2">
            {consolidation.treatmentRequirements.slice(0, 6).map((item) => (
              <li key={item.id} className="text-sm text-slate-700">
                <span className="mr-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                  {item.strategy.replace(/_/g, " ")}
                </span>
                <span className="font-medium text-slate-900">{item.title}</span>
                <span className="text-slate-500"> — {item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  ) : null;

  return (
    <div className="space-y-5 pb-28">
      {formalChrome}
      {consolidationPanel}

      {/* Summary — scrolls away, never sticky */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-600">
              Step {activeStep.stepNumber} of {AI_GOVERNANCE_RISK_STEPS.length}
              <span className="mx-2 text-slate-300">·</span>
              {liveScore.completionPct}% complete
              <span className="mx-2 text-slate-300">·</span>
              Inherent {titleCase(liveScore.inherentTier)} · Residual{" "}
              {titleCase(liveScore.residualTier)}
            </p>
            {inProgress && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  saveState === "error"
                    ? "text-red-600"
                    : saveState === "saving"
                      ? "text-slate-500"
                      : "text-emerald-700"
                )}
              >
                {saveState === "saving"
                  ? "Saving progress…"
                  : saveState === "error"
                    ? "Couldn’t auto-save — your latest answers will retry shortly."
                    : saveState === "saved"
                      ? "Progress saved automatically"
                      : "Answers save automatically"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!inProgress && (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={saving}
                onClick={() => void startAssessment()}
              >
                Start new assessment
              </Button>
            )}
            {inProgress && isLastStep && (
              <Button
                className="rounded-xl"
                disabled={saving}
                onClick={() => void persist("complete")}
              >
                Apply rating to this use case
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${liveScore.completionPct}%` }}
          />
        </div>
        {liveScore.hardRulesFired.length > 0 && (
          <p className="mt-3 text-xs text-amber-800">
            Elevated factors:{" "}
            {liveScore.hardRulesFired.map((rule) => titleCase(rule.replace(/_/g, " "))).join(" · ")}
          </p>
        )}
      </section>

      {/* Step rail — horizontal, scrolls with page (not sticky) */}
      <div ref={stepTopRef} className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AI_GOVERNANCE_RISK_STEPS.map((step) => {
            const progress = stepAnswerProgress(step, factorScores.answers);
            const active = step.id === stepId;
            const done = (factorScores.completedStepIds ?? []).includes(step.id);
            return (
              <button
                key={step.id}
                ref={(el) => {
                  stepChipRefs.current[step.id] = el;
                }}
                type="button"
                onClick={() => goToStep(step.id)}
                className={cn(
                  "flex min-w-[9.5rem] shrink-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    active ? "bg-white text-slate-900" : done ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500"
                  )}
                >
                  {done && !active ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.stepNumber}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{step.title}</span>
                  <span className={cn("block text-[10px]", active ? "text-slate-300" : "text-slate-400")}>
                    {progress.answered}/{progress.total}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active step — single focus */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Step {activeStep.stepNumber} of {AI_GOVERNANCE_RISK_STEPS.length}
          </p>
          <h3 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
            {activeStep.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            {activeStep.objective}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeStep.frameworkAnchors.map((anchor) => (
              <span
                key={anchor}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              >
                {anchor}
              </span>
            ))}
            {!isLastStep && (
              <span className="text-xs text-slate-400">
                {stepProgress.answered} of {stepProgress.total} answered on this step
              </span>
            )}
          </div>
          {!isLastStep && activeStep.evidenceHints.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-600">Helpful evidence: </span>
              {activeStep.evidenceHints.join(" · ")}
            </p>
          )}
        </div>

        <div className="space-y-4 px-6 py-5 sm:px-7">
          {isLastStep ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Inherent rating
                  </p>
                  <p className="mt-2 text-2xl font-semibold capitalize text-slate-950">
                    {titleCase(liveScore.inherentTier)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Score {liveScore.inherentScore}/100</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                    Final rating for this use case
                  </p>
                  <p className="mt-2 text-2xl font-semibold capitalize text-indigo-950">
                    {titleCase(liveScore.residualTier)}
                  </p>
                  <p className="mt-1 text-xs text-indigo-800/80">
                    Residual score {liveScore.residualScore}/100
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Control strength
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={5}
                    className="mt-3 w-full"
                    value={factorScores.controlEffectivenessPct ?? 0}
                    onChange={(event) =>
                      setFactorScores((current) => ({
                        ...current,
                        controlEffectivenessPct: Number(event.target.value),
                      }))
                    }
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {factorScores.controlEffectivenessPct ?? 0}% applied to residual rating
                  </p>
                </div>
              </div>

              {liveScore.hardRulesFired.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Elevated factors affecting this rating:{" "}
                  {liveScore.hardRulesFired
                    .map((rule) => titleCase(rule.replace(/_/g, " ")))
                    .join(" · ")}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Why this rating?</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review or edit the rationale. Completing applies this rating and rationale to
                      the use case.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      setAnswer(
                        "findings_summary",
                        buildRatingRationale(factorScores, liveScore)
                      )
                    }
                  >
                    Refresh rationale
                  </Button>
                </div>
                <textarea
                  rows={10}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm leading-relaxed"
                  value={
                    typeof factorScores.answers.findings_summary?.value === "string"
                      ? factorScores.answers.findings_summary.value
                      : ""
                  }
                  onChange={(event) => setAnswer("findings_summary", event.target.value)}
                  placeholder="Explain why this use case received its risk rating…"
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-4 text-sm text-emerald-950">
                <p className="font-semibold">Ready to apply</p>
                <p className="mt-1 text-emerald-900/80">
                  Click <span className="font-semibold">Apply rating to this use case</span> to tag
                  this system with residual rating{" "}
                  <span className="font-semibold capitalize">
                    {titleCase(liveScore.residualTier)}
                  </span>{" "}
                  and save the rationale on the register record.
                </p>
              </div>
            </>
          ) : (
            activeStep.questions.map((question, index) => {
              const response = factorScores.answers[question.id];
              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 shadow-sm">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{question.prompt}</p>
                      {question.help ? (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{question.help}</p>
                      ) : null}
                      {question.controls?.length ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Typical safeguards: {question.controls.join(" · ")}
                        </p>
                      ) : null}

                      {question.kind === "yes_no_partial" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {YES_NO_PARTIAL_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setAnswer(question.id, option.value)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                response?.value === option.value
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {question.kind === "score_0_4" && (
                        <select
                          className="mt-3 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                          value={typeof response?.value === "number" ? response.value : ""}
                          onChange={(event) => setAnswer(question.id, Number(event.target.value))}
                        >
                          <option value="">Select level…</option>
                          {SCORE_0_4_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {question.kind === "text" && (
                        <textarea
                          rows={4}
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                          value={typeof response?.value === "string" ? response.value : ""}
                          onChange={(event) => setAnswer(question.id, event.target.value)}
                          placeholder="Add context for your team…"
                        />
                      )}

                      {question.kind !== "text" && (
                        <input
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={response?.notes ?? ""}
                          onChange={(event) => setAnswerNotes(question.id, event.target.value)}
                          placeholder="Notes or evidence reference (optional)"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Control recommendations — treatment step only (not every consolidation step) */}
      {stepId === "treatment" && (
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Control recommendations
              </p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">
                Suggested key controls for this use case
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                Based on gaps in your answers, we map unaddressed risks to controls in your
                framework library. Accepting them adds them as key controls for this system.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={acceptingRecs || selectedRecs.length === 0}
                onClick={() => void acceptControls(selectedRecs)}
              >
                Add selected ({selectedRecs.length})
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={acceptingRecs || recommendations.length === 0}
                onClick={() =>
                  void acceptControls(recommendations.map((rec) => rec.controlCode))
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Add all recommended
              </Button>
            </div>
          </div>
          {gaps.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              {gaps.length} gap{gaps.length === 1 ? "" : "s"} detected across{" "}
              {new Set(gaps.map((gap) => gap.pillarLabel)).size} risk area
              {new Set(gaps.map((gap) => gap.pillarLabel)).size === 1 ? "" : "s"}
              {loadingRecs ? " · Updating…" : ""}
            </p>
          )}
        </div>

        <div className="px-6 py-5 sm:px-7">
          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center text-sm text-slate-500">
              {gaps.length === 0
                ? "Answer the assessment questions to surface control recommendations for unaddressed risks."
                : "No additional framework controls matched these gaps, or they are already key controls."}
            </div>
          ) : (
            <ul className="space-y-3">
              {recommendations.map((rec) => {
                const selected = selectedRecs.includes(rec.controlCode);
                return (
                  <li
                    key={`${rec.pillarId}-${rec.controlCode}`}
                    className={cn(
                      "rounded-2xl border px-4 py-4 transition sm:px-5",
                      selected
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <label className="flex min-w-0 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                          checked={selected}
                          onChange={() => toggleRec(rec.controlCode)}
                        />
                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                              {rec.controlCode}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {rec.pillarLabel}
                            </span>
                          </span>
                          <span className="mt-2 block text-sm font-semibold text-slate-950">
                            {rec.controlTitle}
                          </span>
                          {rec.description ? (
                            <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">
                              {rec.description}
                            </span>
                          ) : null}
                          <span className="mt-2 block text-xs leading-relaxed text-slate-500">
                            Why recommended: {rec.reason}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">
                            Owner role: {rec.ownerRole}
                          </span>
                        </span>
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        disabled={acceptingRecs}
                        onClick={() => void acceptControls([rec.controlCode])}
                      >
                        Add as key control
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {keyControls.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-sm font-semibold text-slate-900">
                Key controls for this use case
              </h4>
              <ul className="mt-3 space-y-2">
                {keyControls.map((control) => (
                  <li
                    key={control.controlCode}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3"
                  >
                      <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        <span className="mr-2 font-mono text-[11px] text-emerald-800">
                          {control.controlCode}
                        </span>
                        {control.controlTitle}
                      </p>
                      {control.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {control.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        Owner role: {control.ownerRole}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-slate-500"
                      onClick={() => void removeKeyControl(control.controlCode)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Manual tier / history — only on the final apply-rating step */}
      {isLastStep ? morePanel : null}

      {/* Single sticky footer — only sticky chrome in this flow */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={stepIndex === 0}
            onClick={() => goToStep(AI_GOVERNANCE_RISK_STEPS[Math.max(0, stepIndex - 1)].id)}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <p className="hidden text-xs text-slate-500 sm:block">
            {activeStep.title}
            <span className="mx-1.5 text-slate-300">·</span>
            {stepProgress.answered}/{stepProgress.total} on this step
            <span className="mx-1.5 text-slate-300">·</span>
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save failed"
                  : "Auto-save on"}
          </p>
          <div className="flex flex-wrap gap-2">
            {isLastStep ? (
              <Button
                type="button"
                className="rounded-xl"
                disabled={saving || !inProgress}
                onClick={() => void persist("complete")}
              >
                Apply rating to this use case
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-xl"
                disabled={saving}
                onClick={() => void continueToNext()}
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
