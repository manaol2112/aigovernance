"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { Badge } from "@/components/ui/badge";
import { isAnalysisStage, displayStepIndex } from "@/lib/use-case-types";
import {
  ControlReviewWorkspace,
  type ControlReviewWorkspaceHandle,
} from "@/components/control-review-workspace";
import { AssessmentReportingPanel } from "@/components/assessment-reporting-panel";
import { cn } from "@/lib/utils";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments-catalog";
import { getDepartmentsForFrameworks } from "@/lib/workshop-departments-catalog";
import { DeleteAssessmentButton } from "@/components/delete-assessment-button";
import { GovernanceReadinessSelector } from "@/components/governance-readiness-selector";
import { UseCaseIntakeCard } from "@/components/use-case-intake-card";
import { UseCaseRegistryRow } from "@/components/use-case-registry-row";
import {
  createEmptyUseCaseDraft,
  useCaseIntakeToPayload,
  validateUseCaseIntake,
  type UseCaseIntakeDraft,
  type UseCaseIntakeMode,
} from "@/lib/use-case-intake";
import {
  AssessmentEngagementHeader,
} from "@/components/assessment-journey-rail";
import {
  AssessmentPhaseNav,
  getPhaseFocusCopy,
  type ScopeSectionId,
} from "@/components/assessment-phase-nav";
import {
  canAdvanceScopeStage,
  resolveScopeSectionForStage,
  scopeAdvanceBlocker,
  scopeSectionIndex,
  scopeSectionToStage,
} from "@/lib/assessment-scope-navigation";
import type { WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import { toast } from "@/components/ui/toast";

type Checkpoint = {
  id: string;
  checkpointType: string;
  status: string;
  title: string;
  summary: string;
  confirmedBy?: string | null;
};

type UseCaseRow = {
  id: string;
  name: string;
  description?: string;
  useCaseType: string;
  department?: string | null;
  businessOwner?: string | null;
  vendor?: string | null;
  riskTier?: string | null;
  actorRole?: string | null;
  deploymentStage?: string | null;
  autonomyLevel?: string | null;
  regions?: string[];
  _count: { scopedRequirements: number; pillarWorkshopResponses: number };
};

type Deliverable = {
  id: string;
  type: string;
  title: string;
  status: string;
};

type AssessmentData = {
  id: string;
  name: string;
  clientName: string | null;
  clientIndustry: string | null;
  workflowStage: string;
  scope?: { frameworkCodes: string[] };
  useCases: UseCaseRow[];
  checkpoints: Checkpoint[];
  requirementEvaluations: Array<{
    id: string;
    complianceStatus: string;
    status: string;
    citedClauseId: string;
    gapFindings: string;
    alignedFindings: string;
    useCase: { name: string };
    requirement: { framework: { code: string } };
  }>;
  deliverables: Deliverable[];
};

const CHECKPOINT_ORDER = [
  "scope_confirmation",
  "use_case_confirmation",
  "requirement_scoping_confirmation",
  "evaluation_review",
  "deliverable_approval",
];

const STAGE_EXIT_CHECKPOINT: Record<string, string> = {
  use_cases: "use_case_confirmation",
  workshop: "evaluation_review",
  evaluation: "evaluation_review",
  human_review: "evaluation_review",
  deliverables: "deliverable_approval",
};

export function AssessmentWorkflow({ assessmentId }: { assessmentId: string }) {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [controlProgress, setControlProgress] = useState({ confirmed: 0, total: 0 });
  const [showAddUseCase, setShowAddUseCase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [newUseCase, setNewUseCase] = useState<UseCaseIntakeDraft>(createEmptyUseCaseDraft());
  const [useCaseIntakeMode, setUseCaseIntakeMode] = useState<UseCaseIntakeMode>("discovery");

  const [loadError, setLoadError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<WorkshopDepartmentOption[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<WorkshopWorkspacePhaseId>("workshop");
  const [scopeSection, setScopeSection] = useState<ScopeSectionId>("overview");
  const [phaseNavCollapsed, setPhaseNavCollapsed] = useState(false);
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const workspaceRef = useRef<ControlReviewWorkspaceHandle>(null);
  const syncedWorkflowStageRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [aRes, deptRes] = await Promise.all([
        fetch(`/api/assessments/${assessmentId}/workflow`),
        fetch(`/api/assessments/${assessmentId}/departments`),
      ]);

      if (!aRes.ok) {
        const err = await aRes.text();
        throw new Error(err || `Failed to load workflow (${aRes.status})`);
      }

      const aText = await aRes.text();
      const parsed: AssessmentData | null = aText ? JSON.parse(aText) : null;
      setData(parsed);

      if (
        parsed &&
        !isAnalysisStage(parsed.workflowStage) &&
        parsed.workflowStage !== "deliverables" &&
        parsed.workflowStage !== "finalized"
      ) {
        if (syncedWorkflowStageRef.current !== parsed.workflowStage) {
          setScopeSection(resolveScopeSectionForStage(parsed.workflowStage));
          syncedWorkflowStageRef.current = parsed.workflowStage;
        }
      } else if (parsed) {
        syncedWorkflowStageRef.current = parsed.workflowStage;
      }

      if (
        parsed &&
        (isAnalysisStage(parsed.workflowStage) ||
          parsed.workflowStage === "deliverables" ||
          parsed.workflowStage === "finalized")
      ) {
        const crRes = await fetch(`/api/assessments/${assessmentId}/control-review`);
        if (crRes.ok) {
          const cr = (await crRes.json()) as {
            stats?: { confirmed: number; total: number; scopedRequirements?: number };
          };
          if (cr.stats) {
            setControlProgress({ confirmed: cr.stats.confirmed, total: cr.stats.total });
            setWorkspaceInitialized(
              (cr.stats.total ?? 0) > 0 || (cr.stats.scopedRequirements ?? 0) > 0
            );
          }
        }
      }

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartmentOptions(deptData.options ?? deptData.suggested ?? []);
      } else {
        const codes = parsed?.scope?.frameworkCodes ?? [];
        setDepartmentOptions(getDepartmentsForFrameworks(codes));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load assessment workflow");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  const handleWorkspaceMetaChange = useCallback(
    (meta: { initialized: boolean; analysisStale: boolean; hasAnalysis: boolean }) => {
      setWorkspaceInitialized((prev) => (prev === meta.initialized ? prev : meta.initialized));
    },
    []
  );

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("assessment-phase-nav-collapsed");
      if (stored === "true") setPhaseNavCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  function togglePhaseNavCollapsed() {
    setPhaseNavCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("assessment-phase-nav-collapsed", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  async function workflowAction(action: string, extra?: Record<string, unknown>) {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error ?? "Action failed", { variant: "error" });
        return null;
      }
      await load();
      return result as Record<string, unknown>;
    } finally {
      setActionLoading("");
    }
  }

  async function goToStage(stage: string) {
    if (stage === data?.workflowStage) return;
    await workflowAction("go_to_stage", { stage });
  }

  async function approveCheckpointAction(checkpointType: string) {
    if (!reviewerName.trim()) {
      toast("Enter your name as reviewer before approving.", { variant: "error" });
      return;
    }
    await workflowAction("approve_checkpoint", { checkpointType, confirmedBy: reviewerName });
    const exitCheckpoint = STAGE_EXIT_CHECKPOINT[data!.workflowStage];
    if (exitCheckpoint === checkpointType) {
      await workflowAction("advance");
    }
  }

  async function addUseCase() {
    const validationError = validateUseCaseIntake(newUseCase, useCaseIntakeMode);
    if (validationError) {
      toast(validationError, { variant: "error" });
      return;
    }
    setActionLoading("add_use_case");
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/use-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useCaseIntakeToPayload(newUseCase, useCaseIntakeMode)),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(
          result.error ??
            `Failed to create use case (${res.status}). Try restarting the dev server after schema changes.`,
          { variant: "error" }
        );
        return;
      }
      setNewUseCase(createEmptyUseCaseDraft(undefined, useCaseIntakeMode));
      setShowAddUseCase(false);
      await load();
    } finally {
      setActionLoading("");
    }
  }

  async function updateUseCaseDepartment(useCaseId: string, department: string) {
    await fetch(`/api/assessments/${assessmentId}/use-cases`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useCaseId, department: department.trim() || null }),
    });
    await load();
  }

  async function removeUseCase(useCaseId: string) {
    if (!confirm("Remove this use case? Scoped requirements and workshop data will be deleted.")) return;
    await fetch(`/api/assessments/${assessmentId}/use-cases?useCaseId=${useCaseId}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="space-y-4 py-20 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="text-slate-700">{loadError ?? "Assessment not found"}</p>
        <p className="text-sm text-slate-500">
          If you recently updated the schema, restart the dev server: <code className="rounded bg-slate-100 px-1">npm run dev</code>
        </p>
        <Button onClick={() => { setLoading(true); load(); }}>Retry</Button>
      </div>
    );
  }

  const activeCheckpoint =
    data.checkpoints.find((c) => c.status === "pending")
    ?? CHECKPOINT_ORDER.map((t) => data.checkpoints.find((c) => c.checkpointType === t))
        .find((c) => c && c.status !== "approved" && c.status !== "locked");
  const evaluationCheckpoint = data.checkpoints.find((c) => c.checkpointType === "evaluation_review");
  const deliverableCheckpoint = data.checkpoints.find((c) => c.checkpointType === "deliverable_approval");
  const totalScoped = data.useCases.reduce((s, u) => s + u._count.scopedRequirements, 0);
  const scopingReady = totalScoped > 0;
  const canEditUseCases =
    scopeSection === "use_cases" &&
    (data.workflowStage === "client_setup" ||
      data.workflowStage === "use_cases" ||
      data.workflowStage === "requirement_scoping");
  const pendingCheckpointCount = data.checkpoints.filter((c) => c.status === "pending").length;

  const checkpointStatuses = Object.fromEntries(
    data.checkpoints.map((checkpoint) => [checkpoint.checkpointType, checkpoint.status])
  ) as Record<string, string | undefined>;

  const scopeNavigationBlocker = scopeAdvanceBlocker({
    targetSection: scopeSection,
    workflowStage: data.workflowStage,
    useCaseCount: data.useCases.length,
    checkpointStatuses,
  });

  async function advanceScopeStageIfReady(stage: string) {
    if (
      !canAdvanceScopeStage(stage, checkpointStatuses, {
        useCaseCount: data.useCases.length,
        totalScoped,
      })
    ) {
      return null;
    }
    return workflowAction("advance");
  }

  async function handleSelectScope(section: ScopeSectionId) {
    setScopeSection(section);
    if (!data) return;

    if (isAnalysisStage(data.workflowStage)) {
      const targetStage = scopeSectionToStage(section);
      if (data.workflowStage !== targetStage) {
        await goToStage(targetStage);
      }
      return;
    }

    const targetIdx = scopeSectionIndex(section);
    const currentIdx = displayStepIndex(data.workflowStage);

    if (targetIdx < currentIdx) {
      const targetStage = scopeSectionToStage(section);
      if (data.workflowStage !== targetStage) {
        await goToStage(targetStage);
      }
      return;
    }

    if (targetIdx <= currentIdx) return;

    const blocker = scopeAdvanceBlocker({
      targetSection: section,
      workflowStage: data.workflowStage,
      useCaseCount: data.useCases.length,
      checkpointStatuses,
    });
    if (blocker) return;

    let stage = data.workflowStage;
    let statuses = { ...checkpointStatuses };
    let guard = 0;

    while (displayStepIndex(stage) < targetIdx && guard < 4) {
      const result = await advanceScopeStageIfReady(stage);
      if (!result || typeof result.workflowStage !== "string") break;

      const refreshed = await fetch(`/api/assessments/${assessmentId}/workflow`);
      if (!refreshed.ok) break;
      const fresh = (await refreshed.json()) as AssessmentData;
      setData(fresh);
      syncedWorkflowStageRef.current = fresh.workflowStage;
      stage = fresh.workflowStage;
      statuses = Object.fromEntries(
        fresh.checkpoints.map((checkpoint) => [checkpoint.checkpointType, checkpoint.status])
      );
      guard += 1;
    }
  }

  async function handleSelectWorkspace(tab: WorkshopWorkspacePhaseId) {
    setWorkspaceTab(tab);
    if (!data) return;

    if (!isAnalysisStage(data.workflowStage)) {
      if (scopingReady) {
        if (controlProgress.total === 0) {
          await workflowAction("init_control_review");
        } else if (data.workflowStage !== "workshop") {
          await workflowAction("advance");
        }
      } else {
        setScopeSection("requirements");
        toast("Complete requirement scoping before opening the workspace.", { variant: "error" });
        return;
      }
    }

    await workspaceRef.current?.navigateToTab(tab);
  }

  async function handleSelectDeliver() {
    if (!data) return;
    if (data.workflowStage === "deliverables" || data.workflowStage === "finalized") return;
    if (!isAnalysisStage(data.workflowStage)) return;

    if (controlProgress.total > 0 && controlProgress.confirmed >= controlProgress.total) {
      await workflowAction("proceed_to_deliverables", { confirmedBy: reviewerName || "Reviewer" });
    } else {
      toast("Complete control sign-off in Validate before opening the client package.", {
        variant: "error",
      });
      setWorkspaceTab("review");
      if (workspaceRef.current) {
        await workspaceRef.current.navigateToTab("review");
      }
    }
  }

  const inWorkspace = isAnalysisStage(data.workflowStage);
  const inDeliver = data.workflowStage === "deliverables" || data.workflowStage === "finalized";
  const inScope = !inWorkspace && !inDeliver;

  const phaseFocus = getPhaseFocusCopy(
    inDeliver
      ? { area: "deliver" }
      : inWorkspace
        ? { area: "workspace", tab: workspaceTab }
        : { area: "scope", section: scopeSection }
  );

  const showWorkspaceCheckpoint =
    inWorkspace &&
    activeCheckpoint?.checkpointType === "evaluation_review" &&
    workspaceTab === "review";

  function renderCheckpointCard(checkpoint: Checkpoint) {
    return (
      <Card
        id="approval-checkpoint"
        className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-700" />
            <CardTitle className="text-amber-900">Approval required</CardTitle>
          </div>
          <CardDescription className="text-amber-800">
            Review the summary below, then approve when this section is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-white p-4">
            <div className="font-semibold text-slate-900">{checkpoint.title}</div>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{checkpoint.summary}</pre>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Reviewer name"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
            />
            <Button
              onClick={() => approveCheckpointAction(checkpoint.checkpointType)}
              disabled={!!actionLoading}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Approve{STAGE_EXIT_CHECKPOINT[data.workflowStage] === checkpoint.checkpointType ? " & Continue" : ""}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AssessmentEngagementHeader
        assessmentName={data.name}
        clientName={data.clientName}
        clientIndustry={data.clientIndustry}
        frameworkCodes={data.scope?.frameworkCodes ?? []}
        controlProgress={controlProgress}
        pendingCheckpointCount={pendingCheckpointCount}
        deleteButton={
          <DeleteAssessmentButton
            assessmentId={assessmentId}
            assessmentName={data.name}
            variant="workflow"
          />
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside
          className={cn(
            "relative z-10 shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start",
            phaseNavCollapsed ? "lg:w-[4.75rem]" : "w-full lg:w-72"
          )}
        >
          <AssessmentPhaseNav
            workflowStage={data.workflowStage}
            workspaceTab={inWorkspace ? workspaceTab : undefined}
            workspaceInitialized={workspaceInitialized || controlProgress.total > 0}
            scopeSection={scopeSection}
            controlProgress={controlProgress}
            useCaseCount={data.useCases.length}
            totalScoped={totalScoped}
            scopingApproved={scopingReady}
            disabled={!!actionLoading}
            collapsed={phaseNavCollapsed}
            onToggleCollapsed={togglePhaseNavCollapsed}
            onSelectScope={(section) => void handleSelectScope(section)}
            onSelectWorkspace={(tab) => void handleSelectWorkspace(tab)}
            onSelectDeliver={() => void handleSelectDeliver()}
          />
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600/80">
              Current focus
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{phaseFocus.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{phaseFocus.description}</p>
            {inScope && scopeNavigationBlocker && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {scopeNavigationBlocker}
              </p>
            )}
          </section>

          {showWorkspaceCheckpoint && activeCheckpoint?.status === "pending" && renderCheckpointCard(activeCheckpoint)}

      {/* Stage: Client setup summary */}
      {inScope && scopeSection === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>Client & Framework Scope</CardTitle>
            <CardDescription>Assessment scope established at creation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div><span className="text-slate-500">Client:</span> {data.clientName}</div>
            <div><span className="text-slate-500">Industry:</span> {data.clientIndustry ?? "—"}</div>
            <div><span className="text-slate-500">Frameworks:</span> {data.scope?.frameworkCodes.join(", ")}</div>
            </div>
            {data.scope?.frameworkCodes?.length ? (
              <FrameworkScopeNotice codes={data.scope.frameworkCodes} compact />
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Stage: Use Cases */}
      {inScope && scopeSection === "use_cases" && canEditUseCases && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f6f7f9] shadow-sm">
          <div className="border-b border-slate-200/80 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Assessment scope
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  AI use case registry
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  Register every AI system in scope. Assign workshop departments so facilitation groups
                  stakeholders who own related framework requirements.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 bg-white"
                onClick={() => setShowAddUseCase(!showAddUseCase)}
              >
                <Plus className="mr-1 h-4 w-4" /> {showAddUseCase ? "Cancel" : "Add system"}
              </Button>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {showAddUseCase && data && (
              <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Register new AI system</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose discovery or established intake, then capture system details.
                  </p>
                </div>
                <div className="space-y-4 p-5">
                  <GovernanceReadinessSelector
                    value={useCaseIntakeMode}
                    compact
                    onChange={(mode) => {
                      setUseCaseIntakeMode(mode);
                      setNewUseCase(createEmptyUseCaseDraft(newUseCase.useCaseType, mode));
                    }}
                  />
                  <UseCaseIntakeCard
                    index={data.useCases.length}
                    draft={newUseCase}
                    frameworkCodes={data.scope?.frameworkCodes ?? []}
                    intakeMode={useCaseIntakeMode}
                    onChange={setNewUseCase}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={addUseCase} disabled={actionLoading === "add_use_case"}>
                      {actionLoading === "add_use_case" ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Save system
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {data.useCases.length === 0 && !showAddUseCase && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Bot className="h-6 w-6" />
                </span>
                <p className="mt-4 text-base font-semibold text-slate-900">No AI systems registered yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Add at least one AI system to scope framework requirements and begin the workshop.
                </p>
                <Button size="sm" className="mt-5" onClick={() => setShowAddUseCase(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add first system
                </Button>
              </div>
            )}

            {data.useCases.map((uc, i) => (
              <UseCaseRegistryRow
                key={uc.id}
                useCase={uc}
                index={i}
                departmentOptions={departmentOptions}
                onDepartmentChange={(department) => updateUseCaseDepartment(uc.id, department)}
                onRemove={() => removeUseCase(uc.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stage: Requirement Scoping */}
      {inScope && scopeSection === "requirements" && (
        <Card>
          <CardHeader>
            <CardTitle>Requirement Scoping</CardTitle>
            <CardDescription>
              Requirements are scoped automatically from your frameworks and use cases. Review the mapping below, then open the workshop when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scopeNavigationBlocker && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {scopeNavigationBlocker}
              </p>
            )}
            {totalScoped === 0 && data.useCases.length > 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600" />
                Scoping framework requirements for your use cases…
              </div>
            ) : totalScoped === 0 ? (
              <p className="text-sm text-slate-500">Add use cases first — requirements will scope automatically.</p>
            ) : (
              <>
                {data.useCases.map((uc) => (
                  <div key={uc.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="font-medium">{uc.name}</span>
                    <Badge variant="secondary">{uc._count.scopedRequirements} requirements → controls</Badge>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => workflowAction("init_control_review")} disabled={!!actionLoading}>
                    {actionLoading === "init_control_review" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Start workshop ({totalScoped} reqs → controls)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => workflowAction("scope_requirements")}
                    disabled={!!actionLoading || data.useCases.length === 0}
                  >
                    {actionLoading === "scope_requirements" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Re-sync scoping
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage: Workshop (evidence, validation, reports) */}
      {inWorkspace && (
        <div className="h-[calc(100dvh-12rem)] min-h-[32rem]">
          <ControlReviewWorkspace
            ref={workspaceRef}
            assessmentId={assessmentId}
            hideWorkspacePhaseTabs
            activeWorkspaceTab={workspaceTab}
            className="h-full min-h-0"
          onWorkspaceTabChange={setWorkspaceTab}
          onWorkspaceMetaChange={handleWorkspaceMetaChange}
          onProgressChange={setControlProgress}
          knownScopedCount={totalScoped}
          onGoToStage={goToStage}
          onInitWorkshop={() => workflowAction("init_control_review")}
          initWorkshopLoading={actionLoading === "init_control_review"}
          evaluationReviewApproved={evaluationCheckpoint?.status === "approved"}
          onProceedToDeliverables={async (confirmedBy) => {
            await workflowAction("proceed_to_deliverables", { confirmedBy });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
            proceedLoading={actionLoading === "proceed_to_deliverables"}
          />
        </div>
      )}

      {/* Stage: Deliverables — full package view (same as Reporting, plus approval flow) */}
      {inDeliver && (
        <div className="flex h-[calc(100dvh-12rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <AssessmentReportingPanel
            assessmentId={assessmentId}
            reviewProgress={{
              confirmed: controlProgress.confirmed,
              total: controlProgress.total,
            }}
            onGoToReview={() => goToStage("workshop")}
            variant="deliverables"
            workflowStage={data.workflowStage}
            deliverableCheckpoint={deliverableCheckpoint}
            actionLoading={actionLoading}
            onApproveDeliverablePackage={async (confirmedBy) => {
              await workflowAction("approve_checkpoint", {
                checkpointType: "deliverable_approval",
                confirmedBy,
              });
            }}
            onFinalizeAssessment={() => workflowAction("finalize")}
          />
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
