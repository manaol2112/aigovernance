"use client";

import { Building2, Globe2, Shield, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DepartmentSelect } from "@/components/department-select";
import { USE_CASE_TYPES } from "@/lib/use-case-types";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments-catalog";
import { titleCase, cn } from "@/lib/utils";

type UseCaseSummary = {
  id: string;
  name: string;
  description?: string | null;
  useCaseType: string;
  department?: string | null;
  businessOwner?: string | null;
  vendor?: string | null;
  riskTier?: string | null;
  actorRole?: string | null;
  deploymentStage?: string | null;
  regions?: string[];
  _count?: { scopedRequirements: number };
};

const RISK_STYLES: Record<string, string> = {
  prohibited: "bg-red-50 text-red-800 ring-red-200",
  high: "bg-orange-50 text-orange-900 ring-orange-200",
  gpai: "bg-violet-50 text-violet-900 ring-violet-200",
  limited: "bg-amber-50 text-amber-900 ring-amber-200",
  minimal: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  general: "bg-slate-100 text-slate-700 ring-slate-200",
};

type Props = {
  useCase: UseCaseSummary;
  index: number;
  departmentOptions: WorkshopDepartmentOption[];
  onDepartmentChange: (department: string) => void;
  onRemove: () => void;
};

export function UseCaseRegistryRow({
  useCase,
  index,
  departmentOptions,
  onDepartmentChange,
  onRemove,
}: Props) {
  const typeDef = USE_CASE_TYPES.find((t) => t.value === useCase.useCaseType);
  const riskKey = useCase.riskTier ?? "general";
  const riskStyle = RISK_STYLES[riskKey] ?? RISK_STYLES.general;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-white px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-slate-900">{useCase.name}</h3>
              {typeDef?.euHighRisk && (
                <Badge variant="danger" className="text-[10px]">
                  EU high-risk profile
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-indigo-600">
              {typeDef?.label ?? titleCase(useCase.useCaseType.replace(/_/g, " "))}
            </p>
            {useCase.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{useCase.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {useCase._count && useCase._count.scopedRequirements > 0 && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              {useCase._count.scopedRequirements} requirements scoped
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={onRemove} className="text-slate-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetaItem
          icon={Shield}
          label="Risk tier"
          value={useCase.riskTier ? titleCase(useCase.riskTier.replace(/_/g, " ")) : "Not classified"}
          className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1", riskStyle)}
        />
        <MetaItem
          icon={UserRound}
          label="Business owner"
          value={useCase.businessOwner || "Unassigned"}
        />
        <MetaItem
          icon={Building2}
          label="Department"
          value={useCase.department || "Organization-wide"}
        />
        <MetaItem
          icon={Globe2}
          label="Regions"
          value={useCase.regions?.length ? useCase.regions.join(", ") : "Global"}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {useCase.vendor ? (
            <>
              <span className="font-medium text-slate-700">Vendor:</span> {useCase.vendor}
            </>
          ) : (
            "In-house or vendor not specified"
          )}
          {useCase.actorRole && (
            <span className="ml-3">
              <span className="font-medium text-slate-700">Role:</span>{" "}
              {titleCase(useCase.actorRole.replace(/_/g, " "))}
            </span>
          )}
        </p>
        <DepartmentSelect
          value={useCase.department ?? ""}
          onChange={onDepartmentChange}
          options={departmentOptions}
          emptyLabel="Assign workshop department"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm sm:w-64"
        />
      </div>
    </article>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("mt-1 truncate text-sm font-medium text-slate-800", className)} title={value}>
        {value}
      </p>
    </div>
  );
}
