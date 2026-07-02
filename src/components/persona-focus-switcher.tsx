"use client";

import { Brain, ClipboardCheck, Presentation } from "lucide-react";
import type { WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import { cn } from "@/lib/utils";

export type PersonaFocus = "facilitator" | "analyst" | "reviewer";

const PERSONAS: Array<{
  id: PersonaFocus;
  label: string;
  shortLabel: string;
  tab: WorkshopWorkspacePhaseId;
  icon: typeof Presentation;
}> = [
  { id: "facilitator", label: "Facilitator", shortLabel: "Facilitate", tab: "workshop", icon: Presentation },
  { id: "analyst", label: "Analyst", shortLabel: "Evidence", tab: "notes", icon: Brain },
  { id: "reviewer", label: "Reviewer", shortLabel: "Validate", tab: "review", icon: ClipboardCheck },
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
    <div
      className={cn(
        "inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5",
        className
      )}
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
  );
}
