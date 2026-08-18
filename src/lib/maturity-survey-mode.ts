/** Client-safe survey mode metadata and types. */

import { RISK_PILLARS } from "@/lib/risk-pillars";

export type SurveyMode = "quick" | "deep_dive";

const BASELINE_QUESTION_COUNT = RISK_PILLARS.length;

export const SURVEY_MODE_META: Record<
  SurveyMode,
  { label: string; duration: string; questionHint: string; description: string }
> = {
  quick: {
    label: "Baseline scan",
    duration: `~${BASELINE_QUESTION_COUNT} minutes`,
    questionHint: `${BASELINE_QUESTION_COUNT} questions`,
    description:
      "One focused question per risk pillar — the recommended starting point for leadership teams.",
  },
  deep_dive: {
    label: "Detailed pillar assessment",
    duration: "~15–30 minutes",
    questionHint: "Full pillar review",
    description:
      "Expand one pillar with detailed control questions and a documentation review — available after your baseline scan.",
  },
};

export const DEFAULT_SURVEY_MODE: SurveyMode = "quick";

export function getSurveyModeMeta(mode: SurveyMode | string | null | undefined) {
  return SURVEY_MODE_META[mode === "deep_dive" ? "deep_dive" : "quick"];
}
