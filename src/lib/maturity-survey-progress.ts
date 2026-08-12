import type { SurveyPillarGroup, SurveyStep } from "@/lib/maturity-survey-types";
import { buildSurveySteps } from "@/lib/maturity-survey-types";

export type SurveyResponseLike = {
  controlId: string;
  pillarId: string;
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

export function buildSurveyResponsesByStepKey(
  responses: SurveyResponseLike[]
): Map<string, SurveyResponseLike> {
  return new Map(
    responses.map((response) => [
      surveyStepResponseKey(response.pillarId, response.controlId),
      response,
    ])
  );
}

export function computeSurveyProgress(
  catalog: SurveyPillarGroup[],
  responses: SurveyResponseLike[]
): {
  steps: SurveyStep[];
  totalSteps: number;
  answeredStepCount: number;
  allComplete: boolean;
  unansweredSteps: SurveyStep[];
  progressPct: number;
} {
  const steps = buildSurveySteps(catalog);
  const byStepKey = buildSurveyResponsesByStepKey(responses);
  const unansweredSteps = steps.filter((step) => !isStepAnswered(step, byStepKey));
  const answeredStepCount = steps.length - unansweredSteps.length;
  const totalSteps = steps.length;
  const allComplete = totalSteps > 0 && unansweredSteps.length === 0;
  const progressPct =
    totalSteps > 0 ? Math.round((answeredStepCount / totalSteps) * 100) : 0;

  return {
    steps,
    totalSteps,
    answeredStepCount,
    allComplete,
    unansweredSteps,
    progressPct,
  };
}

export function validateSurveyReadyToSubmit(
  catalog: SurveyPillarGroup[],
  responses: SurveyResponseLike[]
): { ok: true } | { ok: false; missingLabels: string[] } {
  const { unansweredSteps } = computeSurveyProgress(catalog, responses);
  if (unansweredSteps.length === 0) return { ok: true };
  return {
    ok: false,
    missingLabels: unansweredSteps.map((step) => step.pillarLabel),
  };
}
