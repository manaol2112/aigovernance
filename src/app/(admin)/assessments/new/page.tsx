"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { USE_CASE_TYPES, DATA_CATEGORY_OPTIONS } from "@/lib/use-case-types";
import type { UseCaseType } from "@prisma/client";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { SetupWizardStepper } from "@/components/setup-wizard-stepper";
import { IndustrySelect } from "@/components/industry-select";
import { toast } from "@/components/ui/toast";
import {
  CLIENT_INDUSTRY_OTHER,
  resolveClientIndustry,
} from "@/lib/client-industries";

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

type UseCaseDraft = {
  name: string;
  description: string;
  useCaseType: UseCaseType;
  dataCategories: string[];
};

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
  const [useCases, setUseCases] = useState<UseCaseDraft[]>([
    {
      name: "",
      description: "",
      useCaseType: "client_facing_product",
      dataCategories: ["personal", "customer"],
    },
  ]);

  function toggleFramework(code: string) {
    setFrameworkCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function addUseCase() {
    setUseCases((prev) => [
      ...prev,
      { name: "", description: "", useCaseType: "internal_operations_tool", dataCategories: [] },
    ]);
  }

  function removeUseCase(i: number) {
    setUseCases((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateUseCase(i: number, field: keyof UseCaseDraft, value: string | string[]) {
    setUseCases((prev) => prev.map((uc, idx) => (idx === i ? { ...uc, [field]: value } : uc)));
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
      if (useCases.some((uc) => !uc.name.trim() || !uc.description.trim())) {
        toast("Complete all use case names and descriptions.", { variant: "error" });
        return false;
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
      const typeDefs = USE_CASE_TYPES;
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientIndustry: resolveClientIndustry(industrySelection, customIndustry),
          frameworkCodes,
          useCases: useCases.map((uc) => {
            const def = typeDefs.find((t) => t.value === uc.useCaseType)!;
            return {
              ...uc,
              actorRole: def.defaultActor,
              riskTier: def.defaultRiskTier,
            };
          }),
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/assessments"><ArrowLeft className="mr-1 h-4 w-4" /> Assessments</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Client Assessment</h1>
        <p className="mt-2 text-slate-500">
          Set up client scope, frameworks, and use cases before requirement scoping.
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI use cases</CardTitle>
                  <CardDescription>Define each AI system or capability the client operates.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addUseCase}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {useCases.map((uc, i) => {
                const typeDef = USE_CASE_TYPES.find((t) => t.value === uc.useCaseType);
                return (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Use case {i + 1}</Badge>
                      {useCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUseCase(i)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Use case name *</label>
                      <input
                        required
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={uc.name}
                        onChange={(e) => updateUseCase(i, "name", e.target.value)}
                        placeholder="Customer Service Chatbot"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Use case type *</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={uc.useCaseType}
                        onChange={(e) => updateUseCase(i, "useCaseType", e.target.value)}
                      >
                        {USE_CASE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {typeDef && <p className="mt-1 text-xs text-slate-500">{typeDef.description}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description *</label>
                      <textarea
                        required
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        rows={2}
                        value={uc.description}
                        onChange={(e) => updateUseCase(i, "description", e.target.value)}
                        placeholder="Describe what the AI system does, who it affects, and how it is deployed..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data categories</label>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {DATA_CATEGORY_OPTIONS.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() =>
                              updateUseCase(
                                i,
                                "dataCategories",
                                uc.dataCategories.includes(cat)
                                  ? uc.dataCategories.filter((c) => c !== cat)
                                  : [...uc.dataCategories, cat]
                              )
                            }
                            className={`rounded px-2 py-0.5 text-xs capitalize ${
                              uc.dataCategories.includes(cat)
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cat.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {typeDef && (
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">Actor: {typeDef.defaultActor}</Badge>
                        <Badge variant="warning">Risk: {typeDef.defaultRiskTier}</Badge>
                        {typeDef.euHighRisk && <Badge variant="danger">EU High-Risk</Badge>}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
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
