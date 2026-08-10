import type { SurveyPillarGroup, SurveyStep } from "@/lib/maturity-survey-types";
import { buildSurveySteps } from "@/lib/maturity-survey-types";

export type SurveyResponseLike = {
  controlId: string;
  pillarId: string;
};

export function isStepAnswered(
  step: SurveyStep,
  responsesByControlId: Map<string, SurveyResponseLike>
): boolean {
  return responsesByControlId.has(step.control.id);
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
  const byControl = new Map(responses.map((r) => [r.controlId, r]));
  const unansweredSteps = steps.filter((s) => !isStepAnswered(s, byControl));
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
    missingLabels: unansweredSteps.map((s) => s.pillarLabel),
  };
}
