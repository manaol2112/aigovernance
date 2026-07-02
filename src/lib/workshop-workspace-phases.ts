/** Workspace tabs inside the engagement phase (facilitate → preview). */
export const WORKSHOP_WORKSPACE_PHASES = [
  {
    id: "workshop" as const,
    label: "Facilitate",
    shortLabel: "Facilitate",
    subtitle: "Conduct the assessment session",
    journeyId: "facilitate" as const,
  },
  {
    id: "notes" as const,
    label: "Evidence",
    shortLabel: "Evidence",
    subtitle: "Upload sources and map controls",
    journeyId: "evidence" as const,
  },
  {
    id: "review" as const,
    label: "Validate",
    shortLabel: "Validate",
    subtitle: "Confirm findings and citations",
    journeyId: "validate" as const,
  },
  {
    id: "reporting" as const,
    label: "Preview",
    shortLabel: "Preview",
    subtitle: "Review outputs before delivery",
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
