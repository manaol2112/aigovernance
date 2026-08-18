/**
 * Pure wizard state helpers for the maturity survey.
 *
 * INVARIANTS (regression-tested — do not break):
 * 1. Wizard UI must render `progress.steps` — a stable list that does NOT shrink when
 *    the user answers. Never bind question cards or step indices to `navigationSteps`.
 * 2. Deep-dive baseline controls are removed from the wizard catalog up front via
 *    `prepareWizardCatalog`, not hidden at render time via a shrinking list.
 * 3. `navigationSteps` is only for resume/init (first unanswered step) and progress hints.
 */

import type { SurveyMode } from "@/lib/maturity-survey-mode";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { filterCatalogExcludingControls, countSurveyQuestions } from "@/lib/maturity-survey-types";
import {
  computeSurveyProgress,
  findStepCatalogIndex,
  type SurveyResponseLike,
} from "@/lib/maturity-survey-progress";

export function prepareWizardCatalog(
  catalog: SurveyPillarGroup[],
  mode: SurveyMode,
  seededControlIds: readonly string[]
): SurveyPillarGroup[] {
  if (mode !== "deep_dive" || seededControlIds.length === 0) return catalog;
  return filterCatalogExcludingControls(catalog, new Set(seededControlIds));
}

export function countWizardFollowUpQuestions(
  scopedCatalog: SurveyPillarGroup[],
  seededControlIds: readonly string[]
): number {
  return countSurveyQuestions(
    prepareWizardCatalog(scopedCatalog, "deep_dive", seededControlIds)
  );
}

/** Resolve saved step index on load — lands on first unanswered question when resuming. */
export function resolveInitialWizardStepIndex(
  steps: ReturnType<typeof computeSurveyProgress>["steps"],
  navigationSteps: ReturnType<typeof computeSurveyProgress>["navigationSteps"],
  savedCatalogIndex: number
): number {
  if (steps.length === 0) return 0;

  const firstPending = navigationSteps[0];
  if (firstPending) {
    const pendingIndex = findStepCatalogIndex(steps, firstPending);
    if (pendingIndex >= 0) return pendingIndex;
  }

  return Math.min(Math.max(0, savedCatalogIndex), steps.length - 1);
}

export function isDeepDiveQuestionsComplete(
  mode: SurveyMode,
  progress: Pick<
    ReturnType<typeof computeSurveyProgress>,
    "allComplete" | "totalSteps"
  >,
  seededControlCount: number
): boolean {
  if (mode !== "deep_dive") return progress.allComplete;
  return progress.allComplete || (progress.totalSteps === 0 && seededControlCount > 0);
}

export function buildWizardProgress(
  catalog: SurveyPillarGroup[],
  responses: SurveyResponseLike[]
) {
  return computeSurveyProgress(catalog, responses);
}

/** Guard for tests — steps must not change identity/length as answers are added. */
export function assertWizardStepsStayStable(
  before: ReturnType<typeof computeSurveyProgress>,
  after: ReturnType<typeof computeSurveyProgress>
): void {
  if (before.steps.length !== after.steps.length) {
    throw new Error("Wizard steps must not shrink or grow when responses change");
  }
  for (let i = 0; i < before.steps.length; i++) {
    const left = before.steps[i];
    const right = after.steps[i];
    if (
      left?.pillarId !== right?.pillarId ||
      left?.control.id !== right?.control.id
    ) {
      throw new Error("Wizard step order/identity changed after a response was saved");
    }
  }
}
