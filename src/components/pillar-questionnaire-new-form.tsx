"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLoadingOverlay } from "@/components/brand-page-loader";
import { MaturityPortalFooterMode } from "@/components/maturity-portal-shell";
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
import { formatUnitCount } from "@/lib/format-unit-count";
import { getPackClientCopy, PACK_WORKSHOP_COPY } from "@/lib/maturity-client-copy";
import {
  getPackPillarCatalog,
  resolvePackPillarSet,
  type PackPillarSet,
} from "@/lib/pillar-questionnaire";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { rememberClientOwnedSession } from "@/lib/client-owned-sessions";

type Props = {
  product: "maturity" | "workshop";
  pack: {
    id: string;
    name: string;
    questionCount: number;
    pillarSet?: PackPillarSet | string | null;
    pillarCount?: number;
  };
  allowOverride: boolean;
};

type SetupStepId = "organization" | "overview";

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--theme-brand)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]";

const SECTION_CARD =
  "brand-elevated-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]";

const MATURITY_SETUP_OUTCOMES = [
  { icon: BarChart3, label: "Pillar posture scores" },
  { icon: Target, label: "Priority improvements" },
  { icon: FileText, label: "Executive-ready summary" },
] as const;

const WORKSHOP_SETUP_OUTCOMES = [
  { icon: Users, label: "Facilitated live capture" },
  { icon: BarChart3, label: "Pillar posture scores" },
  { icon: FileText, label: "Client workshop summary" },
] as const;

function OrganizationFields({
  product,
  form,
  setForm,
  industrySelection,
  setIndustrySelection,
  customIndustry,
  setCustomIndustry,
}: {
  product: "maturity" | "workshop";
  form: {
    title: string;
    organizationName: string;
    leadName: string;
    leadRole: string;
    clientContactName: string;
    clientContactRole: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      organizationName: string;
      leadName: string;
      leadRole: string;
      clientContactName: string;
      clientContactRole: string;
    }>
  >;
  industrySelection: string;
  setIndustrySelection: (value: string) => void;
  customIndustry: string;
  setCustomIndustry: (value: string) => void;
}) {
  const copy = getPackClientCopy(product);

  return (
    <section className={SECTION_CARD}>
      <div className="relative flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-[var(--theme-brand-muted)]/40 via-white to-white px-6 py-5 sm:px-7">
        <span
          aria-hidden
          className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[var(--theme-brand)]"
        />
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-brand-muted text-theme-brand">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">{copy.orgSectionTitle}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{copy.orgSectionDescription}</p>
        </div>
      </div>
      <div className="space-y-5 p-6 sm:p-7">
        <div>
          <label className="text-sm font-semibold text-slate-700">
            {copy.orgNameLabel} <span className="text-red-500">*</span>
          </label>
          <input
            required
            className={INPUT_CLASS}
            value={form.organizationName}
            onChange={(event) =>
              setForm((current) => ({ ...current, organizationName: event.target.value }))
            }
            placeholder={product === "workshop" ? "Client organization name" : "Your organization name"}
          />
        </div>

        {product === "workshop" && (
          <IndustrySelect
            selection={industrySelection}
            customValue={customIndustry}
            onSelectionChange={setIndustrySelection}
            onCustomChange={setCustomIndustry}
            className="[&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_select]:mt-2 [&_select]:rounded-xl [&_select]:border-slate-200/90 [&_select]:px-4 [&_select]:py-3 [&_select]:shadow-sm [&_select]:focus:border-[var(--theme-brand)] [&_select]:focus:ring-4 [&_select]:focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)] [&_input]:rounded-xl [&_input]:border-slate-200/90 [&_input]:px-4 [&_input]:py-3 [&_input]:shadow-sm [&_input]:focus:border-[var(--theme-brand)] [&_input]:focus:ring-4 [&_input]:focus:ring-[color-mix(in_srgb,var(--theme-brand)_12%,transparent)]"
          />
        )}

        <div>
          <label className="text-sm font-semibold text-slate-700">{copy.sessionTitleLabel}</label>
          <input
            className={INPUT_CLASS}
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder={copy.sessionTitlePlaceholder}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">{copy.leadNameLabel}</label>
            <input
              className={INPUT_CLASS}
              value={form.leadName}
              onChange={(event) => setForm((current) => ({ ...current, leadName: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">{copy.leadRoleLabel}</label>
            <input
              className={INPUT_CLASS}
              value={form.leadRole}
              onChange={(event) => setForm((current) => ({ ...current, leadRole: event.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>

        {product === "workshop" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {PACK_WORKSHOP_COPY.clientContactNameLabel}
              </label>
              <input
                className={INPUT_CLASS}
                value={form.clientContactName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientContactName: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {PACK_WORKSHOP_COPY.clientContactRoleLabel}
              </label>
              <input
                className={INPUT_CLASS}
                value={form.clientContactRole}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientContactRole: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OverviewPanel({
  product,
  pillars,
}: {
  product: "maturity" | "workshop";
  pillars: Array<{ id: string; label: string; description: string }>;
}) {
  const copy = getPackClientCopy(product);
  const modeHeader =
    "relative border-[color-mix(in_srgb,var(--theme-brand)_18%,white)] bg-gradient-to-r from-[var(--theme-brand-muted)]/55 via-white to-white";
  const modeIcon =
    "bg-[var(--theme-action,var(--theme-brand))] text-[var(--theme-action-on,#fff)] shadow-md shadow-slate-900/10";

  return (
    <section className={SECTION_CARD}>
      <div className={cn("border-b px-6 py-5 sm:px-7", modeHeader)}>
        <span
          aria-hidden
          className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[var(--theme-brand)]"
        />
        <div className="flex items-start gap-4">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", modeIcon)}>
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
              Step 2 of 2
            </p>
            <h2 className="mt-1 text-base font-bold text-slate-900">{copy.overviewTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{copy.overviewSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-6 sm:p-7">
        <div>
          <p className="text-sm font-semibold text-slate-900">{copy.howToAnswerTitle}</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {copy.howToAnswer.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-600"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-theme-brand" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{copy.pillarsHeading}</p>
            <p className="text-[11px] font-medium tabular-nums text-slate-500">
              {pillars.length} pillars
            </p>
          </div>
          <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {pillars.map((pillar, index) => (
              <div
                key={pillar.id}
                className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm shadow-slate-900/[0.02]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-theme-brand">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{pillar.label}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PackSetupAside({
  product,
  step,
  questionCount,
  pillarCount,
  organizationName,
}: {
  product: "maturity" | "workshop";
  step: SetupStepId;
  questionCount: number;
  pillarCount: number;
  organizationName: string;
}) {
  const outcomes = product === "workshop" ? WORKSHOP_SETUP_OUTCOMES : MATURITY_SETUP_OUTCOMES;
  const orgLabel =
    organizationName.trim() || (product === "workshop" ? "Your client" : "Your organization");
  const stepHint =
    step === "organization"
      ? product === "workshop"
        ? "Confirm who this workshop is for."
        : "Confirm who this baseline is for."
      : product === "workshop"
        ? "Review coverage, then open the session."
        : "Review coverage, then open the diagnostic.";

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="brand-elevated-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.04]">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
            Engagement brief
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{orgLabel}</p>
          <p className="mt-0.5 text-xs text-slate-500">{stepHint}</p>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Questions
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                {questionCount}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Pillars
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                {pillarCount}
              </p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {outcomes.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-brand-muted)] text-theme-brand">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-4">
        <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Lock className="h-3.5 w-3.5 text-theme-brand" />
          {product === "workshop" ? "Confidential to this client" : "Confidential to your organization"}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {product === "workshop"
            ? "Session answers stay on this engagement — built for client leadership review, not public sharing."
            : "Responses stay on this engagement — built for leadership review, not public sharing."}
        </p>
      </div>
    </aside>
  );
}

function PackNewForm({
  product,
  pack,
  allowOverride,
}: {
  product: "maturity" | "workshop";
  pack: Props["pack"];
  allowOverride: boolean;
}) {
  const router = useRouter();
  const copy = getPackClientCopy(product);
  const pillarSet = resolvePackPillarSet({
    pillarSet: pack.pillarSet,
    name: pack.name,
  });
  const pillars = getPackPillarCatalog(pillarSet);
  const pillarCount = pack.pillarCount ?? pillars.length;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<SetupStepId>("organization");
  const [industrySelection, setIndustrySelection] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [form, setForm] = useState({
    title: "",
    organizationName: "",
    leadName: "",
    leadRole: "",
    clientContactName: "",
    clientContactRole: "",
  });

  const setupSteps = [
    {
      id: "organization" as const,
      label: copy.setupStepOrganization,
      description: copy.setupStepOrganizationDescription,
    },
    {
      id: "overview" as const,
      label: copy.setupStepOverview,
      description: copy.setupStepOverviewDescription,
    },
  ];

  const orgComplete = form.organizationName.trim().length > 0;
  const sessionBase = product === "maturity" ? "/maturity-assessment" : "/guided-workshop";
  const createUrl =
    product === "maturity" ? "/api/maturity-surveys" : "/api/guided-workshops";

  async function handleStart() {
    if (!orgComplete) {
      toast(`${copy.orgNameLabel} is required.`, { variant: "error" });
      return;
    }
    if (
      product === "workshop" &&
      industrySelection === CLIENT_INDUSTRY_OTHER &&
      !customIndustry.trim()
    ) {
      toast("Enter a custom industry or choose a different option.", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const industry =
        product === "workshop" ? resolveClientIndustry(industrySelection, customIndustry) : undefined;

      const body =
        product === "maturity"
          ? {
              title: form.title,
              organizationName: form.organizationName,
              respondentName: form.leadName,
              respondentRole: form.leadRole,
              questionCatalogSource: "pack",
              questionPackId: pack.id,
            }
          : {
              title: form.title,
              organizationName: form.organizationName,
              clientIndustry: industry,
              facilitatorName: form.leadName,
              facilitatorRole: form.leadRole,
              clientContactName: form.clientContactName,
              clientContactRole: form.clientContactRole,
              questionCatalogSource: "pack",
              questionPackId: pack.id,
            };

      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start");
      rememberClientOwnedSession(product === "maturity" ? "maturity" : "workshop", data.id);
      router.push(`${sessionBase}/${data.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to start.", { variant: "error" });
      setLoading(false);
    }
  }

  const setupOutcomes = product === "workshop" ? WORKSHOP_SETUP_OUTCOMES : MATURITY_SETUP_OUTCOMES;

  const footerBar = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/92 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {step === "organization"
              ? orgComplete
                ? "Next: review coverage"
                : product === "workshop"
                  ? "Client organization name required"
                  : "Organization name required"
              : product === "workshop"
                ? "Ready to open the workshop"
                : "Ready to open the baseline"}
          </p>
          <p className="text-xs text-slate-500">
            {step === "organization"
              ? `Step 1 of 2 · ${formatUnitCount(pack.questionCount, "question", "questions")} across ${pillarCount} pillars`
              : `Step 2 of 2 · ${copy.modeLabel}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {step === "overview" && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setStep("organization")}
            >
              Back
            </Button>
          )}
          {step === "organization" ? (
            <Button
              type="button"
              size="lg"
              disabled={!orgComplete}
              onClick={() => setStep("overview")}
              className="group h-11 gap-2 rounded-xl px-6 text-sm font-semibold sm:min-w-[180px]"
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={loading}
              onClick={() => void handleStart()}
              className="group h-11 gap-2 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-slate-900/10 sm:min-w-[200px]"
            >
              {copy.startButton}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="brand-canvas-shell bg-slate-950">
      <MaturityPortalFooterMode mode="pack" />
      <BrandLoadingOverlay show={loading} label={copy.loadingLabel} />
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
              href={copy.backHref}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {copy.backLink}
            </Link>
          </MountReveal>

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-14">
            <div>
              <MountReveal delay={60}>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {copy.heroEyebrow}
                </p>
              </MountReveal>

              <MountReveal delay={120}>
                <h1 className="mt-4 text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl xl:text-[2.75rem]">
                  Configure your{" "}
                  <ShimmerGradientText>{copy.heroTitleAccent}</ShimmerGradientText>
                </h1>
              </MountReveal>

              <MountReveal delay={180}>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                  {copy.heroSubtitle}
                </p>
              </MountReveal>

              <MountReveal delay={240}>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-300" />
                    {formatUnitCount(pack.questionCount, "question", "questions")} · ~
                    {pillarCount} minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-indigo-300" />
                    Confidential engagement
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-300" />
                    Board-ready output
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
                  {product === "workshop" ? "Workshop scope" : "Assessment scope"}
                </p>
                <p className="mt-3 text-3xl font-light tracking-tight text-white">
                  {pack.questionCount}
                  <span className="ml-2 text-base font-normal text-slate-400">questions</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Across {pillarCount} governance pillars
                  {pillarSet === "tmt_6" ? " · TMT" : ""}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {pillars.slice(0, 6).map((pillar) => (
                    <span
                      key={pillar.id}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-300"
                    >
                      {pillar.label.split("&")[0]?.trim() ?? pillar.label}
                    </span>
                  ))}
                  {pillars.length > 6 && (
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-400">
                      +{pillars.length - 6} more
                    </span>
                  )}
                </div>
                <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                  {setupOutcomes.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                      {label}
                    </li>
                  ))}
                </ul>
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
            <div className="min-w-0">
              <ScrollReveal variant="premium" className="mb-8">
                <SetupWizardStepper steps={setupSteps} currentStepId={step} />
              </ScrollReveal>

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
                              Step 1 of 2
                            </p>
                            <h2 className="mt-1 text-base font-bold text-slate-900">
                              {copy.modeLabel}
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">{copy.modeDescription}</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </ScrollReveal>

                  <ScrollReveal variant="premium" delay={80} className="mt-6">
                    <OrganizationFields
                      product={product}
                      form={form}
                      setForm={setForm}
                      industrySelection={industrySelection}
                      setIndustrySelection={setIndustrySelection}
                      customIndustry={customIndustry}
                      setCustomIndustry={setCustomIndustry}
                    />
                  </ScrollReveal>
                </>
              )}

              {step === "overview" && (
                <ScrollReveal variant="premium" delay={40}>
                  <OverviewPanel product={product} pillars={pillars} />
                </ScrollReveal>
              )}

              {allowOverride && (
                <p className="mt-8 text-center text-sm text-slate-500 lg:text-left">
                  <Link
                    href={copy.overrideHref}
                    className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600"
                  >
                    {copy.overrideLink}
                  </Link>
                </p>
              )}
            </div>

            <ScrollReveal variant="premium" delay={100} className="hidden lg:block">
              <PackSetupAside
                product={product}
                step={step}
                questionCount={pack.questionCount}
                pillarCount={pillarCount}
                organizationName={form.organizationName}
              />
            </ScrollReveal>
          </div>
        </div>

        {footerBar}
      </ScrollSection>
    </div>
  );
}

export function PillarQuestionnaireNewForm({ product, pack, allowOverride }: Props) {
  return <PackNewForm product={product} pack={pack} allowOverride={allowOverride} />;
}
