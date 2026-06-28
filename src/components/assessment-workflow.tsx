"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  Lock,
  Plus,
  Shield,
  Trash2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STEPS, USE_CASE_TYPES, getUseCaseTypeDef } from "@/lib/use-case-types";
import { titleCase } from "@/lib/utils";

type Checkpoint = {
  id: string;
  checkpointType: string;
  status: string;
  title: string;
  summary: string;
  confirmedBy?: string | null;
};

type WorkshopPillar = {
  id: string;
  pillarId: string;
  pillarLabel: string;
  questionPrompt: string;
  requirementIds: string[];
  linkedControls: string[];
  frameworkSummary: Record<string, number> | null;
  clientNotes: string | null;
  facilitatorNotes: string | null;
  useCase: { id: string; name: string };
  evidenceFiles: Array<{ id: string; fileName: string; fileSize: number }>;
};

type UseCaseRow = {
  id: string;
  name: string;
  description?: string;
  useCaseType: string;
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

const DELIVERABLE_LABELS: Record<string, string> = {
  gap_assessment_report: "Gap Assessment Report",
  remediation_roadmap: "Remediation Roadmap",
  risk_control_matrix: "Risk & Control Matrix",
  board_ready_summary: "Board-Ready Summary",
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
  human_review: "evaluation_review",
  evaluation: "evaluation_review",
  deliverables: "deliverable_approval",
};

export function AssessmentWorkflow({ assessmentId }: { assessmentId: string }) {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopPillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null);
  const [showAddUseCase, setShowAddUseCase] = useState(false);
  const [newUseCase, setNewUseCase] = useState({
    name: "",
    description: "",
    useCaseType: "client_facing_product",
  });

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [aRes, wRes] = await Promise.all([
        fetch(`/api/assessments/${assessmentId}/workflow`),
        fetch(`/api/assessments/${assessmentId}/workshop`),
      ]);

      if (!aRes.ok) {
        const err = await aRes.text();
        throw new Error(err || `Failed to load workflow (${aRes.status})`);
      }
      if (!wRes.ok) {
        const err = await wRes.text();
        throw new Error(err || `Failed to load workshop (${wRes.status})`);
      }

      const [aText, wText] = await Promise.all([aRes.text(), wRes.text()]);
      setData(aText ? JSON.parse(aText) : null);
      setWorkshop(wText ? JSON.parse(wText) : []);
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
    await fetch(`/api/assessments/${assessmentId}/use-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newUseCase.name,
        description: newUseCase.description,
        useCaseType: newUseCase.useCaseType,
        actorRole: def.defaultActor,
        riskTier: def.defaultRiskTier,
        dataCategories: def.dataCategories,
      }),
    });
    setNewUseCase({ name: "", description: "", useCaseType: "client_facing_product" });
    setShowAddUseCase(false);
    await load();
  }

  async function removeUseCase(useCaseId: string) {
    if (!confirm("Remove this use case? Scoped requirements and workshop data will be deleted.")) return;
    await fetch(`/api/assessments/${assessmentId}/use-cases?useCaseId=${useCaseId}`, { method: "DELETE" });
    await load();
  }

  async function saveWorkshopNotes(item: WorkshopPillar, clientNotes: string, facilitatorNotes: string) {
    await fetch(`/api/assessments/${assessmentId}/workshop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillarResponseId: item.id, clientNotes, facilitatorNotes }),
    });
    await load();
  }

  async function uploadEvidence(itemId: string, file: File) {
    const formData = new FormData();
    formData.append("pillarResponseId", itemId);
    formData.append("file", file);
    await fetch(`/api/assessments/${assessmentId}/workshop`, { method: "POST", body: formData });
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

  const currentStep = WORKFLOW_STEPS.findIndex((s) => s.stage === data.workflowStage);
  const activeCheckpoint =
    data.checkpoints.find((c) => c.status === "pending")
    ?? CHECKPOINT_ORDER.map((t) => data.checkpoints.find((c) => c.checkpointType === t))
        .find((c) => c && c.status !== "approved" && c.status !== "locked");
  const scopingCheckpoint = data.checkpoints.find((c) => c.checkpointType === "requirement_scoping_confirmation");
  const evaluationCheckpoint = data.checkpoints.find((c) => c.checkpointType === "evaluation_review");
  const deliverableCheckpoint = data.checkpoints.find((c) => c.checkpointType === "deliverable_approval");
  const totalScoped = data.useCases.reduce((s, u) => s + u._count.scopedRequirements, 0);
  const totalPillarQuestions = data.useCases.reduce((s, u) => s + u._count.pillarWorkshopResponses, 0);

  // Group workshop by use case
  const workshopByUseCase = data.useCases.map((uc) => ({
    useCase: uc,
    pillars: workshop.filter((w) => w.useCase.id === uc.id),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/assessments"><ArrowLeft className="mr-1 h-4 w-4" /> Assessments</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          <Badge variant="outline">{titleCase(data.workflowStage.replace(/_/g, " "))}</Badge>
        </div>
        <p className="mt-1 text-slate-500">
          {data.clientName}{data.clientIndustry ? ` · ${data.clientIndustry}` : ""}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {WORKFLOW_STEPS.map((step, i) => (
          <div
            key={step.stage}
            className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${
              i < currentStep ? "bg-emerald-700 text-white"
              : i === currentStep ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-400"
            }`}
          >
            {i < currentStep ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {step.number}. {step.label}
          </div>
        ))}
      </div>

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

      {/* Stage: Client setup summary (always visible as context) */}
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

      {/* Stage: Use Cases — dynamic add/remove */}
      {(data.workflowStage === "use_cases" || data.workflowStage === "requirement_scoping") && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Use Cases</CardTitle>
                <CardDescription>
                  Add all AI systems in scope. Each use case gets its own pillar-grouped workshop.
                </CardDescription>
              </div>
              {data.workflowStage === "use_cases" && (
                <Button size="sm" variant="outline" onClick={() => setShowAddUseCase(!showAddUseCase)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Use Case
                </Button>
              )}
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
                <Button size="sm" onClick={addUseCase}>Save Use Case</Button>
              </div>
            )}

            {data.useCases.length === 0 && (
              <p className="text-sm text-slate-500">No use cases yet. Add at least one to continue.</p>
            )}

            {data.useCases.map((uc) => (
              <div key={uc.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <span className="font-medium">{uc.name}</span>
                  <Badge variant="outline" className="ml-2">{titleCase(uc.useCaseType.replace(/_/g, " "))}</Badge>
                  {uc.riskTier && <Badge variant="secondary" className="ml-1">{uc.riskTier} risk</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {uc._count.scopedRequirements > 0 && (
                    <Badge variant="secondary">{uc._count.scopedRequirements} reqs</Badge>
                  )}
                  {data.workflowStage === "use_cases" && (
                    <Button size="sm" variant="ghost" onClick={() => removeUseCase(uc.id)}>
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  )}
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
              Auto-scope framework requirements for {data.useCases.length} use case(s). Individual requirements are grouped into ~10 risk pillars for the workshop.
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
                    <Badge variant="secondary">{uc._count.scopedRequirements} requirements → ~10 pillar questions</Badge>
                  </div>
                ))}
                {scopingCheckpoint?.status === "approved" && (
                  <Button onClick={() => workflowAction("init_workshop")} disabled={!!actionLoading}>
                    {actionLoading === "init_workshop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Start Pillar Workshop ({totalScoped} reqs grouped by risk pillar)
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

      {/* Stage: Workshop — pillar grouped */}
      {data.workflowStage === "workshop" && (
        <Card>
          <CardHeader>
            <CardTitle>Workshop — Risk Pillar Discussions</CardTitle>
            <CardDescription>
              {totalPillarQuestions} consolidated pillar questions across {data.useCases.length} use case(s).
              Each pillar covers multiple framework requirements — capture notes once per risk area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {workshop.length === 0 && (
              <Button onClick={() => workflowAction("init_workshop")} disabled={!!actionLoading}>
                Initialize Pillar Workshop Questions
              </Button>
            )}

            {workshopByUseCase.map(({ useCase, pillars }) => (
              <div key={useCase.id} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                  {useCase.name}
                  <Badge variant="outline" className="ml-2">{pillars.length} pillars</Badge>
                </h3>
                {pillars.map((item) => (
                  <PillarWorkshopCard
                    key={item.id}
                    item={item}
                    expanded={expandedWorkshop === item.id}
                    onToggle={() => setExpandedWorkshop(expandedWorkshop === item.id ? null : item.id)}
                    onSave={saveWorkshopNotes}
                    onUpload={uploadEvidence}
                  />
                ))}
              </div>
            ))}

            {workshop.length > 0 && (
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => workflowAction("run_evaluation")} disabled={!!actionLoading}>
                  {actionLoading === "run_evaluation" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Run Grounded Evaluation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage: Evaluation / Human Review */}
      {(data.workflowStage === "human_review" || data.workflowStage === "evaluation") && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Results</CardTitle>
            <CardDescription>
              Grounded analysis using pillar workshop notes applied to each scoped requirement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.requirementEvaluations.length === 0 && (
              <Button onClick={() => workflowAction("run_evaluation")} disabled={!!actionLoading}>
                Run Evaluation
              </Button>
            )}
            {["aligned", "partial", "gap", "not_assessed"].map((status) => {
              const items = data.requirementEvaluations.filter((e) => e.complianceStatus === status);
              if (items.length === 0) return null;
              return (
                <div key={status}>
                  <h4 className="mb-2 text-sm font-semibold capitalize">{status.replace(/_/g, " ")} ({items.length})</h4>
                  {items.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="mb-2 rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{ev.requirement.framework.code} {ev.citedClauseId}</Badge>
                        <span className="text-slate-500">{ev.useCase.name}</span>
                      </div>
                      <p className="mt-1 text-slate-600">{ev.gapFindings.slice(0, 200)}...</p>
                    </div>
                  ))}
                  {items.length > 5 && <p className="text-xs text-slate-400">+{items.length - 5} more</p>}
                </div>
              );
            })}
            {data.requirementEvaluations.length > 0 && evaluationCheckpoint?.status === "approved" && (
              <Button className="mt-4" onClick={() => workflowAction("generate_deliverables")} disabled={!!actionLoading}>
                {actionLoading === "generate_deliverables" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Deliverables
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage: Deliverables */}
      {(data.workflowStage === "deliverables" || data.workflowStage === "finalized") && (
        <Card>
          <CardHeader>
            <CardTitle>Deliverables</CardTitle>
            <CardDescription>Formal reports for client delivery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.deliverables.length > 0
              ? data.deliverables
              : Object.keys(DELIVERABLE_LABELS).map((type) => ({ type, status: "draft", title: DELIVERABLE_LABELS[type], id: type }))
            ).map((d) => (
              <div key={d.type ?? d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <div className="font-medium">{DELIVERABLE_LABELS[d.type] ?? d.title}</div>
                  <Badge variant={d.status === "approved" ? "success" : "secondary"} className="mt-1">
                    {titleCase(d.status ?? "draft")}
                  </Badge>
                </div>
                <a href={`/api/assessments/${assessmentId}/deliverables?type=${d.type}`} download>
                  <Button variant="outline" size="sm"><Download className="mr-1 h-3 w-3" /> Download</Button>
                </a>
              </div>
            ))}
            {data.workflowStage === "deliverables" && deliverableCheckpoint?.status === "approved" && (
              <Button className="mt-4" onClick={() => workflowAction("finalize")} disabled={!!actionLoading}>
                Finalize Assessment
              </Button>
            )}
            {data.workflowStage === "finalized" && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                Assessment finalized and ready for client delivery.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checkpoint progress (collapsed summary) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkpoint Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.checkpoints.map((cp) => (
              <Badge
                key={cp.id}
                variant={
                  cp.status === "approved" ? "success"
                  : cp.status === "pending" ? "warning"
                  : "secondary"
                }
                className="gap-1"
              >
                {cp.status === "locked" && <Lock className="h-3 w-3" />}
                {cp.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                {cp.status === "pending" && <AlertTriangle className="h-3 w-3" />}
                {cp.checkpointType.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PillarWorkshopCard({
  item,
  expanded,
  onToggle,
  onSave,
  onUpload,
}: {
  item: WorkshopPillar;
  expanded: boolean;
  onToggle: () => void;
  onSave: (item: WorkshopPillar, client: string, facilitator: string) => Promise<void>;
  onUpload: (id: string, file: File) => Promise<void>;
}) {
  const [clientNotes, setClientNotes] = useState(item.clientNotes ?? "");
  const [facilitatorNotes, setFacilitatorNotes] = useState(item.facilitatorNotes ?? "");
  const [saving, setSaving] = useState(false);

  const fwSummary = item.frameworkSummary
    ? Object.entries(item.frameworkSummary).map(([fw, n]) => `${fw} (${n})`).join(", ")
    : "";

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
        <div>
          <Badge variant="outline">{item.pillarLabel}</Badge>
          <span className="ml-2 text-sm font-medium">{item.requirementIds.length} requirements</span>
          {fwSummary && <span className="ml-2 text-xs text-slate-400">{fwSummary}</span>}
        </div>
        <div className="flex items-center gap-2">
          {item.evidenceFiles.length > 0 && <Badge variant="success">{item.evidenceFiles.length} files</Badge>}
          {(item.clientNotes || item.facilitatorNotes) && <Badge variant="outline">notes saved</Badge>}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
          <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-white rounded-lg p-3 border max-h-64 overflow-y-auto">{item.questionPrompt}</pre>
          {item.linkedControls.length > 0 && (
            <p className="text-xs text-slate-500">Controls: {item.linkedControls.join(", ")}</p>
          )}
          <div>
            <label className="text-xs font-medium">Client Notes</label>
            <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Record client responses for this risk pillar..." />
          </div>
          <div>
            <label className="text-xs font-medium">Facilitator Notes</label>
            <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={facilitatorNotes} onChange={(e) => setFacilitatorNotes(e.target.value)} placeholder="Internal observations, follow-up items..." />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(item.id, e.target.files[0])} />
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                <Upload className="h-3 w-3" /> Upload Evidence
              </span>
            </label>
            {item.evidenceFiles.map((f) => (
              <Badge key={f.id} variant="secondary">{f.fileName}</Badge>
            ))}
            <Button size="sm" disabled={saving} onClick={async () => { setSaving(true); await onSave(item, clientNotes, facilitatorNotes); setSaving(false); }}>
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
