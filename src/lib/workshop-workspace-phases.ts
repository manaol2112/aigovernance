/** Workspace tabs — Governance Intelligence v2 flow. */
export const WORKSHOP_WORKSPACE_PHASES = [
  {
    id: "workshop" as const,
    label: "Workshop",
    shortLabel: "Workshop",
    subtitle: "Live notes & AI tagging",
    journeyId: "facilitate" as const,
  },
  {
    id: "notes" as const,
    label: "Evidence",
    shortLabel: "Evidence",
    subtitle: "Upload sources & run analysis",
    journeyId: "evidence" as const,
  },
  {
    id: "mapping" as const,
    label: "Mapping",
    shortLabel: "Mapping",
    subtitle: "Review findings, citations & traceability",
    journeyId: "validate" as const,
  },
  {
    id: "dependencies" as const,
    label: "Dependencies",
    shortLabel: "Graph",
    subtitle: "Blocked & unlock paths",
    journeyId: "validate" as const,
  },
  {
    id: "review" as const,
    label: "Validate",
    shortLabel: "Validate",
    subtitle: "Reviewer sign-off & disputes",
    journeyId: "validate" as const,
  },
  {
    id: "assessment_output" as const,
    label: "Assessment",
    shortLabel: "Scores",
    subtitle: "Multi-dimensional maturity",
    journeyId: "preview" as const,
  },
  {
    id: "roadmap" as const,
    label: "Roadmap",
    shortLabel: "Roadmap",
    subtitle: "ROI-ranked initiatives",
    journeyId: "preview" as const,
  },
  {
    id: "reporting" as const,
    label: "Preview",
    shortLabel: "Preview",
    subtitle: "Deliverable preview",
    journeyId: "preview" as const,
  },
] as const;

export type WorkshopWorkspacePhaseId = (typeof WORKSHOP_WORKSPACE_PHASES)[number]["id"];

export type WorkspaceJourneyId = (typeof WORKSHOP_WORKSPACE_PHASES)[number]["journeyId"];

export function getWorkspacePhase(id: WorkshopWorkspacePhaseId) {
  return WORKSHOP_WORKSPACE_PHASES.find((p) => p.id === id)!;
}

export function workspacePhaseToJourneyId(tab: WorkshopWorkspacePhaseId): WorkspaceJourneyId {
  return getWorkspacePhase(tab).journeyId;
}

export function journeyIdToWorkspacePhase(journeyId: WorkspaceJourneyId): WorkshopWorkspacePhaseId | null {
  const match = WORKSHOP_WORKSPACE_PHASES.find((p) => p.journeyId === journeyId);
  return match?.id ?? null;
}

/** Tab groups for visual separation in the workspace toolbar. */
export const WORKSPACE_TAB_GROUPS: Array<{
  journeyId: WorkspaceJourneyId;
  label: string;
  tabs: WorkshopWorkspacePhaseId[];
}> = (["facilitate", "evidence", "validate", "preview"] as const).map((journeyId) => ({
  journeyId,
  label:
    journeyId === "facilitate"
      ? "Workshop"
      : journeyId === "evidence"
        ? "Evidence"
        : journeyId === "validate"
          ? "Validate"
          : "Intelligence",
  tabs: WORKSHOP_WORKSPACE_PHASES.filter((p) => p.journeyId === journeyId).map((p) => p.id),
}));
