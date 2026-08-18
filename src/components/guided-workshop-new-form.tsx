"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Shield,
  UserCircle2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndustrySelect } from "@/components/industry-select";
import { SetupWizardStepper } from "@/components/setup-wizard-stepper";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import {
  CLIENT_INDUSTRY_OTHER,
  resolveClientIndustry,
} from "@/lib/client-industries";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const ALL_FRAMEWORKS = [
  { code: "NIST-AI-RMF", name: "NIST AI RMF", tagline: "US risk management baseline" },
  { code: "ISO-42001", name: "ISO 42001", tagline: "AI management system standard" },
  { code: "EU-AIA", name: "EU AI Act", tagline: "EU regulatory obligations" },
  { code: "OECD-AI", name: "OECD AI Principles", tagline: "International policy alignment" },
  { code: "COSO-ERM", name: "COSO ERM 2017", tagline: "Enterprise risk integration" },
] as const;

const WIZARD_STEPS = [
  { id: "client", label: "Client & team", description: "Who this workshop is for" },
  { id: "frameworks", label: "Framework scope", description: "Standards in scope" },
  { id: "confirm", label: "Confirm", description: "Start the session" },
] as const;

type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--theme-brand)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-brand)_10%,transparent)]";

const SECTION_CARD =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]";

export function NewGuidedWorkshopForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WizardStepId>("client");
  const [frameworkCodes, setFrameworkCodes] = useState<string[]>([]);
  const [industrySelection, setIndustrySelection] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [form, setForm] = useState({
    title: "",
    organizationName: "",
    facilitatorName: "",
    facilitatorRole: "",
    clientContactName: "",
    clientContactRole: "",
  });

  function toggleFramework(code: string) {
    setFrameworkCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function validateClient(): boolean {
    if (!form.organizationName.trim()) {
      toast("Client organization name is required.", { variant: "error" });
      return false;
    }
    if (industrySelection === CLIENT_INDUSTRY_OTHER && !customIndustry.trim()) {
      toast("Enter a custom industry or choose a different option.", { variant: "error" });
      return false;
    }
    return true;
  }

  async function createWorkshop() {
    if (!validateClient()) {
      setStep("client");
      return;
    }
    if (frameworkCodes.length === 0) {
      toast("Select at least one framework.", { variant: "error" });
      setStep("frameworks");
      return;
    }

    setLoading(true);
    try {
      const industry = resolveClientIndustry(industrySelection, customIndustry);
      const title =
        form.title.trim() ||
        `${form.organizationName.trim()} AI Governance Workshop${industry ? ` — ${industry}` : ""}`;

      const res = await fetch("/api/guided-workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title,
          clientIndustry: industry,
          frameworkCodes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to create workshop");
      }
      const data = await res.json();
      toast("Workshop ready — you can begin.", { variant: "success" });
      router.push(`/guided-workshop/${data.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create workshop.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-[var(--theme-brand-muted)]/30 pb-16">
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/guided-workshop"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-theme-brand" />
            <span className="text-sm font-semibold text-slate-900">New guided workshop</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-brand">
            Workshop setup
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Configure your client workshop
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
            Capture client details and framework scope. During the session you&apos;ll walk through
            weighted control questions across all eleven governance pillars.
          </p>
        </div>

        <SetupWizardStepper steps={[...WIZARD_STEPS]} currentStepId={step} className="mb-8" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "client") {
              if (validateClient()) setStep("frameworks");
              return;
            }
            if (step === "frameworks") {
              if (frameworkCodes.length === 0) {
                toast("Select at least one framework.", { variant: "error" });
                return;
              }
              setStep("confirm");
              return;
            }
            void createWorkshop();
          }}
        >
          {step === "client" && (
            <div className={SECTION_CARD}>
              <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-[var(--theme-brand-muted)]/80 to-white px-6 py-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-brand-muted text-theme-brand">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Client organization</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Who this workshop is for</p>
                </div>
              </div>
              <div className="space-y-5 p-6">
                <div>
                  <label className="text-sm font-medium text-slate-700">Organization name *</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.organizationName}
                    onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                    placeholder="Enter organisation name"
                    autoComplete="off"
                    name="workshop-client-organization"
                  />
                </div>
                <IndustrySelect
                  selection={industrySelection}
                  customValue={customIndustry}
                  onSelectionChange={setIndustrySelection}
                  onCustomChange={setCustomIndustry}
                />
                <div>
                  <label className="text-sm font-medium text-slate-700">Workshop title (optional)</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Auto-generated from organization name"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "client" && (
            <div className={cn(SECTION_CARD, "mt-6")}>
              <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-[var(--theme-brand-muted)]/80 to-white px-6 py-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-brand-muted text-theme-brand">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Workshop team</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Your lead and primary client contact</p>
                </div>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Lead name</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.facilitatorName}
                    onChange={(e) => setForm({ ...form, facilitatorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Lead role</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.facilitatorRole}
                    onChange={(e) => setForm({ ...form, facilitatorRole: e.target.value })}
                    placeholder="e.g. AI Governance Lead"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Client contact name</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.clientContactName}
                    onChange={(e) => setForm({ ...form, clientContactName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Client contact role</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.clientContactRole}
                    onChange={(e) => setForm({ ...form, clientContactRole: e.target.value })}
                    placeholder="e.g. CRO, CIO"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "frameworks" && (
            <div className={SECTION_CARD}>
              <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-6 py-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Framework scope</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Controls and questions are drawn from requirements in these frameworks
                  </p>
                </div>
              </div>
              <div className="space-y-3 p-6">
                <FrameworkScopeNotice />
                {ALL_FRAMEWORKS.map((fw) => {
                  const selected = frameworkCodes.includes(fw.code);
                  const meta = FRAMEWORK_SCOPE[fw.code];
                  const color = FRAMEWORK_COLUMNS.find((f) => f.code === fw.code)?.color ?? "bg-slate-500";
                  return (
                    <button
                      key={fw.code}
                      type="button"
                      onClick={() => toggleFramework(fw.code)}
                      className={cn(
                        "group relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                          : "border-slate-200 bg-white hover:border-[var(--theme-brand-ring)] hover:shadow-md"
                      )}
                    >
                      <span className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-full", color)} />
                      <span
                        className={cn(
                          "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                          selected ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-300"
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{fw.name}</p>
                        <p className={cn("mt-1 text-xs", selected ? "text-white/75" : "text-slate-500")}>
                          {fw.tagline}
                        </p>
                        {meta && (
                          <p className={cn("mt-2 text-[11px]", selected ? "text-white/60" : "text-slate-400")}>
                            {meta.scopeNote}
                          </p>
                        )}
                      </div>
                      {!selected && (
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-theme-brand" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className={SECTION_CARD}>
              <div className="border-b border-slate-100 bg-gradient-to-r from-[var(--theme-brand-muted)]/80 to-white px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">Ready to begin</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Deep-dive control questions across all 11 pillars · weighted maturity scoring
                </p>
              </div>
              <dl className="divide-y divide-slate-100 px-6">
                <div className="py-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Client</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{form.organizationName}</dd>
                </div>
                {form.facilitatorName && (
                  <div className="py-4">
                    <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Workshop lead</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {form.facilitatorName}
                      {form.facilitatorRole ? ` · ${form.facilitatorRole}` : ""}
                    </dd>
                  </div>
                )}
                <div className="py-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Frameworks</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {frameworkCodes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-theme-brand-muted px-3 py-1 text-xs font-semibold text-[var(--theme-brand-hover)]"
                      >
                        {ALL_FRAMEWORKS.find((f) => f.code === code)?.name ?? code}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(WIZARD_STEPS[stepIndex - 1]!.id)}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (
                "Creating…"
              ) : step === "confirm" ? (
                <>
                  Start workshop
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
