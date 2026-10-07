"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Download,
  Layers,
  Loader2,
  Maximize2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillarWorkshopGuidePanel, DepartmentWorkshopGuidePanel } from "@/components/pillar-workshop-guide";
import { WorkshopCaptureWorkspace } from "@/components/workshop-capture-workspace";
import { ControlReviewWorkpaperPanel, type ReviewLeaveGuard } from "@/components/control-review-workpaper-panel";
import { AssessmentReportingPanel } from "@/components/assessment-reporting-panel";
import { SourceNotebookChatLauncher } from "@/components/source-notebook-chat";
import type { CaptureAnalysisSummary } from "@/lib/capture-analysis-types";
import { WORKSHOP_WORKSPACE_PHASES, WORKSPACE_TAB_GROUPS, type WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { PillarWorkshopGuide } from "@/lib/pillar-workshop-guide";
import type { DepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import { ALL_DEPARTMENTS } from "@/lib/workshop-department";
import { openWorkshopPresenter } from "@/lib/workshop-present-url";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments";
import { EvidenceDrawerProvider } from "@/components/evidence-drawer";
import { GovernanceMappingPanel } from "@/components/governance-mapping-panel";
import { GovernanceDependencyGraphView } from "@/components/governance-dependency-graph-view";
import { GovernanceAssessmentOutputPanel } from "@/components/governance-assessment-output-panel";
import { GovernanceRoadmapPanel } from "@/components/governance-roadmap-panel";
import type {
  WorkpaperContentRecord,
  WorkpaperFieldStateRecord,
  WorkpaperReviewNoteThread,
} from "@/lib/control-review-workpaper";
import type { ExplainabilityPayload } from "@/lib/governance-v2/types";

type EvidenceFile = {
  id: string;
  fileName: string;
  fileSize: number;
  extractedText: string | null;
  controlCodes: string[];
  description?: string | null;
};

type PillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  requirementCount: number;
  frameworkCodes: string[];
  controls: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    ownerRole: string;
  }>;
};

type ControlEval = {
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
  citations: Array<{
    id: string;
    citationIndex: number;
    section: string;
    claimText: string;
    sourceType: string;
    sourceId: string | null;
    sourceLabel: string;
    excerpt: string;
    startOffset: number;
    endOffset: number;
  }>;
  reviewNotes: WorkpaperReviewNoteThread[];
  disagreements: Array<{
    id: string;
    status: string;
    mismatchReason: string | null;
    disputedField: string | null;
    reviewerOverride: string | null;
    createdAt: string;
  }>;
};

const WORKSPACE_PHASES = WORKSHOP_WORKSPACE_PHASES;

export type ControlReviewWorkspaceHandle = {
  navigateToTab: (tab: WorkshopWorkspacePhaseId) => Promise<void>;
};

type Props = {
  assessmentId: string;
  onProgressChange?: (stats: { confirmed: number; total: number }) => void;
  knownScopedCount?: number;
  onGoToStage?: (stage: string) => void;
  onInitWorkshop?: () => void;
  initWorkshopLoading?: boolean;
  evaluationReviewApproved?: boolean;
  onProceedToDeliverables?: (confirmedBy: string) => Promise<void>;
  proceedLoading?: boolean;
  hideWorkspacePhaseTabs?: boolean;
  activeWorkspaceTab?: WorkshopWorkspacePhaseId;
  onWorkspaceTabChange?: (tab: WorkshopWorkspacePhaseId) => void;
  onWorkspaceMetaChange?: (meta: {
    initialized: boolean;
    analysisStale: boolean;
    hasAnalysis: boolean;
  }) => void;
  className?: string;
};

export const ControlReviewWorkspace = forwardRef<ControlReviewWorkspaceHandle, Props>(
  function ControlReviewWorkspace(
    {
      assessmentId,
      onProgressChange,
      knownScopedCount = 0,
      onGoToStage,
      onInitWorkshop,
      initWorkshopLoading = false,
      evaluationReviewApproved = false,
      onProceedToDeliverables,
      proceedLoading = false,
      hideWorkspacePhaseTabs = false,
      activeWorkspaceTab,
      onWorkspaceTabChange,
      onWorkspaceMetaChange,
      className,
    },
    ref
  ) {
  const [tab, setTab] = useState<WorkshopWorkspacePhaseId>("workshop");
  const [workshopNotes, setWorkshopNotes] = useState("");
  const [facilitatorNotes, setFacilitatorNotes] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [pillars, setPillars] = useState<PillarGroup[]>([]);
  const [evaluations, setEvaluations] = useState<ControlEval[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    aiDraft: 0,
    rejected: 0,
    pillarCount: 0,
    scopedRequirements: 0,
  });
  const [activePillarId, setActivePillarId] = useState<string | null>(null);
  const [activeSubPillarId, setActiveSubPillarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState<CaptureAnalysisSummary | null>(null);
  const [analysisStale, setAnalysisStale] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [captureChunkCount, setCaptureChunkCount] = useState(0);
  const [validationChatOpen, setValidationChatOpen] = useState(false);
  const [pillarGuide, setPillarGuide] = useState<PillarWorkshopGuide | null>(null);
  const [pillarGuideLoading, setPillarGuideLoading] = useState(false);
  const [departmentGuide, setDepartmentGuide] = useState<DepartmentWorkshopGuide | null>(null);
  const [departmentGuideLoading, setDepartmentGuideLoading] = useState(false);
  const [runbookMode, setRunbookMode] = useState<"pillar" | "department">("pillar");
  const [facilitatorDepartment, setFacilitatorDepartment] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState(ALL_DEPARTMENTS);
  const [departmentOptions, setDepartmentOptions] = useState<WorkshopDepartmentOption[]>([]);
  const [exportLoading, setExportLoading] = useState<"current" | "all" | null>(null);
  const reviewLeaveGuardRef = useRef<ReviewLeaveGuard | null>(null);
  const onWorkspaceMetaChangeRef = useRef(onWorkspaceMetaChange);
  const onProgressChangeRef = useRef(onProgressChange);
  const lastWorkspaceMetaRef = useRef<{
    initialized: boolean;
    analysisStale: boolean;
    hasAnalysis: boolean;
  } | null>(null);

  onWorkspaceMetaChangeRef.current = onWorkspaceMetaChange;
  onProgressChangeRef.current = onProgressChange;

  const requestTabChange = useCallback(
    async (nextTab: WorkshopWorkspacePhaseId | "evidence_view") => {
      const normalized = nextTab === "evidence_view" ? "notes" : nextTab;
      if (normalized === tab) return;
      if (tab === "review" && reviewLeaveGuardRef.current?.hasUnsavedChanges()) {
        const ok = await reviewLeaveGuardRef.current.promptSaveBeforeLeave();
        if (!ok) return;
      }
      setTab(normalized);
      onWorkspaceTabChange?.(normalized);
    },
    [tab, onWorkspaceTabChange]
  );

  useImperativeHandle(ref, () => ({ navigateToTab: requestTabChange }), [requestTabChange]);

  useEffect(() => {
    if (!activeWorkspaceTab || activeWorkspaceTab === tab) return;
    void requestTabChange(activeWorkspaceTab);
  }, [activeWorkspaceTab, tab, requestTabChange]);

  useEffect(() => {
    const meta = {
      initialized: stats.scopedRequirements > 0 && stats.total > 0,
      analysisStale,
      hasAnalysis: Boolean(analysisSummary),
    };
    const prev = lastWorkspaceMetaRef.current;
    if (
      prev &&
      prev.initialized === meta.initialized &&
      prev.analysisStale === meta.analysisStale &&
      prev.hasAnalysis === meta.hasAnalysis
    ) {
      return;
    }
    lastWorkspaceMetaRef.current = meta;
    onWorkspaceMetaChangeRef.current?.(meta);
  }, [stats.scopedRequirements, stats.total, analysisStale, analysisSummary]);

  const departmentQuery =
    selectedDepartment !== ALL_DEPARTMENTS
      ? `?department=${encodeURIComponent(selectedDepartment)}`
      : "";

  const guideDepartmentQuery =
    selectedDepartment !== ALL_DEPARTMENTS
      ? `&department=${encodeURIComponent(selectedDepartment)}`
      : "";

  const progressPct = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;
  const hasScopedData = stats.scopedRequirements > 0;

  const load = useCallback(async () => {
    const [repoRes, reviewRes, captureRes] = await Promise.all([
      fetch(`/api/assessments/${assessmentId}/repository${departmentQuery}`),
      fetch(`/api/assessments/${assessmentId}/control-review${departmentQuery}`),
      fetch(`/api/assessments/${assessmentId}/capture`),
    ]);
    const repo = await repoRes.json();
    const review = await reviewRes.json();
    const capture = await captureRes.json();
    setWorkshopNotes(repo.workshopNotes ?? "");
    setFacilitatorNotes(repo.facilitatorNotes ?? "");
    setEvidence(repo.evidence ?? []);
    setPillars(review.pillars ?? []);
    setEvaluations(review.evaluations ?? []);
    setDepartmentOptions(review.departmentOptions ?? []);
    setAnalysisSummary(capture.analysisSummary ?? null);
    setAnalysisStale(Boolean(capture.analysisStale));
    setLastAnalyzedAt(capture.lastAnalyzedAt ?? null);
    setCaptureChunkCount(capture.chunkCount ?? 0);
    const s = review.stats ?? {};
    setStats({
      total: s.total ?? 0,
      confirmed: s.confirmed ?? 0,
      pending: s.pending ?? 0,
      aiDraft: s.aiDraft ?? 0,
      rejected: s.rejected ?? 0,
      pillarCount: s.pillarCount ?? 0,
      scopedRequirements: s.scopedRequirements ?? 0,
    });
    onProgressChangeRef.current?.({ confirmed: s.confirmed ?? 0, total: s.total ?? 0 });
    setLoading(false);
  }, [assessmentId, departmentQuery]);

  useEffect(() => {
    setLoading(true);
    setActivePillarId(null);
    load();
  }, [load]);

  useEffect(() => {
    if (facilitatorDepartment || departmentOptions.length === 0) return;
    setFacilitatorDepartment(departmentOptions[0].label);
  }, [departmentOptions, facilitatorDepartment]);

  useEffect(() => {
    if (!activePillarId || tab !== "workshop" || runbookMode !== "pillar") return;
    setPillarGuideLoading(true);
    fetch(
      `/api/assessments/${assessmentId}/control-review/guide?pillarId=${activePillarId}${guideDepartmentQuery}`
    )
      .then((r) => r.json())
      .then((data: PillarWorkshopGuide & { error?: string }) => {
        setPillarGuide(data.error ? null : data);
      })
      .finally(() => setPillarGuideLoading(false));
  }, [activePillarId, assessmentId, tab, guideDepartmentQuery, runbookMode]);

  useEffect(() => {
    if (!facilitatorDepartment || tab !== "workshop" || runbookMode !== "department") return;
    setDepartmentGuideLoading(true);
    setActiveSubPillarId(null);
    fetch(
      `/api/assessments/${assessmentId}/control-review/guide?departmentGuide=true&facilitatorDepartment=${encodeURIComponent(facilitatorDepartment)}${guideDepartmentQuery}`
    )
      .then((r) => r.json())
      .then((data: DepartmentWorkshopGuide & { error?: string }) => {
        setDepartmentGuide(data.error ? null : data);
      })
      .finally(() => setDepartmentGuideLoading(false));
  }, [facilitatorDepartment, assessmentId, tab, guideDepartmentQuery, runbookMode]);

  useEffect(() => {
    if (runbookMode !== "pillar") return;
    if (!activePillarId && pillars.length > 0) {
      setActivePillarId(pillars[0].pillarId);
    }
  }, [pillars, activePillarId, runbookMode]);

  const evidenceTexts = useMemo(() => {
    const map: Record<string, { fileName: string; text: string }> = {};
    for (const f of evidence) {
      if (f.extractedText) map[f.id] = { fileName: f.fileName, text: f.extractedText };
    }
    return map;
  }, [evidence]);

  async function uploadCaptureFiles(files: File[]) {
    setSaving("uploading");
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await fetch(`/api/assessments/${assessmentId}/repository`, { method: "POST", body: formData });
      }
      await load();
    } finally {
      setSaving("");
    }
  }

  async function analyzeAllCaptureFiles() {
    setSaving("transcripts");
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/control-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_transcripts",
          mergeMode: "merge",
          existingWorkshopNotes: workshopNotes,
          existingFacilitatorNotes: facilitatorNotes,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setAnalysisSummary(null);
        setAnalysisError(result.error ?? `Analysis failed (HTTP ${res.status})`);
        return;
      }

      setWorkshopNotes(result.workshopNotes ?? workshopNotes);
      setFacilitatorNotes(result.facilitatorNotes ?? facilitatorNotes);
      setAnalysisSummary(result.analysisSummary ?? null);
      setAnalysisStale(false);
      setLastAnalyzedAt(new Date().toISOString());
      await load();
    } catch (error) {
      setAnalysisSummary(null);
      setAnalysisError(error instanceof Error ? error.message : "Network error");
    } finally {
      setSaving("");
    }
  }

  async function deleteEvidence(evidenceId: string) {
    await fetch(`/api/assessments/${assessmentId}/repository?evidenceId=${evidenceId}`, {
      method: "DELETE",
    });
    await load();
  }

  function selectPillar(pillarId: string) {
    setActivePillarId(pillarId);
    setActiveSubPillarId(null);
  }

  function selectSubPillar(subPillarId: string | null) {
    setActiveSubPillarId(subPillarId);
    if (subPillarId) {
      requestAnimationFrame(() => {
        document.getElementById(`sub-pillar-${subPillarId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function downloadWorkshopExport(mode: "current" | "all") {
    setExportLoading(mode);
    try {
      const scopeQ =
        selectedDepartment !== ALL_DEPARTMENTS
          ? `&department=${encodeURIComponent(selectedDepartment)}`
          : "";

      let url: string;
      if (mode === "all") {
        url = `/api/assessments/${assessmentId}/control-review/export?all=true${scopeQ}`;
      } else if (runbookMode === "pillar" && activePillarId) {
        url = `/api/assessments/${assessmentId}/control-review/export?pillarId=${encodeURIComponent(activePillarId)}${scopeQ}`;
      } else if (runbookMode === "department" && facilitatorDepartment) {
        url = `/api/assessments/${assessmentId}/control-review/export?departmentGuide=true&facilitatorDepartment=${encodeURIComponent(facilitatorDepartment)}${scopeQ}`;
      } else {
        url = `/api/assessments/${assessmentId}/control-review/export?all=true${scopeQ}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast(err.error ?? "Could not generate export. Ensure workshop content is in scope.", {
          variant: "error",
        });
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "workshop-questions.html";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExportLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-500">Loading workshop workspace…</p>
      </div>
    );
  }

  if (stats.scopedRequirements === 0 && selectedDepartment === ALL_DEPARTMENTS) {
    if (knownScopedCount > 0) {
      return (
        <EmptyState
          tone="indigo"
          title="Workshop not initialized"
          description={`${knownScopedCount} requirements are scoped, but the control review workspace has not been set up yet.`}
          action={
            onInitWorkshop ? (
              <Button onClick={onInitWorkshop} disabled={initWorkshopLoading}>
                {initWorkshopLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Initialize workshop workspace
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <EmptyState
        tone="amber"
        title="No requirements scoped yet"
        description="Run requirement scoping before the workshop. Department tags are optional — use cases without a department are included in organization-wide workshops."
        action={
          onGoToStage ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onGoToStage("use_cases")}>
                Edit Use Cases
              </Button>
              <Button size="sm" onClick={() => onGoToStage("requirement_scoping")}>
                Go to Requirement Scoping
              </Button>
            </div>
          ) : undefined
        }
      />
    );
  }

  if (!hasScopedData) {
    return (
      <EmptyState
        tone="slate"
        title={`No requirements in "${selectedDepartment}"`}
        description='Assign a use case to this department on the Use Cases step, or switch scope to "All organization" to include unassigned use cases.'
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {onGoToStage && (
              <Button variant="outline" size="sm" onClick={() => onGoToStage("use_cases")}>
                Edit Use Cases
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setSelectedDepartment(ALL_DEPARTMENTS)}>
              View all organization
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <EvidenceDrawerProvider
      workshopNotes={workshopNotes}
      facilitatorNotes={facilitatorNotes}
      evidenceTexts={evidenceTexts}
    >
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-[#E3E3E3] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:h-full lg:overflow-hidden",
        className
      )}
    >
      {/* Compact toolbar — workshop / evidence / sign-off use their own header shells */}
      {tab !== "workshop" && tab !== "notes" && tab !== "review" && (
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#E3E3E3] bg-[#FAFAFA]/70 px-3 py-1.5 sm:px-4">
        {!hideWorkspacePhaseTabs && (
          <>
            <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-[#E3E3E3] bg-white p-0.5 [scrollbar-width:thin]">
              {WORKSPACE_TAB_GROUPS.map((group, groupIdx) => (
                <div key={group.journeyId} className="flex shrink-0 items-center gap-0.5">
                  {groupIdx > 0 && (
                    <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-[#E3E3E3] sm:block" aria-hidden />
                  )}
                  {group.tabs.map((tabId) => {
                    const phase = WORKSPACE_PHASES.find((p) => p.id === tabId)!;
                    return (
                      <button
                        key={phase.id}
                        type="button"
                        title={phase.subtitle}
                        onClick={() => void requestTabChange(phase.id)}
                        className={cn(
                          "shrink-0 rounded-md px-2.5 py-1.5 text-left transition-all sm:px-3",
                          tab === phase.id
                            ? "bg-black text-white shadow-sm"
                            : "text-[#53565A] hover:bg-[#F5F5F5] hover:text-black"
                        )}
                      >
                        <span className="block text-[11px] font-semibold leading-tight sm:text-xs">
                          <span className="sm:hidden">{phase.shortLabel}</span>
                          <span className="hidden sm:inline">{phase.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="hidden h-4 w-px bg-[#E3E3E3] sm:block" />
          </>
        )}

        <div className="flex-1" />

        {departmentOptions.length > 0 && (
          <select
            id="workshop-scope"
            className="max-w-[200px] rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5 text-xs font-medium text-black"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            title="Data scope"
          >
            <option value={ALL_DEPARTMENTS}>All organization</option>
            {departmentOptions.some((d) => d.fromScopedControls) && (
              <optgroup label="In scope">
                {departmentOptions
                  .filter((d) => d.fromScopedControls)
                  .map((dept) => (
                    <option key={dept.id} value={dept.label}>
                      {dept.label}
                    </option>
                  ))}
              </optgroup>
            )}
            <optgroup label="Stakeholders">
              {departmentOptions
                .filter((d) => !d.fromScopedControls)
                .map((dept) => (
                  <option key={dept.id} value={dept.label}>
                    {dept.label}
                  </option>
                ))}
            </optgroup>
          </select>
        )}

        <div
          className="hidden items-center gap-1.5 rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1 text-xs text-[#666666] sm:flex"
          title="Validation progress"
        >
          <span className="font-semibold text-black">{stats.confirmed}</span>
          <span className="text-[#A7A8AA]">/</span>
          <span>{stats.total}</span>
          <div className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-[#F0F0F0]">
            <div
              className="h-full rounded-full bg-[var(--theme-brand)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

      </div>
      )}

      {/* Tab content — nested scroll only at lg+; phones use #main-content */}
      <div className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
        {tab === "workshop" && (
          <div className="min-w-0 space-y-3 bg-[#FAFAFA]/40 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden [scrollbar-width:thin]">
            <header className="flex flex-col gap-2 border-b border-[#E3E3E3] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex rounded-md border border-[#E3E3E3] bg-[#FAFAFA] p-0.5"
                  role="group"
                  aria-label="Workshop navigation mode"
                >
                  {([
                    ["pillar", "Pillars", Layers],
                    ["department", "Stakeholders", Users],
                  ] as const).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setRunbookMode(mode);
                        setActiveSubPillarId(null);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                        runbookMode === mode
                          ? "bg-black text-white"
                          : "text-[#53565A] hover:text-black"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {departmentOptions.length > 0 && (
                  <label className="inline-flex items-center gap-2 text-[11px] text-[#666666]">
                    <span className="font-medium">Scope</span>
                    <select
                      id="workshop-scope"
                      className="rounded-md border border-[#E3E3E3] bg-white px-2.5 py-1.5 text-xs font-medium text-black"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                      <option value={ALL_DEPARTMENTS}>All organization</option>
                      {departmentOptions.some((d) => d.fromScopedControls) && (
                        <optgroup label="In scope">
                          {departmentOptions
                            .filter((d) => d.fromScopedControls)
                            .map((dept) => (
                              <option key={dept.id} value={dept.label}>
                                {dept.label}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      <optgroup label="Stakeholders">
                        {departmentOptions
                          .filter((d) => !d.fromScopedControls)
                          .map((dept) => (
                            <option key={dept.id} value={dept.label}>
                              {dept.label}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </label>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <p className="mr-1 text-[11px] tabular-nums text-[#666666]">
                  <span className="font-semibold text-black">{stats.confirmed}</span>
                  {" / "}
                  {stats.total}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    openWorkshopPresenter(assessmentId, {
                      mode: runbookMode,
                      pillarId: activePillarId,
                      facilitatorDepartment,
                      department: selectedDepartment,
                      subPillarId: activeSubPillarId,
                    })
                  }
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Presenter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!!exportLoading}
                  onClick={() => downloadWorkshopExport("current")}
                  className="gap-1.5"
                >
                  {exportLoading === "current" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Export
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!!exportLoading}
                  onClick={() => downloadWorkshopExport("all")}
                >
                  Full guide
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void requestTabChange("notes")}
                  className="gap-1.5"
                >
                  Evidence
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </header>

            <div className="min-w-0 space-y-2 px-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#767676]">
                  {runbookMode === "pillar" ? "Risk pillars" : "Stakeholders"}
                </p>
                {runbookMode === "pillar" && pillars.length > 0 ? (
                  <label className="inline-flex min-w-0 items-center gap-2 text-[11px] text-[#666666]">
                    <span className="shrink-0 font-medium">Jump to</span>
                    <select
                      className="max-w-[14rem] rounded-md border border-[#E3E3E3] bg-white px-2 py-1 text-xs font-medium text-black"
                      value={activePillarId ?? ""}
                      onChange={(e) => selectPillar(e.target.value)}
                      aria-label="Select risk pillar"
                    >
                      {pillars.map((pillar, idx) => (
                        <option key={pillar.pillarId} value={pillar.pillarId}>
                          {idx + 1}. {pillar.pillarLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {runbookMode === "department" && departmentOptions.length > 0 ? (
                  <label className="inline-flex min-w-0 items-center gap-2 text-[11px] text-[#666666]">
                    <span className="shrink-0 font-medium">Jump to</span>
                    <select
                      className="max-w-[14rem] rounded-md border border-[#E3E3E3] bg-white px-2 py-1 text-xs font-medium text-black"
                      value={facilitatorDepartment}
                      onChange={(e) => {
                        setFacilitatorDepartment(e.target.value);
                        setActiveSubPillarId(null);
                      }}
                      aria-label="Select stakeholder"
                    >
                      {departmentOptions.map((dept) => (
                        <option key={dept.id} value={dept.label}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <nav
                className="flex min-w-0 flex-wrap gap-1.5"
                aria-label={runbookMode === "pillar" ? "Risk pillars" : "Stakeholders"}
              >
                {runbookMode === "pillar"
                  ? pillars.map((pillar, idx) => {
                      const active = activePillarId === pillar.pillarId;
                      return (
                        <button
                          key={pillar.pillarId}
                          type="button"
                          onClick={() => selectPillar(pillar.pillarId)}
                          className={cn(
                            "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                            active
                              ? "border-black bg-black text-white"
                              : "border-[#E3E3E3] bg-white text-[#53565A] hover:border-[#D0D0CE] hover:text-black"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold",
                              active
                                ? "bg-white/15 text-white"
                                : "bg-[#EEF7E0] text-[#046A38]"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate text-xs font-semibold leading-snug">
                            {pillar.pillarLabel}
                          </span>
                        </button>
                      );
                    })
                  : departmentOptions.map((dept) => {
                      const active = facilitatorDepartment === dept.label;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            setFacilitatorDepartment(dept.label);
                            setActiveSubPillarId(null);
                          }}
                          title={dept.description}
                          className={cn(
                            "inline-flex max-w-full items-center rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                            active
                              ? "border-black bg-black text-white"
                              : "border-[#E3E3E3] bg-white text-[#53565A] hover:border-[#D0D0CE] hover:text-black"
                          )}
                        >
                          <span className="truncate">{dept.label}</span>
                        </button>
                      );
                    })}
              </nav>
            </div>

            <div className="mx-3 overflow-hidden rounded-lg border border-[#E3E3E3] bg-white sm:mx-4">
              {runbookMode === "pillar" ? (
                <PillarWorkshopGuidePanel
                  guide={pillarGuide}
                  loading={pillarGuideLoading}
                  activeSubPillarId={activeSubPillarId}
                  onSubPillarSelect={selectSubPillar}
                />
              ) : (
                <DepartmentWorkshopGuidePanel
                  guide={departmentGuide}
                  loading={departmentGuideLoading}
                  activeSubPillarId={activeSubPillarId}
                  onSubPillarSelect={selectSubPillar}
                />
              )}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <WorkshopCaptureWorkspace
              assessmentId={assessmentId}
              evidence={evidence}
              saving={saving}
              analysisSummary={analysisSummary}
              analysisStale={analysisStale}
              lastAnalyzedAt={lastAnalyzedAt}
              analysisError={analysisError}
              onUploadFiles={uploadCaptureFiles}
              onDeleteFile={deleteEvidence}
              onAnalyzeAll={analyzeAllCaptureFiles}
              onGoToMapping={() => void requestTabChange("mapping")}
            />
          </div>
        )}

        {tab === "mapping" && (
          <div className="flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <GovernanceMappingPanel
              assessmentId={assessmentId}
              pillars={pillars}
              workshopNotes={workshopNotes}
              facilitatorNotes={facilitatorNotes}
              evidenceTexts={evidenceTexts}
            />
          </div>
        )}

        {tab === "dependencies" && (
          <div className="flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <GovernanceDependencyGraphView assessmentId={assessmentId} />
          </div>
        )}

        {tab === "review" && (
          <div className="relative flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <ControlReviewWorkpaperPanel
              assessmentId={assessmentId}
              pillars={pillars}
              evaluations={evaluations}
              stats={stats}
              evidenceTexts={evidenceTexts}
              workshopNotes={workshopNotes}
              facilitatorNotes={facilitatorNotes}
              departmentQuery={departmentQuery}
              onReload={load}
              onRegisterLeaveGuard={(guard) => {
                reviewLeaveGuardRef.current = guard;
              }}
            />
            <SourceNotebookChatLauncher
              assessmentId={assessmentId}
              chunkCount={captureChunkCount}
              disabled={!!saving}
              evidenceTexts={evidenceTexts}
              open={validationChatOpen}
              onOpenChange={setValidationChatOpen}
              suggestedPrompts={[
                "What evidence supports the selected control finding?",
                "Was this control topic discussed in the workshop?",
                "What did participants say about documented vs informal practices?",
                "Which source excerpts relate to this control area?",
              ]}
            />
          </div>
        )}

        {tab === "assessment_output" && (
          <div className="flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <GovernanceAssessmentOutputPanel assessmentId={assessmentId} />
          </div>
        )}

        {tab === "roadmap" && (
          <div className="flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <GovernanceRoadmapPanel assessmentId={assessmentId} />
          </div>
        )}

        <div
          className={`flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 ${
            tab === "reporting" ? "" : "hidden"
          }`}
        >
          <AssessmentReportingPanel
            assessmentId={assessmentId}
            departmentQuery={departmentQuery}
            reviewProgress={{ confirmed: stats.confirmed, total: stats.total }}
            onGoToReview={() => void requestTabChange("review")}
            refreshKey={`${stats.confirmed}:${stats.total}`}
            evaluationReviewApproved={evaluationReviewApproved}
            onProceedToDeliverables={onProceedToDeliverables}
            proceedLoading={proceedLoading}
            hasAnalysis={Boolean(analysisSummary)}
            analysisStale={analysisStale}
            onGoToEvidence={() => void requestTabChange("notes")}
          />
        </div>
      </div>
    </div>
    </EvidenceDrawerProvider>
  );
});

function EmptyState({
  tone,
  title,
  description,
  action,
}: {
  tone: "indigo" | "amber" | "slate";
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const styles = {
    indigo: "border-indigo-200 bg-indigo-50/50 text-indigo-900",
    amber: "border-amber-200 bg-amber-50/50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };
  const descStyles = {
    indigo: "text-indigo-800/80",
    amber: "text-amber-800/80",
    slate: "text-slate-500",
  };

  return (
    <div className={`rounded-2xl border p-8 text-center space-y-4 ${styles[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className={`text-sm max-w-md mx-auto ${descStyles[tone]}`}>{description}</p>
      {action}
    </div>
  );
}
