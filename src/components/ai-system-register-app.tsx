"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileStack,
  LayoutGrid,
  List,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
import { AiSystemRegisterActorPanel } from "@/components/ai-system-register-actor-panel";
import { AiSystemRegisterRatingMatrix } from "@/components/ai-system-register-rating-matrix";
import { cn, titleCase } from "@/lib/utils";
import { USE_CASE_TYPES } from "@/lib/use-case-types";
import { AI_SYSTEM_LIFECYCLE_OPTIONS } from "@/lib/ai-system-register";
import { registerFetch } from "@/lib/ai-system-register-actor-client";
import { isReviewOverdue } from "@/lib/ai-system-register-governance";

type RegisterViewMode = "list" | "tiles" | "matrix";
const VIEW_STORAGE_KEY = "ai-system-register-view-mode";

type OrganizationRow = {
  id: string;
  name: string;
  industry: string | null;
  notes: string | null;
  _count: { systems: number };
};

type SystemRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  useCaseType: string;
  status: string;
  businessOwner: string | null;
  riskTier: string | null;
  residualRiskTier?: string | null;
  riskSource: string;
  riskAssessmentStatus: string;
  riskAcceptanceStatus?: string;
  nextReviewAt?: string | null;
  assessmentSuite?: unknown;
  _count: { evidence: number; riskAssessments: number };
};

const ORG_STORAGE_KEY = "ai-system-register-org-id";

const RISK_BADGE: Record<string, string> = {
  prohibited: "border-red-200 bg-red-50 text-red-800",
  high: "border-orange-200 bg-orange-50 text-orange-900",
  gpai: "border-violet-200 bg-violet-50 text-violet-900",
  limited: "border-amber-200 bg-amber-50 text-amber-900",
  minimal: "border-emerald-200 bg-emerald-50 text-emerald-900",
  general: "border-slate-200 bg-slate-50 text-slate-700",
};

const INPUT =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100";

export function AiSystemRegisterApp() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<RegisterViewMode>("list");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", industry: "", notes: "" });
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "list" || stored === "tiles" || stored === "matrix") {
        setViewMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function updateViewMode(mode: RegisterViewMode) {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  const loadOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const res = await registerFetch("/api/organizations");
      const text = await res.text();
      let data: OrganizationRow[] | { error?: string } = [];
      if (text) {
        try {
          data = JSON.parse(text) as OrganizationRow[] | { error?: string };
        } catch {
          throw new Error(
            `Server returned a non-JSON response (${res.status}). Restart the dev server and try again.`
          );
        }
      }
      if (!res.ok) {
        throw new Error(
          (!Array.isArray(data) && data.error) ||
            `Failed to load organizations (${res.status}).`
        );
      }
      if (!Array.isArray(data)) throw new Error("Unexpected organizations response.");
      setOrganizations(data);
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(ORG_STORAGE_KEY) : null;
      const preferred =
        (stored && data.find((org) => org.id === stored)?.id) || data[0]?.id || "";
      setOrgId(preferred);
      if (!data.length) setShowCreateOrg(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load organizations.", {
        variant: "error",
      });
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  const loadSystems = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setSystems([]);
      return;
    }
    setLoadingSystems(true);
    try {
      const res = await registerFetch(
        `/api/ai-system-register?organizationId=${encodeURIComponent(organizationId)}`
      );
      if (!res.ok) throw new Error("Failed to load AI systems");
      setSystems((await res.json()) as SystemRow[]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load systems.", {
        variant: "error",
      });
    } finally {
      setLoadingSystems(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!orgId) return;
    window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
    void loadSystems(orgId);
  }, [orgId, loadSystems]);

  const selectedOrg = useMemo(
    () => organizations.find((org) => org.id === orgId) ?? null,
    [organizations, orgId]
  );

  const filteredSystems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return systems;
    return systems.filter((system) =>
      [system.code, system.name, system.businessOwner, system.useCaseType, system.riskTier]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [query, systems]);

  const stats = useMemo(() => {
    const assessed = systems.filter((s) => s.riskSource !== "not_assessed").length;
    const elevated = systems.filter((s) =>
      ["prohibited", "high", "gpai"].includes(s.riskTier ?? "")
    ).length;
    const evidence = systems.reduce((sum, s) => sum + s._count.evidence, 0);
    const overdue = systems.filter((s) => isReviewOverdue(s.nextReviewAt)).length;
    const stale = systems.filter((s) => s.riskAssessmentStatus === "stale").length;
    return { total: systems.length, assessed, elevated, evidence, overdue, stale };
  }, [systems]);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    setCreatingOrg(true);
    try {
      const res = await registerFetch("/api/organizations", {
        method: "POST",
        body: JSON.stringify(orgForm),
      });
      const text = await res.text();
      let data: Partial<OrganizationRow> & { error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as Partial<OrganizationRow> & { error?: string };
        } catch {
          throw new Error(
            `Server returned a non-JSON response (${res.status}). Restart the dev server and try again.`
          );
        }
      }
      if (!res.ok) {
        throw new Error(data.error || `Failed to create organization (${res.status}).`);
      }
      if (!data.id) throw new Error("Organization was created but no id was returned.");
      toast("Organization created.", { variant: "success" });
      setOrgForm({ name: "", industry: "", notes: "" });
      setShowCreateOrg(false);
      await loadOrganizations();
      setOrgId(data.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to create organization.", {
        variant: "error",
      });
    } finally {
      setCreatingOrg(false);
    }
  }

  const createOrgForm = (
    <form onSubmit={createOrganization} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="text-sm font-semibold text-slate-700">
          Organization name <span className="text-red-500">*</span>
        </label>
        <input
          required
          className={INPUT}
          value={orgForm.name}
          onChange={(event) => setOrgForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Organization name"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700">Industry</label>
        <input
          className={INPUT}
          value={orgForm.industry}
          onChange={(event) =>
            setOrgForm((current) => ({ ...current, industry: event.target.value }))
          }
          placeholder="Optional"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700">Notes</label>
        <input
          className={INPUT}
          value={orgForm.notes}
          onChange={(event) => setOrgForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={creatingOrg} className="rounded-xl">
          {creatingOrg ? "Creating…" : "Create organization"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );

  return (
    <div
      className={cn(
        "mx-auto space-y-8",
        viewMode === "matrix" ? "max-w-[96rem]" : "max-w-7xl"
      )}
    >
      <AdminPageHeader
        variant="hero"
        eyebrow="Enterprise AI inventory"
        title="AI System Register"
        description="Multi-organization inventory for AI systems and use cases — ownership, risk posture, and evidence. Independent of Full Assessment engagements."
        actions={
          selectedOrg ? (
            <>
              <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
                <Link href={`/ai-system-register/new?organizationId=${selectedOrg.id}`}>
                  Add AI system
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setShowCreateOrg((value) => !value)}
              >
                <Building2 className="h-4 w-4" />
                {showCreateOrg ? "Cancel" : "New organization"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => setShowCreateOrg(true)}
              disabled={loadingOrgs}
            >
              Create organization
              <ArrowRight className="h-4 w-4" />
            </Button>
          )
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminPageHeaderStat
            icon={ClipboardList}
            label="Systems in register"
            value={loadingOrgs || loadingSystems ? "—" : stats.total}
          />
          <AdminPageHeaderStat
            icon={Shield}
            label="Risk assessed"
            value={loadingOrgs || loadingSystems ? "—" : stats.assessed}
          />
          <AdminPageHeaderStat
            icon={ShieldAlert}
            label="Elevated risk"
            value={loadingOrgs || loadingSystems ? "—" : stats.elevated}
          />
          <AdminPageHeaderStat
            icon={FileStack}
            label="Overdue / stale"
            value={
              loadingOrgs || loadingSystems
                ? "—"
                : `${stats.overdue} / ${stats.stale}`
            }
          />
        </div>
      </AdminPageHeader>

      <AiSystemRegisterActorPanel organizationId={selectedOrg?.id ?? null} />

      {loadingOrgs ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
          Loading organizations…
        </div>
      ) : !selectedOrg ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 px-8 py-16 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-lg shadow-slate-300/60">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
            Start with an organization
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
            Each company gets a dedicated AI systems inventory. Create an organization to house
            ownership, risk, and evidence for its use cases.
          </p>
          <div className="mt-8 w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-6 text-left shadow-sm">
            {createOrgForm}
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active organization
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {selectedOrg.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  {selectedOrg.industry
                    ? `${selectedOrg.industry} · `
                    : ""}
                  Inventory, ownership, and risk for this organization’s AI systems.
                  {selectedOrg.notes ? ` ${selectedOrg.notes}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="register-org">
                  Switch organization
                </label>
                <select
                  id="register-org"
                  className="h-10 min-w-[14rem] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 shadow-sm"
                  value={orgId}
                  onChange={(event) => {
                    setOrgId(event.target.value);
                    setShowCreateOrg(false);
                    setQuery("");
                  }}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <Button asChild className="rounded-xl">
                  <Link href={`/ai-system-register/new?organizationId=${selectedOrg.id}`}>
                    <Plus className="h-4 w-4" />
                    Add AI system
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Systems",
                  value: loadingSystems ? "—" : String(stats.total),
                  hint: "In this register",
                },
                {
                  label: "Assessed",
                  value: loadingSystems ? "—" : String(stats.assessed),
                  hint: "Manual or guided risk",
                },
                {
                  label: "Elevated",
                  value: loadingSystems ? "—" : String(stats.elevated),
                  hint: "High / GPAI / prohibited",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{item.hint}</p>
                </div>
              ))}
            </div>

            {showCreateOrg && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
                <p className="text-sm font-semibold text-slate-900">Create another organization</p>
                <p className="mt-1 text-sm text-slate-500">
                  Opens a separate inventory. Switch anytime from the dropdown above.
                </p>
                <div className="mt-4">{createOrgForm}</div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">AI systems</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {loadingSystems
                    ? "Loading inventory…"
                    : `${filteredSystems.length} of ${systems.length} system${
                        systems.length === 1 ? "" : "s"
                      } for ${selectedOrg.name}`}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div
                  className="inline-flex h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                  role="group"
                  aria-label="View mode"
                >
                  <button
                    type="button"
                    onClick={() => updateViewMode("list")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
                      viewMode === "list"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                    aria-pressed={viewMode === "list"}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => updateViewMode("tiles")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
                      viewMode === "tiles"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                    aria-pressed={viewMode === "tiles"}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Tiles
                  </button>
                  <button
                    type="button"
                    onClick={() => updateViewMode("matrix")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
                      viewMode === "matrix"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                    aria-pressed={viewMode === "matrix"}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Matrix
                  </button>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm shadow-sm"
                    placeholder="Search systems…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredSystems.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
                  No AI systems yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Add the first system for {selectedOrg.name}. Risk can stay not assessed, or set a
                  manual tier with rationale.
                </p>
                <Button asChild size="lg" className="mt-8 gap-2 rounded-full px-6">
                  <Link href={`/ai-system-register/new?organizationId=${selectedOrg.id}`}>
                    Add AI system
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : viewMode === "matrix" ? (
              <AiSystemRegisterRatingMatrix systems={filteredSystems} />
            ) : viewMode === "list" ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="hidden border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto] md:gap-4">
                  <span>System</span>
                  <span>Type / owner</span>
                  <span>Status</span>
                  <span>Risk</span>
                  <span className="text-right">Evidence</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {filteredSystems.map((system) => {
                    const typeLabel =
                      USE_CASE_TYPES.find((type) => type.value === system.useCaseType)?.label ??
                      titleCase(system.useCaseType.replace(/_/g, " "));
                    const statusLabel =
                      AI_SYSTEM_LIFECYCLE_OPTIONS.find((option) => option.value === system.status)
                        ?.label ?? system.status;
                    const riskKey = system.riskTier ?? "general";
                    const riskLabel =
                      system.riskSource === "not_assessed"
                        ? "Risk not assessed"
                        : titleCase((system.riskTier ?? "general").replace(/_/g, " "));
                    const overdue = isReviewOverdue(system.nextReviewAt);
                    const stale = system.riskAssessmentStatus === "stale";

                    return (
                      <li key={system.id}>
                        <Link
                          href={`/ai-system-register/${system.id}`}
                          className="group grid gap-3 px-5 py-4 transition hover:bg-slate-50/80 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto] md:items-center md:gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                                {system.code}
                              </span>
                              <span className="text-sm font-semibold text-slate-950 group-hover:text-indigo-700">
                                {system.name}
                              </span>
                              {overdue ? (
                                <Badge
                                  variant="outline"
                                  className="border-orange-200 bg-orange-50 text-[10px] text-orange-900"
                                >
                                  Review overdue
                                </Badge>
                              ) : null}
                              {stale ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-900"
                                >
                                  Assessment stale
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs text-slate-500 md:line-clamp-1">
                              {system.description}
                            </p>
                          </div>
                          <div className="min-w-0 text-sm text-slate-600">
                            <p className="truncate">{typeLabel}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {system.businessOwner || "No owner"}
                            </p>
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                            >
                              {statusLabel}
                            </Badge>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {titleCase(system.riskAssessmentStatus.replace(/_/g, " "))}
                            </p>
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                RISK_BADGE[riskKey] ?? RISK_BADGE.general
                              )}
                            >
                              {riskLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-3 md:justify-end">
                            <span className="text-xs tabular-nums text-slate-500">
                              {system._count.evidence} evidence
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {filteredSystems.map((system) => {
                  const typeLabel =
                    USE_CASE_TYPES.find((type) => type.value === system.useCaseType)?.label ??
                    titleCase(system.useCaseType.replace(/_/g, " "));
                  const statusLabel =
                    AI_SYSTEM_LIFECYCLE_OPTIONS.find((option) => option.value === system.status)
                      ?.label ?? system.status;
                  const riskKey = system.riskTier ?? "general";
                  const riskLabel =
                    system.riskSource === "not_assessed"
                      ? "Risk not assessed"
                      : titleCase((system.riskTier ?? "general").replace(/_/g, " "));

                  return (
                    <Link
                      key={system.id}
                      href={`/ai-system-register/${system.id}`}
                      className={cn(
                        "group relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 pl-7 shadow-sm transition-all duration-300",
                        "hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]"
                      )}
                    >
                      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-slate-900" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          {system.code}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                        >
                          {statusLabel}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", RISK_BADGE[riskKey] ?? RISK_BADGE.general)}
                        >
                          {riskLabel}
                        </Badge>
                      </div>
                      <p className="mt-4 text-lg font-semibold tracking-tight text-slate-950 group-hover:text-indigo-700">
                        {system.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {system.description}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <span>
                          {typeLabel}
                          {system.businessOwner ? ` · ${system.businessOwner}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            {titleCase(system.riskAssessmentStatus.replace(/_/g, " "))}
                          </span>
                          <span>{system._count.evidence} evidence</span>
                          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
