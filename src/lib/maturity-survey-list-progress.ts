import type { SurveyMode } from "@/lib/maturity-survey-mode";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { countSurveyQuestions, filterCatalogByPillars } from "@/lib/maturity-survey-types";
import { prepareWizardCatalog } from "@/lib/maturity-survey-wizard-state";

export type SurveyListProgressInput = {
  questionCatalogSource: "framework" | "pack" | string;
  surveyMode: SurveyMode;
  focusPillarIds: string[];
  packQuestionCount: number;
  packResponseCount: number;
  frameworkResponseCount: number;
  /** Full mode catalog before focus / baseline exclusions. */
  frameworkCatalog: SurveyPillarGroup[];
  /** Control IDs carried from a parent quick scan (deep-dive only). */
  seededControlIds: string[];
};

export type SurveyListProgress = {
  responseCount: number;
  totalQuestions: number;
};

/**
 * Progress shown on resume/list cards.
 * Matches wizard math: focus pillars + deep-dive baselines excluded from totals,
 * and seeded baseline answers excluded from the answered count.
 */
export function computeSurveyListProgress(input: SurveyListProgressInput): SurveyListProgress {
  if (input.questionCatalogSource === "pack") {
    return {
      responseCount: input.packResponseCount,
      totalQuestions: input.packQuestionCount,
    };
  }

  const scoped = filterCatalogByPillars(input.frameworkCatalog, input.focusPillarIds);
  const wizardCatalog = prepareWizardCatalog(
    scoped,
    input.surveyMode,
    input.seededControlIds
  );
  const seeded = new Set(input.seededControlIds);
  const answeredFollowUps = Math.max(0, input.frameworkResponseCount - seeded.size);

  return {
    responseCount: answeredFollowUps,
    totalQuestions: countSurveyQuestions(wizardCatalog),
  };
}
