"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Shield,
  Sparkles,
  UserCircle2,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndustrySelect } from "@/components/industry-select";
import { SetupWizardStepper } from "@/components/setup-wizard-stepper";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import {
  FilmGrain,
  HeroAmbientOrbs,
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
} from "@/components/maturity-landing-motion";
import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import {
  CLIENT_INDUSTRY_OTHER,
  resolveClientIndustry,
} from "@/lib/client-industries";
import { formatUnitCount } from "@/lib/format-unit-count";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { rememberClientOwnedSession } from "@/lib/client-owned-sessions";
import { BrandLoadingOverlay } from "@/components/brand-page-loader";

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
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--theme-brand)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]";

const SECTION_CARD =
  "brand-elevated-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]";

const SETUP_OUTCOMES = [
  { icon: Users, label: "Facilitated live capture" },
  { icon: Shield, label: "Framework-scoped controls" },
  { icon: FileText, label: "Client workshop summary" },
] as const;

const INDUSTRY_SELECT_CLASS =
  "[&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_select]:mt-2 [&_select]:rounded-xl [&_select]:border-slate-200/90 [&_select]:px-4 [&_select]:py-3 [&_select]:shadow-sm [&_select]:focus:border-[var(--theme-brand)] [&_select]:focus:ring-4 [&_select]:focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)] [&_input]:rounded-xl [&_input]:border-slate-200/90 [&_input]:px-4 [&_input]:py-3 [&_input]:shadow-sm [&_input]:focus:border-[var(--theme-brand)] [&_input]:focus:ring-4 [&_input]:focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]";

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="relative flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-[var(--theme-brand-muted)]/40 via-white to-white px-6 py-5 sm:px-7">
      <span
        aria-hidden
        className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[var(--theme-brand)]"
      />
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-brand-muted text-theme-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
          {badge && (
            <span className="rounded-full bg-[var(--theme-brand-muted)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-brand">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function FrameworkSelectCard({
  code,
  name,
  tagline,
  selected,
  emphasize,
  onToggle,
}: {
  code: string;
  name: string;
  tagline: string;
  selected: boolean;
  emphasize?: boolean;
  onToggle: () => void;
}) {
  const meta = FRAMEWORK_SCOPE[code];
  const color = FRAMEWORK_COLUMNS.find((f) => f.code === code)?.color ?? "bg-slate-500";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-300",
        selected
          ? "border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-900/15 ring-2 ring-slate-900/10"
          : "border-slate-200/90 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg",
        emphasize && !selected && "animate-pulse ring-2 ring-[color-mix(in_srgb,var(--theme-brand)_45%,white)] ring-offset-2"
      )}
    >
      <span className={cn("absolute bottom-4 left-0 top-4 w-1 rounded-full", color)} />
      <span
        className={cn(
          "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          selected
            ? "border-emerald-400 bg-emerald-500 text-white"
            : "border-slate-300 bg-white group-hover:border-[var(--theme-brand)]"
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold tracking-tight">{name}</p>
          {meta && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                selected ? "bg-white/15 text-white/90" : "bg-slate-100 text-slate-600"
              )}
            >
              {formatUnitCount(meta.requirementCount, "requirement")}
            </span>
          )}
        </div>
        <p className={cn("mt-1 text-xs", selected ? "text-white/75" : "text-slate-500")}>
          {tagline}
        </p>
        {meta && (
          <p
            className={cn(
              "mt-2 line-clamp-2 text-[11px] leading-relaxed",
              selected ? "text-white/60" : "text-slate-400"
            )}
          >
            {meta.scopeNote}
          </p>
        )}
      </div>
      {!selected && (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-theme-brand" />
      )}
    </button>
  );
}

export function NewGuidedWorkshopForm() {
  const router = useRouter();
  const frameworksRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WizardStepId>("client");
  const [emphasizeFrameworks, setEmphasizeFrameworks] = useState(false);
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

  const orgComplete = form.organizationName.trim().length > 0;
  const frameworksComplete = frameworkCodes.length > 0;

  useEffect(() => {
    if (step !== "frameworks") return;
    setEmphasizeFrameworks(true);
    const timer = window.setTimeout(() => setEmphasizeFrameworks(false), 2400);
    frameworksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => window.clearTimeout(timer);
  }, [step]);

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
      rememberClientOwnedSession("workshop", data.id);
      toast("Workshop ready — you can begin.", { variant: "success" });
      router.push(`/guided-workshop/${data.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create workshop.", { variant: "error" });
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "client") {
      if (validateClient()) setStep("frameworks");
      return;
    }
    if (step === "frameworks") {
      if (frameworkCodes.length === 0) {
        toast("Select at least one framework to continue.", { variant: "error" });
        setEmphasizeFrameworks(true);
        window.setTimeout(() => setEmphasizeFrameworks(false), 2000);
        return;
      }
      setStep("confirm");
      return;
    }
    await createWorkshop();
  }

  return (
    <div className="brand-canvas-shell bg-slate-950">
      <BrandLoadingOverlay show={loading} label="Opening your workshop" />
      <ScrollSection glow="indigo" className="brand-ink-surface text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_-10%,rgba(134,188,37,0.18),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_90%,rgba(16,118,168,0.12),transparent)]" />
        <FilmGrain />
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
          <HeroAmbientOrbs />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8">
          <MountReveal delay={0}>
            <Link
              href="/guided-workshop"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to workshops
            </Link>
          </MountReveal>

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-14">
            <div>
              <MountReveal delay={60}>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Workshop setup
                </p>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl xl:text-[2.75rem]">
                  Configure your <ShimmerGradientText>client workshop</ShimmerGradientText>
                </h1>
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                  Client details, framework scope, then confirm — so the session only draws controls
                  from standards you choose.
                </p>
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-300" />
                    Facilitated live
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-indigo-300" />
                    Confidential engagement
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-indigo-300" />
                    Framework-scoped
                  </span>
                </div>
              </MountReveal>
            </div>

            <MountReveal delay={200}>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <span
                  aria-hidden
                  className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-[var(--theme-brand)]"
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
                  What you will get
                </p>
                <ul className="mt-5 space-y-3">
                  {SETUP_OUTCOMES.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-3 text-sm text-slate-200">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-indigo-300">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
                  Select only the standards that apply — we will not invent coverage you did not
                  choose.
                </p>
              </div>
            </MountReveal>
          </div>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      <ScrollSection
        data-header-theme="light"
        glow="none"
        className="brand-canvas-shell bg-slate-50 pb-32 pt-10 sm:pb-36 sm:pt-12"
      >
        <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="premium" className="mb-8">
            <SetupWizardStepper steps={[...WIZARD_STEPS]} currentStepId={step} />
          </ScrollReveal>

          <div
            className={cn(
              "grid gap-8 lg:items-start lg:gap-10",
              step === "confirm" ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_300px]"
            )}
          >
            <div className="min-w-0">
              {step === "client" && (
                <>
                  <ScrollReveal variant="premium" delay={40}>
                    <section className={cn(SECTION_CARD, "overflow-hidden")}>
                      <div className="relative border-b border-slate-100 bg-gradient-to-r from-[var(--theme-brand-muted)]/50 via-white to-white px-6 py-5 sm:px-7">
                        <span
                          aria-hidden
                          className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[var(--theme-brand)]"
                        />
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-action,var(--theme-brand))] text-[var(--theme-action-on,#fff)] shadow-md shadow-slate-900/15">
                            <Zap className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
                              Step 1 of 3
                            </p>
                            <h2 className="mt-1 text-base font-bold text-slate-900">
                              Live client session
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                              Walk your client through current-state questions — capture answers and
                              facilitator notes for a workshop summary.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </ScrollReveal>

                  <ScrollReveal variant="premium" delay={80} className="mt-6">
                    <section className={SECTION_CARD}>
                      <SectionHeader
                        icon={Building2}
                        title="Client organization"
                        description="Who this workshop is for — shown on the workshop summary."
                      />
                      <div className="space-y-5 p-6 sm:p-7">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Client organization name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            className={INPUT_CLASS}
                            value={form.organizationName}
                            onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                            placeholder="Client organization name"
                            autoComplete="off"
                            name="workshop-client-organization"
                          />
                        </div>
                        <IndustrySelect
                          selection={industrySelection}
                          customValue={customIndustry}
                          onSelectionChange={setIndustrySelection}
                          onCustomChange={setCustomIndustry}
                          className={INDUSTRY_SELECT_CLASS}
                        />
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Workshop title (optional)
                          </label>
                          <input
                            className={INPUT_CLASS}
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Auto-generated from organization name"
                          />
                        </div>
                      </div>
                    </section>
                  </ScrollReveal>

                  <ScrollReveal variant="premium" delay={120} className="mt-6">
                    <section className={SECTION_CARD}>
                      <SectionHeader
                        icon={UserCircle2}
                        title="Workshop team"
                        description="Your lead and primary client contact"
                      />
                      <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-7">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Facilitator name
                          </label>
                          <input
                            className={INPUT_CLASS}
                            value={form.facilitatorName}
                            onChange={(e) => setForm({ ...form, facilitatorName: e.target.value })}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Facilitator role
                          </label>
                          <input
                            className={INPUT_CLASS}
                            value={form.facilitatorRole}
                            onChange={(e) => setForm({ ...form, facilitatorRole: e.target.value })}
                            placeholder="e.g. AI Governance Lead"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Client contact name
                          </label>
                          <input
                            className={INPUT_CLASS}
                            value={form.clientContactName}
                            onChange={(e) =>
                              setForm({ ...form, clientContactName: e.target.value })
                            }
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Client contact role
                          </label>
                          <input
                            className={INPUT_CLASS}
                            value={form.clientContactRole}
                            onChange={(e) =>
                              setForm({ ...form, clientContactRole: e.target.value })
                            }
                            placeholder="e.g. CRO, CIO"
                          />
                        </div>
                      </div>
                    </section>
                  </ScrollReveal>
                </>
              )}

              {step === "frameworks" && (
                <ScrollReveal variant="premium" delay={40}>
                  <section ref={frameworksRef} className={SECTION_CARD}>
                    <SectionHeader
                      icon={Shield}
                      title="Which frameworks apply?"
                      description="Select every standard this client needs to align with. We won't assume coverage you haven't chosen."
                      badge="Required"
                    />
                    <div className="space-y-4 p-6 sm:p-7">
                      <div className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-brand)_25%,white)] bg-gradient-to-r from-[var(--theme-brand-muted)]/70 to-white px-4 py-3.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                          <Building2 className="h-4 w-4 text-theme-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            Workshop for {form.organizationName.trim() || "your client"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Tap each framework that applies — control questions map only to these
                            standards.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {ALL_FRAMEWORKS.map((fw) => (
                          <FrameworkSelectCard
                            key={fw.code}
                            code={fw.code}
                            name={fw.name}
                            tagline={fw.tagline}
                            selected={frameworkCodes.includes(fw.code)}
                            emphasize={emphasizeFrameworks && !frameworksComplete}
                            onToggle={() => toggleFramework(fw.code)}
                          />
                        ))}
                      </div>

                      {frameworkCodes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--theme-brand)_35%,white)] bg-[var(--theme-brand-muted)]/40 px-5 py-4 text-center">
                          <p className="text-sm font-semibold text-slate-900">
                            Choose at least one framework to continue
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Most engagements select 2–3 standards — for example NIST AI RMF plus EU
                            AI Act if the client operates in Europe.
                          </p>
                        </div>
                      ) : (
                        <FrameworkScopeNotice codes={frameworkCodes} variant="panel" />
                      )}
                    </div>
                  </section>
                </ScrollReveal>
              )}

              {step === "confirm" && (
                <ScrollReveal variant="premium" delay={40}>
                  <section className={SECTION_CARD}>
                    <SectionHeader
                      icon={Clock}
                      title="Ready to begin"
                      description="Deep-dive control questions across all 11 pillars · weighted maturity scoring"
                    />
                    <dl className="divide-y divide-slate-100 px-6 sm:px-7">
                      <div className="py-4">
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Client
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {form.organizationName}
                        </dd>
                      </div>
                      {form.facilitatorName && (
                        <div className="py-4">
                          <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Workshop lead
                          </dt>
                          <dd className="mt-1 text-sm text-slate-900">
                            {form.facilitatorName}
                            {form.facilitatorRole ? ` · ${form.facilitatorRole}` : ""}
                          </dd>
                        </div>
                      )}
                      <div className="py-4">
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Frameworks
                        </dt>
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
                  </section>
                </ScrollReveal>
              )}
            </div>

            {step !== "confirm" && (
              <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
                <div className="brand-elevated-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.04]">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
                      Engagement brief
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {form.organizationName.trim() || "Your client"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {step === "client"
                        ? "Confirm who this workshop is for."
                        : frameworksComplete
                          ? `${frameworkCodes.length} framework${frameworkCodes.length === 1 ? "" : "s"} in scope`
                          : "Select the standards in scope."}
                    </p>
                  </div>
                  <ul className="space-y-2.5 px-5 py-5">
                    {SETUP_OUTCOMES.map(({ icon: Icon, label }) => (
                      <li key={label} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-brand-muted)] text-theme-brand">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            )}
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/92 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <div className="min-w-0">
                {step === "client" && (
                  <>
                    <p className="text-sm font-bold text-slate-900">Next: choose your frameworks</p>
                    <p className="text-xs text-slate-500">
                      Step 1 of 3 · Client organization name required
                    </p>
                  </>
                )}
                {step === "frameworks" && (
                  <>
                    <p className="text-sm font-bold text-slate-900">
                      {frameworksComplete
                        ? "Next: confirm and start"
                        : "Select frameworks to continue"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Step 2 of 3 ·{" "}
                      {frameworksComplete
                        ? `${frameworkCodes.length} framework${frameworkCodes.length === 1 ? "" : "s"} selected`
                        : "At least one framework required"}
                    </p>
                  </>
                )}
                {step === "confirm" && (
                  <>
                    <p className="text-sm font-bold text-slate-900">Ready to open the workshop</p>
                    <p className="text-xs text-slate-500">Step 3 of 3 · Live client session</p>
                  </>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {(step === "frameworks" || step === "confirm") && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setStep(step === "confirm" ? "frameworks" : "client")}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    loading ||
                    (step === "client" && !orgComplete) ||
                    (step === "frameworks" && !frameworksComplete)
                  }
                  className="group h-11 gap-2 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-slate-900/10 sm:min-w-[200px]"
                >
                  {loading
                    ? "Starting…"
                    : step === "client"
                      ? "Continue to frameworks"
                      : step === "frameworks"
                        ? "Continue to confirm"
                        : "Start a guided workshop"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </ScrollSection>
    </div>
  );
}
