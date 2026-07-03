"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  GitCompare,
  Map,
  Gauge,
  Presentation,
  Upload,
} from "lucide-react";
import type { WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import { cn } from "@/lib/utils";

export type PersonaFocus = "facilitator" | "analyst" | "reviewer" | "intelligence";

const PERSONAS: Array<{
  id: PersonaFocus;
  label: string;
  shortLabel: string;
  tab: WorkshopWorkspacePhaseId;
  icon: typeof Presentation;
}> = [
  { id: "facilitator", label: "Facilitator", shortLabel: "Workshop", tab: "workshop", icon: Presentation },
  { id: "analyst", label: "Analyst", shortLabel: "Evidence", tab: "notes", icon: Upload },
  { id: "reviewer", label: "Reviewer", shortLabel: "Validate", tab: "review", icon: ClipboardCheck },
  { id: "intelligence", label: "Intelligence", shortLabel: "Scores", tab: "assessment_output", icon: Gauge },
];

const QUICK_TABS: Array<{
  tab: WorkshopWorkspacePhaseId;
  label: string;
  icon: typeof GitCompare;
}> = [
  { tab: "mapping", label: "Map", icon: GitCompare },
  { tab: "dependencies", label: "Graph", icon: GitBranch },
  { tab: "roadmap", label: "Roadmap", icon: Map },
];

type Props = {
  activeTab: WorkshopWorkspacePhaseId;
  onSelectTab: (tab: WorkshopWorkspacePhaseId) => void;
  className?: string;
};

export function PersonaFocusSwitcher({ activeTab, onSelectTab, className }: Props) {
  const activePersona =
    PERSONAS.find((p) => p.tab === activeTab)?.id ??
    (activeTab === "reporting" ? "reviewer" : "facilitator");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
        title="Focus by role"
      >
        {PERSONAS.map(({ id, label, shortLabel, tab, icon: Icon }) => {
          const active = activePersona === id;
          return (
            <button
              key={id}
              type="button"
              title={`${label} view`}
              onClick={() => onSelectTab(tab)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                active
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          );
        })}
      </div>
      <div className="hidden h-4 w-px bg-slate-200 lg:block" />
      <div className="hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 lg:inline-flex">
        {QUICK_TABS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
              activeTab === tab
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
