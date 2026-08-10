/** Client-safe survey mode metadata and types. */

export type SurveyMode = "quick" | "deep_dive";

export const SURVEY_MODE_META: Record<
  SurveyMode,
  { label: string; duration: string; questionHint: string; description: string }
> = {
  quick: {
    label: "Baseline scan",
    duration: "~10 minutes",
    questionHint: "10 questions",
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
