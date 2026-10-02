"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Shield,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { IndustrySelect } from "@/components/industry-select";
import { SetupWizardStepper } from "@/components/setup-wizard-stepper";
import {
  FilmGrain,
  HeroAmbientOrbs,
  MountReveal,
  ScrollReveal,
  ScrollSection,
  SectionSeam,
  ShimmerGradientText,
} from "@/components/maturity-landing-motion";
import {
  CLIENT_INDUSTRY_OTHER,
  resolveClientIndustry,
} from "@/lib/client-industries";
import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { getSurveyModeMeta, SURVEY_MODE_META, type SurveyMode } from "@/lib/maturity-survey-mode";
import { MaturitySurveyBriefingPanel } from "@/components/maturity-survey-briefing";
import {
  formatBriefingFrameworksInScope,
  formatBriefingStep3Footer,
  getBriefingQuestionCount,
  normalizeMaturitySurveyBriefing,
  type MaturitySurveyBriefing,
} from "@/lib/maturity-survey-briefing";
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
  { id: "organization", label: "Organization", description: "Who this assessment is for" },
  { id: "frameworks", label: "Framework scope", description: "Standards that apply to you" },
  { id: "overview", label: "Overview", description: "Coverage & how to rate" },
] as const;

type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--theme-brand)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]";

const SECTION_CARD =
  "brand-elevated-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]";

const SETUP_OUTCOMES = [
  { icon: BarChart3, label: "Pillar posture scores" },
  { icon: Target, label: "Priority improvements" },
  { icon: FileText, label: "Executive-ready summary" },
] as const;

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  accent?: "indigo" | "emerald" | "violet";
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
          : "border-slate-200/90 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10",
        emphasize && !selected && "animate-pulse ring-2 ring-violet-300/80 ring-offset-2"
      )}
    >
      <span className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-full", color)} />
      <span
        className={cn(
          "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          selected
            ? "border-emerald-400 bg-emerald-500 text-white"
            : "border-slate-300 bg-white group-hover:border-indigo-400"
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
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-400" />
      )}
    </button>
  );
}

export function NewMaturitySurveyForm() {
  const router = useRouter();
  const frameworksRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WizardStepId>("organization");
  const [emphasizeFrameworks, setEmphasizeFrameworks] = useState(false);
  const [briefing, setBriefing] = useState<MaturitySurveyBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const surveyMode: SurveyMode = "quick";
  const [frameworkCodes, setFrameworkCodes] = useState<string[]>([]);
  const [industrySelection, setIndustrySelection] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [form, setForm] = useState({
    title: "",
    organizationName: "",
    respondentName: "",
    respondentRole: "",
  });

  useEffect(() => {
    if (step !== "frameworks") return;
    setEmphasizeFrameworks(true);
    const timer = window.setTimeout(() => setEmphasizeFrameworks(false), 2400);
    frameworksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "overview" || frameworkCodes.length === 0) return;

    let cancelled = false;
    setBriefingLoading(true);
    fetch("/api/maturity-surveys/catalog-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworkCodes, surveyMode }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Failed to load overview");
        }
        return res.json() as Promise<MaturitySurveyBriefing>;
      })
      .then((data) => {
        if (cancelled) return;
        const normalized = normalizeMaturitySurveyBriefing(data);
        if (!normalized) {
          throw new Error("Could not load assessment overview.");
        }
        setBriefing(normalized);
      })
      .catch((e) => {
        if (!cancelled) {
          toast(e instanceof Error ? e.message : "Failed to load overview.", {
            variant: "error",
          });
          setStep("frameworks");
        }
      })
      .finally(() => {
        if (!cancelled) setBriefingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, frameworkCodes, surveyMode]);

  function toggleFramework(code: string) {
    setFrameworkCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function validateOrganization(): boolean {
    if (!form.organizationName.trim()) {
      toast("Organization name is required.", { variant: "error" });
      return false;
    }
    if (industrySelection === CLIENT_INDUSTRY_OTHER && !customIndustry.trim()) {
      toast("Enter a custom industry or choose a different option.", { variant: "error" });
      return false;
    }
    return true;
  }

  function goToFrameworks() {
    if (!validateOrganization()) return;
    setStep("frameworks");
  }

  function goToOverview() {
    if (!validateOrganization()) {
      setStep("organization");
      return;
    }
    if (frameworkCodes.length === 0) {
      toast("Select at least one framework to continue.", { variant: "error" });
      setEmphasizeFrameworks(true);
      window.setTimeout(() => setEmphasizeFrameworks(false), 2000);
      return;
    }
    setBriefing(null);
    setStep("overview");
  }

  async function createSurveyAndStart() {
    setLoading(true);
    try {
      const industry = resolveClientIndustry(industrySelection, customIndustry);
      const title =
        form.title.trim() ||
        `${form.organizationName.trim()} AI Maturity${industry ? ` — ${industry}` : ""}`;

      const res = await fetch("/api/maturity-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title,
          frameworkCodes,
          surveyMode,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to create");
      }
      const data = await res.json();
      rememberClientOwnedSession("maturity", data.id);
      toast("Ready when you are.", { variant: "success" });
      router.push(`/maturity-assessment/${data.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create survey.", { variant: "error" });
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "organization") {
      goToFrameworks();
      return;
    }
    if (step === "frameworks") {
      goToOverview();
      return;
    }
    if (!validateOrganization()) {
      setStep("organization");
      return;
    }
    if (frameworkCodes.length === 0) {
      setStep("frameworks");
      return;
    }
    await createSurveyAndStart();
  }

  const orgComplete = form.organizationName.trim().length > 0;
  const frameworksComplete = frameworkCodes.length > 0;
  const overviewReady = Boolean(briefing?.pillars.length) && !briefingLoading;
  const canStart = orgComplete && frameworksComplete && overviewReady;
  const briefingQuestionCount = briefing ? getBriefingQuestionCount(briefing) : null;

  return (
    <div className="brand-canvas-shell bg-slate-950">
      <BrandLoadingOverlay show={loading} label="Opening your assessment" />
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
              href="/maturity-assessment"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to overview
            </Link>
          </MountReveal>

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-14">
            <div>
              <MountReveal delay={60}>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI governance diagnostic
                </p>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl xl:text-[2.75rem]">
                  Configure your <ShimmerGradientText>maturity baseline</ShimmerGradientText>
                </h1>
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                  Organization, framework scope, then a coverage brief — so the baseline only scores
                  standards you choose.
                </p>
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-300" />
                    {getSurveyModeMeta("quick").duration} for baseline scan
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
              step === "overview"
                ? "lg:grid-cols-1"
                : "lg:grid-cols-[minmax(0,1fr)_300px]"
            )}
          >
            <div className="min-w-0">
              {step === "organization" && (
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
                              {SURVEY_MODE_META.quick.label}
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                              {SURVEY_MODE_META.quick.description}
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
                        title="Organization details"
                        description="Used on your executive summary and results export."
                      />
                      <div className="space-y-5 p-6 sm:p-7">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Organization name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            className={INPUT_CLASS}
                            value={form.organizationName}
                            onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                            placeholder="Your organization name"
                          />
                        </div>
                        <IndustrySelect
                          selection={industrySelection}
                          customValue={customIndustry}
                          onSelectionChange={setIndustrySelection}
                          onCustomChange={setCustomIndustry}
                          className="[&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_select]:mt-2 [&_select]:rounded-xl [&_select]:border-slate-200/90 [&_select]:px-4 [&_select]:py-3 [&_select]:shadow-sm [&_select]:focus:border-[var(--theme-brand)] [&_select]:focus:ring-4 [&_select]:focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)] [&_input]:rounded-xl [&_input]:border-slate-200/90 [&_input]:px-4 [&_input]:py-3 [&_input]:shadow-sm [&_input]:focus:border-[var(--theme-brand)] [&_input]:focus:ring-4 [&_input]:focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]"
                        />
                        <div>
                          <label className="text-sm font-semibold text-slate-700">Report title</label>
                          <input
                            className={INPUT_CLASS}
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Optional — auto-generated if blank"
                          />
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-semibold text-slate-700">Your name</label>
                            <input
                              className={INPUT_CLASS}
                              value={form.respondentName}
                              onChange={(e) =>
                                setForm({ ...form, respondentName: e.target.value })
                              }
                              placeholder="Optional — appears on your report"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-slate-700">Your role</label>
                            <input
                              className={INPUT_CLASS}
                              value={form.respondentRole}
                              onChange={(e) => setForm({ ...form, respondentRole: e.target.value })}
                              placeholder="e.g. Chief Risk Officer"
                            />
                          </div>
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
                      title="Which frameworks apply to you?"
                      description="Select every standard your organization needs to align with. We won't assume coverage you haven't chosen."
                      badge="Required"
                    />
                    <div className="space-y-4 p-6 sm:p-7">
                      <div className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-brand)_25%,white)] bg-gradient-to-r from-[var(--theme-brand-muted)]/70 to-white px-4 py-3.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                          <Building2 className="h-4 w-4 text-theme-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            Assessing {form.organizationName.trim() || "your organization"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Tap each framework that applies — baseline questions and gap analysis
                            map only to these standards.
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
                            Most organizations select 2–3 standards — for example NIST AI RMF plus
                            EU AI Act if you operate in Europe.
                          </p>
                        </div>
                      ) : (
                        <FrameworkScopeNotice codes={frameworkCodes} variant="panel" />
                      )}
                    </div>
                  </section>
                </ScrollReveal>
              )}

              {step === "overview" && (
                <ScrollReveal variant="premium" delay={40}>
                  <MaturitySurveyBriefingPanel
                    briefing={briefing}
                    organizationName={form.organizationName}
                    loading={briefingLoading}
                  />
                </ScrollReveal>
              )}
            </div>

            {step !== "overview" && (
              <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
                <div className="brand-elevated-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.04]">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
                      Engagement brief
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {form.organizationName.trim() || "Your organization"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {step === "organization"
                        ? "Confirm who this baseline is for."
                        : frameworksComplete
                          ? formatBriefingFrameworksInScope(frameworkCodes.length)
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
                {step === "organization" && (
                  <>
                    <p className="text-sm font-bold text-slate-900">Next: choose your frameworks</p>
                    <p className="text-xs text-slate-500">Step 1 of 3 · Organization name required</p>
                  </>
                )}
                {step === "frameworks" && (
                  <>
                    <p className="text-sm font-bold text-slate-900">
                      {frameworksComplete
                        ? "Next: review your overview"
                        : "Select frameworks to continue"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Step 2 of 3 ·{" "}
                      {frameworksComplete
                        ? formatBriefingFrameworksInScope(frameworkCodes.length)
                        : "At least one framework required"}
                    </p>
                  </>
                )}
                {step === "overview" && (
                  <>
                    <p className="text-sm font-bold text-slate-900">
                      {canStart ? "Ready when you are" : "Loading your overview…"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Step 3 of 3 ·{" "}
                      {briefing && briefingQuestionCount != null
                        ? formatBriefingStep3Footer(
                            briefingQuestionCount,
                            briefing.frameworkLabels
                          )
                        : "Review domains and rating scale"}
                    </p>
                  </>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {(step === "frameworks" || step === "overview") && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setStep(step === "overview" ? "frameworks" : "organization")}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    loading ||
                    (step === "frameworks" && !frameworksComplete) ||
                    (step === "overview" && !canStart)
                  }
                  className="group h-11 gap-2 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-slate-900/10 sm:min-w-[200px]"
                >
                  {loading
                    ? "Starting…"
                    : step === "organization"
                      ? "Continue to frameworks"
                      : step === "frameworks"
                        ? "Continue to overview"
                        : "Begin baseline scan"}
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
