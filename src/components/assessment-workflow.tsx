"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  Plus,
  Shield,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STEPS, USE_CASE_TYPES, getUseCaseTypeDef, displayStepIndex, isAnalysisStage } from "@/lib/use-case-types";
import { ControlReviewWorkspace } from "@/components/control-review-workspace";
import { AssessmentReportingPanel } from "@/components/assessment-reporting-panel";
import { DepartmentSelect } from "@/components/department-select";
import { titleCase } from "@/lib/utils";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments-catalog";
import { getDepartmentsForFrameworks } from "@/lib/workshop-departments-catalog";
import { DeleteAssessmentButton } from "@/components/delete-assessment-button";

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
  riskTier?: string | null;
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
  const [newUseCase, setNewUseCase] = useState({
    name: "",
    description: "",
    useCaseType: "client_facing_product",
    department: "",
  });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<WorkshopDepartmentOption[]>([]);

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
        (parsed.workflowStage === "deliverables" || parsed.workflowStage === "finalized")
      ) {
        const crRes = await fetch(`/api/assessments/${assessmentId}/control-review`);
        if (crRes.ok) {
          const cr = (await crRes.json()) as { stats?: { confirmed: number; total: number } };
          if (cr.stats) {
            setControlProgress({ confirmed: cr.stats.confirmed, total: cr.stats.total });
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

  useEffect(() => { load(); }, [load]);

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
        alert(result.error ?? "Action failed");
        return;
      }
      await load();
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
      alert("Enter your name as reviewer before approving.");
      return;
    }
    await workflowAction("approve_checkpoint", { checkpointType, confirmedBy: reviewerName });
    const exitCheckpoint = STAGE_EXIT_CHECKPOINT[data!.workflowStage];
    if (exitCheckpoint === checkpointType) {
      await workflowAction("advance");
    }
  }

  async function addUseCase() {
    if (!newUseCase.name.trim() || !newUseCase.description.trim()) {
      alert("Name and description are required.");
      return;
    }
    const def = getUseCaseTypeDef(newUseCase.useCaseType as Parameters<typeof getUseCaseTypeDef>[0]);
    setActionLoading("add_use_case");
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/use-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUseCase.name,
          description: newUseCase.description,
          useCaseType: newUseCase.useCaseType,
          actorRole: def.defaultActor,
          riskTier: def.defaultRiskTier,
          dataCategories: def.dataCategories,
          department: newUseCase.department.trim() || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(result.error ?? `Failed to create use case (${res.status}). Try restarting the dev server after schema changes.`);
        return;
      }
      setNewUseCase({ name: "", description: "", useCaseType: "client_facing_product", department: "" });
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

  const currentStep = displayStepIndex(data.workflowStage);
  const activeCheckpoint =
    data.checkpoints.find((c) => c.status === "pending")
    ?? CHECKPOINT_ORDER.map((t) => data.checkpoints.find((c) => c.checkpointType === t))
        .find((c) => c && c.status !== "approved" && c.status !== "locked");
  const scopingCheckpoint = data.checkpoints.find((c) => c.checkpointType === "requirement_scoping_confirmation");
  const evaluationCheckpoint = data.checkpoints.find((c) => c.checkpointType === "evaluation_review");
  const deliverableCheckpoint = data.checkpoints.find((c) => c.checkpointType === "deliverable_approval");
  const totalScoped = data.useCases.reduce((s, u) => s + u._count.scopedRequirements, 0);
  const canEditUseCases =
    data.workflowStage === "use_cases" || data.workflowStage === "requirement_scoping";

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/assessments"><ArrowLeft className="mr-1 h-4 w-4" /> Assessments</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
              <Badge variant="outline">{titleCase(data.workflowStage.replace(/_/g, " "))}</Badge>
            </div>
            <p className="mt-1 text-slate-500">
              {data.clientName}{data.clientIndustry ? ` · ${data.clientIndustry}` : ""}
            </p>
          </div>
          <DeleteAssessmentButton
            assessmentId={assessmentId}
            assessmentName={data.name}
            variant="workflow"
          />
        </div>
      </div>

      {/* Stepper — click any completed or current step to revisit */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {WORKFLOW_STEPS.map((step, i) => {
          const isPast = i < currentStep;
          const isCurrent = i === currentStep;
          const canNavigate = i <= currentStep;
          return (
            <button
              key={step.stage}
              type="button"
              disabled={!canNavigate || !!actionLoading}
              onClick={() => canNavigate && goToStage(step.stage)}
              title={canNavigate ? `Go to ${step.label}` : "Complete earlier stages first"}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                isPast
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : isCurrent
                    ? "bg-slate-900 text-white ring-2 ring-slate-300 ring-offset-1"
                    : "cursor-not-allowed bg-slate-100 text-slate-400"
              } ${canNavigate && !isCurrent ? "cursor-pointer" : ""}`}
            >
              {isPast ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {step.number}. {step.label}
            </button>
          );
        })}
      </div>
      {currentStep > 0 && (
        <p className="text-xs text-slate-500">
          Click any completed step above to revisit earlier stages (e.g. edit use cases or re-run scoping).
        </p>
      )}
      {isAnalysisStage(data.workflowStage) && controlProgress.total > 0 && (
        <p className="text-xs font-medium text-indigo-600">
          Review progress: {controlProgress.confirmed} of {controlProgress.total} controls confirmed
        </p>
      )}

      {/* Active checkpoint — only show when pending and reviewable */}
      {activeCheckpoint && activeCheckpoint.status === "pending" && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-700" />
              <CardTitle className="text-amber-900">Human Review Required</CardTitle>
            </div>
            <CardDescription className="text-amber-800">
              Review the summary below, then approve to continue to the next stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-white p-4">
              <div className="font-semibold text-slate-900">{activeCheckpoint.title}</div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{activeCheckpoint.summary}</pre>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                placeholder="Reviewer name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
              <Button
                onClick={() => approveCheckpointAction(activeCheckpoint.checkpointType)}
                disabled={!!actionLoading}
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve{STAGE_EXIT_CHECKPOINT[data.workflowStage] === activeCheckpoint.checkpointType ? " & Continue" : ""}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked checkpoint hint */}
      {activeCheckpoint && activeCheckpoint.status === "locked" && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <Lock className="h-4 w-4 shrink-0" />
          Complete the work in this stage first — approval will unlock when reviewable content is ready.
        </div>
      )}

      {/* Approved checkpoint badge */}
      {activeCheckpoint && activeCheckpoint.status === "approved" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {activeCheckpoint.title} approved{activeCheckpoint.confirmedBy ? ` by ${activeCheckpoint.confirmedBy}` : ""}.
          {data.workflowStage !== "finalized" && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => workflowAction("advance")} disabled={!!actionLoading}>
              Continue to Next Stage
            </Button>
          )}
        </div>
      )}

      {/* Stage: Client setup summary */}
      {(data.workflowStage === "client_setup" || data.workflowStage === "use_cases") && (
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

      {/* Stage: Use Cases — editable when on this stage or requirement scoping (incl. when navigated back) */}
      {canEditUseCases && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Use Cases</CardTitle>
                <CardDescription>
                  Add all AI systems in scope. Assign a workshop department so facilitation can be grouped by the
                  stakeholders who own related framework requirements.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowAddUseCase(!showAddUseCase)}>
                <Plus className="mr-1 h-4 w-4" /> Add Use Case
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddUseCase && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Use case name (e.g. Customer Support Chatbot)"
                  value={newUseCase.name}
                  onChange={(e) => setNewUseCase({ ...newUseCase, name: e.target.value })}
                />
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Description of the AI system and how it's used"
                  value={newUseCase.description}
                  onChange={(e) => setNewUseCase({ ...newUseCase, description: e.target.value })}
                />
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={newUseCase.useCaseType}
                  onChange={(e) => setNewUseCase({ ...newUseCase, useCaseType: e.target.value })}
                >
                  {USE_CASE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <DepartmentSelect
                  value={newUseCase.department}
                  onChange={(department) => setNewUseCase({ ...newUseCase, department })}
                  options={departmentOptions}
                  emptyLabel="Select department (optional)"
                />
                {departmentOptions.length > 0 && data && (
                  <p className="text-xs text-slate-500">
                    Departments are suggested from your selected AI frameworks
                    {data.scope?.frameworkCodes?.length
                      ? ` (${data.scope.frameworkCodes.join(", ")})`
                      : ""}
                    . Leave unassigned for organization-wide workshops.
                  </p>
                )}
                <Button size="sm" onClick={addUseCase} disabled={actionLoading === "add_use_case"}>
                  {actionLoading === "add_use_case" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Save Use Case
                </Button>
              </div>
            )}

            {data.useCases.length === 0 && (
              <p className="text-sm text-slate-500">No use cases yet. Add at least one to continue.</p>
            )}

            {data.useCases.map((uc) => (
              <div key={uc.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium">{uc.name}</span>
                  <Badge variant="outline" className="ml-2">{titleCase(uc.useCaseType.replace(/_/g, " "))}</Badge>
                  {uc.department && (
                    <Badge variant="secondary" className="ml-1">{uc.department}</Badge>
                  )}
                  {uc.riskTier && <Badge variant="secondary" className="ml-1">{uc.riskTier} risk</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <DepartmentSelect
                    value={uc.department ?? ""}
                    onChange={(department) => updateUseCaseDepartment(uc.id, department)}
                    options={departmentOptions}
                    emptyLabel="Not assigned"
                    className="w-56 rounded-lg border px-2 py-1 text-xs"
                  />
                  {uc._count.scopedRequirements > 0 && (
                    <Badge variant="secondary">{uc._count.scopedRequirements} reqs</Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeUseCase(uc.id)}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stage: Requirement Scoping */}
      {data.workflowStage === "requirement_scoping" && (
        <Card>
          <CardHeader>
            <CardTitle>Requirement Scoping</CardTitle>
            <CardDescription>
              Auto-scope framework requirements for {data.useCases.length} use case(s). Requirements map to canonical controls for workshop analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalScoped === 0 ? (
              <Button onClick={() => workflowAction("scope_requirements")} disabled={!!actionLoading || data.useCases.length === 0}>
                {actionLoading === "scope_requirements" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Requirement Scoping
              </Button>
            ) : (
              <>
                {data.useCases.map((uc) => (
                  <div key={uc.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="font-medium">{uc.name}</span>
                    <Badge variant="secondary">{uc._count.scopedRequirements} requirements → controls</Badge>
                  </div>
                ))}
                {scopingCheckpoint?.status === "approved" && (
                  <Button onClick={() => workflowAction("init_control_review")} disabled={!!actionLoading}>
                    {actionLoading === "init_control_review" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Start workshop ({totalScoped} reqs → controls)
                  </Button>
                )}
                {scopingCheckpoint?.status === "pending" && (
                  <p className="text-sm text-amber-700">Approve the scoped requirements above before starting the workshop.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage: Workshop (evidence, validation, reports) */}
      {isAnalysisStage(data.workflowStage) && (
        <ControlReviewWorkspace
          assessmentId={assessmentId}
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
      )}

      {/* Stage: Deliverables — full package view (same as Reporting, plus approval flow) */}
      {(data.workflowStage === "deliverables" || data.workflowStage === "finalized") && (
        <div className="flex min-h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
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
    </div>
  );
}
