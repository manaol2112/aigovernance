"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Download,
  Layers,
  Loader2,
  Maximize2,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PillarWorkshopGuidePanel, DepartmentWorkshopGuidePanel } from "@/components/pillar-workshop-guide";
import { WorkshopCaptureWorkspace } from "@/components/workshop-capture-workspace";
import { ControlReviewPanel, type ReviewLeaveGuard } from "@/components/control-review-panel";
import { AssessmentReportingPanel } from "@/components/assessment-reporting-panel";
import { SourceNotebookChatLauncher } from "@/components/source-notebook-chat";
import type { CaptureAnalysisSummary } from "@/lib/capture-analysis-types";
import { WORKSHOP_WORKSPACE_PHASES } from "@/lib/workshop-workspace-phases";
import type { PillarWorkshopGuide } from "@/lib/pillar-workshop-guide";
import type { DepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import { ALL_DEPARTMENTS } from "@/lib/workshop-department";
import { openWorkshopPresenter } from "@/lib/workshop-present-url";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments";

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
};

const WORKSPACE_PHASES = WORKSHOP_WORKSPACE_PHASES;

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
};

export function ControlReviewWorkspace({
  assessmentId,
  onProgressChange,
  knownScopedCount = 0,
  onGoToStage,
  onInitWorkshop,
  initWorkshopLoading = false,
  evaluationReviewApproved = false,
  onProceedToDeliverables,
  proceedLoading = false,
}: Props) {
  const [tab, setTab] = useState<"workshop" | "notes" | "review" | "reporting">("workshop");
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
  const [useCaseCountByDepartment, setUseCaseCountByDepartment] = useState<Record<string, number>>({});
  const [exportLoading, setExportLoading] = useState<"current" | "all" | null>(null);
  const reviewLeaveGuardRef = useRef<ReviewLeaveGuard | null>(null);

  const requestTabChange = useCallback(
    async (nextTab: "workshop" | "notes" | "review" | "reporting") => {
      if (nextTab === tab) return;
      if (tab === "review" && reviewLeaveGuardRef.current?.hasUnsavedChanges()) {
        const ok = await reviewLeaveGuardRef.current.promptSaveBeforeLeave();
        if (!ok) return;
      }
      setTab(nextTab);
    },
    [tab]
  );

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
    setUseCaseCountByDepartment(review.useCaseCountByDepartment ?? {});
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
    onProgressChange?.({ confirmed: s.confirmed ?? 0, total: s.total ?? 0 });
    setLoading(false);
  }, [assessmentId, departmentQuery, onProgressChange]);

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
        formData.append("category", "transcript");
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
        window.alert(err.error ?? "Could not generate export. Ensure workshop content is in scope.");
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
    <div className="flex h-[calc(100dvh-11.5rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Compact toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {WORKSPACE_PHASES.map((phase) => (
            <button
              key={phase.id}
              type="button"
              title={phase.subtitle}
              onClick={() => void requestTabChange(phase.id)}
              className={`rounded-md px-2.5 py-1.5 text-left transition-all sm:px-3 ${
                tab === phase.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="block text-[11px] font-semibold leading-tight sm:text-xs">
                {"shortLabel" in phase && phase.shortLabel ? (
                  <>
                    <span className="sm:hidden">{phase.shortLabel}</span>
                    <span className="hidden sm:inline">{phase.label}</span>
                  </>
                ) : (
                  phase.label
                )}
              </span>
              <span
                className={`mt-0.5 hidden text-[10px] font-normal leading-tight xl:block ${
                  tab === phase.id ? "text-indigo-600/80" : "text-slate-400"
                }`}
              >
                {phase.subtitle}
              </span>
            </button>
          ))}
        </div>

        <div className="hidden h-4 w-px bg-slate-200 sm:block" />

        {tab === "workshop" && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {([
              ["pillar", "Pillar", Layers],
              ["department", "Dept", Users],
            ] as const).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setRunbookMode(mode);
                  setActiveSubPillarId(null);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                  runbookMode === mode
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {departmentOptions.length > 0 && (
          <select
            id="workshop-scope"
            className="max-w-[200px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
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
          className="hidden items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 sm:flex"
          title="Validation progress"
        >
          <span className="font-semibold text-slate-900">{stats.confirmed}</span>
          <span className="text-slate-400">/</span>
          <span>{stats.total}</span>
          <div className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {tab === "workshop" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
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
              <span className="ml-1 hidden md:inline">Presenter</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!!exportLoading}
              onClick={() => downloadWorkshopExport("current")}
              className="h-7 px-2 text-xs"
            >
              {exportLoading === "current" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="ml-1 hidden md:inline">Export</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!exportLoading}
              onClick={() => downloadWorkshopExport("all")}
              className="h-7 px-2 text-xs"
            >
              Full guide
            </Button>
          </>
        )}

        {tab === "workshop" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void requestTabChange("notes")}
            className="h-7 px-2 text-xs text-indigo-600"
          >
            <span className="hidden sm:inline">Evidence &amp; Analysis</span>
            <span className="sm:hidden">Evidence</span>
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}

        {tab === "review" && captureChunkCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setValidationChatOpen(true)}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask sources</span>
          </Button>
        )}
      </div>

      {/* Secondary stats — hidden on Workshop tab to maximize question space */}
      {tab !== "workshop" && (
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-b border-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
          <span>{stats.pillarCount} pillars</span>
          <span>{stats.total} controls</span>
          <span>{stats.scopedRequirements} requirements</span>
          <span className="text-indigo-600">{stats.confirmed} confirmed</span>
        </div>
      )}

      {/* Tab content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "workshop" && (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="flex w-[188px] shrink-0 flex-col border-r border-slate-100 bg-slate-50/60">
              <p className="shrink-0 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {runbookMode === "pillar" ? "Pillars" : "Department"}
              </p>
              <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
                {runbookMode === "pillar"
                  ? pillars.map((pillar) => (
                      <button
                        key={pillar.pillarId}
                        type="button"
                        onClick={() => selectPillar(pillar.pillarId)}
                        className={`flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-all ${
                          activePillarId === pillar.pillarId
                            ? "bg-indigo-600 text-white"
                            : "text-slate-700 hover:bg-white"
                        }`}
                      >
                        <span className="text-[11px] font-semibold leading-snug">{pillar.pillarLabel}</span>
                        <span
                          className={`mt-0.5 text-[10px] ${
                            activePillarId === pillar.pillarId ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          {pillar.requirementCount} reqs
                        </span>
                      </button>
                    ))
                  : departmentOptions.map((dept) => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setFacilitatorDepartment(dept.label);
                          setActiveSubPillarId(null);
                        }}
                        className={`flex w-full rounded-md px-2.5 py-2 text-left text-[11px] font-semibold leading-snug transition-all ${
                          facilitatorDepartment === dept.label
                            ? "bg-indigo-600 text-white"
                            : "text-slate-700 hover:bg-white"
                        }`}
                        title={dept.description}
                      >
                        {dept.label}
                      </button>
                    ))}
              </nav>
            </aside>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
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
            onGoToReview={() => void requestTabChange("review")}
          />
        )}

        {tab === "review" && (
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ControlReviewPanel
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

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
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
          />
        </div>
      </div>
    </div>
  );
}

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
