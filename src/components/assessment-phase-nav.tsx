"use client";

import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileOutput,
  Gauge,
  GitBranch,
  GitCompare,
  Lock,
  Map,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Target,
  Upload,
  Users,
} from "lucide-react";
import {
  ASSESSMENT_JOURNEY_PHASES,
  isJourneyPhaseReachable,
  isWorkspaceTabReachable,
  journeyPhaseIndex,
  resolveActiveJourneyPhase,
  type JourneyPhaseId,
} from "@/lib/assessment-journey";
import { isAnalysisStage } from "@/lib/use-case-types";
import type { WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import { cn } from "@/lib/utils";

import {
  isScopeSectionViewable,
  resolveScopeSectionStatus,
  type ScopeSectionId,
} from "@/lib/assessment-scope-navigation";

export type { ScopeSectionId } from "@/lib/assessment-scope-navigation";

export type PhaseNavSelection =
  | { area: "scope"; section: ScopeSectionId }
  | { area: "workspace"; tab: WorkshopWorkspacePhaseId }
  | { area: "deliver" };

type Props = {
  workflowStage: string;
  workspaceTab?: WorkshopWorkspacePhaseId;
  workspaceInitialized: boolean;
  scopeSection: ScopeSectionId;
  controlProgress: { confirmed: number; total: number };
  useCaseCount: number;
  totalScoped: number;
  scopingApproved: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onSelectScope: (section: ScopeSectionId) => void;
  onSelectWorkspace: (tab: WorkshopWorkspacePhaseId) => void;
  onSelectDeliver: () => void;
};

type NavItemStatus = "complete" | "active" | "available" | "locked";

const SCOPE_SECTIONS: Array<{
  id: ScopeSectionId;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Target;
}> = [
  {
    id: "overview",
    label: "Client & frameworks",
    shortLabel: "Client",
    description: "Engagement scope and standards in play",
    icon: Target,
  },
  {
    id: "use_cases",
    label: "Use cases",
    shortLabel: "Use cases",
    description: "AI systems included in this assessment",
    icon: Users,
  },
  {
    id: "requirements",
    label: "Requirement scoping",
    shortLabel: "Scoping",
    description: "Map framework obligations to controls",
    icon: ClipboardCheck,
  },
];

const WORKSPACE_AREAS: Array<{
  journeyId: JourneyPhaseId;
  label: string;
  description: string;
  icon: typeof Presentation;
  tabs: Array<{
    id: WorkshopWorkspacePhaseId;
    label: string;
    shortLabel: string;
    icon: typeof Presentation;
  }>;
}> = [
  {
    journeyId: "facilitate",
    label: "Workshop",
    description: "Facilitation guides and live capture",
    icon: Presentation,
    tabs: [{ id: "workshop", label: "Facilitation", shortLabel: "Workshop", icon: Presentation }],
  },
  {
    journeyId: "evidence",
    label: "Evidence",
    description: "Upload sources and run governance analysis",
    icon: Upload,
    tabs: [{ id: "notes", label: "Sources & analysis", shortLabel: "Evidence", icon: Upload }],
  },
  {
    journeyId: "validate",
    label: "Validate",
    description: "Traceability, dependencies, and sign-off",
    icon: ClipboardCheck,
    tabs: [
      { id: "mapping", label: "Mapping", shortLabel: "Mapping", icon: GitCompare },
      { id: "dependencies", label: "Dependencies", shortLabel: "Graph", icon: GitBranch },
      { id: "review", label: "Sign-off", shortLabel: "Sign-off", icon: ClipboardCheck },
    ],
  },
  {
    journeyId: "preview",
    label: "Intelligence",
    description: "Scores, roadmap, and deliverable preview",
    icon: Gauge,
    tabs: [
      { id: "assessment_output", label: "Scores", shortLabel: "Scores", icon: Gauge },
      { id: "roadmap", label: "Roadmap", shortLabel: "Roadmap", icon: Map },
      { id: "reporting", label: "Preview", shortLabel: "Preview", icon: FileOutput },
    ],
  },
];

function resolveSelection(
  workflowStage: string,
  workspaceTab: WorkshopWorkspacePhaseId | undefined,
  scopeSection: ScopeSectionId
): PhaseNavSelection {
  if (workflowStage === "deliverables" || workflowStage === "finalized") {
    return { area: "deliver" };
  }
  if (isAnalysisStage(workflowStage)) {
    return { area: "workspace", tab: workspaceTab ?? "workshop" };
  }
  return { area: "scope", section: scopeSection };
}

function workspaceAreaStatus(
  journeyId: JourneyPhaseId,
  workflowStage: string,
  workspaceInitialized: boolean,
  workspaceTab?: WorkshopWorkspacePhaseId,
  scopingApproved = false
): NavItemStatus {
  const active = resolveActiveJourneyPhase(workflowStage, workspaceTab);
  const activeIdx = journeyPhaseIndex(active);
  const targetIdx = journeyPhaseIndex(journeyId);
  const reachable = isJourneyPhaseReachable(
    journeyId,
    workflowStage,
    workspaceInitialized,
    workspaceTab,
    scopingApproved
  );

  if (!reachable) return "locked";
  if (journeyId === active) return "active";
  if (targetIdx < activeIdx) return "complete";
  return "available";
}

function StatusIcon({ status }: { status: NavItemStatus }) {
  if (status === "complete") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />;
  }
  if (status === "locked") {
    return <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />;
  }
  if (status === "active") {
    return <Circle className="h-3.5 w-3.5 shrink-0 fill-indigo-600 text-indigo-600" />;
  }
  return <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />;
}

type CollapsedNavItem = {
  id: string;
  label: string;
  shortLabel: string;
  icon: typeof Target;
  disabled: boolean;
  active: boolean;
  complete: boolean;
  onClick: () => void;
};

function CollapsedNavButton({
  item,
}: {
  item: CollapsedNavItem;
}) {
  const Icon = item.icon;
  return (
    <div className="group relative w-full">
      <button
        type="button"
        aria-label={item.label}
        disabled={item.disabled}
        onClick={item.onClick}
        className={cn(
          "relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all",
          item.active && "bg-slate-900 text-white shadow-sm",
          !item.active && item.complete && "text-emerald-700 hover:bg-emerald-50",
          !item.active && !item.complete && !item.disabled && "text-slate-600 hover:bg-slate-100",
          item.disabled && "cursor-not-allowed text-slate-300"
        )}
      >
        <span className="relative flex h-8 w-8 items-center justify-center">
          <Icon className="h-4 w-4" />
          {item.complete && !item.active && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
          {item.active && (
            <span className="absolute -left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-indigo-400" />
          )}
        </span>
        <span
          className={cn(
            "w-full text-center text-[9px] font-semibold leading-[1.15]",
            item.active ? "text-slate-200" : "text-inherit"
          )}
        >
          {item.shortLabel}
        </span>
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {item.label}
      </div>
    </div>
  );
}

export function AssessmentPhaseNav({
  workflowStage,
  workspaceTab,
  workspaceInitialized,
  scopeSection,
  controlProgress,
  useCaseCount,
  totalScoped,
  scopingApproved,
  disabled,
  collapsed = false,
  onToggleCollapsed,
  onSelectScope,
  onSelectWorkspace,
  onSelectDeliver,
}: Props) {
  const selection = resolveSelection(workflowStage, workspaceTab, scopeSection);
  const inScope = !isAnalysisStage(workflowStage) && workflowStage !== "deliverables" && workflowStage !== "finalized";
  const inWorkspace = isAnalysisStage(workflowStage);
  const inDeliver = workflowStage === "deliverables" || workflowStage === "finalized";
  const activeJourney = resolveActiveJourneyPhase(workflowStage, workspaceTab);
  const deliverReachable = isJourneyPhaseReachable(
    "deliver",
    workflowStage,
    workspaceInitialized,
    workspaceTab,
    scopingApproved
  );

  const validationPct =
    controlProgress.total > 0
      ? Math.round((controlProgress.confirmed / controlProgress.total) * 100)
      : null;

  const scopeCollapsedItems: CollapsedNavItem[] = SCOPE_SECTIONS.map((section) => {
    const status = resolveScopeSectionStatus({
      section: section.id,
      workflowStage,
      scopeSection,
      useCaseCount,
    });
    const isSelected = inScope && scopeSection === section.id;
    const viewable = isScopeSectionViewable(section.id, workflowStage, useCaseCount);
    return {
      id: `scope-${section.id}`,
      label: section.label,
      shortLabel: section.shortLabel,
      icon: section.icon,
      disabled: !!disabled || !viewable,
      active: isSelected,
      complete: status === "complete",
      onClick: () => onSelectScope(section.id),
    };
  });

  const workspaceCollapsedItems: CollapsedNavItem[] = WORKSPACE_AREAS.flatMap((area) => {
    const areaStatus = workspaceAreaStatus(
      area.journeyId,
      workflowStage,
      workspaceInitialized,
      workspaceTab,
      scopingApproved
    );

    return area.tabs.map((tab) => {
      const tabSelected = selection.area === "workspace" && selection.tab === tab.id;
      const tabReachable = isWorkspaceTabReachable(
        tab.id,
        workflowStage,
        workspaceInitialized,
        scopingApproved
      );
      const TabIcon = tab.icon;
      return {
        id: `workspace-${tab.id}`,
        label: `${area.label}: ${tab.label}`,
        shortLabel: tab.shortLabel,
        icon: TabIcon,
        disabled: !!disabled || !tabReachable,
        active: tabSelected,
        complete: areaStatus === "complete",
        onClick: () => onSelectWorkspace(tab.id),
      };
    });
  });

  const deliverCollapsedItem: CollapsedNavItem = {
    id: "deliver",
    label: "Client package",
    shortLabel: "Deliver",
    icon: Package,
    disabled: !!disabled || !deliverReachable,
    active: inDeliver,
    complete: workflowStage === "finalized",
    onClick: onSelectDeliver,
  };

  return (
    <nav
      className={cn(
        "flex max-h-[calc(100dvh-3rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-200",
        collapsed ? "w-[4.75rem]" : "w-full"
      )}
      aria-label="Assessment phases"
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-slate-100",
          collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-4"
        )}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Engagement
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Focus areas</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Work one section at a time. Jump back anytime.
            </p>
          </div>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800",
              collapsed ? "h-9 w-9" : "h-8 w-8"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          {scopeCollapsedItems.map((item) => (
            <CollapsedNavButton key={item.id} item={item} />
          ))}
          <div className="my-1 h-px bg-slate-100" aria-hidden />
          {workspaceCollapsedItems.map((item) => (
            <CollapsedNavButton key={item.id} item={item} />
          ))}
          <div className="my-1 h-px bg-slate-100" aria-hidden />
          <CollapsedNavButton item={deliverCollapsedItem} />
          {validationPct !== null && (
            <div className="mt-auto pt-2" title={`Validation: ${validationPct}%`}>
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-[9px] font-bold text-indigo-700">
                {validationPct}%
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <section>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Scope
          </p>
          <ul className="space-y-0.5">
            {SCOPE_SECTIONS.map((section) => {
              const status = resolveScopeSectionStatus({
                section: section.id,
                workflowStage,
                scopeSection,
                useCaseCount,
              });
              const isSelected = inScope && scopeSection === section.id;
              const Icon = section.icon;

              return (
                <li key={section.id}>
                  <button
                    type="button"
                    disabled={disabled || !isScopeSectionViewable(section.id, workflowStage, useCaseCount)}
                    onClick={() => onSelectScope(section.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all",
                      isSelected && "bg-slate-900 text-white shadow-sm",
                      !isSelected && status === "complete" && "text-emerald-900 hover:bg-emerald-50",
                      !isSelected && status === "available" && "text-slate-700 hover:bg-slate-50",
                      !isSelected && status === "active" && "bg-indigo-50 text-indigo-950",
                      status === "locked" && "cursor-not-allowed text-slate-300"
                    )}
                  >
                    <StatusIcon status={isSelected ? "active" : status} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="text-xs font-semibold">{section.label}</span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[11px] leading-snug",
                          isSelected ? "text-slate-300" : "text-slate-500"
                        )}
                      >
                        {section.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {inScope && scopeSection === "use_cases" && useCaseCount === 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
              Add at least one use case to continue scoping.
            </p>
          )}
          {inScope && scopeSection === "requirements" && totalScoped === 0 && useCaseCount > 0 && (
            <p className="mt-2 rounded-lg bg-indigo-50 px-2.5 py-2 text-[11px] text-indigo-800">
              Run scoping to map requirements to controls.
            </p>
          )}
        </section>

        <section>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Assessment workspace
          </p>
          <ul className="space-y-3">
            {WORKSPACE_AREAS.map((area) => {
              const areaStatus = workspaceAreaStatus(
                area.journeyId,
                workflowStage,
                workspaceInitialized,
                workspaceTab,
                scopingApproved
              );
              const areaActive =
                inWorkspace && activeJourney === area.journeyId;
              const Icon = area.icon;
              const singleTab = area.tabs.length === 1 ? area.tabs[0]! : null;
              const singleTabReachable = singleTab
                ? isWorkspaceTabReachable(
                    singleTab.id,
                    workflowStage,
                    workspaceInitialized,
                    scopingApproved
                  )
                : false;
              const singleTabSelected =
                !!singleTab &&
                selection.area === "workspace" &&
                selection.tab === singleTab.id;

              if (singleTab) {
                return (
                  <li key={area.journeyId}>
                    <button
                      type="button"
                      disabled={disabled || !singleTabReachable}
                      onClick={() => onSelectWorkspace(singleTab.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all",
                        singleTabSelected || areaActive
                          ? "border-indigo-200 bg-indigo-50/80 text-indigo-950 shadow-sm"
                          : areaStatus === "complete"
                            ? "border-transparent text-emerald-900 hover:border-emerald-100 hover:bg-emerald-50"
                            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
                        !singleTabReachable && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <StatusIcon status={singleTabSelected || areaActive ? "active" : areaStatus} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="text-xs font-semibold">{area.label}</span>
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-[11px] leading-snug",
                            singleTabSelected || areaActive ? "text-indigo-700/80" : "text-slate-500"
                          )}
                        >
                          {area.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={area.journeyId}>
                  <div
                    className={cn(
                      "rounded-xl border px-2.5 py-2",
                      areaActive
                        ? "border-indigo-200 bg-indigo-50/60"
                        : "border-transparent",
                      areaStatus === "locked" && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <StatusIcon status={areaActive ? "active" : areaStatus} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                          <p className="text-xs font-semibold text-slate-900">{area.label}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                          {area.description}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-2 space-y-0.5 border-l border-slate-200 pl-3 ml-1.5">
                      {area.tabs.map((tab) => {
                        const tabSelected =
                          selection.area === "workspace" && selection.tab === tab.id;
                        const tabReachable = isWorkspaceTabReachable(
                          tab.id,
                          workflowStage,
                          workspaceInitialized,
                          scopingApproved
                        );
                        const TabIcon = tab.icon;

                        return (
                          <li key={tab.id}>
                            <button
                              type="button"
                              disabled={disabled || !tabReachable}
                              onClick={() => onSelectWorkspace(tab.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition-all",
                                tabSelected
                                  ? "bg-white text-indigo-700 shadow-sm"
                                  : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
                                !tabReachable && "cursor-not-allowed text-slate-300"
                              )}
                            >
                              <TabIcon className="h-3 w-3 shrink-0" />
                              {tab.label}
                              {tab.id === "review" && controlProgress.total > 0 && (
                                <span className="ml-auto text-[10px] text-slate-400">
                                  {controlProgress.confirmed}/{controlProgress.total}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Closeout
          </p>
          <button
            type="button"
            disabled={disabled || !deliverReachable}
            onClick={onSelectDeliver}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all",
              inDeliver && "bg-slate-900 text-white shadow-sm",
              !inDeliver && deliverReachable && "text-slate-700 hover:bg-slate-50",
              !deliverReachable && "cursor-not-allowed text-slate-300"
            )}
          >
            <StatusIcon
              status={
                inDeliver ? "active" : deliverReachable ? "available" : "locked"
              }
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="text-xs font-semibold">Client package</span>
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[11px] leading-snug",
                  inDeliver ? "text-slate-300" : "text-slate-500"
                )}
              >
                Formal deliverables and engagement closeout
              </span>
            </span>
          </button>
        </section>
      </div>

      {validationPct !== null && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Validation progress</span>
            <span className="font-semibold text-slate-700">{validationPct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${validationPct}%` }}
            />
          </div>
        </div>
      )}
        </>
      )}
    </nav>
  );
}

export function getPhaseFocusCopy(
  selection: PhaseNavSelection
): { title: string; description: string } {
  if (selection.area === "deliver") {
    return {
      title: "Client package",
      description: "Review formal deliverables, approve the package, and close the engagement.",
    };
  }

  if (selection.area === "workspace") {
    const workspaceCopy: Record<WorkshopWorkspacePhaseId, { title: string; description: string }> = {
      workshop: {
        title: "Workshop facilitation",
        description: "Run stakeholder sessions with pillar or department guides and capture live notes.",
      },
      notes: {
        title: "Evidence & analysis",
        description: "Upload transcripts and sources, then run governance analysis to map findings to controls.",
      },
      mapping: {
        title: "Control mapping",
        description: "Review evidence-to-control traceability, citations, and confidence scores.",
      },
      dependencies: {
        title: "Dependency graph",
        description: "See blocked controls, critical paths, and what must be resolved first.",
      },
      review: {
        title: "Control validation",
        description: "Reviewer sign-off, workpaper documentation, and disagreement tracking.",
      },
      assessment_output: {
        title: "Assessment intelligence",
        description: "Multi-dimensional maturity scores and executive-ready assessment output.",
      },
      roadmap: {
        title: "Prioritized roadmap",
        description: "Dependency-aware initiatives ranked by governance ROI.",
      },
      reporting: {
        title: "Deliverable preview",
        description: "Preview executive outputs before moving to the client package.",
      },
    };
    return workspaceCopy[selection.tab];
  }

  const scopeCopy: Record<ScopeSectionId, { title: string; description: string }> = {
    overview: {
      title: "Client & framework scope",
      description: "Confirm the client context and which AI governance standards apply to this engagement.",
    },
    use_cases: {
      title: "AI use cases",
      description: "Define every in-scope AI system and assign workshop departments for stakeholder facilitation.",
    },
    requirements: {
      title: "Requirement scoping",
      description: "Map framework requirements to canonical controls before opening the assessment workspace.",
    },
  };

  return scopeCopy[selection.section];
}

export { ASSESSMENT_JOURNEY_PHASES };
