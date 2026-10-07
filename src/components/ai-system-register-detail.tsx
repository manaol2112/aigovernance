"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  FileStack,
  FileUp,
  History,
  LayoutDashboard,
  Pencil,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
import { AiSystemRegisterRiskPanel } from "@/components/ai-system-register-risk-panel";
import { titleCase, cn } from "@/lib/utils";
import { USE_CASE_TYPES } from "@/lib/use-case-types";
import {
  AI_REGISTER_COMPLIANCE_OPTIONS,
  AI_REGISTER_DECISION_IMPACT_OPTIONS,
  AI_SYSTEM_LIFECYCLE_OPTIONS,
} from "@/lib/ai-system-register";
import { REGISTER_ASSESSMENT_TYPES } from "@/lib/ai-system-register-assessment-triggers";
import { registerFetch } from "@/lib/ai-system-register-actor-client";
import {
  isReviewDueSoon,
  isReviewOverdue,
  requiresRiskAcceptance,
  requiresSecondReviewer,
} from "@/lib/ai-system-register-governance";

type EvidenceRow = {
  id: string;
  title: string;
  evidenceType: string;
  linkedAssessmentType: string | null;
  fileName: string | null;
  externalUrl: string | null;
  notes: string | null;
  uploadedAt: string;
};

type HistoryRow = {
  id: string;
  action: string;
  summary: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
};

type SystemDetail = {
  id: string;
  code: string;
  name: string;
  description: string;
  intendedPurpose: string | null;
  useCaseType: string;
  status: string;
  department: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  riskOwner: string | null;
  humanOversightOwner: string | null;
  actorRole: string | null;
  riskTier: string | null;
  riskSource: string;
  manualRiskRationale: string | null;
  riskAssessmentStatus: string;
  inherentRiskTier: string | null;
  residualRiskTier: string | null;
  inherentRiskScore: number | null;
  residualRiskScore: number | null;
  riskSummary: string | null;
  keyControlCodes: string[];
  keyControls?: Array<{
    controlCode: string;
    controlTitle: string;
    ownerRole: string;
    description: string | null;
  }>;
  vendor: string | null;
  modelProvider: string | null;
  modelNameVersion: string | null;
  hostingLocation: string | null;
  regions: string[];
  dataCategories: string[];
  personalDataInvolved: boolean;
  specialCategoryData: boolean;
  decisionImpact: string;
  autonomyLevel: string;
  humanInTheLoop: boolean;
  aiCapabilities?: string[];
  customerFacing?: boolean;
  employeeFacing?: boolean;
  externalFacing?: boolean;
  criticalBusinessProcess?: boolean;
  businessCriticality?: string;
  failureImpact?: string | null;
  regulatoryJurisdictions?: string[];
  prohibitedUseNotes?: string | null;
  developerProvider?: string | null;
  euAnnexIiiRelevance: string | null;
  friaStatus: string;
  dpiaStatus: string;
  nextAction: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  riskAcceptanceStatus: string;
  riskAcceptedBy: string | null;
  riskAcceptedByEmail: string | null;
  riskAcceptedAt: string | null;
  riskAcceptanceNote: string | null;
  riskSecondReviewer: string | null;
  riskSecondReviewerEmail: string | null;
  riskSecondReviewedAt: string | null;
  organization: { id: string; name: string };
  evidence: EvidenceRow[];
};

type TabId = "overview" | "risk" | "evidence" | "history";

const TABS: Array<{ id: TabId; label: string; hint: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", hint: "Profile & ownership", icon: LayoutDashboard },
  { id: "risk", label: "Risk assessment", hint: "Guided review", icon: ShieldAlert },
  { id: "evidence", label: "Evidence", hint: "Files & links", icon: FileStack },
  { id: "history", label: "History", hint: "Audit trail", icon: History },
];

const AUTONOMY = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function FieldCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900">{value}</p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function displayValue(value: string | null | undefined) {
  if (!value) return "—";
  return titleCase(String(value).replace(/_/g, " "));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AiSystemRegisterDetail({ systemId }: { systemId: string }) {
  const [system, setSystem] = useState<SystemDetail | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | boolean>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState("other");
  const [evidenceLinkedAssessment, setEvidenceLinkedAssessment] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const [secondName, setSecondName] = useState("");
  const [secondEmail, setSecondEmail] = useState("");
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${systemId}`);
      if (!res.ok) throw new Error("System not found");
      const data = (await res.json()) as SystemDetail;
      setSystem(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load system.", {
        variant: "error",
      });
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, [systemId]);

  const loadHistory = useCallback(async () => {
    const res = await registerFetch(`/api/ai-system-register/${systemId}/history`);
    if (!res.ok) return;
    setHistory((await res.json()) as HistoryRow[]);
  }, [systemId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "history") void loadHistory();
  }, [tab, loadHistory]);

  function startEdit() {
    if (!system) return;
    setEditForm({
      name: system.name,
      description: system.description,
      intendedPurpose: system.intendedPurpose ?? "",
      status: system.status,
      department: system.department ?? "",
      businessOwner: system.businessOwner ?? "",
      technicalOwner: system.technicalOwner ?? "",
      riskOwner: system.riskOwner ?? "",
      humanOversightOwner: system.humanOversightOwner ?? "",
      decisionImpact: system.decisionImpact,
      autonomyLevel: system.autonomyLevel,
      humanInTheLoop: system.humanInTheLoop,
      personalDataInvolved: system.personalDataInvolved,
      specialCategoryData: system.specialCategoryData,
      euAnnexIiiRelevance: system.euAnnexIiiRelevance ?? "",
      friaStatus: system.friaStatus,
      dpiaStatus: system.dpiaStatus,
      vendor: system.vendor ?? "",
      modelProvider: system.modelProvider ?? "",
      modelNameVersion: system.modelNameVersion ?? "",
      hostingLocation: system.hostingLocation ?? "",
      nextAction: system.nextAction ?? "",
    });
    setEditing(true);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!system) return;
    setSaving(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSystem(data);
      setEditing(false);
      if (data._meta?.staleAssessment) {
        toast("Saved. Material changes marked the risk assessment stale — re-run it.", {
          variant: "success",
        });
        setTab("risk");
      } else {
        toast("System updated.", { variant: "success" });
      }
      await loadHistory();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Save failed.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function markReviewed() {
    if (!system) return;
    const res = await registerFetch(`/api/ai-system-register/${system.id}`, {
      method: "PATCH",
      body: JSON.stringify({ markReviewed: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Could not mark reviewed.", { variant: "error" });
      return;
    }
    setSystem(data);
    toast("Review marked complete. Next review date refreshed.", { variant: "success" });
  }

  async function acceptRisk(event: React.FormEvent) {
    event.preventDefault();
    if (!system) return;
    setAccepting(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}/risk-acceptance`, {
        method: "POST",
        body: JSON.stringify({
          action: "accept",
          note: acceptanceNote,
          secondReviewerName: secondName,
          secondReviewerEmail: secondEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Acceptance failed");
      setSystem(data);
      setAcceptanceNote("");
      setSecondName("");
      setSecondEmail("");
      toast(
        data.riskAcceptanceStatus === "pending_second_review"
          ? "Acceptance recorded — awaiting independent second-reviewer approval."
          : "Residual risk accepted and tagged to this use case.",
        { variant: "success" }
      );
      await loadHistory();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Acceptance failed.", {
        variant: "error",
      });
    } finally {
      setAccepting(false);
    }
  }

  async function approveSecondReview() {
    if (!system) return;
    setAccepting(true);
    try {
      const res = await registerFetch(`/api/ai-system-register/${system.id}/risk-acceptance`, {
        method: "POST",
        body: JSON.stringify({ action: "second_approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Second approval failed");
      setSystem(data);
      toast("Second reviewer approval recorded. Residual risk is fully accepted.", {
        variant: "success",
      });
      await loadHistory();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Second approval failed.", {
        variant: "error",
      });
    } finally {
      setAccepting(false);
    }
  }

  async function uploadEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!system) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("title", evidenceTitle);
      form.set("evidenceType", evidenceType);
      if (evidenceLinkedAssessment) {
        form.set("linkedAssessmentType", evidenceLinkedAssessment);
      }
      if (evidenceUrl) form.set("externalUrl", evidenceUrl);
      if (evidenceFile) form.set("file", evidenceFile);
      const res = await registerFetch(`/api/ai-system-register/${system.id}/evidence`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      toast("Evidence added.", { variant: "success" });
      setEvidenceTitle("");
      setEvidenceUrl("");
      setEvidenceFile(null);
      setEvidenceLinkedAssessment("");
      await load();
      await loadHistory();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed.", { variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-sm text-slate-500">Loading system…</div>
    );
  }
  if (!system) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <p className="font-semibold text-slate-900">System not found</p>
        <Button asChild className="mt-4 rounded-xl">
          <Link href="/ai-system-register">Back to register</Link>
        </Button>
      </div>
    );
  }

  const typeLabel =
    USE_CASE_TYPES.find((type) => type.value === system.useCaseType)?.label ??
    titleCase(system.useCaseType.replace(/_/g, " "));
  const riskLabel =
    system.riskSource === "not_assessed"
      ? "Not assessed"
      : titleCase((system.riskTier ?? "general").replace(/_/g, " "));
  const overdue = isReviewOverdue(system.nextReviewAt);
  const dueSoon = isReviewDueSoon(system.nextReviewAt);
  const needsAcceptance =
    requiresRiskAcceptance(system.riskTier as never) &&
    system.riskAcceptanceStatus !== "accepted" &&
    system.riskSource === "assessed";
  const pendingSecondReview = system.riskAcceptanceStatus === "pending_second_review";
  const stale = system.riskAssessmentStatus === "stale";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/ai-system-register">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {system.organization.name}
          </Link>
        </Button>
        <AdminPageHeader
          variant="hero"
          eyebrow={`${system.code} · ${system.organization.name}`}
          title={system.name}
          description={system.description}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={startEdit}
              >
                <Pencil className="h-4 w-4" />
                Edit system
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/ai-system-register">Back to register</Link>
              </Button>
            </div>
          }
        >
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminPageHeaderStat icon={LayoutDashboard} label="Use case type" value={typeLabel} />
            <AdminPageHeaderStat
              icon={Shield}
              label="Lifecycle"
              value={titleCase(system.status.replace(/_/g, " "))}
            />
            <AdminPageHeaderStat icon={ShieldAlert} label="Risk tier" value={riskLabel} />
            <AdminPageHeaderStat
              icon={FileStack}
              label="Next review"
              value={
                overdue
                  ? "Overdue"
                  : dueSoon
                    ? `Due ${formatDate(system.nextReviewAt)}`
                    : formatDate(system.nextReviewAt)
              }
            />
          </div>
        </AdminPageHeader>
      </div>

      {(stale || overdue || needsAcceptance) && (
        <div className="space-y-3">
          {stale && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Risk assessment is <span className="font-semibold">stale</span> after material profile
              changes. Re-run the assessment before relying on the prior rating.
              <Button
                type="button"
                size="sm"
                className="ml-3 rounded-xl"
                onClick={() => setTab("risk")}
              >
                Go to risk assessment
              </Button>
            </div>
          )}
          {overdue && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
              Periodic review is <span className="font-semibold">overdue</span> (due{" "}
              {formatDate(system.nextReviewAt)}).
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-3 rounded-xl"
                onClick={() => void markReviewed()}
              >
                Mark reviewed
              </Button>
            </div>
          )}
          {needsAcceptance && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
              Residual risk acceptance is <span className="font-semibold">pending</span> for this
              use case.
              <Button
                type="button"
                size="sm"
                className="ml-3 rounded-xl"
                onClick={() => setTab("risk")}
              >
                Accept risk
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        <nav className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400")}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        active ? "text-slate-300" : "text-slate-400"
                      )}
                    >
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          {editing && (
            <SectionCard
              eyebrow="Change control"
              title="Edit system profile"
              description="Material changes (purpose, autonomy, data, Annex III, etc.) mark a completed assessment stale."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              }
            >
              <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", "Name"],
                    ["description", "Description"],
                    ["intendedPurpose", "Intended purpose"],
                    ["department", "Department"],
                    ["businessOwner", "Business owner"],
                    ["technicalOwner", "Technical owner"],
                    ["riskOwner", "Risk owner"],
                    ["humanOversightOwner", "Oversight owner"],
                    ["euAnnexIiiRelevance", "Annex III relevance"],
                    ["vendor", "Vendor"],
                    ["modelProvider", "Model provider"],
                    ["modelNameVersion", "Model version"],
                    ["hostingLocation", "Hosting"],
                    ["nextAction", "Next action"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm font-semibold text-slate-700">
                    {label}
                    {key === "description" || key === "intendedPurpose" ? (
                      <textarea
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                        rows={3}
                        value={String(editForm[key] ?? "")}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    ) : (
                      <input
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                        value={String(editForm[key] ?? "")}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    )}
                  </label>
                ))}
                <label className="text-sm font-semibold text-slate-700">
                  Lifecycle status
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    value={String(editForm.status ?? "")}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {AI_SYSTEM_LIFECYCLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Decision impact
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    value={String(editForm.decisionImpact ?? "")}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        decisionImpact: event.target.value,
                      }))
                    }
                  >
                    {AI_REGISTER_DECISION_IMPACT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Autonomy
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    value={String(editForm.autonomyLevel ?? "")}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        autonomyLevel: event.target.value,
                      }))
                    }
                  >
                    {AUTONOMY.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  FRIA
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    value={String(editForm.friaStatus ?? "")}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, friaStatus: event.target.value }))
                    }
                  >
                    {AI_REGISTER_COMPLIANCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  DPIA
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    value={String(editForm.dpiaStatus ?? "")}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, dpiaStatus: event.target.value }))
                    }
                  >
                    {AI_REGISTER_COMPLIANCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.humanInTheLoop)}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        humanInTheLoop: event.target.checked,
                      }))
                    }
                  />
                  Human in the loop
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.personalDataInvolved)}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        personalDataInvolved: event.target.checked,
                      }))
                    }
                  />
                  Personal data involved
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.specialCategoryData)}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        specialCategoryData: event.target.checked,
                      }))
                    }
                  />
                  Special category data
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving} className="rounded-xl">
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </SectionCard>
          )}

          {tab === "overview" && (
            <>
              <SectionCard
                eyebrow="Identity"
                title="What this system is"
                description="Purpose, lifecycle position, and the populations or decisions it affects."
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FieldCard label="Use case type" value={typeLabel} />
                  <FieldCard label="Lifecycle status" value={displayValue(system.status)} />
                  <FieldCard label="Department" value={system.department || "—"} />
                  <FieldCard label="Decision impact" value={displayValue(system.decisionImpact)} />
                  <FieldCard label="Autonomy" value={displayValue(system.autonomyLevel)} />
                  <FieldCard label="Actor role" value={displayValue(system.actorRole)} />
                  <div className="md:col-span-2 xl:col-span-3">
                    <FieldCard
                      label="Intended purpose"
                      value={system.intendedPurpose || "—"}
                    />
                  </div>
                </div>
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard eyebrow="Ownership" title="Accountable roles">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldCard label="Business owner" value={system.businessOwner || "—"} />
                    <FieldCard label="AI system owner" value={system.technicalOwner || "—"} />
                    <FieldCard label="Risk owner" value={system.riskOwner || "—"} />
                    <FieldCard
                      label="Oversight owner"
                      value={system.humanOversightOwner || "—"}
                    />
                  </div>
                </SectionCard>

                <SectionCard eyebrow="Review cadence" title="Governance calendar">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldCard label="Last reviewed" value={formatDate(system.lastReviewedAt)} />
                    <FieldCard
                      label="Next review"
                      value={
                        overdue
                          ? `Overdue · ${formatDate(system.nextReviewAt)}`
                          : formatDate(system.nextReviewAt)
                      }
                    />
                    <FieldCard
                      label="Acceptance"
                      value={displayValue(system.riskAcceptanceStatus)}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => void markReviewed()}
                      >
                        Mark reviewed now
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </div>

              <SectionCard eyebrow="Criticality & exposure" title="Impact & regulatory signals">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FieldCard
                    label="Business criticality"
                    value={displayValue(system.businessCriticality)}
                  />
                  <FieldCard
                    label="Facing"
                    value={[
                      system.customerFacing ? "Customer" : null,
                      system.employeeFacing ? "Employee" : null,
                      system.externalFacing ? "External" : null,
                      system.criticalBusinessProcess ? "Critical process" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  />
                  <FieldCard label="Annex III" value={system.euAnnexIiiRelevance || "—"} />
                  <FieldCard label="FRIA / DPIA" value={`${displayValue(system.friaStatus)} / ${displayValue(system.dpiaStatus)}`} />
                  <div className="md:col-span-2">
                    <FieldCard
                      label="AI capabilities"
                      value={
                        system.aiCapabilities?.length
                          ? system.aiCapabilities.map((c) => c.replace(/_/g, " ")).join(", ")
                          : "—"
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FieldCard
                      label="Regulatory jurisdictions"
                      value={
                        system.regulatoryJurisdictions?.length
                          ? system.regulatoryJurisdictions
                              .map((j) => j.replace(/_/g, " "))
                              .join(", ")
                          : "—"
                      }
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <FieldCard
                      label="Failure impact"
                      value={system.failureImpact || "—"}
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <FieldCard
                      label="Prohibited / restricted use"
                      value={system.prohibitedUseNotes || "—"}
                    />
                  </div>
                  <FieldCard label="Developer / provider" value={system.developerProvider || system.vendor || "—"} />
                  <FieldCard label="Next action" value={system.nextAction || "—"} />
                </div>
              </SectionCard>

              <SectionCard eyebrow="Key controls" title="Controls for this use case">
                {(system.keyControls ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center text-sm text-slate-500">
                    No key controls yet.
                  </div>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {(system.keyControls ?? []).map((control) => (
                      <li
                        key={control.controlCode}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3"
                      >
                        <p className="font-mono text-[11px] font-semibold text-emerald-800">
                          {control.controlCode}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {control.controlTitle}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </>
          )}

          {tab === "risk" && (
            <>
              <AiSystemRegisterRiskPanel
                system={system}
                onSystemUpdated={() => {
                  void load({ quiet: true });
                  void loadHistory();
                }}
              />

              {(needsAcceptance || system.riskAcceptanceStatus === "accepted") && (
                <SectionCard
                  eyebrow="Risk acceptance"
                  title="Tag residual risk to this use case"
                  description="Elevated tiers require an independent second-reviewer approval. Acceptance also refreshes the review cadence."
                >
                  {system.riskAcceptanceStatus === "accepted" ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-4 text-sm text-emerald-950">
                      <p className="inline-flex items-center gap-2 font-semibold">
                        <ShieldCheck className="h-4 w-4" />
                        Accepted {formatDate(system.riskAcceptedAt)} by {system.riskAcceptedBy}
                      </p>
                      {system.riskAcceptanceNote ? (
                        <p className="mt-2 text-emerald-900/80">{system.riskAcceptanceNote}</p>
                      ) : null}
                      {system.riskSecondReviewer ? (
                        <p className="mt-2 text-xs text-emerald-800">
                          Second review: {system.riskSecondReviewer} (
                          {system.riskSecondReviewerEmail}) at{" "}
                          {formatDate(system.riskSecondReviewedAt)}
                        </p>
                      ) : null}
                    </div>
                  ) : pendingSecondReview ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-950">
                        <p className="font-semibold">Awaiting second-reviewer approval</p>
                        <p className="mt-1 text-amber-900/80">
                          Accepted by {system.riskAcceptedBy} ({system.riskAcceptedByEmail}).
                          Designated reviewer: {system.riskSecondReviewer} (
                          {system.riskSecondReviewerEmail}).
                        </p>
                        {system.riskAcceptanceNote ? (
                          <p className="mt-2 text-amber-900/80">{system.riskAcceptanceNote}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        disabled={accepting || stale}
                        className="rounded-xl"
                        onClick={() => void approveSecondReview()}
                      >
                        {accepting ? "Recording…" : "Approve as second reviewer"}
                      </Button>
                      <p className="text-xs text-slate-500">
                        Sign in / act as the designated second reviewer email to complete dual
                        control.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={acceptRisk} className="space-y-3">
                      <textarea
                        required
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        placeholder="Acceptance rationale / appetite statement…"
                        value={acceptanceNote}
                        onChange={(event) => setAcceptanceNote(event.target.value)}
                      />
                      {requiresSecondReviewer(system.riskTier as never) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            required
                            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                            placeholder="Second reviewer name"
                            value={secondName}
                            onChange={(event) => setSecondName(event.target.value)}
                          />
                          <input
                            required
                            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                            placeholder="Second reviewer email"
                            value={secondEmail}
                            onChange={(event) => setSecondEmail(event.target.value)}
                          />
                        </div>
                      )}
                      <Button type="submit" disabled={accepting || stale} className="rounded-xl">
                        {accepting
                          ? "Recording…"
                          : requiresSecondReviewer(system.riskTier as never)
                            ? "Submit for second review"
                            : "Accept residual risk"}
                      </Button>
                    </form>
                  )}
                </SectionCard>
              )}
            </>
          )}

          {tab === "evidence" && (
            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard eyebrow="Evidence locker" title="Add supporting material">
                <form onSubmit={uploadEvidence} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Title</label>
                    <input
                      required
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Type</label>
                      <select
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                      >
                        {[
                          "policy",
                          "model_card",
                          "dpia",
                          "fria",
                          "test_report",
                          "vendor_due_diligence",
                          "approval",
                          "monitoring_log",
                          "incident",
                          "other",
                        ].map((type) => (
                          <option key={type} value={type}>
                            {titleCase(type.replace(/_/g, " "))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Linked assessment
                      </label>
                      <select
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        value={evidenceLinkedAssessment}
                        onChange={(e) => setEvidenceLinkedAssessment(e.target.value)}
                      >
                        <option value="">None / general</option>
                        {REGISTER_ASSESSMENT_TYPES.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.shortTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">External URL</label>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">File</label>
                    <input
                      type="file"
                      className="mt-1.5 block w-full text-sm"
                      onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <Button type="submit" disabled={uploading} className="rounded-xl">
                    <FileUp className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Add evidence"}
                  </Button>
                </form>
              </SectionCard>

              <SectionCard
                eyebrow="On file"
                title={`${system.evidence.length} evidence item${system.evidence.length === 1 ? "" : "s"}`}
              >
                {system.evidence.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-14 text-center text-sm text-slate-500">
                    No evidence yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {system.evidence.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4"
                      >
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {titleCase(item.evidenceType.replace(/_/g, " "))}
                          {item.linkedAssessmentType
                            ? ` · ${
                                REGISTER_ASSESSMENT_TYPES.find(
                                  (t) => t.id === item.linkedAssessmentType
                                )?.shortTitle ??
                                titleCase(item.linkedAssessmentType.replace(/_/g, " "))
                              }`
                            : ""}
                          {item.fileName ? ` · ${item.fileName}` : ""}
                          {item.externalUrl ? ` · ${item.externalUrl}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          )}

          {tab === "history" && (
            <SectionCard
              eyebrow="Audit trail"
              title="History"
              description="Material field changes, assessment events, risk acceptance, evidence, and key controls."
            >
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-14 text-center text-sm text-slate-500">
                  No history yet. Edits and governance actions will appear here.
                </div>
              ) : (
                <ul className="space-y-3">
                  {history.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{row.summary}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(row.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {titleCase(row.action.replace(/_/g, " "))}
                        {row.actorName ? ` · ${row.actorName}` : ""}
                        {row.actorEmail ? ` (${row.actorEmail})` : ""}
                      </p>
                      {row.field ? (
                        <p className="mt-2 text-xs text-slate-600">
                          <span className="font-semibold">{row.field}</span>:{" "}
                          <span className="line-through text-slate-400">
                            {row.oldValue || "—"}
                          </span>{" "}
                          → {row.newValue || "—"}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
