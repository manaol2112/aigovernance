"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Database,
  Gavel,
  Layers3,
  Scale,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AdminPageHeader } from "@/components/admin-page-header";
import { USE_CASE_TYPES, DATA_CATEGORY_OPTIONS } from "@/lib/use-case-types";
import {
  ACTOR_ROLE_OPTIONS,
  AUTONOMY_LEVEL_OPTIONS,
  DEPLOYMENT_REGION_OPTIONS,
  DEPLOYMENT_STAGE_OPTIONS,
  RISK_TIER_OPTIONS,
} from "@/lib/use-case-intake";
import {
  AI_CAPABILITY_OPTIONS,
  AI_REGISTER_BUILD_TYPE_OPTIONS,
  AI_REGISTER_BUSINESS_CRITICALITY_OPTIONS,
  AI_REGISTER_COMPLIANCE_OPTIONS,
  AI_REGISTER_DECISION_IMPACT_OPTIONS,
  AI_REGISTER_MODEL_TYPE_OPTIONS,
  AI_SYSTEM_LIFECYCLE_OPTIONS,
  ARTICLE_50_TRIGGER_OPTIONS,
  REGULATORY_JURISDICTION_OPTIONS,
} from "@/lib/ai-system-register";
import { registerFetch } from "@/lib/ai-system-register-actor-client";
import type { RiskTier, UseCaseType } from "@prisma/client";
import { cn, titleCase } from "@/lib/utils";

const INPUT =
  "mt-2 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/8";

const STEPS = [
  {
    id: "purpose",
    label: "Purpose",
    title: "What is this AI for?",
    blurb: "Name the use case, purpose, and capabilities.",
    icon: Sparkles,
  },
  {
    id: "ownership",
    label: "Ownership",
    title: "Who owns and provides it?",
    blurb: "Accountability and supply chain.",
    icon: Building2,
  },
  {
    id: "people",
    label: "People",
    title: "Who is affected, and how?",
    blurb: "Users, facing, decisions, oversight.",
    icon: Users,
  },
  {
    id: "data",
    label: "Data",
    title: "What data does it process?",
    blurb: "Categories, sensitivity, and flows.",
    icon: Database,
  },
  {
    id: "impact",
    label: "Impact",
    title: "Criticality & regulatory exposure",
    blurb: "Failure impact, jurisdictions, restrictions.",
    icon: Scale,
  },
  {
    id: "risk",
    label: "Risk",
    title: "Optional risk snapshot",
    blurb: "Leave open or set a manual tier.",
    icon: ShieldAlert,
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-[13px] font-semibold tracking-tight text-slate-800">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {active ? <Check className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3.5 text-left transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className={cn("mt-1 text-xs leading-relaxed", active ? "text-slate-300" : "text-slate-500")}>
          {description}
        </p>
      ) : null}
    </button>
  );
}

export function AiSystemRegisterNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId") ?? "";
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    intendedPurpose: "",
    useCaseType: "client_facing_product" as UseCaseType,
    status: "discovery" as const,
    department: "",
    businessOwner: "",
    technicalOwner: "",
    riskOwner: "",
    humanOversightOwner: "",
    stewardTeam: "",
    actorRole: "deployer" as const,
    developerProvider: "",
    buildType: "mixed" as const,
    vendor: "",
    modelProvider: "",
    modelNameVersion: "",
    modelType: "llm" as const,
    aiCapabilities: [] as string[],
    intendedUsers: "",
    affectedPopulations: "",
    customerFacing: false,
    employeeFacing: false,
    externalFacing: false,
    decisionImpact: "unclear" as const,
    autonomyLevel: "medium" as const,
    humanInTheLoop: true,
    overrideEscalationPath: "",
    dataCategories: [] as string[],
    personalDataInvolved: false,
    specialCategoryData: false,
    dataSources: "",
    dataOutputs: "",
    retentionPolicy: "",
    crossBorderTransfers: false,
    lawfulBasis: "",
    criticalBusinessProcess: false,
    businessCriticality: "unclear" as const,
    failureImpact: "",
    regulatoryJurisdictions: [] as string[],
    regions: [] as string[],
    prohibitedUseNotes: "",
    euAnnexIiiRelevance: "",
    euArticle50Triggers: [] as string[],
    friaStatus: "not_required" as const,
    dpiaStatus: "not_required" as const,
    ropaLinked: false,
    sectorDomain: "",
    hostingLocation: "",
    subprocessors: "",
    trainsOnCustomerData: "unknown",
    contractDpaStatus: "",
    dependencies: "",
    deploymentStage: "idea" as const,
    shadowAi: false,
    nextAction: "",
    riskMode: "not_assessed" as "not_assessed" | "manual",
    riskTier: "limited" as RiskTier,
    manualRiskRationale: "",
  });

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (!organizationId) return;
    registerFetch(`/api/organizations/${organizationId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Organization not found");
        return res.json();
      })
      .then((org: { name: string }) => setOrgName(org.name))
      .catch(() => toast("Organization not found.", { variant: "error" }));
  }, [organizationId]);

  function toggleList(
    key:
      | "dataCategories"
      | "regions"
      | "euArticle50Triggers"
      | "aiCapabilities"
      | "regulatoryJurisdictions",
    value: string
  ) {
    setForm((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  }

  const stepComplete = useMemo(() => {
    return {
      purpose: Boolean(
        form.name.trim() &&
          form.intendedPurpose.trim() &&
          form.description.trim() &&
          form.aiCapabilities.length
      ),
      ownership: Boolean(form.businessOwner.trim() && form.technicalOwner.trim()),
      people: Boolean(form.intendedUsers.trim()),
      data: true,
      impact: true,
      risk:
        form.riskMode === "not_assessed" ||
        (Boolean(form.riskTier) && Boolean(form.manualRiskRationale.trim())),
    } satisfies Record<StepId, boolean>;
  }, [form]);

  function validateCurrentStep(): string | null {
    const id = STEPS[stepIndex].id;
    if (id === "purpose") {
      if (!form.name.trim()) return "System name is required.";
      if (!form.intendedPurpose.trim()) return "AI use case / purpose is required.";
      if (!form.description.trim()) return "Short description is required.";
      if (!form.aiCapabilities.length) return "Select at least one AI capability.";
    }
    if (id === "ownership") {
      if (!form.businessOwner.trim()) return "Business owner is required.";
      if (!form.technicalOwner.trim()) return "AI system owner is required.";
    }
    if (id === "people") {
      if (!form.intendedUsers.trim()) return "Intended users are required.";
    }
    if (id === "risk" && form.riskMode === "manual") {
      if (!form.manualRiskRationale.trim()) return "Manual risk rationale is required.";
    }
    return null;
  }

  function scrollMainToTop() {
    // Admin chrome scrolls `#main-content`, not `window`.
    const main = document.getElementById("main-content");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    const error = validateCurrentStep();
    if (error) {
      toast(error, { variant: "error" });
      return;
    }
    setStepIndex((value) => Math.min(STEPS.length - 1, value + 1));
    scrollMainToTop();
  }

  function goBack() {
    setStepIndex((value) => Math.max(0, value - 1));
    scrollMainToTop();
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!stepComplete.purpose) {
      toast("Complete purpose, description, and AI capabilities.", { variant: "error" });
      setStepIndex(0);
      return;
    }
    if (!stepComplete.ownership) {
      toast("Business owner and AI system owner are required.", { variant: "error" });
      setStepIndex(1);
      return;
    }
    if (!stepComplete.people) {
      toast("Intended users are required.", { variant: "error" });
      setStepIndex(2);
      return;
    }
    if (!stepComplete.risk) {
      toast("Add a rationale for the manual risk tier.", { variant: "error" });
      setStepIndex(5);
      return;
    }

    if (!organizationId) {
      toast("Select an organization first.", { variant: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await registerFetch("/api/ai-system-register", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          name: form.name,
          description: form.description,
          intendedPurpose: form.intendedPurpose,
          useCaseType: form.useCaseType,
          status: form.status,
          department: form.department,
          businessOwner: form.businessOwner,
          technicalOwner: form.technicalOwner,
          riskOwner: form.riskOwner,
          humanOversightOwner: form.humanOversightOwner,
          stewardTeam: form.stewardTeam,
          actorRole: form.actorRole,
          developerProvider: form.developerProvider || form.vendor,
          buildType: form.buildType,
          vendor: form.vendor || form.developerProvider,
          modelProvider: form.modelProvider,
          modelNameVersion: form.modelNameVersion,
          modelType: form.modelType,
          aiCapabilities: form.aiCapabilities,
          intendedUsers: form.intendedUsers
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          affectedPopulations: form.affectedPopulations,
          customerFacing: form.customerFacing,
          employeeFacing: form.employeeFacing,
          externalFacing: form.externalFacing,
          decisionImpact: form.decisionImpact,
          autonomyLevel: form.autonomyLevel,
          humanInTheLoop: form.humanInTheLoop,
          overrideEscalationPath: form.overrideEscalationPath,
          dataCategories: form.dataCategories,
          personalDataInvolved: form.personalDataInvolved,
          specialCategoryData: form.specialCategoryData,
          dataSources: form.dataSources,
          dataOutputs: form.dataOutputs,
          retentionPolicy: form.retentionPolicy,
          crossBorderTransfers: form.crossBorderTransfers,
          lawfulBasis: form.lawfulBasis,
          criticalBusinessProcess: form.criticalBusinessProcess,
          businessCriticality: form.businessCriticality,
          failureImpact: form.failureImpact,
          regulatoryJurisdictions: form.regulatoryJurisdictions,
          regions: form.regions,
          prohibitedUseNotes: form.prohibitedUseNotes,
          euAnnexIiiRelevance: form.euAnnexIiiRelevance,
          euArticle50Triggers: form.euArticle50Triggers,
          friaStatus: form.friaStatus,
          dpiaStatus: form.dpiaStatus,
          ropaLinked: form.ropaLinked,
          sectorDomain: form.sectorDomain,
          hostingLocation: form.hostingLocation,
          subprocessors: form.subprocessors,
          trainsOnCustomerData: form.trainsOnCustomerData,
          contractDpaStatus: form.contractDpaStatus,
          dependencies: form.dependencies,
          deploymentStage: form.deploymentStage,
          shadowAi: form.shadowAi,
          nextAction: form.nextAction,
          riskSource: form.riskMode,
          riskTier: form.riskMode === "manual" ? form.riskTier : null,
          manualRiskRationale: form.riskMode === "manual" ? form.manualRiskRationale : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create system");
      toast("AI system added to the register.", { variant: "success" });
      router.push(`/ai-system-register/${data.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to create system.", {
        variant: "error",
      });
      setLoading(false);
    }
  }

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">Organization required</p>
        <p className="mt-2 text-sm text-slate-500">
          Create or select an organization on the register before adding systems.
        </p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/ai-system-register">Back to register</Link>
        </Button>
      </div>
    );
  }

  const StepIcon = step.icon;
  const typeLabel =
    USE_CASE_TYPES.find((type) => type.value === form.useCaseType)?.label ?? form.useCaseType;

  return (
    <div className="relative pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.06),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-slate-900/[0.04] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-0 -z-10 h-80 w-80 rounded-full bg-emerald-500/[0.06] blur-3xl"
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/ai-system-register">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {orgName || "AI System Register"}
            </Link>
          </Button>
          <AdminPageHeader
            variant="hero"
            eyebrow={orgName ? `${orgName} · Intake` : "AI System Register"}
            title="Register a new AI system"
            description="A guided intake for the critical governance profile — purpose, ownership, people impact, data, and regulatory exposure."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
          {/* Step nav */}
          <aside className="hidden xl:block">
            <div className="space-y-2 rounded-[28px] border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur">
              <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Intake steps
              </p>
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const active = index === stepIndex;
                const done = stepComplete[item.id] && index < stepIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStepIndex(index);
                      scrollMainToTop();
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                      active
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                        active
                          ? "bg-white/15 text-white"
                          : done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <Icon className="h-3.5 w-3.5 opacity-70" />
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[11px] leading-snug",
                          active ? "text-slate-300" : "text-slate-400"
                        )}
                      >
                        {item.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main step panel */}
          <div className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Step {stepIndex + 1} of {STEPS.length}
                    </p>
                    <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-950">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <StepIcon className="h-4 w-4" />
                      </span>
                      {step.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                      {step.blurb}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Progress
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                      {Math.round(progress)}%
                    </p>
                  </div>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 xl:hidden">
                  {STEPS.map((item, index) => (
                      <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setStepIndex(index);
                        scrollMainToTop();
                      }}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                        index === stepIndex
                          ? "bg-slate-900 text-white"
                          : stepComplete[item.id]
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (stepIndex === STEPS.length - 1) void handleSubmit();
                  else goNext();
                }}
                className="space-y-6 px-6 py-6 sm:px-8 sm:py-8"
              >
                {step.id === "purpose" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="System / use case name" required className="sm:col-span-2">
                      <input
                        required
                        className={INPUT}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Customer support agent"
                      />
                    </Field>
                    <Field
                      label="AI use case / purpose"
                      required
                      hint="What problem it solves, for whom, in which workflow."
                      className="sm:col-span-2"
                    >
                      <textarea
                        required
                        rows={4}
                        className={INPUT}
                        value={form.intendedPurpose}
                        onChange={(e) => setForm({ ...form, intendedPurpose: e.target.value })}
                        placeholder="Describe the intended purpose in plain language…"
                      />
                    </Field>
                    <Field label="Short description" required className="sm:col-span-2">
                      <textarea
                        required
                        rows={2}
                        className={INPUT}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </Field>
                    <Field label="Use case type" required>
                      <select
                        className={INPUT}
                        value={form.useCaseType}
                        onChange={(e) =>
                          setForm({ ...form, useCaseType: e.target.value as UseCaseType })
                        }
                      >
                        {USE_CASE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Sector / domain">
                      <input
                        className={INPUT}
                        value={form.sectorDomain}
                        onChange={(e) => setForm({ ...form, sectorDomain: e.target.value })}
                        placeholder="HR, credit, healthcare…"
                      />
                    </Field>
                    <Field
                      label="AI capability"
                      required
                      hint="Select all that apply."
                      className="sm:col-span-2"
                    >
                      <div className="mt-3 flex flex-wrap gap-2">
                        {AI_CAPABILITY_OPTIONS.map((option) => (
                          <ChipToggle
                            key={option.value}
                            active={form.aiCapabilities.includes(option.value)}
                            onClick={() => toggleList("aiCapabilities", option.value)}
                          >
                            {option.label}
                          </ChipToggle>
                        ))}
                      </div>
                    </Field>
                    <Field label="Lifecycle status">
                      <select
                        className={INPUT}
                        value={form.status}
                        onChange={(e) =>
                          setForm({ ...form, status: e.target.value as typeof form.status })
                        }
                      >
                        {AI_SYSTEM_LIFECYCLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Deployment stage">
                      <select
                        className={INPUT}
                        value={form.deploymentStage}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            deploymentStage: e.target.value as typeof form.deploymentStage,
                          })
                        }
                      >
                        {DEPLOYMENT_STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                {step.id === "ownership" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Business owner" required>
                      <input
                        required
                        className={INPUT}
                        value={form.businessOwner}
                        onChange={(e) => setForm({ ...form, businessOwner: e.target.value })}
                      />
                    </Field>
                    <Field label="AI system owner" required hint="Technical / product owner.">
                      <input
                        required
                        className={INPUT}
                        value={form.technicalOwner}
                        onChange={(e) => setForm({ ...form, technicalOwner: e.target.value })}
                      />
                    </Field>
                    <Field label="Risk owner">
                      <input
                        className={INPUT}
                        value={form.riskOwner}
                        onChange={(e) => setForm({ ...form, riskOwner: e.target.value })}
                      />
                    </Field>
                    <Field label="Human oversight owner">
                      <input
                        className={INPUT}
                        value={form.humanOversightOwner}
                        onChange={(e) =>
                          setForm({ ...form, humanOversightOwner: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Department">
                      <input
                        className={INPUT}
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                      />
                    </Field>
                    <Field label="Steward team">
                      <input
                        className={INPUT}
                        value={form.stewardTeam}
                        onChange={(e) => setForm({ ...form, stewardTeam: e.target.value })}
                      />
                    </Field>
                    <Field label="Internal vs third-party AI" required className="sm:col-span-2">
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {AI_REGISTER_BUILD_TYPE_OPTIONS.map((option) => (
                          <ChoiceCard
                            key={option.value}
                            active={form.buildType === option.value}
                            title={option.label}
                            onClick={() =>
                              setForm({
                                ...form,
                                buildType: option.value as typeof form.buildType,
                              })
                            }
                          />
                        ))}
                      </div>
                    </Field>
                    <Field label="EU AI Act actor role">
                      <select
                        className={INPUT}
                        value={form.actorRole}
                        onChange={(e) =>
                          setForm({ ...form, actorRole: e.target.value as typeof form.actorRole })
                        }
                      >
                        {ACTOR_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Developer / provider">
                      <input
                        className={INPUT}
                        value={form.developerProvider}
                        onChange={(e) =>
                          setForm({ ...form, developerProvider: e.target.value })
                        }
                        placeholder="Internal team, OpenAI, vendor…"
                      />
                    </Field>
                    <Field label="Model / foundation model provider">
                      <input
                        className={INPUT}
                        value={form.modelProvider}
                        onChange={(e) => setForm({ ...form, modelProvider: e.target.value })}
                      />
                    </Field>
                    <Field label="Model name / version">
                      <input
                        className={INPUT}
                        value={form.modelNameVersion}
                        onChange={(e) => setForm({ ...form, modelNameVersion: e.target.value })}
                      />
                    </Field>
                    <Field label="Model class">
                      <select
                        className={INPUT}
                        value={form.modelType}
                        onChange={(e) =>
                          setForm({ ...form, modelType: e.target.value as typeof form.modelType })
                        }
                      >
                        {AI_REGISTER_MODEL_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Hosting location">
                      <input
                        className={INPUT}
                        value={form.hostingLocation}
                        onChange={(e) => setForm({ ...form, hostingLocation: e.target.value })}
                      />
                    </Field>
                    <Field label="Vendor (if different)">
                      <input
                        className={INPUT}
                        value={form.vendor}
                        onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      />
                    </Field>
                  </div>
                )}

                {step.id === "people" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Intended users" required className="sm:col-span-2">
                      <input
                        required
                        className={INPUT}
                        value={form.intendedUsers}
                        onChange={(e) => setForm({ ...form, intendedUsers: e.target.value })}
                        placeholder="Employees, customers, applicants… (comma-separated)"
                      />
                    </Field>
                    <Field
                      label="Affected individuals / populations"
                      className="sm:col-span-2"
                    >
                      <textarea
                        rows={3}
                        className={INPUT}
                        value={form.affectedPopulations}
                        onChange={(e) =>
                          setForm({ ...form, affectedPopulations: e.target.value })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                      {(
                        [
                          ["customerFacing", "Customer-facing", "Used by or shown to customers"],
                          ["employeeFacing", "Employee-facing", "Used by workforce"],
                          ["externalFacing", "External-facing", "Public or partner-facing"],
                          [
                            "criticalBusinessProcess",
                            "Critical business process",
                            "Core operations depend on it",
                          ],
                        ] as const
                      ).map(([key, title, description]) => (
                        <ChoiceCard
                          key={key}
                          active={Boolean(form[key])}
                          title={title}
                          description={description}
                          onClick={() => setForm({ ...form, [key]: !form[key] })}
                        />
                      ))}
                    </div>
                    <Field label="Makes or supports decisions about individuals?">
                      <select
                        className={INPUT}
                        value={form.decisionImpact}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            decisionImpact: e.target.value as typeof form.decisionImpact,
                          })
                        }
                      >
                        {AI_REGISTER_DECISION_IMPACT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Makes autonomous decisions / actions?">
                      <select
                        className={INPUT}
                        value={form.autonomyLevel}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            autonomyLevel: e.target.value as typeof form.autonomyLevel,
                          })
                        }
                      >
                        {AUTONOMY_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Human oversight in place?" className="sm:col-span-2">
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <ChoiceCard
                          active={form.humanInTheLoop}
                          title="Yes — human oversight"
                          description="Human in / on the loop"
                          onClick={() => setForm({ ...form, humanInTheLoop: true })}
                        />
                        <ChoiceCard
                          active={!form.humanInTheLoop}
                          title="No meaningful oversight"
                          description="Limited or no human control"
                          onClick={() => setForm({ ...form, humanInTheLoop: false })}
                        />
                      </div>
                    </Field>
                    <Field label="Override / escalation path" className="sm:col-span-2">
                      <textarea
                        rows={2}
                        className={INPUT}
                        value={form.overrideEscalationPath}
                        onChange={(e) =>
                          setForm({ ...form, overrideEscalationPath: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                )}

                {step.id === "data" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Data types processed" className="sm:col-span-2">
                      <div className="mt-3 flex flex-wrap gap-2">
                        {DATA_CATEGORY_OPTIONS.map((category) => (
                          <ChipToggle
                            key={category}
                            active={form.dataCategories.includes(category)}
                            onClick={() => toggleList("dataCategories", category)}
                          >
                            {category.replace(/_/g, " ")}
                          </ChipToggle>
                        ))}
                      </div>
                    </Field>
                    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                      <ChoiceCard
                        active={form.personalDataInvolved}
                        title="Personal data involved"
                        description="Identifies or relates to individuals"
                        onClick={() =>
                          setForm({
                            ...form,
                            personalDataInvolved: !form.personalDataInvolved,
                          })
                        }
                      />
                      <ChoiceCard
                        active={form.specialCategoryData}
                        title="Sensitive / special-category data"
                        description="Health, biometric, ethnicity, etc."
                        onClick={() =>
                          setForm({
                            ...form,
                            specialCategoryData: !form.specialCategoryData,
                          })
                        }
                      />
                    </div>
                    <Field label="Data sources" className="sm:col-span-2">
                      <textarea
                        rows={2}
                        className={INPUT}
                        value={form.dataSources}
                        onChange={(e) => setForm({ ...form, dataSources: e.target.value })}
                      />
                    </Field>
                    <Field label="Data outputs" className="sm:col-span-2">
                      <textarea
                        rows={2}
                        className={INPUT}
                        value={form.dataOutputs}
                        onChange={(e) => setForm({ ...form, dataOutputs: e.target.value })}
                      />
                    </Field>
                    <Field label="Retention policy">
                      <input
                        className={INPUT}
                        value={form.retentionPolicy}
                        onChange={(e) => setForm({ ...form, retentionPolicy: e.target.value })}
                      />
                    </Field>
                    <Field label="Lawful basis">
                      <input
                        className={INPUT}
                        value={form.lawfulBasis}
                        onChange={(e) => setForm({ ...form, lawfulBasis: e.target.value })}
                      />
                    </Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={form.crossBorderTransfers}
                        onChange={(e) =>
                          setForm({ ...form, crossBorderTransfers: e.target.checked })
                        }
                      />
                      Cross-border data transfers
                    </label>
                  </div>
                )}

                {step.id === "impact" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Business criticality">
                      <select
                        className={INPUT}
                        value={form.businessCriticality}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            businessCriticality: e.target
                              .value as typeof form.businessCriticality,
                          })
                        }
                      >
                        {AI_REGISTER_BUSINESS_CRITICALITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Annex III / high-risk relevance">
                      <select
                        className={INPUT}
                        value={form.euAnnexIiiRelevance}
                        onChange={(e) =>
                          setForm({ ...form, euAnnexIiiRelevance: e.target.value })
                        }
                      >
                        <option value="">Not set</option>
                        <option value="none">No obvious trigger</option>
                        <option value="potential">Potential</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="legal_review">Needs legal review</option>
                      </select>
                    </Field>
                    <Field label="Potential impact if AI fails" className="sm:col-span-2">
                      <textarea
                        rows={3}
                        className={INPUT}
                        value={form.failureImpact}
                        onChange={(e) => setForm({ ...form, failureImpact: e.target.value })}
                        placeholder="Safety, rights, financial, operational, reputational…"
                      />
                    </Field>
                    <Field
                      label="Prohibited / restricted use considerations"
                      className="sm:col-span-2"
                    >
                      <textarea
                        rows={3}
                        className={INPUT}
                        value={form.prohibitedUseNotes}
                        onChange={(e) =>
                          setForm({ ...form, prohibitedUseNotes: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Regulatory jurisdiction" className="sm:col-span-2">
                      <div className="mt-3 flex flex-wrap gap-2">
                        {REGULATORY_JURISDICTION_OPTIONS.map((option) => (
                          <ChipToggle
                            key={option.value}
                            active={form.regulatoryJurisdictions.includes(option.value)}
                            onClick={() => toggleList("regulatoryJurisdictions", option.value)}
                          >
                            {option.label}
                          </ChipToggle>
                        ))}
                      </div>
                    </Field>
                    <Field label="Deployment regions" className="sm:col-span-2">
                      <div className="mt-3 flex flex-wrap gap-2">
                        {DEPLOYMENT_REGION_OPTIONS.map((region) => (
                          <ChipToggle
                            key={region}
                            active={form.regions.includes(region)}
                            onClick={() => toggleList("regions", region)}
                          >
                            {region}
                          </ChipToggle>
                        ))}
                      </div>
                    </Field>
                    <Field label="FRIA status">
                      <select
                        className={INPUT}
                        value={form.friaStatus}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            friaStatus: e.target.value as typeof form.friaStatus,
                          })
                        }
                      >
                        {AI_REGISTER_COMPLIANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="DPIA status">
                      <select
                        className={INPUT}
                        value={form.dpiaStatus}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dpiaStatus: e.target.value as typeof form.dpiaStatus,
                          })
                        }
                      >
                        {AI_REGISTER_COMPLIANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Article 50 transparency triggers" className="sm:col-span-2">
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ARTICLE_50_TRIGGER_OPTIONS.map((trigger) => (
                          <ChipToggle
                            key={trigger}
                            active={form.euArticle50Triggers.includes(trigger)}
                            onClick={() => toggleList("euArticle50Triggers", trigger)}
                          >
                            {trigger.replace(/_/g, " ")}
                          </ChipToggle>
                        ))}
                      </div>
                    </Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 sm:col-span-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-amber-300"
                        checked={form.shadowAi}
                        onChange={(e) => setForm({ ...form, shadowAi: e.target.checked })}
                      />
                      Shadow AI / unsanctioned tool
                    </label>
                  </div>
                )}

                {step.id === "risk" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Risk mode" className="sm:col-span-2">
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <ChoiceCard
                          active={form.riskMode === "not_assessed"}
                          title="Not assessed yet"
                          description="Complete guided assessment later on the record"
                          onClick={() => setForm({ ...form, riskMode: "not_assessed" })}
                        />
                        <ChoiceCard
                          active={form.riskMode === "manual"}
                          title="Set manually"
                          description="Declare a tier with rationale now"
                          onClick={() => setForm({ ...form, riskMode: "manual" })}
                        />
                      </div>
                    </Field>
                    {form.riskMode === "manual" && (
                      <>
                        <Field label="Risk tier" required>
                          <select
                            className={INPUT}
                            value={form.riskTier}
                            onChange={(e) =>
                              setForm({ ...form, riskTier: e.target.value as RiskTier })
                            }
                          >
                            {RISK_TIER_OPTIONS.filter((option) => option.value !== "general").map(
                              (option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>
                        </Field>
                        <Field label="Rationale" required className="sm:col-span-2">
                          <textarea
                            required
                            rows={3}
                            className={INPUT}
                            value={form.manualRiskRationale}
                            onChange={(e) =>
                              setForm({ ...form, manualRiskRationale: e.target.value })
                            }
                          />
                        </Field>
                      </>
                    )}
                    <Field label="Next action" className="sm:col-span-2">
                      <input
                        className={INPUT}
                        value={form.nextAction}
                        onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
                        placeholder="e.g. Request vendor evidence, run FRIA…"
                      />
                    </Field>

                    <div className="sm:col-span-2 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Layers3 className="h-4 w-4" />
                        Ready to save
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        This creates the register record for{" "}
                        <span className="font-medium text-slate-800">
                          {form.name || "this use case"}
                        </span>
                        . You can refine risk assessment and evidence on the detail page.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Live summary */}
          <aside className="hidden lg:block xl:block">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 text-white shadow-xl shadow-slate-900/20">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Live profile
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight">
                  {form.name || "Untitled AI system"}
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">
                  {form.intendedPurpose || "Purpose will appear here as you type."}
                </p>
              </div>
              <dl className="space-y-3 px-5 py-4 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Type</dt>
                  <dd className="mt-1 text-slate-100">{typeLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    Owners
                  </dt>
                  <dd className="mt-1 text-slate-100">
                    {form.businessOwner || "—"}
                    {form.technicalOwner ? ` · ${form.technicalOwner}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    Capabilities
                  </dt>
                  <dd className="mt-1 text-slate-100">
                    {form.aiCapabilities.length
                      ? form.aiCapabilities.map((c) => titleCase(c.replace(/_/g, " "))).join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    Facing / criticality
                  </dt>
                  <dd className="mt-1 text-slate-100">
                    {[
                      form.customerFacing ? "Customer" : null,
                      form.employeeFacing ? "Employee" : null,
                      form.externalFacing ? "External" : null,
                      form.criticalBusinessProcess ? "Critical process" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                    {" · "}
                    {titleCase(form.businessCriticality.replace(/_/g, " "))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data</dt>
                  <dd className="mt-1 text-slate-100">
                    {[
                      form.personalDataInvolved ? "Personal" : null,
                      form.specialCategoryData ? "Sensitive" : null,
                      form.dataCategories.length
                        ? `${form.dataCategories.length} categories`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
              </dl>
              <div className="border-t border-white/10 px-5 py-4">
                <p className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <Gavel className="h-3.5 w-3.5" />
                  {form.regulatoryJurisdictions.length
                    ? `${form.regulatoryJurisdictions.length} jurisdiction${
                        form.regulatoryJurisdictions.length === 1 ? "" : "s"
                      }`
                    : "No jurisdictions selected"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={stepIndex === 0}
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <p className="hidden text-xs text-slate-500 md:block">
            {orgName} · step {stepIndex + 1}/{STEPS.length}
          </p>
          {stepIndex < STEPS.length - 1 ? (
            <Button type="button" className="rounded-xl" onClick={goNext}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={loading}
              className="rounded-xl bg-slate-900 hover:bg-slate-800"
              onClick={() => void handleSubmit()}
            >
              {loading ? "Saving…" : "Save to register"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
