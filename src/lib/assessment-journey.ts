import { isAnalysisStage } from "@/lib/use-case-types";
import type { WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import {
  journeyIdToWorkspacePhase,
  workspacePhaseToJourneyId,
  type WorkspaceJourneyId,
} from "@/lib/workshop-workspace-phases";

export type JourneyPhaseId = WorkspaceJourneyId | "scope" | "deliver";

export type JourneyPhaseDef = {
  id: JourneyPhaseId;
  label: string;
  subtitle: string;
  /** Workflow stages that activate this phase (setup / deliver). */
  workflowStages?: string[];
  /** Workspace tab when in engagement. */
  workspaceTab?: WorkshopWorkspacePhaseId;
};

/** Unified assessment journey — single mental model for facilitators and reviewers. */
export const ASSESSMENT_JOURNEY_PHASES: JourneyPhaseDef[] = [
  {
    id: "scope",
    label: "Scope",
    subtitle: "Client, use cases, and requirements",
    workflowStages: ["client_setup", "use_cases", "requirement_scoping"],
  },
  {
    id: "facilitate",
    label: "Facilitate",
    subtitle: "Workshop session guides",
    workspaceTab: "workshop",
  },
  {
    id: "evidence",
    label: "Evidence",
    subtitle: "Upload sources and run analysis",
    workspaceTab: "notes",
  },
  {
    id: "validate",
    label: "Validate",
    subtitle: "Confirm findings and sign off",
    workspaceTab: "review",
  },
  {
    id: "preview",
    label: "Preview",
    subtitle: "Review outputs before delivery",
    workspaceTab: "reporting",
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

export function getJourneyPhase(id: JourneyPhaseId): JourneyPhaseDef {
  return ASSESSMENT_JOURNEY_PHASES.find((p) => p.id === id)!;
}

export function resolveActiveJourneyPhase(
  workflowStage: string,
  workspaceTab?: WorkshopWorkspacePhaseId
): JourneyPhaseId {
  if (DELIVER_STAGES.has(workflowStage)) return "deliver";
  if (isAnalysisStage(workflowStage)) {
    return workspaceTab ? workspacePhaseToJourneyId(workspaceTab) : "facilitate";
  }
  if (SCOPE_STAGES.has(workflowStage)) return "scope";
  return "scope";
}

export function journeyPhaseIndex(id: JourneyPhaseId): number {
  return ASSESSMENT_JOURNEY_PHASES.findIndex((p) => p.id === id);
}

export function isJourneyPhaseReachable(
  target: JourneyPhaseId,
  workflowStage: string,
  workspaceInitialized: boolean,
  workspaceTab?: WorkshopWorkspacePhaseId
): boolean {
  const targetIdx = journeyPhaseIndex(target);
  const active = resolveActiveJourneyPhase(workflowStage, workspaceTab);
  const activeIdx = journeyPhaseIndex(active);

  if (target === "scope") return true;
  if (target === "deliver") {
    return DELIVER_STAGES.has(workflowStage) || activeIdx >= journeyPhaseIndex("validate");
  }
  if (SCOPE_STAGES.has(workflowStage)) return false;
  if (!workspaceInitialized) {
    if (isAnalysisStage(workflowStage) && target === "facilitate") return true;
    return false;
  }
  if (isAnalysisStage(workflowStage)) {
    return targetIdx <= activeIdx + 1;
  }
  return targetIdx <= activeIdx + 1;
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
        label: "Run requirement scoping",
        hint: "Map framework requirements to canonical controls.",
        journeyPhase: "scope",
      };
    }
    if (workflowStage === "requirement_scoping" && ctx.scopingCheckpointStatus === "pending") {
      return {
        label: "Approve scoped requirements",
        hint: ctx.pendingCheckpointTitle ?? "Confirm scope before starting the engagement workspace.",
        journeyPhase: "scope",
      };
    }
    if (workflowStage === "requirement_scoping" && ctx.scopingCheckpointStatus === "approved") {
      return {
        label: "Prepare assessment workspace",
        hint: "Initialize controls for workshop, evidence, and validation.",
        journeyPhase: "facilitate",
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

    if (ctx.workspaceTab === "workshop" || !ctx.workspaceTab) {
      return {
        label: "Run workshop session",
        hint: "Use facilitation guides, then upload notes in Evidence.",
        journeyPhase: "facilitate",
        workspaceTab: "workshop",
      };
    }

    if (ctx.workspaceTab === "notes") {
      if (ctx.analysisStale) {
        return {
          label: "Re-run governance analysis",
          hint: "Sources changed since the last analysis run.",
          journeyPhase: "evidence",
          workspaceTab: "notes",
        };
      }
      if (!ctx.hasAnalysis) {
        return {
          label: "Upload sources and analyze",
          hint: "Add workshop transcripts, then run governance analysis.",
          journeyPhase: "evidence",
          workspaceTab: "notes",
        };
      }
      return {
        label: "Review control mapping",
        hint: "Confirm evidence mapped to controls, then proceed to validation.",
        journeyPhase: "evidence",
        workspaceTab: "notes",
      };
    }

    if (ctx.workspaceTab === "review") {
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
        label: "Preview reports",
        hint: "Review executive outputs before proceeding to client package.",
        journeyPhase: "preview",
        workspaceTab: "reporting",
      };
    }

    if (ctx.workspaceTab === "reporting") {
      return {
        label: "Proceed to client package",
        hint: "Move to formal deliverables when validation is complete.",
        journeyPhase: "deliver",
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
