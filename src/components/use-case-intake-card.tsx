"use client";

import { useState, type ReactNode } from "react";
import {
  Bot,
  ChevronDown,
  Database,
  Globe2,
  Layers3,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DepartmentSelect } from "@/components/department-select";
import { DATA_CATEGORY_OPTIONS, USE_CASE_TYPES } from "@/lib/use-case-types";
import {
  ACTOR_ROLE_OPTIONS,
  AUTONOMY_LEVEL_OPTIONS,
  DEPLOYMENT_REGION_OPTIONS,
  DEPLOYMENT_STAGE_OPTIONS,
  RISK_TIER_OPTIONS,
  applyUseCaseTypeDefaults,
  type UseCaseIntakeDraft,
  type UseCaseIntakeMode,
} from "@/lib/use-case-intake";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments-catalog";
import { getDepartmentsForFrameworks } from "@/lib/workshop-departments-catalog";
import { cn } from "@/lib/utils";

type Props = {
  index: number;
  draft: UseCaseIntakeDraft;
  frameworkCodes: string[];
  intakeMode?: UseCaseIntakeMode;
  onChange: (draft: UseCaseIntakeDraft) => void;
  onRemove?: () => void;
  showRemove?: boolean;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100";

function FieldLabel({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
      {children}
      {optional && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Optional
        </span>
      )}
    </label>
  );
}

function PanelSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Bot;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function ChipToggle({
  label,
  selected,
  onClick,
  tone = "indigo",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  tone?: "indigo" | "slate";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all",
        selected
          ? tone === "indigo"
            ? "border-indigo-200 bg-indigo-600 text-white shadow-sm"
            : "border-slate-800 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

export function UseCaseIntakeCard({
  index,
  draft,
  frameworkCodes,
  intakeMode = "discovery",
  onChange,
  onRemove,
  showRemove,
}: Props) {
  const discovery = intakeMode === "discovery";
  const [showDetails, setShowDetails] = useState(!discovery);
  const typeDef = USE_CASE_TYPES.find((t) => t.value === draft.useCaseType);
  const departmentOptions: WorkshopDepartmentOption[] = getDepartmentsForFrameworks(frameworkCodes).map(
    (dept) => ({ ...dept })
  );

  function patch(partial: Partial<UseCaseIntakeDraft>) {
    onChange({ ...draft, ...partial });
  }

  function handleTypeChange(useCaseType: UseCaseIntakeDraft["useCaseType"]) {
    onChange(applyUseCaseTypeDefaults(draft, useCaseType, intakeMode));
  }

  const optionalSections = (
    <div className="space-y-4">
      <PanelSection
        icon={Shield}
        title="Regulatory classification"
        hint={
          discovery
            ? "Defaults are fine for discovery engagements — refine with legal during the assessment."
            : "Confirm EU AI Act role and risk tier with the client’s legal or risk team."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel optional={discovery}>EU AI Act role</FieldLabel>
            <select
              className={fieldClass}
              value={draft.actorRole}
              onChange={(e) => patch({ actorRole: e.target.value as UseCaseIntakeDraft["actorRole"] })}
            >
              {ACTOR_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              {ACTOR_ROLE_OPTIONS.find((o) => o.value === draft.actorRole)?.hint}
            </p>
          </div>
          <div>
            <FieldLabel optional={discovery}>Risk tier</FieldLabel>
            <select
              className={fieldClass}
              value={draft.riskTier}
              onChange={(e) => patch({ riskTier: e.target.value as UseCaseIntakeDraft["riskTier"] })}
            >
              {RISK_TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              {RISK_TIER_OPTIONS.find((o) => o.value === draft.riskTier)?.hint}
            </p>
          </div>
          <div>
            <FieldLabel optional={discovery}>Deployment stage</FieldLabel>
            <select
              className={fieldClass}
              value={draft.deploymentStage}
              onChange={(e) =>
                patch({ deploymentStage: e.target.value as UseCaseIntakeDraft["deploymentStage"] })
              }
            >
              {DEPLOYMENT_STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel optional={discovery}>Human oversight</FieldLabel>
            <select
              className={fieldClass}
              value={draft.autonomyLevel}
              onChange={(e) =>
                patch({ autonomyLevel: e.target.value as UseCaseIntakeDraft["autonomyLevel"] })
              }
            >
              {AUTONOMY_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel optional={discovery}>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-slate-400" />
              Deployment regions
            </span>
          </FieldLabel>
          {discovery && draft.regions.length === 0 && (
            <p className="mt-1 text-[11px] text-slate-400">Defaults to Global when saved.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {DEPLOYMENT_REGION_OPTIONS.map((region) => (
              <ChipToggle
                key={region}
                label={region}
                selected={draft.regions.includes(region)}
                onClick={() =>
                  patch({
                    regions: draft.regions.includes(region)
                      ? draft.regions.filter((r) => r !== region)
                      : [...draft.regions, region],
                  })
                }
              />
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection
        icon={UserRound}
        title="Ownership & supply chain"
        hint="Accountable business owner and vendor context for ISO 42001 and third-party risk."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel optional={discovery}>Business owner</FieldLabel>
            <input
              className={fieldClass}
              value={draft.businessOwner}
              onChange={(e) => patch({ businessOwner: e.target.value })}
              placeholder={discovery ? "Assign during workshop" : "e.g. VP Customer Experience"}
            />
          </div>
          <div>
            <FieldLabel optional>Workshop department</FieldLabel>
            <DepartmentSelect
              value={draft.department}
              onChange={(department) => patch({ department })}
              options={departmentOptions}
              emptyLabel="Stakeholder group (optional)"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel optional>Model / vendor</FieldLabel>
            <input
              className={fieldClass}
              value={draft.vendor}
              onChange={(e) => patch({ vendor: e.target.value })}
              placeholder="Azure OpenAI, Salesforce Einstein, in-house model…"
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection
        icon={Database}
        title="Data processed"
        hint={
          discovery
            ? "Optional now — category defaults apply for initial scoping."
            : "Data categories in scope for privacy and EU AI Act obligations."
        }
      >
        <div className="flex flex-wrap gap-2">
          {DATA_CATEGORY_OPTIONS.map((cat) => (
            <ChipToggle
              key={cat}
              label={cat.replace(/_/g, " ")}
              selected={draft.dataCategories.includes(cat)}
              tone="slate"
              onClick={() =>
                patch({
                  dataCategories: draft.dataCategories.includes(cat)
                    ? draft.dataCategories.filter((c) => c !== cat)
                    : [...draft.dataCategories, cat],
                })
              }
            />
          ))}
        </div>
      </PanelSection>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f6f7f9] shadow-sm">
      <div className="border-b border-slate-200/80 bg-white px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  AI system {index + 1}
                </p>
                {discovery && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                    Discovery
                  </Badge>
                )}
                {!discovery && typeDef?.euHighRisk && (
                  <Badge variant="danger" className="text-[10px]">
                    EU high-risk
                  </Badge>
                )}
              </div>
              <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">
                {draft.name.trim() || "New AI system"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {typeDef?.label ?? "Select a system category"}
              </p>
            </div>
          </div>
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove system"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <PanelSection
          icon={Layers3}
          title="System identity"
          hint="Name the system and describe how it is used — this anchors the entire assessment."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <FieldLabel>System name</FieldLabel>
              <input
                required
                className={fieldClass}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Customer Service Chatbot"
              />
            </div>
            <div>
              <FieldLabel>System category</FieldLabel>
              <select
                className={fieldClass}
                value={draft.useCaseType}
                onChange={(e) => handleTypeChange(e.target.value as UseCaseIntakeDraft["useCaseType"])}
              >
                {USE_CASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Category context</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-950/80">
                {typeDef?.description ?? "Choose the category that best matches this AI system."}
              </p>
            </div>
            <div className="lg:col-span-2">
              <FieldLabel>Business description</FieldLabel>
              <textarea
                required
                className={cn(fieldClass, "min-h-[108px] resize-y")}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={
                  discovery
                    ? "What does this AI do today? Who uses it? A rough description is enough to start."
                    : "What outputs or decisions does it produce? Who is affected? What happens if it fails?"
                }
              />
            </div>
          </div>
        </PanelSection>

        {discovery ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Classification & ownership</p>
                <p className="mt-1 text-xs text-slate-500">
                  Optional for discovery — expand when you have owner, risk, or vendor details.
                </p>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", showDetails && "rotate-180")}
              />
            </button>
            {showDetails && <div className="space-y-4 border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5">{optionalSections}</div>}
          </div>
        ) : (
          optionalSections
        )}
      </div>
    </div>
  );
}
