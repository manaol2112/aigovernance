/** Four-phase workshop workspace navigation (Option A — enterprise assessment flow). */
export const WORKSHOP_WORKSPACE_PHASES = [
  {
    id: "workshop" as const,
    label: "Workshop",
    subtitle: "Conduct the assessment session",
  },
  {
    id: "notes" as const,
    label: "Evidence & Analysis",
    shortLabel: "Evidence",
    subtitle: "Upload sources, map controls",
  },
  {
    id: "review" as const,
    label: "Validation",
    subtitle: "Confirm findings and citations",
  },
  {
    id: "reporting" as const,
    label: "Reports",
    subtitle: "Executive outputs and deliverables",
  },
] as const;

export type WorkshopWorkspacePhaseId = (typeof WORKSHOP_WORKSPACE_PHASES)[number]["id"];

export function getWorkspacePhase(id: WorkshopWorkspacePhaseId) {
  return WORKSHOP_WORKSPACE_PHASES.find((p) => p.id === id)!;
}
