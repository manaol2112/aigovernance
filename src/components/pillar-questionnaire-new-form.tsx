"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Lock,
  Sparkles,
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
import { RISK_PILLARS } from "@/lib/risk-pillars";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Props = {
  product: "maturity" | "workshop";
  pack: { id: string; name: string; questionCount: number };
  allowOverride: boolean;
};

type SetupStepId = "organization" | "overview";

const MATURITY_INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

const WORKSHOP_INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--theme-brand)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-brand)_10%,transparent)]";

const SECTION_CARD =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]";

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
  const inputClass = product === "workshop" ? WORKSHOP_INPUT_CLASS : MATURITY_INPUT_CLASS;
  const iconWrap =
    product === "workshop"
      ? "bg-theme-brand-muted text-theme-brand"
      : "bg-indigo-50 text-indigo-600";
  const headerGradient =
    product === "workshop"
      ? "from-[var(--theme-brand-muted)]/80 to-white"
      : "from-slate-50/80 to-white";

  return (
    <section className={SECTION_CARD}>
      <div
        className={cn(
          "flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r px-6 py-5",
          headerGradient
        )}
      >
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconWrap)}>
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">{copy.orgSectionTitle}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{copy.orgSectionDescription}</p>
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div>
          <label className="text-sm font-semibold text-slate-700">
            {copy.orgNameLabel} <span className="text-red-500">*</span>
          </label>
          <input
            required
            className={inputClass}
            value={form.organizationName}
            onChange={(event) =>
              setForm((current) => ({ ...current, organizationName: event.target.value }))
            }
            placeholder={product === "workshop" ? "Enter organisation name" : "Your organization name"}
          />
        </div>

        {product === "workshop" && (
          <IndustrySelect
            selection={industrySelection}
            customValue={customIndustry}
            onSelectionChange={setIndustrySelection}
            onCustomChange={setCustomIndustry}
          />
        )}

        <div>
          <label className="text-sm font-semibold text-slate-700">{copy.sessionTitleLabel}</label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder={copy.sessionTitlePlaceholder}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">{copy.leadNameLabel}</label>
            <input
              className={inputClass}
              value={form.leadName}
              onChange={(event) => setForm((current) => ({ ...current, leadName: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">{copy.leadRoleLabel}</label>
            <input
              className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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

function OverviewPanel({ product }: { product: "maturity" | "workshop" }) {
  const copy = getPackClientCopy(product);
  const modeHeader =
    product === "workshop"
      ? "border-[color-mix(in_srgb,var(--theme-brand)_20%,white)] bg-gradient-to-r from-[var(--theme-brand-muted)]/60 to-white"
      : "border-indigo-100 bg-gradient-to-r from-indigo-50 to-white";
  const modeIcon =
    product === "workshop"
      ? "bg-theme-brand text-white shadow-md shadow-[color-mix(in_srgb,var(--theme-brand)_30%,transparent)]"
      : "bg-indigo-600 text-white shadow-md shadow-indigo-500/30";
  const stepAccent = product === "workshop" ? "text-theme-brand" : "text-indigo-600";

  return (
    <section className={SECTION_CARD}>
      <div className={cn("border-b px-6 py-5", modeHeader)}>
        <div className="flex items-start gap-4">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", modeIcon)}>
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", stepAccent)}>Step 2 of 2</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">{copy.overviewTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{copy.overviewSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">{copy.howToAnswerTitle}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {copy.howToAnswer.map((line) => (
              <li key={line} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{copy.pillarsHeading}</p>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {RISK_PILLARS.map((pillar) => (
              <div
                key={pillar.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-slate-900">{pillar.label}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PackNewForm({
  product,
  pack,
  allowOverride,
}: {
  product: "maturity" | "workshop";
  pack: { id: string; name: string; questionCount: number };
  allowOverride: boolean;
}) {
  const router = useRouter();
  const copy = getPackClientCopy(product);
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
      router.push(`${sessionBase}/${data.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to start.", { variant: "error" });
      setLoading(false);
    }
  }

  const footerBar = (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t px-4 py-4 backdrop-blur-sm",
        product === "workshop"
          ? "border-slate-200 bg-white/95"
          : "border-slate-200 bg-white/95"
      )}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        {step === "overview" ? (
          <Button type="button" variant="outline" onClick={() => setStep("organization")}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step === "organization" ? (
          <Button
            type="button"
            size="lg"
            disabled={!orgComplete}
            onClick={() => setStep("overview")}
            className="ml-auto gap-1.5"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={loading}
            onClick={() => void handleStart()}
            className={cn(
              "ml-auto gap-1.5",
              product === "maturity" && "shadow-lg shadow-indigo-500/20"
            )}
          >
            {copy.startButton}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  if (product === "workshop") {
    return (
      <div className="bg-gradient-to-b from-slate-50 via-white to-[var(--theme-brand-muted)]/30 pb-32">
        <MaturityPortalFooterMode mode="pack" />
        <BrandLoadingOverlay show={loading} label={copy.loadingLabel} />

        <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
            <Link
              href={copy.backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backLink}
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
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Configure your{" "}
              <span className="bg-gradient-to-r from-[var(--theme-brand)] to-[var(--theme-shimmer-from)] bg-clip-text text-transparent">
                {copy.heroTitleAccent}
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">{copy.heroSubtitle}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-theme-brand" />
                {formatUnitCount(pack.questionCount, "question", "questions")} across governance pillars
              </span>
            </div>
          </div>

          <SetupWizardStepper steps={setupSteps} currentStepId={step} className="mb-8" />

          {step === "organization" && (
            <>
              <section className={cn(SECTION_CARD, "mb-8 overflow-hidden")}>
                <div className="border-b border-[color-mix(in_srgb,var(--theme-brand)_15%,white)] bg-gradient-to-r from-[var(--theme-brand-muted)]/80 to-white px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-brand text-white shadow-md">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-theme-brand">
                        Step 1 of 2
                      </p>
                      <h2 className="mt-1 text-base font-bold text-slate-900">{copy.modeLabel}</h2>
                      <p className="mt-1 text-sm text-slate-600">{copy.modeDescription}</p>
                    </div>
                  </div>
                </div>
              </section>
              <OrganizationFields
                product={product}
                form={form}
                setForm={setForm}
                industrySelection={industrySelection}
                setIndustrySelection={setIndustrySelection}
                customIndustry={customIndustry}
                setCustomIndustry={setCustomIndustry}
              />
            </>
          )}

          {step === "overview" && <OverviewPanel product={product} />}

          {allowOverride && (
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href={copy.overrideHref} className="font-medium text-slate-800 underline">
                {copy.overrideLink}
              </Link>
            </p>
          )}
        </div>

        {footerBar}
      </div>
    );
  }

  return (
    <div className="bg-slate-950">
      <MaturityPortalFooterMode mode="pack" />
      <BrandLoadingOverlay show={loading} label={copy.loadingLabel} />
      <ScrollSection glow="indigo" className="text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_0%,rgba(99,102,241,0.35),transparent)]" />
        <FilmGrain />
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
          <HeroAmbientOrbs />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8">
          <MountReveal delay={0}>
            <Link
              href={copy.backHref}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {copy.backLink}
            </Link>
          </MountReveal>

          <MountReveal delay={60}>
            <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.heroEyebrow}
            </p>
          </MountReveal>

          <MountReveal delay={120}>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Set up your <ShimmerGradientText>{copy.heroTitleAccent}</ShimmerGradientText>
            </h1>
          </MountReveal>

          <MountReveal delay={180}>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">{copy.heroSubtitle}</p>
          </MountReveal>

          <MountReveal delay={240}>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                {formatUnitCount(pack.questionCount, "question", "questions")} across your governance pillars
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

      <ScrollSection data-header-theme="light" glow="none" className="bg-slate-50 pb-32 pt-10 sm:pb-36 sm:pt-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="premium" className="mb-8">
            <SetupWizardStepper steps={setupSteps} currentStepId={step} />
          </ScrollReveal>

          {step === "organization" && (
            <>
              <ScrollReveal variant="premium" delay={40}>
                <section className={cn(SECTION_CARD, "overflow-hidden")}>
                  <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                          Step 1 of 2
                        </p>
                        <h2 className="mt-1 text-base font-bold text-slate-900">{copy.modeLabel}</h2>
                        <p className="mt-1 text-sm text-slate-600">{copy.modeDescription}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal variant="premium" delay={80} className="mt-8">
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
              <OverviewPanel product={product} />
            </ScrollReveal>
          )}

          {allowOverride && (
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href={copy.overrideHref} className="font-medium text-slate-800 underline">
                {copy.overrideLink}
              </Link>
            </p>
          )}
        </div>

        {footerBar}
      </ScrollSection>
    </div>
  );
}

export function PillarQuestionnaireNewForm({ product, pack, allowOverride }: Props) {
  return <PackNewForm product={product} pack={pack} allowOverride={allowOverride} />;
}
