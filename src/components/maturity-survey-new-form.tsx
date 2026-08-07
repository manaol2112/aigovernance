"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { IndustrySelect } from "@/components/industry-select";
import {
  FilmGrain,
  HeroAmbientOrbs,
  HoverLift,
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
import { DEFAULT_SURVEY_FRAMEWORKS } from "@/lib/maturity-survey-constants";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import {
  DEFAULT_SURVEY_MODE,
  SURVEY_MODE_META,
  type SurveyMode,
} from "@/lib/maturity-survey-mode";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const ALL_FRAMEWORKS = [
  { code: "NIST-AI-RMF", name: "NIST AI RMF" },
  { code: "ISO-42001", name: "ISO 42001" },
  { code: "EU-AIA", name: "EU AI Act" },
  { code: "OECD-AI", name: "OECD AI Principles" },
  { code: "COSO-ERM", name: "COSO ERM 2017" },
];

const MODE_OPTIONS: {
  id: SurveyMode;
  icon: typeof Zap;
  featured?: boolean;
}[] = [
  { id: "quick", icon: Zap, featured: true },
  { id: "deep_dive", icon: Layers },
];

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

const SECTION_CARD =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]";

const STEPS = [
  { n: 1, label: "Assessment type" },
  { n: 2, label: "Organization" },
  { n: 3, label: "Framework scope" },
];

function StepRail({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                active >= step.n
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                  : "border border-slate-200 bg-white text-slate-400"
              )}
            >
              {active > step.n ? <CheckCircle2 className="h-4 w-4" /> : step.n}
            </div>
            <span
              className={cn(
                "mt-1.5 hidden text-[10px] font-semibold uppercase tracking-wide sm:block",
                active >= step.n ? "text-indigo-600" : "text-slate-400"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-3 h-px w-10 sm:w-16 transition-colors duration-500",
                active > step.n ? "bg-indigo-300" : "bg-slate-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  accent = "indigo",
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  accent?: "indigo" | "emerald" | "violet";
}) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          accents[accent]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function NewMaturitySurveyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [surveyMode, setSurveyMode] = useState<SurveyMode>(DEFAULT_SURVEY_MODE);
  const [frameworkCodes, setFrameworkCodes] = useState<string[]>([...DEFAULT_SURVEY_FRAMEWORKS]);
  const [industrySelection, setIndustrySelection] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [form, setForm] = useState({
    title: "",
    organizationName: "",
    respondentName: "",
    respondentRole: "",
  });

  const stepActive =
    form.organizationName.trim().length > 0 ? 3 : surveyMode ? 2 : 1;

  function toggleFramework(code: string) {
    setFrameworkCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.organizationName.trim()) {
      toast("Organization name is required.", { variant: "error" });
      return;
    }
    if (industrySelection === CLIENT_INDUSTRY_OTHER && !customIndustry.trim()) {
      toast("Enter a custom industry or choose a different option.", { variant: "error" });
      return;
    }
    if (frameworkCodes.length === 0) {
      toast("Select at least one framework.", { variant: "error" });
      return;
    }

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
      toast("Ready when you are.", { variant: "success" });
      router.push(`/maturity-assessment/${data.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create survey.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-950">
      {/* ── HERO ── */}
      <ScrollSection glow="indigo" className="text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_0%,rgba(99,102,241,0.35),transparent)]" />
        <FilmGrain />
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
          <HeroAmbientOrbs />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8">
          <MountReveal delay={0}>
            <Link
              href="/maturity-assessment"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to overview
            </Link>
          </MountReveal>

          <MountReveal delay={60}>
            <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Configure your assessment
            </p>
          </MountReveal>

          <MountReveal delay={120}>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Set up your{" "}
              <ShimmerGradientText>maturity baseline</ShimmerGradientText>
            </h1>
          </MountReveal>

          <MountReveal delay={180}>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
              Choose your depth, confirm your organization, and select the frameworks to benchmark
              against. You&apos;ll answer one question at a time — no login required.
            </p>
          </MountReveal>

          <MountReveal delay={240}>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                ~10 minutes for quick scan
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                Confidential to your organization
              </span>
            </div>
          </MountReveal>
        </div>
      </ScrollSection>

      <SectionSeam from="dark" to="light" />

      {/* ── FORM ── */}
      <ScrollSection data-header-theme="light" glow="none" className="bg-slate-50 pb-24 pt-10 sm:pb-28 sm:pt-12">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="premium" className="mb-10">
            <StepRail active={stepActive} />
          </ScrollReveal>

          {/* Assessment type */}
          <ScrollReveal variant="premium" delay={0}>
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                  1
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  Assessment type
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {MODE_OPTIONS.map(({ id, icon: Icon, featured }) => {
                  const meta = SURVEY_MODE_META[id];
                  const selected = surveyMode === id;
                  return (
                    <HoverLift key={id}>
                      <button
                        type="button"
                        onClick={() => setSurveyMode(id)}
                        className={cn(
                          "group relative h-full w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
                          selected
                            ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-lg shadow-indigo-500/15 ring-2 ring-indigo-500/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md"
                        )}
                      >
                        {featured && (
                          <span className="absolute right-4 top-4 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Recommended
                          </span>
                        )}
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                            selected
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-base font-bold text-slate-900">{meta.label}</p>
                        <p className="mt-1 text-xs font-semibold text-indigo-600">{meta.duration}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          {meta.description}
                        </p>
                        <p className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <Clock className="h-3 w-3" />
                          {meta.questionHint}
                        </p>
                        {selected && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
                        )}
                      </button>
                    </HoverLift>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>

          {/* Organization */}
          <ScrollReveal variant="premium" delay={80} className="mt-10">
            <section className={SECTION_CARD}>
              <SectionHeader
                icon={Building2}
                title="Organization"
                description="Used on your executive summary and results export."
                accent="indigo"
              />
              <div className="space-y-5 p-6">
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
                  className="[&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_select]:mt-2 [&_select]:rounded-xl [&_select]:border-slate-200/90 [&_select]:px-4 [&_select]:py-2.5 [&_select]:shadow-sm [&_select]:focus:border-indigo-400 [&_select]:focus:ring-4 [&_select]:focus:ring-indigo-500/10 [&_input]:rounded-xl [&_input]:border-slate-200/90 [&_input]:px-4 [&_input]:py-2.5 [&_input]:shadow-sm [&_input]:focus:border-indigo-400 [&_input]:focus:ring-4 [&_input]:focus:ring-indigo-500/10"
                />
                <div>
                  <label className="text-sm font-semibold text-slate-700">Report title</label>
                  <input
                    className={INPUT_CLASS}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Optional — auto-generated if blank"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    e.g. &ldquo;Q2 2026 AI Governance Maturity Review&rdquo;
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Frameworks */}
          <ScrollReveal variant="premium" delay={160} className="mt-10">
            <section className={SECTION_CARD}>
              <SectionHeader
                icon={Shield}
                title="Frameworks in scope"
                description="Select the standards to benchmark your maturity against."
                accent="violet"
              />
              <div className="space-y-5 p-6">
                <div className="flex flex-wrap gap-2.5">
                  {ALL_FRAMEWORKS.map((fw) => {
                    const selected = frameworkCodes.includes(fw.code);
                    const color =
                      FRAMEWORK_COLUMNS.find((f) => f.code === fw.code)?.color ?? "bg-slate-500";
                    return (
                      <button
                        key={fw.code}
                        type="button"
                        onClick={() => toggleFramework(fw.code)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all duration-200",
                          selected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                            : "border-slate-200/90 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:shadow-md"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            selected ? "bg-white/90" : color
                          )}
                        />
                        {fw.name}
                      </button>
                    );
                  })}
                </div>
                <FrameworkScopeNotice codes={frameworkCodes} variant="panel" />
              </div>
            </section>
          </ScrollReveal>

          {/* Submit */}
          <ScrollReveal variant="premium" delay={240} className="mt-10">
            <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-violet-50/50 p-6 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-100">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Ready to begin?</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {SURVEY_MODE_META[surveyMode].label} · {SURVEY_MODE_META[surveyMode].duration} ·{" "}
                    {frameworkCodes.length} framework{frameworkCodes.length === 1 ? "" : "s"} selected
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="group h-12 shrink-0 gap-2 rounded-xl bg-indigo-600 px-8 text-base font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:bg-indigo-500 sm:w-auto w-full"
                >
                  {loading ? "Starting…" : "Start assessment"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </form>
      </ScrollSection>
    </div>
  );
}
