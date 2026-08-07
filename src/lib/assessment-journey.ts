import { isAnalysisStage } from "@/lib/use-case-types";
import {
  workspacePhaseToJourneyId,
  getWorkspacePhase,
  type WorkshopWorkspacePhaseId,
  type WorkspaceJourneyId,
} from "@/lib/workshop-workspace-phases";

/** High-level assessment milestones — workspace tabs handle detail navigation. */
export type JourneyPhaseId = "scope" | "deliver" | WorkspaceJourneyId;

export type JourneyPhaseDef = {
  id: JourneyPhaseId;
  label: string;
  subtitle: string;
  workflowStages?: string[];
  /** Default workspace tab when entering this milestone. */
  workspaceTab?: WorkshopWorkspacePhaseId;
};

export const ASSESSMENT_JOURNEY_PHASES: JourneyPhaseDef[] = [
  {
    id: "scope",
    label: "Scope",
    subtitle: "Client, use cases, and requirements",
    workflowStages: ["client_setup", "use_cases", "requirement_scoping"],
  },
  {
    id: "facilitate",
    label: "Workshop",
    subtitle: "Facilitation and live capture",
    workspaceTab: "workshop",
  },
  {
    id: "evidence",
    label: "Evidence",
    subtitle: "Upload, analyze, and map sources",
    workspaceTab: "notes",
  },
  {
    id: "validate",
    label: "Validate",
    subtitle: "Mapping, dependencies, and sign-off",
    workspaceTab: "mapping",
  },
  {
    id: "preview",
    label: "Intelligence",
    subtitle: "Scores, roadmap, and deliverable preview",
    workspaceTab: "assessment_output",
  },
  {
    id: "deliver",
    label: "Client package",
    subtitle: "Formal deliverables and closeout",
    workflowStages: ["deliverables", "finalized"],
  },
];

const SCOPE_STAGES = new Set(["client_setup", "use_cases", "requirement_scoping"]);
const DELIVER_STAGES = new Set(["deliverables", "finalized"]);

const WORKSPACE_MILESTONES = new Set<WorkspaceJourneyId>([
  "facilitate",
  "evidence",
  "validate",
  "preview",
]);

export function isWorkspaceMilestone(id: JourneyPhaseId): id is WorkspaceJourneyId {
  return WORKSPACE_MILESTONES.has(id as WorkspaceJourneyId);
}

export function getJourneyPhase(id: JourneyPhaseId): JourneyPhaseDef {
  return ASSESSMENT_JOURNEY_PHASES.find((p) => p.id === id)!;
}

export function resolveActiveJourneyPhase(
  workflowStage: string,
  workspaceTab?: WorkshopWorkspacePhaseId
): JourneyPhaseId {
  if (DELIVER_STAGES.has(workflowStage)) return "deliver";
  if (isAnalysisStage(workflowStage)) {
    return workspacePhaseToJourneyId(workspaceTab ?? "workshop");
  }
  if (SCOPE_STAGES.has(workflowStage)) return "scope";
  return "scope";
}

export function journeyPhaseIndex(id: JourneyPhaseId): number {
  return ASSESSMENT_JOURNEY_PHASES.findIndex((p) => p.id === id);
}

export function journeyTabForPhase(
  phase: JourneyPhaseId,
  currentTab?: WorkshopWorkspacePhaseId
): WorkshopWorkspacePhaseId | null {
  if (phase === "scope" || phase === "deliver") return null;
  if (currentTab && workspacePhaseToJourneyId(currentTab) === phase) {
    return currentTab;
  }
  return getJourneyPhase(phase).workspaceTab ?? null;
}

export function isJourneyPhaseReachable(
  target: JourneyPhaseId,
  workflowStage: string,
  workspaceInitialized: boolean,
  workspaceTab?: WorkshopWorkspacePhaseId,
  scopingApproved = false
): boolean {
  const targetIdx = journeyPhaseIndex(target);
  const active = resolveActiveJourneyPhase(workflowStage, workspaceTab);
  const activeIdx = journeyPhaseIndex(active);

  if (target === "scope") return true;
  if (target === "deliver") {
    return DELIVER_STAGES.has(workflowStage) || activeIdx >= journeyPhaseIndex("validate");
  }
  if (SCOPE_STAGES.has(workflowStage)) {
    if (target === "facilitate" && scopingApproved) return true;
    return false;
  }
  if (isAnalysisStage(workflowStage)) {
    if (target === "facilitate") return true;
    if (workspaceInitialized) return true;
    return targetIdx <= activeIdx + 1;
  }
  return targetIdx <= activeIdx + 1;
}

/** Whether a workspace tab can be opened from the phase stepper. */
export function isWorkspaceTabReachable(
  tab: WorkshopWorkspacePhaseId,
  workflowStage: string,
  workspaceInitialized: boolean,
  scopingApproved: boolean
): boolean {
  if (DELIVER_STAGES.has(workflowStage)) return true;
  if (SCOPE_STAGES.has(workflowStage)) {
    return scopingApproved;
  }
  if (!isAnalysisStage(workflowStage)) return false;
  if (tab === "workshop") return true;
  return workspaceInitialized;
}

export type NextActionContext = {
  workflowStage: string;
  useCaseCount: number;
  totalScoped: number;
  scopingCheckpointStatus?: string;
  evaluationCheckpointStatus?: string;
  deliverableCheckpointStatus?: string;
  controlProgress: { confirmed: number; total: number };
  pendingCheckpointTitle?: string | null;
  workspaceTab?: WorkshopWorkspacePhaseId;
  analysisStale?: boolean;
  hasAnalysis?: boolean;
};

export type NextAction = {
  label: string;
  hint: string;
  journeyPhase?: JourneyPhaseId;
  workspaceTab?: WorkshopWorkspacePhaseId;
};

const TAB_FLOW: WorkshopWorkspacePhaseId[] = [
  "workshop",
  "notes",
  "mapping",
  "dependencies",
  "review",
  "assessment_output",
  "roadmap",
  "reporting",
];

function nextTabInFlow(current: WorkshopWorkspacePhaseId): WorkshopWorkspacePhaseId | null {
  const idx = TAB_FLOW.indexOf(current);
  if (idx < 0 || idx >= TAB_FLOW.length - 1) return null;
  return TAB_FLOW[idx + 1];
}

export function resolveNextAction(ctx: NextActionContext): NextAction {
  const { workflowStage } = ctx;

  if (DELIVER_STAGES.has(workflowStage)) {
    if (workflowStage === "finalized") {
      return { label: "Assessment complete", hint: "All deliverables are approved and the engagement is closed." };
    }
    if (ctx.deliverableCheckpointStatus === "pending") {
      return {
        label: "Approve client package",
        hint: "Review deliverables and approve for client delivery.",
        journeyPhase: "deliver",
      };
    }
    return {
      label: "Finalize assessment",
      hint: "Complete final approval to close the engagement.",
      journeyPhase: "deliver",
    };
  }

  if (SCOPE_STAGES.has(workflowStage)) {
    if (ctx.useCaseCount === 0) {
      return {
        label: "Add use cases",
        hint: "Define in-scope AI systems before requirement scoping.",
        journeyPhase: "scope",
      };
    }
    if (workflowStage === "requirement_scoping" && ctx.totalScoped === 0) {
      return {
        label: "Add use cases",
        hint: "Requirements scope automatically once use cases are defined.",
        journeyPhase: "scope",
      };
    }
    if (workflowStage === "requirement_scoping" && ctx.totalScoped > 0) {
      return {
        label: "Open assessment workspace",
        hint: "Initialize controls and start the governance intelligence workflow.",
        journeyPhase: "facilitate",
        workspaceTab: "workshop",
      };
    }
    return {
      label: "Continue scoping",
      hint: "Complete use cases and requirement scoping.",
      journeyPhase: "scope",
    };
  }

  if (isAnalysisStage(workflowStage)) {
    if (ctx.pendingCheckpointTitle && ctx.evaluationCheckpointStatus === "pending") {
      return {
        label: "Complete approval",
        hint: ctx.pendingCheckpointTitle,
        journeyPhase: "validate",
        workspaceTab: "review",
      };
    }

    const tab = ctx.workspaceTab ?? "workshop";

    if (tab === "workshop") {
      return {
        label: "Upload capture sources",
        hint: "After facilitation, upload transcripts in Evidence.",
        journeyPhase: "evidence",
        workspaceTab: "notes",
      };
    }

    if (tab === "notes") {
      if (ctx.analysisStale) {
        return {
          label: "Re-run governance analysis",
          hint: "Sources changed — re-analyze to refresh control mappings.",
          journeyPhase: "evidence",
          workspaceTab: "notes",
        };
      }
      if (!ctx.hasAnalysis) {
        return {
          label: "Upload and analyze sources",
          hint: "Run governance analysis to map sources to controls with citations.",
          journeyPhase: "evidence",
          workspaceTab: "notes",
        };
      }
      return {
        label: "Review control mapping",
        hint: "Confirm evidence-to-control traceability and confidence scores.",
        journeyPhase: "validate",
        workspaceTab: "mapping",
      };
    }

    if (tab === "mapping") {
      return {
        label: "Review dependencies",
        hint: "See blocked controls and unlock paths in the dependency graph.",
        journeyPhase: "validate",
        workspaceTab: "dependencies",
      };
    }

    if (tab === "dependencies") {
      if (ctx.controlProgress.total > 0 && ctx.controlProgress.confirmed < ctx.controlProgress.total) {
        const remaining = ctx.controlProgress.total - ctx.controlProgress.confirmed;
        return {
          label: `Sign off ${remaining} control${remaining === 1 ? "" : "s"}`,
          hint: `${ctx.controlProgress.confirmed} of ${ctx.controlProgress.total} validated.`,
          journeyPhase: "validate",
          workspaceTab: "review",
        };
      }
      return {
        label: "Validate controls",
        hint: "Reviewer sign-off and disagreement tracking.",
        journeyPhase: "validate",
        workspaceTab: "review",
      };
    }

    if (tab === "review") {
      if (ctx.controlProgress.total > 0 && ctx.controlProgress.confirmed < ctx.controlProgress.total) {
        const remaining = ctx.controlProgress.total - ctx.controlProgress.confirmed;
        return {
          label: `Sign off ${remaining} control${remaining === 1 ? "" : "s"}`,
          hint: `${ctx.controlProgress.confirmed} of ${ctx.controlProgress.total} controls signed off.`,
          journeyPhase: "validate",
          workspaceTab: "review",
        };
      }
      return {
        label: "Run intelligence pipeline",
        hint: "Generate multi-dimensional scores and ROI-ranked roadmap.",
        journeyPhase: "preview",
        workspaceTab: "assessment_output",
      };
    }

    if (tab === "assessment_output") {
      return {
        label: "Review prioritized roadmap",
        hint: "Dependency-aware initiatives ranked by governance ROI.",
        journeyPhase: "preview",
        workspaceTab: "roadmap",
      };
    }

    if (tab === "roadmap") {
      return {
        label: "Preview deliverables",
        hint: "Review executive outputs before client package.",
        journeyPhase: "preview",
        workspaceTab: "reporting",
      };
    }

    if (tab === "reporting") {
      return {
        label: "Proceed to client package",
        hint: "Move to formal deliverables when ready.",
        journeyPhase: "deliver",
      };
    }

    const next = nextTabInFlow(tab);
    if (next) {
      const phase = getWorkspacePhase(next);
      return {
        label: `Continue to ${phase.label}`,
        hint: phase.subtitle,
        journeyPhase: workspacePhaseToJourneyId(next),
        workspaceTab: next,
      };
    }
  }

  return { label: "Continue assessment", hint: "Pick up where you left off." };
}

export function resolveListNextAction(input: {
  workflowStage: string;
  useCaseCount: number;
  pendingCheckpoints: number;
  controlTotal: number;
  controlConfirmed: number;
}): { label: string; hint: string } {
  const ctx: NextActionContext = {
    workflowStage: input.workflowStage,
    useCaseCount: input.useCaseCount,
    totalScoped: 0,
    controlProgress: { confirmed: input.controlConfirmed, total: input.controlTotal },
    pendingCheckpointTitle:
      input.pendingCheckpoints > 0 ? `${input.pendingCheckpoints} approval(s) pending` : null,
  };

  if (input.controlTotal > 0 && isAnalysisStage(input.workflowStage)) {
    const remaining = input.controlTotal - input.controlConfirmed;
    if (remaining > 0) {
      return {
        label: `Sign off ${remaining} control${remaining === 1 ? "" : "s"}`,
        hint: `${input.controlConfirmed}/${input.controlTotal} validated`,
      };
    }
  }

  const action = resolveNextAction(ctx);
  return { label: action.label, hint: action.hint };
}

export function journeyPhaseLabel(id: JourneyPhaseId): string {
  return getJourneyPhase(id).label;
}
