"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileOutput,
  Gauge,
  GitBranch,
  GitCompare,
  Lock,
  Map,
  Package,
  Presentation,
  Target,
  Upload,
  Users,
} from "lucide-react";
import {
  ASSESSMENT_JOURNEY_PHASES,
  isJourneyPhaseReachable,
  journeyTabForPhase,
  resolveActiveJourneyPhase,
  type JourneyPhaseId,
} from "@/lib/assessment-journey";
import { isAnalysisStage } from "@/lib/use-case-types";
import {
  workspacePhaseToJourneyId,
  type WorkshopWorkspacePhaseId,
} from "@/lib/workshop-workspace-phases";
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
  /** Kept for call-site compatibility. */
  totalScoped?: number;
  scopingApproved: boolean;
  disabled?: boolean;
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

const WORKSPACE_SUBTABS: Record<
  Exclude<JourneyPhaseId, "scope" | "deliver">,
  Array<{
    id: WorkshopWorkspacePhaseId;
    label: string;
    icon: typeof Presentation;
  }>
> = {
  facilitate: [{ id: "workshop", label: "Facilitation", icon: Presentation }],
  evidence: [{ id: "notes", label: "Sources & analysis", icon: Upload }],
  validate: [
    { id: "mapping", label: "Mapping", icon: GitCompare },
    { id: "dependencies", label: "Dependencies", icon: GitBranch },
    { id: "review", label: "Sign-off", icon: ClipboardCheck },
  ],
  preview: [
    { id: "assessment_output", label: "Scores", icon: Gauge },
    { id: "roadmap", label: "Roadmap", icon: Map },
    { id: "reporting", label: "Preview", icon: FileOutput },
  ],
};

const JOURNEY_ICONS: Record<JourneyPhaseId, typeof Target> = {
  scope: Target,
  facilitate: Presentation,
  evidence: Upload,
  validate: ClipboardCheck,
  preview: Gauge,
  deliver: Package,
};

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

function journeyStatus(
  phaseId: JourneyPhaseId,
  workflowStage: string,
  workspaceInitialized: boolean,
  workspaceTab: WorkshopWorkspacePhaseId | undefined,
  scopingApproved: boolean,
  selection: PhaseNavSelection
): NavItemStatus {
  const reachable = isJourneyPhaseReachable(
    phaseId,
    workflowStage,
    workspaceInitialized,
    workspaceTab,
    scopingApproved
  );
  if (!reachable) return "locked";

  const active = resolveActiveJourneyPhase(workflowStage, workspaceTab);
  if (phaseId === "scope") {
    if (selection.area === "scope") return "active";
    if (isAnalysisStage(workflowStage) || selection.area === "deliver") return "complete";
    return "available";
  }
  if (phaseId === "deliver") {
    return selection.area === "deliver" ? "active" : "available";
  }
  if (active === phaseId) return "active";

  const activeIdx = ASSESSMENT_JOURNEY_PHASES.findIndex((p) => p.id === active);
  const targetIdx = ASSESSMENT_JOURNEY_PHASES.findIndex((p) => p.id === phaseId);
  if (targetIdx < activeIdx) return "complete";
  return "available";
}

function Chip({
  label,
  icon: Icon,
  active,
  complete,
  locked,
  disabled,
  onClick,
  meta,
}: {
  label: string;
  icon: typeof Target;
  active: boolean;
  complete?: boolean;
  locked?: boolean;
  disabled?: boolean;
  onClick: () => void;
  meta?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled || locked}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors",
        active && "bg-black text-white",
        !active && complete && "text-[#046A38] hover:bg-[#EEF7E0]",
        !active && !complete && !locked && "text-[#53565A] hover:bg-[#F5F5F5] hover:text-black",
        locked && "cursor-not-allowed text-[#D0D0CE]"
      )}
    >
      {complete && !active ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : locked ? (
        <Lock className="h-3 w-3 shrink-0" />
      ) : (
        <Icon className="h-3 w-3 shrink-0 opacity-80" />
      )}
      {label}
      {meta ? (
        <span className={cn("tabular-nums", active ? "text-white/70" : "text-[#767676]")}>
          {meta}
        </span>
      ) : null}
    </button>
  );
}

export function AssessmentPhaseNav({
  workflowStage,
  workspaceTab,
  workspaceInitialized,
  scopeSection,
  controlProgress,
  useCaseCount,
  scopingApproved,
  disabled,
  onSelectScope,
  onSelectWorkspace,
  onSelectDeliver,
}: Props) {
  const selection = resolveSelection(workflowStage, workspaceTab, scopeSection);
  const focus = getPhaseFocusCopy(selection);
  /** Scope is done once the engagement has moved into workshop / deliver work. */
  const scopeSettled =
    isAnalysisStage(workflowStage) ||
    workflowStage === "deliverables" ||
    workflowStage === "finalized";

  /** Manual expand while still on a working stage (before navigation resolves to scope). */
  const [scopeForcedOpen, setScopeForcedOpen] = useState(false);

  const validationPct =
    controlProgress.total > 0
      ? Math.round((controlProgress.confirmed / controlProgress.total) * 100)
      : null;

  function selectJourney(phaseId: JourneyPhaseId) {
    if (phaseId === "scope") {
      setScopeForcedOpen(true);
      onSelectScope(scopeSection);
      return;
    }
    if (phaseId === "deliver") {
      setScopeForcedOpen(false);
      onSelectDeliver();
      return;
    }
    setScopeForcedOpen(false);
    const tab = journeyTabForPhase(phaseId, workspaceTab);
    if (tab) onSelectWorkspace(tab);
  }

  function openScopeForEdit() {
    setScopeForcedOpen(true);
    onSelectScope("overview");
  }

  function hideScope() {
    setScopeForcedOpen(false);
    if (selection.area === "scope") {
      onSelectWorkspace(workspaceTab ?? "workshop");
    }
  }

  const scopeOpen = !scopeSettled || selection.area === "scope" || scopeForcedOpen;
  const visiblePhases = ASSESSMENT_JOURNEY_PHASES.filter(
    (phase) => phase.id !== "scope" || scopeOpen
  );
  const showScopeSubnav = selection.area === "scope";
  const workspaceSubs =
    selection.area === "workspace"
      ? WORKSPACE_SUBTABS[workspacePhaseToJourneyId(selection.tab)]
      : [];
  const showWorkspaceSubnav = workspaceSubs.length > 1;

  return (
    <nav
      className="rounded-lg border border-[#E3E3E3] bg-white"
      aria-label="Assessment phases"
    >
      <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
        <p className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#767676] sm:block">
          {focus.title}
        </p>
        <div className="hidden h-4 w-px shrink-0 bg-[#E3E3E3] sm:block" aria-hidden />
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:thin]">
          {visiblePhases.map((phase) => {
            const status = journeyStatus(
              phase.id,
              workflowStage,
              workspaceInitialized,
              workspaceTab,
              scopingApproved,
              selection
            );
            return (
              <Chip
                key={phase.id}
                label={phase.label}
                icon={JOURNEY_ICONS[phase.id]}
                active={status === "active"}
                complete={status === "complete"}
                locked={status === "locked"}
                disabled={disabled || status === "locked"}
                onClick={() => selectJourney(phase.id)}
              />
            );
          })}
        </div>
        {scopeSettled ? (
          selection.area === "scope" || scopeForcedOpen ? (
            <button
              type="button"
              disabled={disabled}
              onClick={hideScope}
              className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#53565A] hover:bg-[#F5F5F5] hover:text-black"
              title="Hide scope and return to workspace"
            >
              <ChevronUp className="h-3 w-3" />
              Hide scope
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={openScopeForEdit}
              className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#046A38] hover:bg-[#EEF7E0]"
              title="Review or update engagement scope"
            >
              <Target className="h-3 w-3" />
              Edit scope
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
          )
        ) : null}
        {validationPct !== null ? (
          <div className="hidden shrink-0 items-center gap-1.5 text-[11px] text-[#666666] sm:flex">
            <span className="font-semibold tabular-nums text-black">{validationPct}%</span>
            <div className="h-1 w-14 overflow-hidden rounded-full bg-[#F0F0F0]">
              <div
                className="h-full rounded-full bg-[var(--theme-brand)] transition-all"
                style={{ width: `${validationPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {showScopeSubnav ? (
        <div className="flex gap-0.5 overflow-x-auto border-t border-[#E3E3E3] bg-[#FAFAFA] px-2 py-1 [scrollbar-width:thin]">
          {SCOPE_SECTIONS.map((section) => {
            const status = resolveScopeSectionStatus({
              section: section.id,
              workflowStage,
              scopeSection,
              useCaseCount,
            });
            return (
              <Chip
                key={section.id}
                label={section.shortLabel}
                icon={section.icon}
                active={scopeSection === section.id}
                complete={status === "complete"}
                locked={status === "locked"}
                disabled={
                  disabled || !isScopeSectionViewable(section.id, workflowStage, useCaseCount)
                }
                onClick={() => onSelectScope(section.id)}
              />
            );
          })}
        </div>
      ) : null}

      {showWorkspaceSubnav ? (
        <div className="flex gap-0.5 overflow-x-auto border-t border-[#E3E3E3] bg-[#FAFAFA] px-2 py-1 [scrollbar-width:thin]">
          {workspaceSubs.map((tab) => (
            <Chip
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={selection.area === "workspace" && selection.tab === tab.id}
              onClick={() => onSelectWorkspace(tab.id)}
              disabled={disabled}
              meta={
                tab.id === "review" && controlProgress.total > 0
                  ? `${controlProgress.confirmed}/${controlProgress.total}`
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}
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
        title: "Workshop",
        description: "Run stakeholder sessions with pillar or department guides and capture live notes.",
      },
      notes: {
        title: "Evidence",
        description: "Upload transcripts and sources, then run governance analysis to map findings to controls.",
      },
      mapping: {
        title: "Mapping",
        description: "Review evidence-to-control traceability, citations, and confidence scores.",
      },
      dependencies: {
        title: "Dependencies",
        description: "See blocked controls, critical paths, and what must be resolved first.",
      },
      review: {
        title: "Sign-off",
        description: "Reviewer sign-off, workpaper documentation, and disagreement tracking.",
      },
      assessment_output: {
        title: "Scores",
        description: "Multi-dimensional maturity scores and executive-ready assessment output.",
      },
      roadmap: {
        title: "Roadmap",
        description: "Dependency-aware initiatives ranked by governance ROI.",
      },
      reporting: {
        title: "Preview",
        description: "Preview executive outputs before moving to the client package.",
      },
    };
    return workspaceCopy[selection.tab];
  }

  const scopeCopy: Record<ScopeSectionId, { title: string; description: string }> = {
    overview: {
      title: "Scope",
      description: "Confirm the client context and which AI governance standards apply to this engagement.",
    },
    use_cases: {
      title: "Use cases",
      description: "Define every in-scope AI system and assign workshop departments for stakeholder facilitation.",
    },
    requirements: {
      title: "Scoping",
      description: "Map framework requirements to canonical controls before opening the assessment workspace.",
    },
  };

  return scopeCopy[selection.section];
}

export { ASSESSMENT_JOURNEY_PHASES };
