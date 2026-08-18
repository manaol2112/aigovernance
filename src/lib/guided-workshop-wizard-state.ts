import type { MaturityLevel } from "@prisma/client";
import {
  buildSurveyResponsesByStepKey,
  computeSurveyProgress,
  findStepCatalogIndex,
  isStepAnswered,
  type SurveyResponseLike,
} from "@/lib/maturity-survey-progress";
import { resolveInitialWizardStepIndex } from "@/lib/maturity-survey-wizard-state";
import type { SurveyPillarGroup, SurveyStep } from "@/lib/maturity-survey-types";

export type GuidedWorkshopWizardPhase =
  | "briefing"
  | "pillarSelect"
  | "questions"
  | "pillarComplete"
  | "review";

export type WorkshopResponseLike = {
  controlId: string;
  pillarId: string;
  maturity: MaturityLevel;
  facilitatorNotes?: string | null;
};

export type WorkshopPillarSummary = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  controlCount: number;
  answeredCount: number;
  progressPct: number;
  isComplete: boolean;
  firstStepIndex: number;
};

/** Decide which wizard screen to show when reopening a saved workshop. */
export function resolveInitialWorkshopPhase(
  responses: readonly SurveyResponseLike[],
  progress: Pick<
    ReturnType<typeof computeSurveyProgress>,
    "allComplete" | "answeredStepCount"
  >
): GuidedWorkshopWizardPhase {
  if (responses.length === 0 || progress.answeredStepCount === 0) return "briefing";
  if (progress.allComplete) return "review";
  return "questions";
}

export function resolveInitialWorkshopStepIndex(
  catalog: SurveyPillarGroup[],
  responses: readonly SurveyResponseLike[],
  savedStepIndex: number
): number {
  const progress = computeSurveyProgress(catalog, responses);
  if (progress.steps.length === 0) return 0;
  return resolveInitialWizardStepIndex(
    progress.steps,
    progress.navigationSteps,
    savedStepIndex
  );
}

export function buildWorkshopPillarSummaries(
  catalog: SurveyPillarGroup[],
  steps: SurveyStep[],
  responses: readonly SurveyResponseLike[]
): WorkshopPillarSummary[] {
  const responsesByStepKey = buildSurveyResponsesByStepKey(responses);

  return catalog
    .map((group) => {
      const pillarSteps = steps.filter((step) => step.pillarId === group.pillarId);
      if (pillarSteps.length === 0) return null;

      const answeredCount = pillarSteps.filter((step) =>
        isStepAnswered(step, responsesByStepKey)
      ).length;
      const firstStepIndex = findStepCatalogIndex(steps, pillarSteps[0]!);

      return {
        pillarId: group.pillarId,
        pillarLabel: group.pillarLabel,
        pillarDescription: group.pillarDescription,
        criticality: group.criticality,
        controlCount: pillarSteps.length,
        answeredCount,
        progressPct:
          pillarSteps.length > 0
            ? Math.round((answeredCount / pillarSteps.length) * 100)
            : 0,
        isComplete: answeredCount === pillarSteps.length,
        firstStepIndex: firstStepIndex >= 0 ? firstStepIndex : 0,
      };
    })
    .filter((summary): summary is WorkshopPillarSummary => summary != null);
}

/** First unanswered control in a pillar, or the first control if all are answered. */
export function resolvePillarEntryStepIndex(
  steps: SurveyStep[],
  pillarId: string,
  responses: readonly SurveyResponseLike[]
): number {
  const responsesByStepKey = buildSurveyResponsesByStepKey(responses);
  const pillarSteps = steps.filter((step) => step.pillarId === pillarId);
  if (pillarSteps.length === 0) return 0;

  const unanswered = pillarSteps.find((step) => !isStepAnswered(step, responsesByStepKey));
  const target = unanswered ?? pillarSteps[0]!;
  const index = findStepCatalogIndex(steps, target);
  return index >= 0 ? index : 0;
}

export function getAdjacentStepIndexInPillar(
  steps: SurveyStep[],
  stepIndex: number,
  direction: "next" | "prev"
): number | null {
  const current = steps[stepIndex];
  if (!current) return null;

  if (direction === "next") {
    for (let i = stepIndex + 1; i < steps.length; i++) {
      if (steps[i]!.pillarId === current.pillarId) return i;
    }
    return null;
  }

  for (let i = stepIndex - 1; i >= 0; i--) {
    if (steps[i]!.pillarId === current.pillarId) return i;
  }
  return null;
}

export function isLastStepInPillar(steps: SurveyStep[], stepIndex: number): boolean {
  return getAdjacentStepIndexInPillar(steps, stepIndex, "next") === null;
}

export function buildWorkshopResumeSummary(
  catalog: SurveyPillarGroup[],
  responses: readonly SurveyResponseLike[]
) {
  const progress = computeSurveyProgress(catalog, responses);
  return {
    answeredStepCount: progress.answeredStepCount,
    totalSteps: progress.totalSteps,
    progressPct: progress.progressPct,
    allComplete: progress.allComplete,
    phase: resolveInitialWorkshopPhase(responses, progress),
  };
}
