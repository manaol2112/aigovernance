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
  const [reviewTab, setReviewTab] = useState<ReviewTab>("writeup");
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
      setReviewTab("writeup");
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]/40">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#E3E3E3] bg-white px-3 py-1.5 sm:px-4">
        <div className="inline-flex rounded-md border border-[#E3E3E3] bg-[#FAFAFA] p-0.5">
          {([
            ["individual", "Individual"],
            ["batch", "Batch"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => void guardedNavigate(() => setReviewMode(mode))}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                reviewMode === mode
                  ? "bg-black text-white"
                  : "text-[#53565A] hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inline-flex min-w-0 flex-1 flex-wrap gap-0.5 overflow-x-auto [scrollbar-width:thin]">
          {([
            ["all", "All"],
            ["ready", "Ready"],
            ["confirmed", "Signed"],
            ["rejected", "Revision"],
            ["pending", "Pending"],
          ] as const).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => void guardedNavigate(() => setStatusFilter(f))}
              className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                statusFilter === f
                  ? "bg-black text-white"
                  : "text-[#53565A] hover:bg-[#F5F5F5] hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FollowUpQuestionsExportButton assessmentId={assessmentId} departmentQuery={departmentQuery} />
          <div className="inline-flex items-center gap-1 text-[11px] tabular-nums text-[#666666]">
            <span className="font-semibold text-black">{stats.confirmed}</span>
            <span>/</span>
            <span>{stats.total}</span>
            <div className="ml-0.5 h-1 w-12 overflow-hidden rounded-full bg-[#F0F0F0]">
              <div
                className="h-full rounded-full bg-[var(--theme-brand)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-12">
        <aside className="flex max-h-[34vh] flex-col overflow-hidden border-b border-[#E3E3E3] bg-white lg:col-span-3 lg:max-h-none lg:border-b-0 lg:border-r">
          <ValidationQueuePanel
            queue={validationQueue}
            selectedControlId={selectedControlId}
            onSelectControl={selectControl}
          />
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
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
                <div key={pillar.pillarId} className="border-b border-[#E3E3E3]">
                  <div className="flex items-center gap-1.5 bg-[#FAFAFA] px-2 py-1.5">
                    {reviewMode === "batch" && (() => {
                      const reviewableIds = pillar.controls
                        .map((c) => c.id)
                        .filter((id) => evalByControl.get(id)?.inPlaceFindings?.trim());
                      return (
                        <input
                          type="checkbox"
                          className="rounded border-[#D0D0CE]"
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
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
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
                        className={`h-3.5 w-3.5 shrink-0 text-[#A7A8AA] transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-black">{pillar.pillarLabel}</p>
                        <p className="text-[10px] tabular-nums text-[#767676]">
                          {pillarConfirmed}/{pillar.controls.length}
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
                          className={`flex items-start gap-1.5 border-l-2 px-2 py-1.5 transition-colors ${
                            selected
                              ? "border-black bg-[#FAFAFA]"
                              : "border-transparent hover:bg-[#FAFAFA]"
                          }`}
                        >
                          {reviewMode === "batch" && (
                            <input
                              type="checkbox"
                              className="mt-0.5 rounded border-[#D0D0CE]"
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
                            <div className="flex items-center gap-1.5">
                              <ReviewIcon className={`h-3 w-3 shrink-0 ${reviewMeta.className}`} />
                              <span className="font-mono text-[10px] font-semibold text-black">{c.code}</span>
                              {openNotes > 0 && (
                                <span className="rounded bg-amber-50 px-1 text-[9px] font-semibold text-amber-800">
                                  {openNotes}n
                                </span>
                              )}
                              {ev && (
                                <span
                                  className={`ml-auto shrink-0 rounded border px-1 py-px text-[9px] font-medium uppercase ${
                                    STATUS_COLORS[ev.complianceStatus] ?? ""
                                  }`}
                                >
                                  {ev.complianceStatus.replace("_", " ").slice(0, 7)}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-[#666666]">{c.title}</p>
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden lg:col-span-9">
          {reviewMode === "batch" && batchReviewable.length > 0 && (
            <div className="shrink-0 border-b border-[#E3E3E3] bg-[#FAFAFA] px-3 py-1.5">
              <p className="text-[11px] font-medium text-black">
                <Users className="mr-1 inline h-3.5 w-3.5" />
                {batchReviewable.length} selected for batch sign-off
              </p>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4 [scrollbar-width:thin]">
            {selectedControl && selectedEval ? (
              <div className="space-y-3 pb-14">
                <div className="rounded-lg border border-[#E3E3E3] bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs font-semibold text-black">{selectedControl.code}</span>
                    <span className="text-[#D0D0CE]">·</span>
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-black">
                      {selectedControl.title}
                    </h3>
                    {selectedEval.status === "human_confirmed" ? (
                      <Badge className="bg-[#EEF7E0] text-[#046A38] hover:bg-[#EEF7E0]">
                        <Lock className="mr-1 h-3 w-3" /> Signed off
                      </Badge>
                    ) : selectedEval.status === "rejected" ? (
                      <Badge variant="danger">Needs revision</Badge>
                    ) : hasSelectedOpenNotes ? (
                      <Badge variant="outline" className="border-amber-200 text-amber-800">
                        {selectedOpenNotes} open note{selectedOpenNotes === 1 ? "" : "s"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[#666666]">
                        In progress
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-md border border-[#E3E3E3] bg-[#FAFAFA] p-0.5">
                      {([
                        ["writeup", "Workpaper"],
                        ["details", "Details"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setReviewTab(id)}
                          className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            reviewTab === id
                              ? "bg-black text-white"
                              : "text-[#53565A] hover:text-black"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="hidden text-[10px] text-[#767676] sm:inline">
                      {selectedControl.pillarLabel}
                      {documentationValidation
                        ? ` · ${documentationValidation.coveragePct}% docs`
                        : ""}
                      {` · ${selectedEval.citations.length} citations`}
                    </span>
                    <div className="ml-auto flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => analyzeControl(selectedControl.id)}
                        disabled={!!saving}
                      >
                        {saving === `analyze-${selectedControl.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Brain className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={goPrev} disabled={currentIndex <= 0}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={goNext} disabled={currentIndex >= navigableIds.length - 1}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {hasSelectedOpenNotes && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs text-amber-900">
                      <span className="font-semibold">{selectedOpenNotes} open note{selectedOpenNotes === 1 ? "" : "s"}</span>
                      {" "}blocking approval
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-amber-200 text-xs text-amber-900"
                      onClick={() => void resolveAllNotes()}
                      disabled={!reviewerName.trim() || selectedOpenNotes === 0 || !!saving}
                    >
                      Resolve all
                    </Button>
                  </div>
                )}

                {selectedEval.disagreements.length > 0 && (
                  <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">
                    Disagreement history attached to this control.
                  </p>
                )}

                {reviewTab === "details" ? (
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-3">
                      <div className="rounded-lg border border-[#E3E3E3] bg-white px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#767676]">
                          Control details
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-[#666666]">
                          {selectedControl.description}
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <StatusRow label="Control code" value={selectedControl.code} />
                          <StatusRow label="Owner role" value={selectedControl.ownerRole || "Unassigned"} />
                          <StatusRow
                            label="Reviewer status"
                            value={REVIEW_STATUS_ICON[selectedEval.status ?? "pending"]?.label ?? "In progress"}
                            tone={selectedEval.status === "human_confirmed" ? "emerald" : selectedEval.status === "rejected" ? "amber" : "slate"}
                          />
                        </div>
                        {selectedEval.explainability?.frameworkRequirements?.length ? (
                          <div className="mt-3 rounded-md border border-[#E3E3E3] bg-[#FAFAFA] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#767676]">
                              Framework references
                            </p>
                            <ul className="mt-1.5 space-y-1 text-xs text-[#53565A]">
                              {selectedEval.explainability.frameworkRequirements.slice(0, 6).map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--theme-brand)]" />
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

                    <aside className="space-y-3">
                      <WorkpaperStatusCard
                        selectedEval={selectedEval}
                        documentationValidation={documentationValidation}
                        openNotes={selectedOpenNotes}
                      />

                      {selectedEval.disagreements.length > 0 && (
                        <div className="rounded-lg border border-rose-200 bg-white">
                          <div className="border-b border-rose-100 px-3 py-2">
                            <p className="text-xs font-semibold text-rose-900">Open disagreements</p>
                          </div>
                          <div className="space-y-2 p-3">
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
                      <div className="rounded-lg border border-dashed border-[#E3E3E3] bg-white px-4 py-8 text-center">
                        <Brain className="mx-auto h-8 w-8 text-[#A7A8AA]" />
                        <p className="mt-2 text-sm font-medium text-black">No findings to review yet</p>
                        <p className="mt-1 text-xs text-[#666666]">
                          {isMalformedFindingText(selectedEval.inPlaceFindings)
                            ? "The last analysis did not format correctly. Run AI analysis again."
                            : "Run AI analysis from Evidence & Analysis or re-analyze this control."}
                        </p>
                        <Button className="mt-3" size="sm" onClick={() => analyzeControl(selectedControl.id)} disabled={!!saving}>
                          Run AI analysis
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
                          <div className="space-y-3">
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

                          <aside className="space-y-2 xl:self-start">
                            <WorkpaperStatusCard
                              selectedEval={selectedEval}
                              documentationValidation={documentationValidation}
                              openNotes={selectedOpenNotes}
                            />

                            <div className="rounded-lg border border-[#E3E3E3] bg-white">
                              <div className="border-b border-[#E3E3E3] px-3 py-1.5">
                                <p className="text-[11px] font-semibold text-black">Supports</p>
                                <p className="text-[10px] text-[#767676]">
                                  {getWorkpaperFieldLabel(activeField)}
                                </p>
                              </div>
                              <div className="p-2.5">
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
                                    className="text-xs"
                                  />
                                ) : (
                                  <p className="text-[11px] text-[#767676]">
                                    No citations mapped to this field yet.
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
                              <div className="rounded-lg border border-rose-200 bg-white">
                                <div className="border-b border-rose-100 px-3 py-1.5">
                                  <p className="text-[11px] font-semibold text-rose-900">Disagreements</p>
                                </div>
                                <div className="space-y-2 p-2.5">
                                  {selectedEval.disagreements.map((item) => (
                                    <div key={item.id} className="rounded-md border border-rose-100 bg-rose-50/50 p-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                        {item.disputedField?.replaceAll("_", " ") ?? "general"}
                                      </p>
                                      {item.mismatchReason && (
                                        <p className="mt-0.5 text-xs text-[#53565A]">{item.mismatchReason}</p>
                                      )}
                                      {item.reviewerOverride && (
                                        <p className="mt-1 text-[11px] leading-relaxed text-[#666666]">
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
                          <div className="sticky bottom-0 z-20 -mx-3 border-t border-[#E3E3E3] bg-white/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void saveWorkpaper(selectedControl.id)}
                                disabled={!!saving || saveStatus === "saving" || !findingsDirty}
                              >
                                {saving === "workpaper" || saveStatus === "saving" ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="mr-1 h-3.5 w-3.5" />
                                )}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-rose-200 text-xs text-rose-800 hover:bg-rose-50"
                                onClick={() => void requestChanges()}
                                disabled={actionBarBlocked || !reviewerName.trim() || selectedEval.status === "human_confirmed"}
                              >
                                Changes
                              </Button>
                              {selectedOpenNotes > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 border-amber-200 text-xs text-amber-800 hover:bg-amber-50"
                                  onClick={() => void resolveAllNotes()}
                                  disabled={!reviewerName.trim() || !!saving}
                                >
                                  {saving === "resolve_notes" ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Resolve notes
                                </Button>
                              )}
                              <div className="ml-auto">
                                {selectedEval.status === "human_confirmed" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-amber-200 text-xs text-amber-800 hover:bg-amber-50"
                                    onClick={() => removeSignOff(selectedControl.id, selectedControl.code)}
                                    disabled={!!saving}
                                  >
                                    {saving === "unconfirm" ? (
                                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                                    )}
                                    Re-open
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => void submitReview([selectedControl.id])}
                                    disabled={actionBarBlocked || hasSelectedOpenNotes}
                                  >
                                    {saving === "review" ? (
                                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                    )}
                                    Approve
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
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-[#E3E3E3] bg-white px-4 py-10 text-center">
                <ClipboardCheck className="h-8 w-8 text-[#A7A8AA]" />
                <p className="mt-2 text-sm font-medium text-black">Select a control workpaper</p>
                <p className="mt-1 max-w-sm text-xs text-[#767676]">
                  Open a control from the left queue to document findings, resolve notes, and sign off.
                </p>
              </div>
            )}
          </div>

          {reviewMode === "batch" && (
            <div className="shrink-0 border-t border-[#E3E3E3] bg-[#FAFAFA] px-3 py-2.5 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[#666666]">
                  <span className="font-semibold text-black">Batch sign-off</span>
                  {batchHasOpenNotes
                    ? " · resolve open notes on selected controls first"
                    : ` · ${batchReviewable.length} ready`}
                </p>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => submitReview(batchReviewable)}
                  disabled={!!saving || batchReviewable.length === 0 || batchHasOpenNotes}
                >
                  {saving === "review" ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  )}
                  Attest ({batchReviewable.length})
                </Button>
              </div>
              <div className="mt-2 grid gap-2 lg:grid-cols-3">
                <div className="flex flex-wrap gap-x-3 gap-y-1 lg:col-span-1">
                  {(["complete", "accurate", "noHallucination"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-1.5 text-[11px] text-[#53565A]">
                      <input
                        type="checkbox"
                        className="rounded border-[#D0D0CE]"
                        checked={reviewChecks[key]}
                        onChange={(e) =>
                          setReviewChecks({ ...reviewChecks, [key]: e.target.checked })
                        }
                      />
                      {key === "complete" && "Complete"}
                      {key === "accurate" && "Accurate"}
                      {key === "noHallucination" && "Traceable"}
                    </label>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
                  <input
                    className="w-full rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5 text-xs"
                    placeholder="Reviewer name"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-full rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5 text-xs"
                    value={signOffDate}
                    onChange={(e) => setSignOffDate(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5 text-xs sm:col-span-2"
                    rows={1}
                    placeholder="Batch notes (optional)"
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
    <div className="rounded-lg border border-[#E3E3E3] bg-white">
      <div className="border-b border-[#E3E3E3] px-3 py-1.5">
        <p className="text-[11px] font-semibold text-black">Status</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2.5">
        <StatusRow
          label="Review"
          value={REVIEW_STATUS_ICON[selectedEval.status ?? "pending"]?.label ?? "In progress"}
        />
        <StatusRow label="Notes" value={String(openNotes)} tone={openNotes > 0 ? "amber" : "emerald"} />
        <StatusRow
          label="Docs"
          value={
            documentationValidation
              ? `${documentationValidation.coveragePct}%`
              : "—"
          }
          tone={documentationValidation?.overallStatus === "complete" ? "emerald" : "slate"}
        />
        <StatusRow
          label="Citations"
          value={String(selectedEval.citations.length)}
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
    slate: "text-black",
    amber: "text-amber-800",
    emerald: "text-[#046A38]",
  };
  return (
    <div className="rounded-md border border-[#E3E3E3] bg-[#FAFAFA] px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#767676]">{label}</p>
      <p className={`mt-0.5 truncate text-[11px] font-semibold ${tones[tone]}`}>{value}</p>
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
    <div className="rounded-lg border border-[#E3E3E3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E3E3] px-3 py-2">
        <p className="text-[11px] font-semibold text-black">Compliance conclusion</p>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            STATUS_COLORS[value] ?? STATUS_COLORS.not_assessed
          }`}
        >
          {selected.label}
        </span>
      </div>

      <div className="p-2.5">
        {locked ? (
          <div className="flex items-start gap-2 rounded-md border border-[#E3E3E3] bg-[#FAFAFA] px-3 py-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A7A8AA]" />
            <div>
              <p className={`text-xs font-semibold ${selected.textClass}`}>{selected.label}</p>
              <p className="mt-0.5 text-[11px] text-[#666666]">{selected.description}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {COMPLIANCE_OPTIONS.map((option) => {
              const isSelected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(option.id)}
                  className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                    isSelected ? option.activeClass : option.idleClass
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClass}`} />
                    <p className={`text-xs font-semibold ${isSelected ? option.textClass : "text-black"}`}>
                      {option.label}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-[#666666]">{option.summary}</p>
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
    <div className="rounded-lg border border-[#E3E3E3] bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E3E3E3] bg-[#FAFAFA] px-3 py-2">
        <ShieldCheck className="h-3.5 w-3.5 text-black" />
        <p className="text-[11px] font-semibold text-black">Approve {controlCode}</p>
        <p className="text-[10px] text-[#767676]">Saved workpaper · resolved notes · attested checks</p>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid gap-1.5 sm:grid-cols-3">
          {checklist.map((item) => (
            <label
              key={item.key}
              className={`flex cursor-pointer flex-col rounded-md border px-2.5 py-2 transition-colors ${
                reviewChecks[item.key]
                  ? "border-[var(--theme-brand)] bg-[#EEF7E0]/50"
                  : "border-[#E3E3E3] bg-[#FAFAFA] hover:border-[#D0D0CE]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="rounded border-[#D0D0CE]"
                  checked={reviewChecks[item.key]}
                  onChange={(e) => onReviewCheckChange(item.key, e.target.checked)}
                />
                <span className="text-[11px] font-semibold text-black">{item.title}</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-[#666666]">{item.detail}</p>
            </label>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#767676]">
              <PenLine className="h-3 w-3" />
              Reviewer
            </label>
            <input
              className={`w-full rounded-md border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                reviewerError
                  ? "border-red-300 focus:ring-red-100"
                  : "border-[#E3E3E3] focus:border-black focus:ring-[#E3E3E3]"
              }`}
              placeholder="Full name"
              value={reviewerName}
              onChange={(e) => onReviewerNameChange(e.target.value)}
            />
            {reviewerError && (
              <p className="mt-1 text-[10px] text-red-600">Name required</p>
            )}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#767676]">
              <Calendar className="h-3 w-3" />
              Date
            </label>
            <input
              type="date"
              required
              className="w-full rounded-md border border-[#E3E3E3] px-2.5 py-1.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-[#E3E3E3]"
              value={signOffDate}
              onChange={(e) => onSignOffDateChange(e.target.value)}
            />
          </div>
        </div>

        <textarea
          className="w-full rounded-md border border-[#E3E3E3] px-2.5 py-1.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-[#E3E3E3]"
          rows={2}
          placeholder="Reviewer notes (optional)"
          value={reviewNotes}
          onChange={(e) => onReviewNotesChange(e.target.value)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E3E3] pt-2">
          {(blockedByAutosave || blockedByOpenNotes) ? (
            <p className="inline-flex items-center gap-1 text-[10px] text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {blockedByAutosave
                ? "Wait for auto-save before approving."
                : "Resolve open notes before approval."}
            </p>
          ) : (
            <p className="text-[10px] text-[#767676]">Projects into reporting once approved.</p>
          )}
          <Button size="sm" className="h-7 text-xs" onClick={onSubmit} disabled={disabled}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            )}
            Approve
          </Button>
        </div>
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
    <div className="rounded-lg border border-[#86BC25]/50 bg-[#EEF7E0]/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#86BC25]/35 px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#046A38]" />
        <p className="font-mono text-[11px] font-semibold text-[#046A38]">{controlCode}</p>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-black">{controlTitle}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#046A38]">Signed off</span>
      </div>

      <div className="grid gap-1.5 px-3 py-2.5 sm:grid-cols-3">
        <div className="rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#767676]">Conclusion</p>
          <p className={`mt-0.5 text-[11px] font-semibold ${compliance.textClass}`}>{compliance.label}</p>
        </div>
        <div className="rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#767676]">By</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-black">{confirmedBy ?? "—"}</p>
        </div>
        <div className="rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#767676]">Date</p>
          <p className="mt-0.5 text-[11px] font-semibold text-black">{formatSignOffDate(confirmedAt)}</p>
          {confirmedAt && (
            <p className="text-[10px] text-[#767676]">{formatSignOffTime(confirmedAt)}</p>
          )}
        </div>
      </div>

      {reviewerNotes && (
        <div className="mx-3 mb-2.5 rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#767676]">Notes</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#53565A]">{reviewerNotes}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#86BC25]/35 px-3 py-2">
        <p className="flex items-center gap-1 text-[10px] text-[#046A38]">
          <Lock className="h-3 w-3" />
          In reporting
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 border-amber-200 bg-white text-xs text-amber-900 hover:bg-amber-50"
          onClick={onRemoveSignOff}
          disabled={removing}
        >
          {removing ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Undo2 className="mr-1 h-3.5 w-3.5" />
          )}
          Re-open
        </Button>
      </div>
    </div>
  );
}

