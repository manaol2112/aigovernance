"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { SetupWizardStepper } from "@/components/setup-wizard-stepper";
import { IndustrySelect } from "@/components/industry-select";
import { GovernanceReadinessSelector } from "@/components/governance-readiness-selector";
import { UseCaseIntakeCard } from "@/components/use-case-intake-card";
import { toast } from "@/components/ui/toast";
import {
  CLIENT_INDUSTRY_OTHER,
  resolveClientIndustry,
} from "@/lib/client-industries";
import {
  createEmptyUseCaseDraft,
  remapUseCasesForIntakeMode,
  useCaseIntakeToPayload,
  validateUseCaseIntake,
  type UseCaseIntakeDraft,
  type UseCaseIntakeMode,
} from "@/lib/use-case-intake";

const ALL_FRAMEWORKS = [
  { code: "NIST-AI-RMF", name: "NIST AI RMF" },
  { code: "ISO-42001", name: "ISO 42001" },
  { code: "EU-AIA", name: "EU AI Act" },
  { code: "OECD-AI", name: "OECD AI Principles" },
  { code: "COSO-ERM", name: "COSO ERM 2017" },
];

const WIZARD_STEPS = [
  { id: "client", label: "Client", description: "Engagement details" },
  { id: "frameworks", label: "Frameworks", description: "Applicable standards" },
  { id: "use_cases", label: "Use cases", description: "AI systems in scope" },
] as const;

type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export default function NewAssessmentWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WizardStepId>("client");
  const [frameworkCodes, setFrameworkCodes] = useState(ALL_FRAMEWORKS.map((f) => f.code));
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    description: "",
  });
  const [industrySelection, setIndustrySelection] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [useCases, setUseCases] = useState<UseCaseIntakeDraft[]>([createEmptyUseCaseDraft()]);
  const [intakeMode, setIntakeMode] = useState<UseCaseIntakeMode>("discovery");

  function toggleFramework(code: string) {
    setFrameworkCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function addUseCase() {
    setUseCases((prev) => [...prev, createEmptyUseCaseDraft("internal_operations_tool", intakeMode)]);
  }

  function setIntakeModeAndRemap(mode: UseCaseIntakeMode) {
    setIntakeMode(mode);
    setUseCases((prev) => remapUseCasesForIntakeMode(prev, mode));
  }

  function removeUseCase(i: number) {
    setUseCases((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateUseCase(i: number, draft: UseCaseIntakeDraft) {
    setUseCases((prev) => prev.map((uc, idx) => (idx === i ? draft : uc)));
  }

  function validateStep(target: WizardStepId): boolean {
    if (target === "client") {
      if (!form.clientName.trim() || !form.name.trim()) {
        toast("Client name and assessment name are required.", { variant: "error" });
        return false;
      }
      if (industrySelection === CLIENT_INDUSTRY_OTHER && !customIndustry.trim()) {
        toast("Enter a custom industry or choose a different option.", { variant: "error" });
        return false;
      }
    }
    if (target === "frameworks" || step === "use_cases") {
      if (frameworkCodes.length === 0) {
        toast("Select at least one framework.", { variant: "error" });
        return false;
      }
    }
    if (step === "use_cases") {
      for (let i = 0; i < useCases.length; i += 1) {
        const error = validateUseCaseIntake(useCases[i]!, intakeMode);
        if (error) {
          toast(`Use case ${i + 1}: ${error}`, { variant: "error" });
          return false;
        }
      }
    }
    return true;
  }

  function goNext() {
    if (step === "client") {
      if (!validateStep("client")) return;
      setStep("frameworks");
      return;
    }
    if (step === "frameworks") {
      if (!validateStep("frameworks")) return;
      setStep("use_cases");
    }
  }

  function goBack() {
    if (step === "use_cases") setStep("frameworks");
    else if (step === "frameworks") setStep("client");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep("use_cases")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientIndustry: resolveClientIndustry(industrySelection, customIndustry),
          frameworkCodes,
          useCases: useCases.map((uc) => useCaseIntakeToPayload(uc, intakeMode)),
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      toast("Assessment created — opening workflow.", { variant: "success" });
      router.push(`/assessments/${data.id}/workflow`);
    } catch {
      toast("Failed to create assessment. Is the database running?", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/assessments"><ArrowLeft className="mr-1 h-4 w-4" /> Assessments</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Client Assessment</h1>
        <p className="mt-2 text-slate-500">
          Set up client scope, frameworks, and in-scope AI systems. Regulatory classification and ownership fields
          drive automatic requirement scoping.
        </p>
      </div>

      <SetupWizardStepper steps={[...WIZARD_STEPS]} currentStepId={step} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === "client" && (
          <Card>
            <CardHeader>
              <CardTitle>Client information</CardTitle>
              <CardDescription>Who you are assessing and how to label this engagement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Client name *</label>
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  />
                </div>
                <IndustrySelect
                  selection={industrySelection}
                  customValue={customIndustry}
                  onSelectionChange={setIndustrySelection}
                  onCustomChange={setCustomIndustry}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Assessment name *</label>
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Q1 2026 AI Governance Assessment"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === "frameworks" && (
          <Card>
            <CardHeader>
              <CardTitle>Applicable frameworks</CardTitle>
              <CardDescription>
                All selected by default. Deselect frameworks not applicable to this client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {ALL_FRAMEWORKS.map((fw) => (
                  <button
                    key={fw.code}
                    type="button"
                    onClick={() => toggleFramework(fw.code)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      frameworkCodes.includes(fw.code)
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {fw.name}
                  </button>
                ))}
              </div>
              <FrameworkScopeNotice codes={frameworkCodes} compact />
            </CardContent>
          </Card>
        )}

        {step === "use_cases" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f6f7f9] shadow-sm">
            <div className="border-b border-slate-200/80 bg-white px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                Scope intake
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                AI systems in scope
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Define each AI system this engagement covers. Discovery mode needs only a name and
                description — classification and ownership can follow in workshops.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Client governance readiness</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Choose the intake path that matches where the client is today. You can always refine
                    classification during workshops.
                  </p>
                </div>
                <div className="p-5">
                  <GovernanceReadinessSelector value={intakeMode} onChange={setIntakeModeAndRemap} />
                </div>
              </div>

              {intakeMode === "discovery" && (
                <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white px-5 py-4 text-sm leading-relaxed text-amber-950">
                  <strong>Discovery mode:</strong> only system name, category, and description are required.
                  Risk tier defaults to &ldquo;Not yet classified&rdquo; and regions default to Global so
                  scoping can still run. Capture ownership and classification details as you learn them.
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">
                  {useCases.length} system{useCases.length === 1 ? "" : "s"} in scope
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addUseCase}>
                  <Plus className="mr-1 h-3 w-3" /> Add system
                </Button>
              </div>

              <div className="space-y-5">
                {useCases.map((uc, i) => (
                  <UseCaseIntakeCard
                    key={i}
                    index={i}
                    draft={uc}
                    frameworkCodes={frameworkCodes}
                    intakeMode={intakeMode}
                    onChange={(draft) => updateUseCase(i, draft)}
                    onRemove={() => removeUseCase(i)}
                    showRemove={useCases.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {step !== "client" && (
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
          )}
          {step !== "use_cases" ? (
            <Button type="button" className="ml-auto gap-1" onClick={goNext}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="ml-auto" size="lg">
              {loading ? "Creating assessment…" : "Create assessment & start workflow"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
