/** Client-safe survey mode metadata and types. */

export type SurveyMode = "quick" | "deep_dive";

export const SURVEY_MODE_META: Record<
  SurveyMode,
  { label: string; duration: string; questionHint: string; description: string }
> = {
  quick: {
    label: "Quick scan",
    duration: "~10 minutes",
    questionHint: "10 questions",
    description:
      "One critical question per risk pillar — ideal for executives and first-pass maturity checks.",
  },
  deep_dive: {
    label: "Deep dive",
    duration: "~30–45 minutes",
    questionHint: "Full control set",
    description:
      "Assess every canonical control in scope — for detailed gap analysis and audit preparation.",
  },
};

export const DEFAULT_SURVEY_MODE: SurveyMode = "quick";
