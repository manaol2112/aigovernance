import type { MaturityLevel } from "@prisma/client";
import type { SurveyPillarGroup, SurveyStep } from "@/lib/maturity-survey-types";
import { buildSurveySteps } from "@/lib/maturity-survey-types";

export type SurveyResponseLike = {
  controlId: string;
  pillarId: string;
  maturity?: MaturityLevel;
  notes?: string | null;
};

/** One saved response per survey step — pillars can share a control without cross-answering. */
export function surveyStepResponseKey(pillarId: string, controlId: string): string {
  return `${pillarId}:${controlId}`;
}

export function surveyStepResponseKeyFromStep(step: SurveyStep): string {
  return surveyStepResponseKey(step.pillarId, step.control.id);
}

export function isStepAnswered(
  step: SurveyStep,
  responsesByStepKey: Map<string, SurveyResponseLike>
): boolean {
  return responsesByStepKey.has(surveyStepResponseKeyFromStep(step));
}

export function isStepComplete(
  step: SurveyStep,
  responsesByStepKey: Map<string, SurveyResponseLike>,
  carriedForwardControlIds?: ReadonlySet<string>
): boolean {
  if (isStepAnswered(step, responsesByStepKey)) return true;
  return carriedForwardControlIds?.has(step.control.id) ?? false;
}

export function buildSurveyResponsesByStepKey(
  responses: readonly SurveyResponseLike[]
): Map<string, SurveyResponseLike> {
  return new Map(
    responses.map((response) => [
      surveyStepResponseKey(response.pillarId, response.controlId),
      response,
    ])
  );
}

export function stepsMatch(a: SurveyStep, b: SurveyStep): boolean {
  return a.pillarId === b.pillarId && a.control.id === b.control.id;
}

/** Pending-only list — for resume/init hints. NEVER use as the wizard render list. */
export function buildNavigationSteps(unansweredSteps: SurveyStep[]): SurveyStep[] {
  return unansweredSteps;
}

export function findStepCatalogIndex(steps: SurveyStep[], step: SurveyStep): number {
  return steps.findIndex((candidate) => stepsMatch(candidate, step));
}

export function resolveNavigationStepIndex(
  steps: SurveyStep[],
  navigationSteps: SurveyStep[],
  savedCatalogStepIndex: number
): number {
  if (navigationSteps.length === 0) return 0;

  const savedStep = steps[savedCatalogStepIndex];
  if (!savedStep) return 0;

  const navIndex = navigationSteps.findIndex((step) => stepsMatch(step, savedStep));
  return navIndex >= 0 ? navIndex : 0;
}

export function computeSurveyProgress(
  catalog: SurveyPillarGroup[],
  responses: readonly SurveyResponseLike[],
  options?: { carriedForwardControlIds?: ReadonlySet<string> }
): {
  steps: SurveyStep[];
  totalSteps: number;
  answeredStepCount: number;
  allComplete: boolean;
  unansweredSteps: SurveyStep[];
  navigationSteps: SurveyStep[];
  progressPct: number;
} {
  const steps = buildSurveySteps(catalog);
  const byStepKey = buildSurveyResponsesByStepKey(responses);
  const carriedForwardControlIds = options?.carriedForwardControlIds;
  const unansweredSteps = steps.filter(
    (step) => !isStepComplete(step, byStepKey, carriedForwardControlIds)
  );
  const answeredStepCount = steps.length - unansweredSteps.length;
  const totalSteps = steps.length;
  const allComplete = totalSteps > 0 && unansweredSteps.length === 0;
  const navigationSteps = buildNavigationSteps(unansweredSteps);
  const progressPct =
    totalSteps > 0 ? Math.round((answeredStepCount / totalSteps) * 100) : 0;

  return {
    steps,
    totalSteps,
    answeredStepCount,
    allComplete,
    unansweredSteps,
    navigationSteps,
    progressPct,
  };
}

export function validateSurveyReadyToSubmit(
  catalog: SurveyPillarGroup[],
  responses: SurveyResponseLike[]
): { ok: true } | { ok: false; missingLabels: string[] } {
  const steps = buildSurveySteps(catalog);
  const byStepKey = buildSurveyResponsesByStepKey(responses);
  const answeredControlIds = new Set(responses.map((response) => response.controlId));

  const missingSteps = steps.filter((step) => {
    if (isStepAnswered(step, byStepKey)) return false;
    return !answeredControlIds.has(step.control.id);
  });

  if (missingSteps.length === 0) return { ok: true };
  return {
    ok: false,
    missingLabels: missingSteps.map((step) => step.pillarLabel),
  };
}
