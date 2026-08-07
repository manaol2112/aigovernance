"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Loader2,
  Lock,
  PenLine,
  Save,
  ShieldCheck,
  Undo2,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CitedAnalysis, SourceEvidenceDialog, type Citation } from "@/components/cited-analysis";
import { ControlFollowUpInline } from "@/components/control-follow-up-inline";
import { FollowUpQuestionsExportButton } from "@/components/follow-up-questions-export-button";
import { openSharedEvidenceCitation, useEvidenceDrawer } from "@/components/evidence-drawer";
import { ValidationQueuePanel } from "@/components/validation-queue-panel";
import { buildValidationQueue } from "@/lib/validation-queue";
import { isMalformedFindingText } from "@/lib/capture-finding-format";
import { toast } from "@/components/ui/toast";

export type ReviewPillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  controls: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    ownerRole: string;
  }>;
};

export type ReviewControlEval = {
  id: string;
  controlId: string;
  workshopNotes: string | null;
  facilitatorNotes: string | null;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: string;
  status: string;
  aiGenerated: boolean;
  analyzedAt?: string | null;
  reviewerComplete: boolean | null;
  reviewerAccurate: boolean | null;
  reviewerNoHallucination: boolean | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  reviewerNotes: string | null;
  control: { code: string; title: string; controlType: string; ownerRole: string };
  citations: Citation[];
};

export type ReviewStats = {
  total: number;
  confirmed: number;
  pending?: number;
  aiDraft?: number;
  rejected?: number;
  pillarCount: number;
  scopedRequirements: number;
};

const STATUS_COLORS: Record<string, string> = {
  aligned: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  gap: "bg-red-100 text-red-800 border-red-200",
  not_assessed: "bg-slate-100 text-slate-600 border-slate-200",
};

const COMPLIANCE_OPTIONS = [
  {
    id: "aligned" as const,
    label: "Aligned",
    summary: "Requirements substantially met",
    description: "Workshop evidence shows the control is in place and operating as expected.",
    activeClass: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200",
    idleClass: "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-900",
  },
  {
    id: "partial" as const,
    label: "Partial",
    summary: "Coverage with gaps",
    description: "Some practices exist but material elements are missing or inconsistently applied.",
    activeClass: "border-amber-400 bg-amber-50 ring-2 ring-amber-200",
    idleClass: "border-slate-200 hover:border-amber-200 hover:bg-amber-50/40",
    dotClass: "bg-amber-500",
    textClass: "text-amber-900",
  },
  {
    id: "gap" as const,
    label: "Gap",
    summary: "Material remediation needed",
    description: "Evidence indicates the control is not adequately implemented for in-scope requirements.",
    activeClass: "border-red-400 bg-red-50 ring-2 ring-red-200",
    idleClass: "border-slate-200 hover:border-red-200 hover:bg-red-50/40",
    dotClass: "bg-red-500",
    textClass: "text-red-900",
  },
  {
    id: "not_assessed" as const,
    label: "Not assessed",
    summary: "Insufficient evidence",
    description: "Workshop materials did not provide enough information to reach a conclusion.",
    activeClass: "border-slate-400 bg-slate-100 ring-2 ring-slate-300",
    idleClass: "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
    dotClass: "bg-slate-400",
    textClass: "text-slate-800",
  },
];

const REVIEW_STATUS_ICON: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  human_confirmed: { icon: CheckCircle2, className: "text-emerald-600", label: "Signed off" },
  rejected: { icon: XCircle, className: "text-red-500", label: "Needs revision" },
  ai_draft: { icon: Circle, className: "text-amber-500", label: "Ready to review" },
  pending: { icon: Circle, className: "text-slate-300", label: "Not analyzed" },
};

type ReviewMode = "individual" | "batch";
type StatusFilter = "all" | "pending" | "ready" | "confirmed" | "rejected";
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const AUTO_SAVE_DELAY_MS = 1200;

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function signOffDateToIso(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return new Date().toISOString();
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function formatSignOffDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatSignOffTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ReviewLeaveGuard = {
  hasUnsavedChanges: () => boolean;
  promptSaveBeforeLeave: () => Promise<boolean>;
};

type Props = {
  assessmentId: string;
  pillars: ReviewPillarGroup[];
  evaluations: ReviewControlEval[];
  stats: ReviewStats;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  workshopNotes: string;
  facilitatorNotes: string;
  departmentQuery?: string;
  onReload: () => Promise<void>;
  onRegisterLeaveGuard?: (guard: ReviewLeaveGuard | null) => void;
};

export function ControlReviewPanel({
  assessmentId,
  pillars,
  evaluations,
  stats,
  evidenceTexts,
  workshopNotes,
  facilitatorNotes,
  departmentQuery = "",
  onReload,
  onRegisterLeaveGuard,
}: Props) {
  const [reviewMode, setReviewMode] = useState<ReviewMode>("individual");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerError, setReviewerError] = useState(false);
  const [reviewChecks, setReviewChecks] = useState({ complete: false, accurate: false, noHallucination: false });
  const [reviewNotes, setReviewNotes] = useState("");
  const [signOffDate, setSignOffDate] = useState(todayDateInputValue);
  const [draftInPlace, setDraftInPlace] = useState("");
  const [draftGaps, setDraftGaps] = useState("");
  const [draftRecs, setDraftRecs] = useState("");
  const [draftCompliance, setDraftCompliance] = useState("not_assessed");
  const [findingsDirty, setFindingsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const evidenceDrawer = useEvidenceDrawer();

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedControlRef = useRef<string | null>(null);
  const stateRef = useRef({
    findingsDirty,
    saveStatus,
    selectedControlId,
    draftInPlace,
    draftGaps,
    draftRecs,
    draftCompliance,
  });

  stateRef.current = {
    findingsDirty,
    saveStatus,
    selectedControlId,
    draftInPlace,
    draftGaps,
    draftRecs,
    draftCompliance,
  };

  const evalByControl = useMemo(() => new Map(evaluations.map((e) => [e.controlId, e])), [evaluations]);

  const allControls = useMemo(() => {
    const byId = new Map<
      string,
      (typeof pillars)[0]["controls"][0] & {
        pillarId: string;
        pillarLabel: string;
        pillarDescription: string;
      }
    >();
    for (const p of pillars) {
      for (const c of p.controls) {
        if (byId.has(c.id)) continue;
        byId.set(c.id, {
          ...c,
          pillarId: p.pillarId,
          pillarLabel: p.pillarLabel,
          pillarDescription: p.pillarDescription,
        });
      }
    }
    return [...byId.values()];
  }, [pillars]);

  const progressPct = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;

  const filteredControls = useMemo(() => {
    return allControls.filter((c) => {
      const ev = evalByControl.get(c.id);
      const status = ev?.status ?? "pending";
      if (statusFilter === "all") return true;
      if (statusFilter === "confirmed") return status === "human_confirmed";
      if (statusFilter === "rejected") return status === "rejected";
      if (statusFilter === "ready") return status === "ai_draft" || status === "rejected";
      if (statusFilter === "pending") return status === "pending" || !ev?.inPlaceFindings?.trim();
      return true;
    });
  }, [allControls, evalByControl, statusFilter]);

  const validationQueue = useMemo(
    () =>
      buildValidationQueue(
        allControls.map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          pillarLabel: c.pillarLabel,
        })),
        evalByControl
      ),
    [allControls, evalByControl]
  );

  const selectedEval = selectedControlId ? evalByControl.get(selectedControlId) ?? null : null;
  const selectedControl = allControls.find((c) => c.id === selectedControlId) ?? null;

  useEffect(() => {
    if (pillars.length > 0 && expandedPillars.size === 0) {
      setExpandedPillars(new Set(pillars.map((p) => p.pillarId)));
    }
  }, [pillars, expandedPillars.size]);

  useEffect(() => {
    if (!selectedControlId && filteredControls.length > 0) {
      setSelectedControlId(filteredControls[0].id);
    }
  }, [selectedControlId, filteredControls]);

  useEffect(() => {
    if (!selectedControlId) return;
    const ev = evalByControl.get(selectedControlId);
    if (!ev) return;
    const analyzedKey = ev.analyzedAt ?? "";
    const contentKey = `${ev.inPlaceFindings}|${ev.gapFindings}|${ev.recommendations}`;
    const syncKey = `${selectedControlId}:${analyzedKey}:${contentKey}`;
    if (loadedControlRef.current === syncKey) return;

    setDraftInPlace(isMalformedFindingText(ev.inPlaceFindings) ? "" : ev.inPlaceFindings);
    setDraftGaps(isMalformedFindingText(ev.gapFindings) ? "" : ev.gapFindings);
    setDraftRecs(isMalformedFindingText(ev.recommendations) ? "" : ev.recommendations);
    setDraftCompliance(ev.complianceStatus);
    setReviewChecks({
      complete: ev.reviewerComplete ?? false,
      accurate: ev.reviewerAccurate ?? false,
      noHallucination: ev.reviewerNoHallucination ?? false,
    });
    setReviewNotes(ev.reviewerNotes ?? "");
    setFindingsDirty(false);
    setSaveStatus("idle");
    loadedControlRef.current = syncKey;
  }, [selectedControlId, evalByControl]);

  useEffect(() => {
    if (selectedEval) {
      setReviewChecks({
        complete: selectedEval.reviewerComplete ?? false,
        accurate: selectedEval.reviewerAccurate ?? false,
        noHallucination: selectedEval.reviewerNoHallucination ?? false,
      });
      setReviewNotes(selectedEval.reviewerNotes ?? "");
    }
  }, [selectedEval?.id, selectedEval?.status, selectedEval?.reviewerComplete, selectedEval?.reviewerAccurate, selectedEval?.reviewerNoHallucination, selectedEval?.reviewerNotes]);

  useEffect(() => {
    const stored = localStorage.getItem("aigovernance-reviewer-name");
    if (stored) setReviewerName(stored);
  }, []);

  const activeCitationObj = useMemo(() => {
    if (activeCitation == null || !selectedEval) return null;
    return selectedEval.citations.find((c) => c.citationIndex === activeCitation) ?? null;
  }, [activeCitation, selectedEval]);

  const navigableIds = filteredControls.map((c) => c.id);
  const currentIndex = selectedControlId ? navigableIds.indexOf(selectedControlId) : -1;

  function draftsMatch(
    a: { inPlace: string; gaps: string; recs: string; compliance: string },
    b: { inPlace: string; gaps: string; recs: string; compliance: string }
  ) {
    return (
      a.inPlace === b.inPlace &&
      a.gaps === b.gaps &&
      a.recs === b.recs &&
      a.compliance === b.compliance
    );
  }

  const persistFindings = useCallback(
    async (controlId: string, options?: { manual?: boolean }) => {
      const snapshot = {
        inPlace: stateRef.current.draftInPlace,
        gaps: stateRef.current.draftGaps,
        recs: stateRef.current.draftRecs,
        compliance: stateRef.current.draftCompliance,
      };

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      if (options?.manual) setSaving("findings");
      setSaveStatus("saving");

      try {
        const res = await fetch(`/api/assessments/${assessmentId}/control-review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_findings",
            controlId,
            inPlaceFindings: snapshot.inPlace,
            gapFindings: snapshot.gaps,
            recommendations: snapshot.recs,
            complianceStatus: snapshot.compliance,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Save failed");
        }

        const current = {
          inPlace: stateRef.current.draftInPlace,
          gaps: stateRef.current.draftGaps,
          recs: stateRef.current.draftRecs,
          compliance: stateRef.current.draftCompliance,
        };
        const stillDirty = !draftsMatch(snapshot, current);
        setFindingsDirty(stillDirty);
        setSaveStatus(stillDirty ? "pending" : "saved");
        await onReload();
        return !stillDirty;
      } catch {
        setSaveStatus("error");
        return false;
      } finally {
        if (options?.manual) setSaving("");
      }
    },
    [assessmentId, onReload]
  );

  const flushAutoSave = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const { findingsDirty: dirty, saveStatus: status, selectedControlId: controlId } = stateRef.current;
    if (!controlId || (!dirty && status !== "pending")) return true;
    return persistFindings(controlId);
  }, [persistFindings]);

  const promptSaveBeforeLeave = useCallback(async (): Promise<boolean> => {
    await flushAutoSave();
    const { findingsDirty: dirty, saveStatus: status, selectedControlId: controlId } = stateRef.current;
    if (!dirty && status !== "pending" && status !== "saving") return true;
    if (!controlId) return true;

    const shouldSave = window.confirm(
      "You have unsaved review edits. Save them before leaving this control?"
    );
    if (!shouldSave) return false;

    const saved = await persistFindings(controlId, { manual: true });
    if (!saved && stateRef.current.findingsDirty) {
      toast("Could not save your edits. Please try again before leaving.", { variant: "error" });
      return false;
    }
    return true;
  }, [flushAutoSave, persistFindings]);

  useEffect(() => {
    if (!onRegisterLeaveGuard) return;
    onRegisterLeaveGuard({
      hasUnsavedChanges: () => {
        const s = stateRef.current;
        return s.findingsDirty || s.saveStatus === "pending" || s.saveStatus === "saving";
      },
      promptSaveBeforeLeave,
    });
    return () => onRegisterLeaveGuard(null);
  }, [onRegisterLeaveGuard, promptSaveBeforeLeave]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const s = stateRef.current;
      if (s.findingsDirty || s.saveStatus === "pending" || s.saveStatus === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!findingsDirty || !selectedControlId) return;
    setSaveStatus("pending");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistFindings(selectedControlId);
    }, AUTO_SAVE_DELAY_MS);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    draftInPlace,
    draftGaps,
    draftRecs,
    draftCompliance,
    findingsDirty,
    selectedControlId,
    persistFindings,
  ]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  function markFindingsDirty() {
    setFindingsDirty(true);
    setSaveStatus("pending");
  }

  async function guardedNavigate(action: () => void) {
    const ok = await promptSaveBeforeLeave();
    if (ok) action();
  }

  function openEvidenceCitation(index: number) {
    setActiveCitation(index);
    const cite = selectedEval?.citations.find((c) => c.citationIndex === index) ?? null;
    if (!openSharedEvidenceCitation(evidenceDrawer, cite)) {
      setEvidenceDialogOpen(true);
    }
  }

  function selectControl(controlId: string) {
    if (controlId === selectedControlId) return;
    void guardedNavigate(() => {
      loadedControlRef.current = null;
      setSelectedControlId(controlId);
      setActiveCitation(null);
      setEvidenceDialogOpen(false);
    });
  }

  function goNext() {
    if (currentIndex >= 0 && currentIndex < navigableIds.length - 1) {
      selectControl(navigableIds[currentIndex + 1]);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      selectControl(navigableIds[currentIndex - 1]);
    }
  }

  function toggleBatch(controlId: string) {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(controlId)) next.delete(controlId);
      else next.add(controlId);
      return next;
    });
  }

  function togglePillarBatch(pillarId: string) {
    const pillar = pillars.find((p) => p.pillarId === pillarId);
    if (!pillar) return;
    const ids = pillar.controls.map((c) => c.id).filter((id) => {
      const ev = evalByControl.get(id);
      return ev && ev.status !== "pending" && ev.inPlaceFindings.trim();
    });
    setBatchSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function hasReviewableFindings(ev: ReviewControlEval): boolean {
    const inPlace = ev.inPlaceFindings?.trim() ?? "";
    return (
      ev.status !== "pending" &&
      !!inPlace &&
      !isMalformedFindingText(inPlace) &&
      !isMalformedFindingText(ev.gapFindings) &&
      !isMalformedFindingText(ev.recommendations)
    );
  }

  async function analyzeControl(controlId: string) {
    setSaving(`analyze-${controlId}`);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/control-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_one", controlId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast(
          data.error ?? "AI analysis failed. Check that workshop notes or evidence exist for this control.",
          { variant: "error" }
        );
        return;
      }
      loadedControlRef.current = null;
      await onReload();
    } finally {
      setSaving("");
    }
  }

  async function saveFindings(controlId: string) {
    await persistFindings(controlId, { manual: true });
  }

  async function submitReview(controlIds: string[]) {
    if (!reviewerName.trim()) {
      setReviewerError(true);
      return;
    }
    await flushAutoSave();
    if (stateRef.current.findingsDirty) return;

    localStorage.setItem("aigovernance-reviewer-name", reviewerName.trim());
    setReviewerError(false);
    setSaving("review");
    await fetch(`/api/assessments/${assessmentId}/control-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: controlIds.length > 1 ? "batch_review" : "review",
        controlId: controlIds.length === 1 ? controlIds[0] : undefined,
        controlIds: controlIds.length > 1 ? controlIds : undefined,
        confirmedBy: reviewerName.trim(),
        reviewerComplete: reviewChecks.complete,
        reviewerAccurate: reviewChecks.accurate,
        reviewerNoHallucination: reviewChecks.noHallucination,
        reviewerNotes: reviewNotes || undefined,
        confirmedAt: signOffDateToIso(signOffDate),
      }),
    });
    setBatchSelected(new Set());
    await onReload();
    setSaving("");
    if (reviewMode === "individual") goNext();
  }

  async function removeSignOff(controlId: string, controlCode: string) {
    const proceed = window.confirm(
      `Remove sign-off for ${controlCode}?\n\nThis control will return to draft review status and will be excluded from formal reporting until signed off again.`
    );
    if (!proceed) return;
    setSaving("unconfirm");
    await fetch(`/api/assessments/${assessmentId}/control-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unconfirm", controlId }),
    });
    await onReload();
    setSaving("");
  }

  const batchReviewable = useMemo(() => {
    return [...batchSelected].filter((id) => {
      const ev = evalByControl.get(id);
      return ev && ev.status !== "pending" && ev.inPlaceFindings.trim();
    });
  }, [batchSelected, evalByControl]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/30">
      {/* Progress header */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Control review</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Validate & sign off findings</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Edit in-place, gap, and recommendation wording. Only signed-off controls flow to formal reporting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FollowUpQuestionsExportButton
              assessmentId={assessmentId}
              departmentQuery={departmentQuery}
            />
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {stats.confirmed}
                <span className="text-base font-normal text-slate-400"> / {stats.total}</span>
              </p>
              <p className="text-xs text-slate-500">controls signed off</p>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-indigo-100 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-700">{progressPct}%</span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {([
              ["individual", "Individual review"],
              ["batch", "Batch review"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => void guardedNavigate(() => setReviewMode(mode))}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  reviewMode === mode
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex flex-wrap gap-1">
            {([
              ["all", "All"],
              ["ready", "Ready to review"],
              ["confirmed", "Signed off"],
              ["rejected", "Needs revision"],
              ["pending", "Not analyzed"],
            ] as const).map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => void guardedNavigate(() => setStatusFilter(f))}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-12">
        {/* Control navigator */}
        <aside className="flex max-h-[40vh] flex-col overflow-hidden border-b border-slate-200 bg-white lg:col-span-4 lg:max-h-none lg:border-b-0 lg:border-r">
          <ValidationQueuePanel
            queue={validationQueue}
            selectedControlId={selectedControlId}
            onSelectControl={selectControl}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pillars.map((pillar) => {
              const pillarControls = pillar.controls.filter((c) =>
                filteredControls.some((fc) => fc.id === c.id)
              );
              if (pillarControls.length === 0) return null;
              const expanded = expandedPillars.has(pillar.pillarId);
              const pillarConfirmed = pillar.controls.filter(
                (c) => evalByControl.get(c.id)?.status === "human_confirmed"
              ).length;

              return (
                <div key={pillar.pillarId} className="border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2">
                    {reviewMode === "batch" && (() => {
                      const reviewableIds = pillar.controls
                        .map((c) => c.id)
                        .filter((id) => evalByControl.get(id)?.inPlaceFindings?.trim());
                      return (
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        disabled={reviewableIds.length === 0}
                        onChange={() => togglePillarBatch(pillar.pillarId)}
                        checked={
                          reviewableIds.length > 0 &&
                          reviewableIds.every((id) => batchSelected.has(id))
                        }
                      />
                      );
                    })()}
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() =>
                        setExpandedPillars((prev) => {
                          const next = new Set(prev);
                          if (next.has(pillar.pillarId)) next.delete(pillar.pillarId);
                          else next.add(pillar.pillarId);
                          return next;
                        })
                      }
                    >
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{pillar.pillarLabel}</p>
                        <p className="text-[10px] text-slate-400">
                          {pillarConfirmed}/{pillar.controls.length} signed off
                        </p>
                      </div>
                    </button>
                  </div>
                  {expanded &&
                    pillarControls.map((c) => {
                      const ev = evalByControl.get(c.id);
                      const reviewMeta = REVIEW_STATUS_ICON[ev?.status ?? "pending"];
                      const ReviewIcon = reviewMeta.icon;
                      const selected = selectedControlId === c.id;

                      return (
                        <div
                          key={c.id}
                          className={`flex items-start gap-2 border-l-2 px-3 py-2.5 transition-colors ${
                            selected
                              ? "border-indigo-500 bg-indigo-50/60"
                              : "border-transparent hover:bg-slate-50"
                          }`}
                        >
                          {reviewMode === "batch" && (
                            <input
                              type="checkbox"
                              className="mt-1 rounded border-slate-300"
                              disabled={!ev?.inPlaceFindings?.trim()}
                              checked={batchSelected.has(c.id)}
                              onChange={() => toggleBatch(c.id)}
                            />
                          )}
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => selectControl(c.id)}
                          >
                            <div className="flex items-center gap-2">
                              <ReviewIcon className={`h-3.5 w-3.5 shrink-0 ${reviewMeta.className}`} />
                              <span className="font-mono text-[11px] font-bold text-indigo-700">{c.code}</span>
                              {ev && (
                                <span
                                  className={`ml-auto shrink-0 rounded border px-1 py-0.5 text-[9px] font-medium uppercase ${
                                    STATUS_COLORS[ev.complianceStatus] ?? ""
                                  }`}
                                >
                                  {ev.complianceStatus.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600">{c.title}</p>
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Validation workspace */}
        <main className="flex min-h-0 flex-col overflow-hidden lg:col-span-8">
          {reviewMode === "batch" && batchReviewable.length > 0 && (
            <div className="shrink-0 border-b border-indigo-200 bg-indigo-50/80 px-5 py-3">
              <p className="text-sm font-medium text-indigo-900">
                <Users className="mr-1.5 inline h-4 w-4" />
                {batchReviewable.length} control(s) selected — complete attestation below
              </p>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {selectedControl && selectedEval ? (
              <div className="mx-auto max-w-4xl space-y-5">
                {/* Control header */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedControl.pillarLabel}
                      </Badge>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono text-indigo-700">{selectedControl.code}</span>
                        <span className="font-normal text-slate-400"> — </span>
                        {selectedControl.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedControl.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {selectedEval.status === "human_confirmed" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          <Lock className="mr-1 h-3 w-3" /> Signed off
                        </Badge>
                      ) : selectedEval.status === "rejected" ? (
                        <Badge variant="danger">Needs revision</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700">
                          Awaiting sign-off
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyzeControl(selectedControl.id)}
                      disabled={!!saving}
                    >
                      {saving === `analyze-${selectedControl.id}` ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Brain className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Re-analyze with AI
                    </Button>
                    {selectedEval.status === "human_confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-800 hover:bg-amber-50"
                        onClick={() => removeSignOff(selectedControl.id, selectedControl.code)}
                        disabled={!!saving}
                      >
                        {saving === "unconfirm" ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Remove sign-off
                      </Button>
                    )}
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={goPrev} disabled={currentIndex <= 0}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={goNext}
                        disabled={currentIndex >= navigableIds.length - 1}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {draftCompliance === "not_assessed" && selectedControl && (
                  <ControlFollowUpInline
                    assessmentId={assessmentId}
                    controlId={selectedControl.id}
                    active
                    departmentQuery={departmentQuery}
                  />
                )}

                {!hasReviewableFindings(selectedEval) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                    <Brain className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-medium text-slate-700">No findings to review yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {isMalformedFindingText(selectedEval.inPlaceFindings)
                        ? "The last analysis did not format correctly. Run AI analysis again."
                        : "Run AI analysis from Evidence & Analysis or re-analyze this control."}
                    </p>
                    <Button className="mt-4" size="sm" onClick={() => analyzeControl(selectedControl.id)} disabled={!!saving}>
                      Run AI analysis
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Step 1 — Review &amp; refine findings
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        Validate in-place practices, gaps, and recommendations against source evidence.
                      </p>
                    </div>

                    {/* Editable findings */}
                    {[
                      {
                        key: "in_place" as const,
                        title: "What's in place",
                        value: draftInPlace,
                        set: setDraftInPlace,
                        color: "border-emerald-200 focus-within:ring-emerald-100",
                        header: "text-emerald-800",
                      },
                      {
                        key: "gap" as const,
                        title: "Gaps identified",
                        value: draftGaps,
                        set: setDraftGaps,
                        color: "border-amber-200 focus-within:ring-amber-100",
                        header: "text-amber-900",
                      },
                      {
                        key: "recommendation" as const,
                        title: "Recommendations",
                        value: draftRecs,
                        set: setDraftRecs,
                        color: "border-indigo-200 focus-within:ring-indigo-100",
                        header: "text-indigo-900",
                      },
                    ].map((section) => (
                      <div
                        key={section.key}
                        className={`rounded-2xl border bg-white p-4 shadow-sm focus-within:ring-2 ${section.color}`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className={`text-xs font-bold uppercase tracking-wide ${section.header}`}>
                            {section.title}
                          </h4>
                          <span className="text-[10px] text-slate-400">Editable — citation markers [{`{n}`}] preserved</span>
                        </div>
                        <textarea
                          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          rows={5}
                          value={section.value}
                          onChange={(e) => {
                            section.set(e.target.value);
                            markFindingsDirty();
                          }}
                        />
                        {selectedEval.citations.filter((c) => c.section === section.key).length > 0 && (
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase text-slate-500">Citation preview</p>
                            <CitedAnalysis
                              text={section.value}
                              citations={selectedEval.citations.filter((c) => c.section === section.key)}
                              activeCitation={activeCitation}
                              onCitationClick={openEvidenceCitation}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void saveFindings(selectedControl.id)}
                        disabled={!!saving || saveStatus === "saving" || !findingsDirty}
                      >
                        {saving === "findings" || saveStatus === "saving" ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Save now
                      </Button>
                      <SaveStatusIndicator status={saveStatus} dirty={findingsDirty} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Edits save automatically after you pause typing. Saving a signed-off control requires re-sign-off.
                    </p>

                    <ComplianceConclusionPanel
                      value={draftCompliance}
                      onChange={(value) => {
                        setDraftCompliance(value);
                        markFindingsDirty();
                      }}
                      locked={selectedEval.status === "human_confirmed"}
                    />

                    {/* Sign-off */}
                    {selectedEval.status !== "human_confirmed" && reviewMode === "individual" && (
                      <SignOffAttestationForm
                        controlCode={selectedControl.code}
                        reviewChecks={reviewChecks}
                        onReviewCheckChange={(key, checked) =>
                          setReviewChecks({ ...reviewChecks, [key]: checked })
                        }
                        reviewerName={reviewerName}
                        onReviewerNameChange={(value) => {
                          setReviewerName(value);
                          if (value.trim()) setReviewerError(false);
                        }}
                        reviewerError={reviewerError}
                        signOffDate={signOffDate}
                        onSignOffDateChange={setSignOffDate}
                        reviewNotes={reviewNotes}
                        onReviewNotesChange={setReviewNotes}
                        onSubmit={() => void submitReview([selectedControl.id])}
                        disabled={
                          !!saving ||
                          findingsDirty ||
                          saveStatus === "pending" ||
                          saveStatus === "saving"
                        }
                        saving={saving === "review"}
                        blockedByAutosave={
                          findingsDirty || saveStatus === "pending" || saveStatus === "saving"
                        }
                      />
                    )}

                    {selectedEval.status === "human_confirmed" && (
                      <SignOffCertificate
                        controlCode={selectedControl.code}
                        controlTitle={selectedControl.title}
                        complianceStatus={draftCompliance}
                        confirmedBy={selectedEval.confirmedBy}
                        confirmedAt={selectedEval.confirmedAt}
                        reviewerNotes={selectedEval.reviewerNotes}
                        onRemoveSignOff={() =>
                          removeSignOff(selectedControl.id, selectedControl.code)
                        }
                        removing={saving === "unconfirm"}
                      />
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                <ClipboardCheck className="h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium text-slate-600">Select a control to review</p>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Use the navigator to choose a control, edit findings, and sign off for reporting.
                </p>
              </div>
            )}
          </div>

          {/* Batch sign-off footer */}
          {reviewMode === "batch" && (
            <div className="shrink-0 border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                    Batch attestation
                  </p>
                  <h4 className="mt-0.5 text-sm font-semibold text-slate-900">Sign off multiple controls</h4>
                </div>
                <Button
                  size="sm"
                  onClick={() => submitReview(batchReviewable)}
                  disabled={!!saving || batchReviewable.length === 0}
                >
                  {saving === "review" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Attest selected ({batchReviewable.length})
                </Button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="space-y-2 lg:col-span-1">
                  {(["complete", "accurate", "noHallucination"] as const).map((key) => (
                    <label
                      key={key}
                      className="flex items-start gap-2 rounded-lg border border-white bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300"
                        checked={reviewChecks[key]}
                        onChange={(e) =>
                          setReviewChecks({ ...reviewChecks, [key]: e.target.checked })
                        }
                      />
                      <span className="text-xs leading-snug">
                        {key === "complete" && "Complete — addresses requirements"}
                        {key === "accurate" && "Accurate — matches evidence"}
                        {key === "noHallucination" && "No hallucination — cited claims"}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="space-y-3 lg:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <PenLine className="h-3 w-3" />
                        Reviewer name
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="Full name"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <Calendar className="h-3 w-3" />
                        Sign-off date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={signOffDate}
                        onChange={(e) => setSignOffDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Batch reviewer notes (optional)"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {!evidenceDrawer && (
        <SourceEvidenceDialog
          open={evidenceDialogOpen}
          onOpenChange={setEvidenceDialogOpen}
          citation={activeCitationObj}
          workshopNotes={workshopNotes}
          facilitatorNotes={facilitatorNotes}
          evidenceTexts={evidenceTexts}
        />
      )}
    </div>
  );
}

function ComplianceConclusionPanel({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  const selected = COMPLIANCE_OPTIONS.find((o) => o.id === value) ?? COMPLIANCE_OPTIONS[3];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Step 2 — Compliance conclusion
            </p>
            <h4 className="mt-0.5 text-base font-semibold text-slate-900">
              How does this control assess against requirements?
            </h4>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review the findings above, then select the overall compliance posture before attestation.
            </p>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              STATUS_COLORS[value] ?? STATUS_COLORS.not_assessed
            }`}
          >
            {selected.label}
          </div>
        </div>
      </div>

      <div className="p-5">
        {locked ? (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p className={`text-sm font-semibold ${selected.textClass}`}>{selected.label}</p>
              <p className="mt-1 text-sm text-slate-600">{selected.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                Locked after sign-off. Remove sign-off to change the compliance conclusion.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {COMPLIANCE_OPTIONS.map((option) => {
              const isSelected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(option.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    isSelected ? option.activeClass : option.idleClass
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dotClass} ${
                        isSelected ? "ring-2 ring-white ring-offset-1" : ""
                      }`}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? option.textClass : "text-slate-900"}`}>
                        {option.label}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">{option.summary}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">{option.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SignOffAttestationForm({
  controlCode,
  reviewChecks,
  onReviewCheckChange,
  reviewerName,
  onReviewerNameChange,
  reviewerError,
  signOffDate,
  onSignOffDateChange,
  reviewNotes,
  onReviewNotesChange,
  onSubmit,
  disabled,
  saving,
  blockedByAutosave,
}: {
  controlCode: string;
  reviewChecks: { complete: boolean; accurate: boolean; noHallucination: boolean };
  onReviewCheckChange: (key: "complete" | "accurate" | "noHallucination", checked: boolean) => void;
  reviewerName: string;
  onReviewerNameChange: (value: string) => void;
  reviewerError: boolean;
  signOffDate: string;
  onSignOffDateChange: (value: string) => void;
  reviewNotes: string;
  onReviewNotesChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  saving: boolean;
  blockedByAutosave: boolean;
}) {
  const checklist = [
    {
      key: "complete" as const,
      title: "Completeness",
      detail: "Findings address all in-scope framework requirements for this control.",
    },
    {
      key: "accurate" as const,
      title: "Accuracy",
      detail: "Statements match workshop notes, capture analysis, and uploaded evidence.",
    },
    {
      key: "noHallucination" as const,
      title: "Traceability",
      detail: "Every material claim is supported by a verifiable source citation.",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-lg shadow-indigo-100/30">
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 px-6 py-5 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
              Step 3 — Reviewer attestation
            </p>
            <h4 className="mt-0.5 text-lg font-semibold tracking-tight">Sign off control {controlCode}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-indigo-100/90">
              Your attestation records reviewer name, sign-off date, and validation criteria. Signed-off
              controls are included in formal reporting.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {checklist.map((item) => (
            <label
              key={item.key}
              className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                reviewChecks[item.key]
                  ? "border-indigo-300 bg-indigo-50/80 ring-2 ring-indigo-200"
                  : "border-slate-200 bg-slate-50/50 hover:border-indigo-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600"
                  checked={reviewChecks[item.key]}
                  onChange={(e) => onReviewCheckChange(item.key, e.target.checked)}
                />
                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.detail}</p>
            </label>
          ))}
        </div>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <PenLine className="h-3 w-3" />
              Reviewer name
            </label>
            <input
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                reviewerError
                  ? "border-red-300 focus:ring-red-100"
                  : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100"
              }`}
              placeholder="Full legal name"
              value={reviewerName}
              onChange={(e) => onReviewerNameChange(e.target.value)}
            />
            {reviewerError && (
              <p className="mt-1.5 text-xs text-red-600">Reviewer name is required to sign off.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Calendar className="h-3 w-3" />
              Sign-off date
            </label>
            <input
              type="date"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={signOffDate}
              onChange={(e) => onSignOffDateChange(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">Date this review was completed and attested.</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Reviewer notes (optional)
          </label>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            rows={2}
            placeholder="Context for audit trail — scope limitations, follow-ups, etc."
            value={reviewNotes}
            onChange={(e) => onReviewNotesChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="max-w-md text-xs text-slate-500">
            By attesting, you confirm the findings are ready for inclusion in the gap assessment and
            executive reporting package.
          </p>
          <Button onClick={onSubmit} disabled={disabled} className="shrink-0">
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1.5 h-4 w-4" />
            )}
            Attest &amp; sign off
          </Button>
        </div>
        {blockedByAutosave && (
          <p className="text-xs text-amber-600">Wait for auto-save to finish before signing off.</p>
        )}
      </div>
    </div>
  );
}

function SignOffCertificate({
  controlCode,
  controlTitle,
  complianceStatus,
  confirmedBy,
  confirmedAt,
  reviewerNotes,
  onRemoveSignOff,
  removing,
}: {
  controlCode: string;
  controlTitle: string;
  complianceStatus: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  reviewerNotes: string | null;
  onRemoveSignOff: () => void;
  removing: boolean;
}) {
  const compliance =
    COMPLIANCE_OPTIONS.find((o) => o.id === complianceStatus) ?? COMPLIANCE_OPTIONS[3];

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/80 via-white to-white shadow-lg shadow-emerald-100/40">
      <div className="relative border-b border-emerald-100/80 px-6 py-6">
        <div className="absolute right-4 top-4 opacity-10">
          <ShieldCheck className="h-24 w-24 text-emerald-600" />
        </div>
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Control review attestation
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-800">{controlCode}</p>
            <p className="mt-0.5 text-base font-semibold text-slate-900">{controlTitle}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Compliance conclusion</p>
          <p className={`mt-1 text-sm font-semibold ${compliance.textClass}`}>{compliance.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{compliance.summary}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Signed off by</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{confirmedBy ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <Calendar className="h-3 w-3" />
            Sign-off date
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatSignOffDate(confirmedAt)}</p>
          {confirmedAt && (
            <p className="mt-0.5 text-xs text-slate-500">
              Recorded at {formatSignOffTime(confirmedAt)}
            </p>
          )}
        </div>
      </div>

      {reviewerNotes && (
        <div className="mx-6 mb-5 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Reviewer notes</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{reviewerNotes}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 bg-emerald-50/30 px-6 py-4">
        <p className="flex items-center gap-1.5 text-xs text-emerald-800">
          <Lock className="h-3.5 w-3.5" />
          Included in formal reporting
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
          onClick={onRemoveSignOff}
          disabled={removing}
        >
          {removing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Remove sign-off
        </Button>
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status, dirty }: { status: SaveStatus; dirty: boolean }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-xs font-medium text-red-600">Save failed — use Save now</span>;
  }
  if (dirty || status === "pending") {
    return <span className="text-xs font-medium text-amber-600">Unsaved changes</span>;
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        All changes saved
      </span>
    );
  }
  return null;
}
