"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  FileCheck,
  Files,
  Loader2,
  Lock,
  MessageSquareMore,
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
import { ControlDocumentationPanel } from "@/components/control-documentation-panel";
import { ControlFollowUpInline } from "@/components/control-follow-up-inline";
import { FollowUpQuestionsExportButton } from "@/components/follow-up-questions-export-button";
import { openSharedEvidenceCitation, useEvidenceDrawer } from "@/components/evidence-drawer";
import { LimitedRichTextEditor } from "@/components/limited-rich-text-editor";
import { ValidationQueuePanel } from "@/components/validation-queue-panel";
import { WorkpaperReviewNotes } from "@/components/workpaper-review-notes";
import { buildValidationQueue } from "@/lib/validation-queue";
import { isMalformedFindingText } from "@/lib/capture-finding-format";
import {
  countOpenThreads,
  getWorkpaperFieldLabel,
  htmlToPlainText,
  type WorkpaperContentRecord,
  type WorkpaperFieldKey,
  type WorkpaperFieldStateRecord,
  type WorkpaperReviewNoteThread,
} from "@/lib/control-review-workpaper";
import type { ExplainabilityPayload } from "@/lib/governance-v2/types";
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

type ReviewerDisagreement = {
  id: string;
  status: string;
  mismatchReason: string | null;
  disputedField: string | null;
  reviewerOverride: string | null;
  createdAt: string;
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
  explainability?: ExplainabilityPayload | null;
  workpaperContent: WorkpaperContentRecord;
  workpaperFieldState?: WorkpaperFieldStateRecord;
  updatedAt?: string;
  control: { code: string; title: string; controlType: string; ownerRole: string };
  citations: Citation[];
  reviewNotes: WorkpaperReviewNoteThread[];
  disagreements: ReviewerDisagreement[];
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

export type ReviewLeaveGuard = {
  hasUnsavedChanges: () => boolean;
  promptSaveBeforeLeave: () => Promise<boolean>;
};

type ReviewMode = "individual" | "batch";
type ReviewTab = "details" | "writeup";
type StatusFilter = "all" | "pending" | "ready" | "confirmed" | "rejected";
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

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

const AUTO_SAVE_DELAY_MS = 1200;

const STATUS_COLORS: Record<string, string> = {
  aligned: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  gap: "bg-red-100 text-red-800 border-red-200",
  not_assessed: "bg-slate-100 text-slate-600 border-slate-200",
};

const REVIEW_STATUS_ICON: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  human_confirmed: { icon: CheckCircle2, className: "text-emerald-600", label: "Signed off" },
  rejected: { icon: XCircle, className: "text-red-500", label: "Needs revision" },
  ai_draft: { icon: Circle, className: "text-amber-500", label: "Ready to review" },
  pending: { icon: Circle, className: "text-slate-300", label: "Not analyzed" },
};

const COMPLIANCE_OPTIONS = [
  {
    id: "aligned" as const,
    label: "Aligned",
    summary: "Requirements substantially met",
    description: "Workshop evidence shows the control is implemented and supported by documentation.",
    activeClass: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200",
    idleClass: "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-900",
  },
  {
    id: "partial" as const,
    label: "Partial",
    summary: "Coverage with gaps",
    description: "Some control elements exist, but material design or operating gaps remain.",
    activeClass: "border-amber-400 bg-amber-50 ring-2 ring-amber-200",
    idleClass: "border-slate-200 hover:border-amber-200 hover:bg-amber-50/40",
    dotClass: "bg-amber-500",
    textClass: "text-amber-900",
  },
  {
    id: "gap" as const,
    label: "Gap",
    summary: "Material remediation needed",
    description: "Current evidence does not support effective implementation for in-scope requirements.",
    activeClass: "border-red-400 bg-red-50 ring-2 ring-red-200",
    idleClass: "border-slate-200 hover:border-red-200 hover:bg-red-50/40",
    dotClass: "bg-red-500",
    textClass: "text-red-900",
  },
  {
    id: "not_assessed" as const,
    label: "Not assessed",
    summary: "Insufficient evidence",
    description: "The workpaper does not yet contain enough grounded support to conclude on this control.",
    activeClass: "border-slate-400 bg-slate-100 ring-2 ring-slate-300",
    idleClass: "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
    dotClass: "bg-slate-400",
    textClass: "text-slate-800",
  },
] as const;

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

function fieldToCitationSection(field: WorkpaperFieldKey): string | null {
  switch (field) {
    case "inPlaceFindings":
      return "in_place";
    case "gapFindings":
      return "gap";
    case "recommendations":
      return "recommendation";
    default:
      return null;
  }
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

export function ControlReviewWorkpaperPanel({
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
  const [draftConclusion, setDraftConclusion] = useState("");
  const [draftCompliance, setDraftCompliance] = useState("not_assessed");
  const [findingsDirty, setFindingsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [reviewTab, setReviewTab] = useState<ReviewTab>("details");
  const [activeField, setActiveField] = useState<WorkpaperFieldKey>("inPlaceFindings");
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);
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
    draftConclusion,
    draftCompliance,
  });

  stateRef.current = {
    findingsDirty,
    saveStatus,
    selectedControlId,
    draftInPlace,
    draftGaps,
    draftRecs,
    draftConclusion,
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
        new Map(
          [...evalByControl.entries()].map(([controlId, evaluation]) => [
            controlId,
            {
              ...evaluation,
              openReviewNotes: countOpenThreads(evaluation.reviewNotes ?? []),
            },
          ])
        )
      ),
    [allControls, evalByControl]
  );

  const selectedEval = selectedControlId ? evalByControl.get(selectedControlId) ?? null : null;
  const selectedControl = allControls.find((c) => c.id === selectedControlId) ?? null;
  const selectedOpenNotes = selectedEval ? countOpenThreads(selectedEval.reviewNotes ?? []) : 0;
  const hasSelectedOpenNotes = selectedOpenNotes > 0;

  const documentationValidation = selectedEval?.explainability?.documentationValidation ?? null;
  const activeCitationObj = useMemo(() => {
    if (activeCitation == null || !selectedEval) return null;
    return selectedEval.citations.find((c) => c.citationIndex === activeCitation) ?? null;
  }, [activeCitation, selectedEval]);

  const activeFieldCitations = useMemo(() => {
    if (!selectedEval) return [];
    const section = fieldToCitationSection(activeField);
    if (!section) return [];
    return selectedEval.citations.filter((c) => c.section === section);
  }, [activeField, selectedEval]);

  const navigableIds = filteredControls.map((c) => c.id);
  const currentIndex = selectedControlId ? navigableIds.indexOf(selectedControlId) : -1;

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
    const syncKey = [
      selectedControlId,
      ev.analyzedAt ?? "",
      ev.updatedAt ?? "",
      ev.workpaperContent?.inPlaceFindings ?? ev.inPlaceFindings,
      ev.workpaperContent?.gapFindings ?? ev.gapFindings,
      ev.workpaperContent?.recommendations ?? ev.recommendations,
      ev.workpaperContent?.overallConclusion ?? ev.reviewerNotes ?? "",
    ].join(":");
    if (loadedControlRef.current === syncKey) return;

    setDraftInPlace(ev.workpaperContent?.inPlaceFindings ?? "");
    setDraftGaps(ev.workpaperContent?.gapFindings ?? "");
    setDraftRecs(ev.workpaperContent?.recommendations ?? "");
    setDraftConclusion(ev.workpaperContent?.overallConclusion ?? "");
    setDraftCompliance(ev.complianceStatus);
    setReviewChecks({
      complete: ev.reviewerComplete ?? false,
      accurate: ev.reviewerAccurate ?? false,
      noHallucination: ev.reviewerNoHallucination ?? false,
    });
    setReviewNotes(ev.reviewerNotes ?? "");
    setFindingsDirty(false);
    setSaveStatus("idle");
    setActiveField("inPlaceFindings");
    loadedControlRef.current = syncKey;
  }, [selectedControlId, evalByControl]);

  useEffect(() => {
    const stored = localStorage.getItem("aigovernance-reviewer-name");
    if (stored) setReviewerName(stored);
  }, []);

  function draftsMatch(
    a: {
      inPlace: string;
      gaps: string;
      recs: string;
      conclusion: string;
      compliance: string;
    },
    b: {
      inPlace: string;
      gaps: string;
      recs: string;
      conclusion: string;
      compliance: string;
    }
  ) {
    return (
      a.inPlace === b.inPlace &&
      a.gaps === b.gaps &&
      a.recs === b.recs &&
      a.conclusion === b.conclusion &&
      a.compliance === b.compliance
    );
  }

  const persistWorkpaper = useCallback(
    async (controlId: string, options?: { manual?: boolean }) => {
      const snapshot = {
        inPlace: stateRef.current.draftInPlace,
        gaps: stateRef.current.draftGaps,
        recs: stateRef.current.draftRecs,
        conclusion: stateRef.current.draftConclusion,
        compliance: stateRef.current.draftCompliance,
      };

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      if (options?.manual) setSaving("workpaper");
      setSaveStatus("saving");

      try {
        const res = await fetch(`/api/assessments/${assessmentId}/control-review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_workpaper",
            controlId,
            complianceStatus: snapshot.compliance,
            workpaperContent: {
              inPlaceFindings: snapshot.inPlace,
              gapFindings: snapshot.gaps,
              recommendations: snapshot.recs,
              overallConclusion: snapshot.conclusion,
            },
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
          conclusion: stateRef.current.draftConclusion,
          compliance: stateRef.current.draftCompliance,
        };
        const stillDirty = !draftsMatch(snapshot, current);
        setFindingsDirty(stillDirty);
        setSaveStatus(stillDirty ? "pending" : "saved");
        loadedControlRef.current = null;
        await onReload();
        return !stillDirty;
      } catch (error) {
        setSaveStatus("error");
        toast(error instanceof Error ? error.message : "Save failed", { variant: "error" });
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
    return persistWorkpaper(controlId);
  }, [persistWorkpaper]);

  const promptSaveBeforeLeave = useCallback(async (): Promise<boolean> => {
    await flushAutoSave();
    const { findingsDirty: dirty, saveStatus: status, selectedControlId: controlId } = stateRef.current;
    if (!dirty && status !== "pending" && status !== "saving") return true;
    if (!controlId) return true;

    const shouldSave = window.confirm(
      "You have unsaved workpaper edits. Save them before leaving this control?"
    );
    if (!shouldSave) return false;

    const saved = await persistWorkpaper(controlId, { manual: true });
    if (!saved && stateRef.current.findingsDirty) {
      toast("Could not save your edits. Please try again before leaving.", { variant: "error" });
      return false;
    }
    return true;
  }, [flushAutoSave, persistWorkpaper]);

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
      void persistWorkpaper(selectedControlId);
    }, AUTO_SAVE_DELAY_MS);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    draftInPlace,
    draftGaps,
    draftRecs,
    draftConclusion,
    draftCompliance,
    findingsDirty,
    selectedControlId,
    persistWorkpaper,
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
      setReviewTab("details");
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

  async function saveWorkpaper(controlId: string) {
    await persistWorkpaper(controlId, { manual: true });
  }

  async function runReviewMutation(payload: Record<string, unknown>) {
    const res = await fetch(`/api/assessments/${assessmentId}/control-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Review action failed");
    }
    loadedControlRef.current = null;
    await onReload();
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
    try {
      await runReviewMutation({
        action: controlIds.length > 1 ? "batch_review" : "review",
        controlId: controlIds.length === 1 ? controlIds[0] : undefined,
        controlIds: controlIds.length > 1 ? controlIds : undefined,
        confirmedBy: reviewerName.trim(),
        reviewerComplete: reviewChecks.complete,
        reviewerAccurate: reviewChecks.accurate,
        reviewerNoHallucination: reviewChecks.noHallucination,
        reviewerNotes: reviewNotes || undefined,
        confirmedAt: signOffDateToIso(signOffDate),
      });
      setBatchSelected(new Set());
      if (reviewMode === "individual") goNext();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Sign-off failed", { variant: "error" });
    } finally {
      setSaving("");
    }
  }

  async function removeSignOff(controlId: string, controlCode: string) {
    const proceed = window.confirm(
      `Remove sign-off for ${controlCode}?\n\nThis control will return to draft review status and will be excluded from formal reporting until signed off again.`
    );
    if (!proceed) return;
    setSaving("unconfirm");
    try {
      await runReviewMutation({ action: "unconfirm", controlId });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove sign-off", {
        variant: "error",
      });
    } finally {
      setSaving("");
    }
  }

  async function createThread(input: {
    fieldKey: WorkpaperFieldKey;
    title?: string;
    body: string;
    createdBy: string;
    assignee?: string;
    quotedText?: string;
    highlightId?: string;
  }) {
    if (!selectedControlId) return false;
    setSaving("thread");
    try {
      await runReviewMutation({
        action: "create_review_note",
        controlId: selectedControlId,
        fieldKey: input.fieldKey,
        noteTitle: input.title,
        noteBody: input.body,
        createdBy: input.createdBy,
        assignee: input.assignee,
        noteQuotedText: input.quotedText,
        noteHighlightId: input.highlightId,
      });
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create note", { variant: "error" });
      return false;
    } finally {
      setSaving("");
    }
  }

  async function replyToThread(input: { threadId: string; body: string; createdBy: string }) {
    setBusyThreadId(input.threadId);
    try {
      await runReviewMutation({
        action: "reply_review_note",
        noteThreadId: input.threadId,
        noteBody: input.body,
        createdBy: input.createdBy,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not reply to note", { variant: "error" });
    } finally {
      setBusyThreadId(null);
    }
  }

  async function assignThread(input: { threadId: string; assignee: string; createdBy: string }) {
    setBusyThreadId(input.threadId);
    try {
      await runReviewMutation({
        action: "assign_review_note",
        noteThreadId: input.threadId,
        assignee: input.assignee,
        createdBy: input.createdBy,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not assign note", { variant: "error" });
    } finally {
      setBusyThreadId(null);
    }
  }

  async function resolveThread(input: {
    threadId: string;
    resolvedBy: string;
    resolutionNote?: string;
  }) {
    setBusyThreadId(input.threadId);
    try {
      await runReviewMutation({
        action: "resolve_review_note",
        noteThreadId: input.threadId,
        resolvedBy: input.resolvedBy,
        resolutionNote: input.resolutionNote,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not resolve note", { variant: "error" });
    } finally {
      setBusyThreadId(null);
    }
  }

  async function reopenThread(input: {
    threadId: string;
    createdBy: string;
    resolutionNote?: string;
  }) {
    setBusyThreadId(input.threadId);
    try {
      await runReviewMutation({
        action: "reopen_review_note",
        noteThreadId: input.threadId,
        createdBy: input.createdBy,
        resolutionNote: input.resolutionNote,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not reopen note", { variant: "error" });
    } finally {
      setBusyThreadId(null);
    }
  }

  const batchReviewable = useMemo(() => {
    return [...batchSelected].filter((id) => {
      const ev = evalByControl.get(id);
      return ev && ev.status !== "pending" && ev.inPlaceFindings.trim();
    });
  }, [batchSelected, evalByControl]);

  const batchHasOpenNotes = useMemo(
    () =>
      batchReviewable.some((controlId) => {
        const evaluation = evalByControl.get(controlId);
        return countOpenThreads(evaluation?.reviewNotes ?? []) > 0;
      }),
    [batchReviewable, evalByControl]
  );

  const actionBarBlocked =
    !!saving || findingsDirty || saveStatus === "pending" || saveStatus === "saving";

  async function requestChanges() {
    if (!selectedControl) return;
    if (!reviewerName.trim()) {
      setReviewerError(true);
      return;
    }
    await flushAutoSave();
    if (stateRef.current.findingsDirty) return;
    setSaving("request_changes");
    try {
      await runReviewMutation({
        action: "request_changes",
        controlId: selectedControl.id,
        confirmedBy: reviewerName.trim(),
        confirmedAt: signOffDateToIso(signOffDate),
        reviewerComplete: reviewChecks.complete,
        reviewerAccurate: false,
        reviewerNoHallucination: reviewChecks.noHallucination,
        reviewerNotes:
          reviewNotes.trim() ||
          "Reviewer requested changes before final approval in the Validate workpaper.",
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not request changes", {
        variant: "error",
      });
    } finally {
      setSaving("");
    }
  }

  async function resolveAllNotes() {
    if (!selectedControl || !reviewerName.trim() || selectedOpenNotes === 0) return;
    setSaving("resolve_notes");
    try {
      await runReviewMutation({
        action: "resolve_all_review_notes",
        controlId: selectedControl.id,
        resolvedBy: reviewerName.trim(),
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not resolve notes", {
        variant: "error",
      });
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/30">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Validate workpaper</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Reviewer-first control workpapers</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Document grounded findings, challenge them with threaded notes, validate evidence completeness, and
              sign off only when the workpaper is resolved and defensible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FollowUpQuestionsExportButton assessmentId={assessmentId} departmentQuery={departmentQuery} />
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {stats.confirmed}
                <span className="text-base font-normal text-slate-400"> / {stats.total}</span>
              </p>
              <p className="text-xs text-slate-500">controls signed off</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-indigo-100">
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
                      const openNotes = ev ? countOpenThreads(ev.reviewNotes ?? []) : 0;

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
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {openNotes > 0 && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  {openNotes} open note{openNotes === 1 ? "" : "s"}
                                </span>
                              )}
                              {ev?.disagreements?.some((item) => item.status === "open") && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                  disagreement
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden lg:col-span-8">
          {reviewMode === "batch" && batchReviewable.length > 0 && (
            <div className="shrink-0 border-b border-indigo-200 bg-indigo-50/80 px-5 py-3">
              <p className="text-sm font-medium text-indigo-900">
                <Users className="mr-1.5 inline h-4 w-4" />
                {batchReviewable.length} control(s) selected for batch attestation
              </p>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {selectedControl && selectedEval ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {selectedControl.pillarLabel}
                        </Badge>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {stats.confirmed}/{stats.total} signed off
                        </span>
                        {selectedEval.status === "human_confirmed" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            <Lock className="mr-1 h-3 w-3" /> Signed off
                          </Badge>
                        ) : selectedEval.status === "rejected" ? (
                          <Badge variant="danger">Needs revision</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700">
                            Workpaper in progress
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                        <span className="font-mono text-indigo-700">{selectedControl.code}</span>
                        <span className="font-normal text-slate-400"> — </span>
                        {selectedControl.title}
                      </h3>
                      <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-600">
                        {selectedControl.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <MetaChip
                        icon={Files}
                        label={`${selectedOpenNotes} open review note${selectedOpenNotes === 1 ? "" : "s"}`}
                        tone={hasSelectedOpenNotes ? "amber" : "slate"}
                      />
                      <MetaChip
                        icon={FileCheck}
                        label={
                          documentationValidation
                            ? `${documentationValidation.coveragePct}% documentation coverage`
                            : "Documentation not validated"
                        }
                        tone={documentationValidation?.overallStatus === "complete" ? "emerald" : "slate"}
                      />
                      <MetaChip
                        icon={MessageSquareMore}
                        label={`${selectedEval.citations.length} source citation${selectedEval.citations.length === 1 ? "" : "s"}`}
                        tone="slate"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {([
                        ["details", "Control details"],
                        ["writeup", "Control Documentation"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setReviewTab(id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            reviewTab === id
                              ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="ml-auto flex flex-wrap gap-2">
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
                        Re-analyze
                      </Button>
                      <Button size="sm" variant="outline" onClick={goPrev} disabled={currentIndex <= 0}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={goNext} disabled={currentIndex >= navigableIds.length - 1}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {hasSelectedOpenNotes && (
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Open reviewer notes are blocking approval</p>
                        <p className="mt-1 text-xs text-amber-800/80">
                          Resolve or reopen the active field threads before this control can be approved.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-900 hover:bg-amber-100"
                        onClick={() => void resolveAllNotes()}
                        disabled={!reviewerName.trim() || selectedOpenNotes === 0 || !!saving}
                      >
                        {saving === "resolve_notes" ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Resolve all notes
                      </Button>
                    </div>
                  </div>
                )}

                {selectedEval.disagreements.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-rose-900">Reviewer disagreement history detected</p>
                    <p className="mt-1 text-xs text-rose-800/80">
                      Prior reviewer objections remain attached to this control for traceability and challenge history.
                    </p>
                  </div>
                )}

                {reviewTab === "details" ? (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Control details
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <StatusRow label="Control code" value={selectedControl.code} />
                          <StatusRow label="Owner role" value={selectedControl.ownerRole || "Unassigned"} />
                          <StatusRow
                            label="Reviewer status"
                            value={REVIEW_STATUS_ICON[selectedEval.status ?? "pending"]?.label ?? "In progress"}
                            tone={selectedEval.status === "human_confirmed" ? "emerald" : selectedEval.status === "rejected" ? "amber" : "slate"}
                          />
                        </div>
                        {selectedEval.explainability?.frameworkRequirements?.length ? (
                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Framework references in scope
                            </p>
                            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                              {selectedEval.explainability.frameworkRequirements.slice(0, 6).map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>

                      <ControlDocumentationPanel
                        assessmentId={assessmentId}
                        controlCode={selectedControl.code}
                        onValidationChange={() => void onReload()}
                        showRequiredDocumentation={false}
                      />
                    </div>

                    <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
                      <WorkpaperStatusCard
                        selectedEval={selectedEval}
                        documentationValidation={documentationValidation}
                        openNotes={selectedOpenNotes}
                      />

                      {selectedEval.disagreements.length > 0 && (
                        <div className="rounded-2xl border border-rose-200 bg-white shadow-sm">
                          <div className="border-b border-rose-100 px-4 py-3">
                            <p className="text-sm font-semibold text-rose-900">Open disagreements</p>
                            <p className="mt-1 text-xs text-rose-700/80">
                              Historical reviewer disputes carried into the workpaper for traceability.
                            </p>
                          </div>
                          <div className="space-y-3 p-4">
                            {selectedEval.disagreements.map((item) => (
                              <div key={item.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                  {item.disputedField?.replaceAll("_", " ") ?? "general"}
                                </p>
                                {item.mismatchReason && (
                                  <p className="mt-1 text-sm text-slate-700">{item.mismatchReason}</p>
                                )}
                                {item.reviewerOverride && (
                                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.reviewerOverride}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </aside>
                  </div>
                ) : (
                  <>
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
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
                          <div className="space-y-5">
                            <LimitedRichTextEditor
                              label="In Place"
                              value={draftInPlace}
                              onChange={(value) => {
                                setDraftInPlace(value);
                                markFindingsDirty();
                              }}
                              onFocus={() => setActiveField("inPlaceFindings")}
                              noteCount={countOpenThreads(selectedEval.reviewNotes, "inPlaceFindings")}
                              onOpenNotes={() => setActiveField("inPlaceFindings")}
                              reviewerName={reviewerName}
                              onCreateReviewNote={(input) =>
                                createThread({
                                  fieldKey: "inPlaceFindings",
                                  createdBy: reviewerName,
                                  ...input,
                                })
                              }
                              onCitationClick={openEvidenceCitation}
                              statusText="Grounded operating practices already evidenced."
                            />

                            <ControlDocumentationPanel
                              assessmentId={assessmentId}
                              controlCode={selectedControl.code}
                              onValidationChange={() => void onReload()}
                              showRequirementContext={false}
                              showFrameworkObligations={false}
                            />

                            <LimitedRichTextEditor
                              label="Gaps"
                              value={draftGaps}
                              onChange={(value) => {
                                setDraftGaps(value);
                                markFindingsDirty();
                              }}
                              onFocus={() => setActiveField("gapFindings")}
                              noteCount={countOpenThreads(selectedEval.reviewNotes, "gapFindings")}
                              onOpenNotes={() => setActiveField("gapFindings")}
                              reviewerName={reviewerName}
                              onCreateReviewNote={(input) =>
                                createThread({
                                  fieldKey: "gapFindings",
                                  createdBy: reviewerName,
                                  ...input,
                                })
                              }
                              onCitationClick={openEvidenceCitation}
                              statusText="Document deficiencies, missing controls, and unsupported claims."
                            />

                            <LimitedRichTextEditor
                              label="Recommendations"
                              value={draftRecs}
                              onChange={(value) => {
                                setDraftRecs(value);
                                markFindingsDirty();
                              }}
                              onFocus={() => setActiveField("recommendations")}
                              noteCount={countOpenThreads(selectedEval.reviewNotes, "recommendations")}
                              onOpenNotes={() => setActiveField("recommendations")}
                              reviewerName={reviewerName}
                              onCreateReviewNote={(input) =>
                                createThread({
                                  fieldKey: "recommendations",
                                  createdBy: reviewerName,
                                  ...input,
                                })
                              }
                              onCitationClick={openEvidenceCitation}
                              statusText="Describe the first remediation steps and expected uplift."
                            />

                            <LimitedRichTextEditor
                              label="Reviewer Conclusion"
                              value={draftConclusion}
                              onChange={(value) => {
                                setDraftConclusion(value);
                                markFindingsDirty();
                              }}
                              onFocus={() => setActiveField("overallConclusion")}
                              noteCount={countOpenThreads(selectedEval.reviewNotes, "overallConclusion")}
                              onOpenNotes={() => setActiveField("overallConclusion")}
                              reviewerName={reviewerName}
                              onCreateReviewNote={(input) =>
                                createThread({
                                  fieldKey: "overallConclusion",
                                  createdBy: reviewerName,
                                  ...input,
                                })
                              }
                              statusText="Optional wrap-up for reporting reviewers and quality control."
                            />

                            <ComplianceConclusionPanel
                              value={draftCompliance}
                              onChange={(value) => {
                                setDraftCompliance(value);
                                setActiveField("complianceStatus");
                                markFindingsDirty();
                              }}
                              locked={selectedEval.status === "human_confirmed"}
                            />

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
                                disabled={actionBarBlocked || hasSelectedOpenNotes}
                                saving={saving === "review"}
                                blockedByAutosave={findingsDirty || saveStatus === "pending" || saveStatus === "saving"}
                                blockedByOpenNotes={hasSelectedOpenNotes}
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
                                onRemoveSignOff={() => removeSignOff(selectedControl.id, selectedControl.code)}
                                removing={saving === "unconfirm"}
                              />
                            )}
                          </div>

                          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
                            <WorkpaperStatusCard
                              selectedEval={selectedEval}
                              documentationValidation={documentationValidation}
                              openNotes={selectedOpenNotes}
                            />

                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                              <div className="border-b border-slate-100 px-4 py-3">
                                <p className="text-sm font-semibold text-slate-900">Reviewed supports</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Active field: {getWorkpaperFieldLabel(activeField)}
                                </p>
                              </div>
                              <div className="p-4">
                                {activeFieldCitations.length > 0 ? (
                                  <CitedAnalysis
                                    text={htmlToPlainText(
                                      activeField === "inPlaceFindings"
                                        ? draftInPlace
                                        : activeField === "gapFindings"
                                          ? draftGaps
                                          : activeField === "recommendations"
                                            ? draftRecs
                                            : draftConclusion
                                    )}
                                    citations={activeFieldCitations}
                                    activeCitation={activeCitation}
                                    onCitationClick={openEvidenceCitation}
                                    className="text-sm"
                                  />
                                ) : (
                                  <p className="text-sm text-slate-500">
                                    No direct citations are mapped to this field yet.
                                  </p>
                                )}
                              </div>
                            </div>

                            <WorkpaperReviewNotes
                              activeField={activeField}
                              onSelectField={setActiveField}
                              threads={selectedEval.reviewNotes}
                              onCreateThread={createThread}
                              onReplyToThread={replyToThread}
                              onAssignThread={assignThread}
                              onResolveThread={resolveThread}
                              onReopenThread={reopenThread}
                              reviewerName={reviewerName}
                              busyThreadId={busyThreadId}
                            />

                            {selectedEval.disagreements.length > 0 && (
                              <div className="rounded-2xl border border-rose-200 bg-white shadow-sm">
                                <div className="border-b border-rose-100 px-4 py-3">
                                  <p className="text-sm font-semibold text-rose-900">Open disagreements</p>
                                  <p className="mt-1 text-xs text-rose-700/80">
                                    Historical reviewer disputes carried into the workpaper for traceability.
                                  </p>
                                </div>
                                <div className="space-y-3 p-4">
                                  {selectedEval.disagreements.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                                        {item.disputedField?.replaceAll("_", " ") ?? "general"}
                                      </p>
                                      {item.mismatchReason && (
                                        <p className="mt-1 text-sm text-slate-700">{item.mismatchReason}</p>
                                      )}
                                      {item.reviewerOverride && (
                                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                          {item.reviewerOverride}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </aside>
                        </div>

                        {reviewMode === "individual" && (
                          <div className="sticky bottom-0 z-20 rounded-[24px] border border-slate-900/10 bg-white/95 p-4 shadow-2xl shadow-slate-300/25 backdrop-blur">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                  Workpaper actions
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Save, challenge, resolve, and approve from a single sticky action rail.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void saveWorkpaper(selectedControl.id)}
                                  disabled={!!saving || saveStatus === "saving" || !findingsDirty}
                                >
                                  {saving === "workpaper" || saveStatus === "saving" ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Save className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Save draft
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-rose-200 text-rose-800 hover:bg-rose-50"
                                  onClick={() => void requestChanges()}
                                  disabled={actionBarBlocked || !reviewerName.trim() || selectedEval.status === "human_confirmed"}
                                >
                                  Request changes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-200 text-amber-800 hover:bg-amber-50"
                                  onClick={() => void resolveAllNotes()}
                                  disabled={!reviewerName.trim() || selectedOpenNotes === 0 || !!saving}
                                >
                                  {saving === "resolve_notes" ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Resolve all notes
                                </Button>
                                {selectedEval.status === "human_confirmed" ? (
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
                                    Re-open control
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => void submitReview([selectedControl.id])}
                                    disabled={actionBarBlocked || hasSelectedOpenNotes}
                                  >
                                    {saving === "review" ? (
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    Approve control
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                <ClipboardCheck className="h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium text-slate-600">Select a control workpaper</p>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Use the left queue to open a control, document the workpaper, resolve review notes, and sign off.
                </p>
              </div>
            )}
          </div>

          {reviewMode === "batch" && (
            <div className="shrink-0 border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Batch attestation</p>
                  <h4 className="mt-0.5 text-sm font-semibold text-slate-900">Sign off multiple controls</h4>
                  {batchHasOpenNotes && (
                    <p className="mt-1 text-xs text-amber-700">
                      Resolve open workpaper notes on selected controls before batch sign-off.
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => submitReview(batchReviewable)}
                  disabled={!!saving || batchReviewable.length === 0 || batchHasOpenNotes}
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

function MetaChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Files;
  label: string;
  tone: "slate" | "amber" | "emerald";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function WorkpaperStatusCard({
  selectedEval,
  documentationValidation,
  openNotes,
}: {
  selectedEval: ReviewControlEval;
  documentationValidation: ExplainabilityPayload["documentationValidation"] | null;
  openNotes: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Workpaper status</p>
        <p className="mt-1 text-xs text-slate-500">Approval is blocked until open field notes are resolved.</p>
      </div>
      <div className="space-y-3 p-4">
        <StatusRow
          label="Review state"
          value={REVIEW_STATUS_ICON[selectedEval.status ?? "pending"]?.label ?? "In progress"}
        />
        <StatusRow label="Open notes" value={String(openNotes)} tone={openNotes > 0 ? "amber" : "emerald"} />
        <StatusRow
          label="Documentation"
          value={
            documentationValidation
              ? `${documentationValidation.overallStatus} (${documentationValidation.coveragePct}%)`
              : "Not validated"
          }
          tone={documentationValidation?.overallStatus === "complete" ? "emerald" : "slate"}
        />
        <StatusRow
          label="Traceability"
          value={`${selectedEval.citations.length} citation${selectedEval.citations.length === 1 ? "" : "s"}`}
        />
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "amber" | "emerald";
}) {
  const tones = {
    slate: "text-slate-700",
    amber: "text-amber-800",
    emerald: "text-emerald-700",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tones[tone]}`}>{value}</p>
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
              Compliance conclusion
            </p>
            <h4 className="mt-0.5 text-base font-semibold text-slate-900">
              What is the current control posture?
            </h4>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Select the overall conclusion that should flow into downstream reporting.
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
                Locked after sign-off. Re-open sign-off to change the conclusion.
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
  blockedByOpenNotes,
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
  blockedByOpenNotes: boolean;
}) {
  const checklist = [
    {
      key: "complete" as const,
      title: "Completeness",
      detail: "Findings address in-scope requirements, evidence coverage, and reviewer conclusion.",
    },
    {
      key: "accurate" as const,
      title: "Accuracy",
      detail: "Statements match workshop notes, documentation, and uploaded evidence.",
    },
    {
      key: "noHallucination" as const,
      title: "Traceability",
      detail: "Material claims are grounded in source citations or clearly flagged as missing evidence.",
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
              Final reviewer attestation
            </p>
            <h4 className="mt-0.5 text-lg font-semibold tracking-tight">Approve control {controlCode}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-indigo-100/90">
              Sign-off is allowed only when the workpaper is saved, evidence is reviewed, and all field notes are
              resolved.
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
            placeholder="Context for audit trail — scope limitations, review observations, or follow-ups."
            value={reviewNotes}
            onChange={(e) => onReviewNotesChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="max-w-md text-xs text-slate-500">
            Approved controls are projected into the existing control evaluation record and become eligible for
            formal reporting.
          </p>
          <Button onClick={onSubmit} disabled={disabled} className="shrink-0">
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1.5 h-4 w-4" />
            )}
            Approve control
          </Button>
        </div>
        {blockedByAutosave && (
          <p className="text-xs text-amber-600">Wait for auto-save to finish before approving this control.</p>
        )}
        {blockedByOpenNotes && (
          <p className="inline-flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Resolve all open review notes before approval.
          </p>
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
          Re-open sign-off
        </Button>
      </div>
    </div>
  );
}

