import { displayStepIndex } from "@/lib/use-case-types";

export type ScopeSectionId = "overview" | "use_cases" | "requirements";

export const SCOPE_SECTION_ORDER: ScopeSectionId[] = ["overview", "use_cases", "requirements"];

export function scopeSectionToStage(section: ScopeSectionId): string {
  if (section === "requirements") return "requirement_scoping";
  if (section === "use_cases") return "use_cases";
  return "client_setup";
}

export function resolveScopeSectionForStage(workflowStage: string): ScopeSectionId {
  if (workflowStage === "requirement_scoping") return "requirements";
  if (workflowStage === "use_cases") return "use_cases";
  return "overview";
}

export function scopeSectionIndex(section: ScopeSectionId): number {
  return displayStepIndex(scopeSectionToStage(section));
}

/** Checkpoint that must be approved before advancing past the current workflow stage. */
export const SCOPE_STAGE_EXIT_CHECKPOINT: Record<string, string> = {
  client_setup: "scope_confirmation",
  use_cases: "use_case_confirmation",
  requirement_scoping: "requirement_scoping_confirmation",
};

export function isScopeSectionViewable(
  section: ScopeSectionId,
  workflowStage: string,
  useCaseCount: number
): boolean {
  if (section === "overview" || section === "use_cases") return true;
  return useCaseCount > 0 || displayStepIndex(workflowStage) >= scopeSectionIndex("requirements");
}

export type ScopeSectionNavStatus = "complete" | "active" | "available" | "locked";

export function resolveScopeSectionStatus(input: {
  section: ScopeSectionId;
  workflowStage: string;
  scopeSection: ScopeSectionId;
  useCaseCount: number;
}): ScopeSectionNavStatus {
  const { section, workflowStage, scopeSection, useCaseCount } = input;

  if (!isScopeSectionViewable(section, workflowStage, useCaseCount)) {
    return "locked";
  }

  const stageIdx = displayStepIndex(workflowStage);
  const sectionIdx = scopeSectionIndex(section);
  const selectedIdx = scopeSectionIndex(scopeSection);

  if (scopeSection === section) return "active";
  if (sectionIdx < stageIdx || sectionIdx < selectedIdx) return "complete";
  return "available";
}

/** Data readiness required before advancing past a scope workflow stage. */
export function canAdvanceScopeStage(
  workflowStage: string,
  _checkpointStatuses: Record<string, string | undefined>,
  context?: { useCaseCount: number; totalScoped: number }
): boolean {
  if (workflowStage === "client_setup") return true;
  if (workflowStage === "use_cases") return (context?.useCaseCount ?? 0) > 0;
  if (workflowStage === "requirement_scoping") return (context?.totalScoped ?? 0) > 0;
  return false;
}

export function nextScopeSection(section: ScopeSectionId): ScopeSectionId | null {
  const idx = SCOPE_SECTION_ORDER.indexOf(section);
  if (idx < 0 || idx >= SCOPE_SECTION_ORDER.length - 1) return null;
  return SCOPE_SECTION_ORDER[idx + 1] ?? null;
}

export function scopeAdvanceBlocker(input: {
  targetSection: ScopeSectionId;
  workflowStage: string;
  useCaseCount: number;
  checkpointStatuses: Record<string, string | undefined>;
}): string | null {
  const { targetSection, workflowStage, useCaseCount, checkpointStatuses } = input;
  const targetIdx = scopeSectionIndex(targetSection);
  const stageIdx = displayStepIndex(workflowStage);

  if (targetIdx <= stageIdx) return null;

  if (targetSection === "use_cases" && useCaseCount === 0) {
    return "Add at least one use case before continuing.";
  }

  if (targetSection === "requirements" && useCaseCount === 0) {
    return "Add use cases before requirement scoping.";
  }

  return null;
}
