import type { MaturityLevel } from "@prisma/client";
import {
  MATURITY_LEVELS,
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_RATING_INSTRUCTIONS,
} from "@/lib/maturity-survey-constants";
import { formatCountPhrase, formatUnitCount } from "@/lib/format-unit-count";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";

/** Baseline scan always targets one question per risk pillar. */
export const BASELINE_SCAN_PILLAR_COUNT = RISK_PILLARS.length;

export type MaturityBriefingPillar = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
};

export type MaturitySurveyBriefing = {
  questionCount: number;
  expectedQuestionCount: number;
  pillarCount: number;
  frameworkLabels: string[];
  pillars: MaturityBriefingPillar[];
  maturityLevels: Array<{
    level: MaturityLevel;
    label: string;
    headline: string;
    goodLooksLike: string;
    color: string;
  }>;
  ratingInstructions: typeof MATURITY_RATING_INSTRUCTIONS;
};

function defaultMaturityLevels(): MaturitySurveyBriefing["maturityLevels"] {
  return MATURITY_LEVELS.map((level) => ({
    level,
    label: MATURITY_LEVEL_GUIDANCE[level].label,
    headline: MATURITY_LEVEL_GUIDANCE[level].headline,
    goodLooksLike: MATURITY_LEVEL_GUIDANCE[level].goodLooksLike,
    color: MATURITY_LEVEL_GUIDANCE[level].color,
  }));
}

function normalizePillar(
  raw: Partial<MaturityBriefingPillar> & { pillarId?: string }
): MaturityBriefingPillar | null {
  if (!raw.pillarId) return null;
  const pillarMeta = RISK_PILLARS.find((p) => p.id === raw.pillarId);
  return {
    pillarId: raw.pillarId,
    pillarLabel: raw.pillarLabel ?? pillarMeta?.label ?? raw.pillarId,
    pillarDescription: raw.pillarDescription ?? pillarMeta?.description ?? "",
    criticality: raw.criticality ?? pillarMeta?.criticality ?? "medium",
  };
}

/** Coerce API / cached payloads into a complete briefing — prevents "undefined" in UI. */
export function normalizeMaturitySurveyBriefing(
  raw: Partial<MaturitySurveyBriefing> | null | undefined
): MaturitySurveyBriefing | null {
  if (!raw) return null;

  const pillars = (Array.isArray(raw.pillars) ? raw.pillars : [])
    .map((pillar) => normalizePillar(pillar))
    .filter((pillar): pillar is MaturityBriefingPillar => pillar != null);

  if (pillars.length === 0) return null;

  const questionCount =
    typeof raw.questionCount === "number" && Number.isFinite(raw.questionCount)
      ? raw.questionCount
      : pillars.length;

  const expectedQuestionCount =
    typeof raw.expectedQuestionCount === "number" &&
    Number.isFinite(raw.expectedQuestionCount)
      ? raw.expectedQuestionCount
      : Math.max(BASELINE_SCAN_PILLAR_COUNT, questionCount);

  const pillarCount =
    typeof raw.pillarCount === "number" && Number.isFinite(raw.pillarCount)
      ? raw.pillarCount
      : pillars.length;

  const frameworkLabels = Array.isArray(raw.frameworkLabels)
    ? raw.frameworkLabels.filter((label): label is string => typeof label === "string" && label.length > 0)
    : [];

  const maturityLevels =
    Array.isArray(raw.maturityLevels) && raw.maturityLevels.length > 0
      ? raw.maturityLevels.map((level, index) => ({
          level: level.level ?? MATURITY_LEVELS[index] ?? "not_implemented",
          label: level.label ?? MATURITY_LEVEL_GUIDANCE[MATURITY_LEVELS[index] ?? "not_implemented"].label,
          headline:
            level.headline ??
            MATURITY_LEVEL_GUIDANCE[MATURITY_LEVELS[index] ?? "not_implemented"].headline,
          goodLooksLike:
            level.goodLooksLike ??
            MATURITY_LEVEL_GUIDANCE[MATURITY_LEVELS[index] ?? "not_implemented"].goodLooksLike,
          color:
            level.color ??
            MATURITY_LEVEL_GUIDANCE[MATURITY_LEVELS[index] ?? "not_implemented"].color,
        }))
      : defaultMaturityLevels();

  const ratingInstructions = {
    title: raw.ratingInstructions?.title ?? MATURITY_RATING_INSTRUCTIONS.title,
    summary: raw.ratingInstructions?.summary ?? MATURITY_RATING_INSTRUCTIONS.summary,
    honestyNote:
      raw.ratingInstructions?.honestyNote ?? MATURITY_RATING_INSTRUCTIONS.honestyNote,
  };

  return {
    questionCount,
    expectedQuestionCount,
    pillarCount,
    frameworkLabels,
    pillars,
    maturityLevels,
    ratingInstructions,
  };
}

export function getBriefingQuestionCount(briefing: MaturitySurveyBriefing): number {
  return briefing.expectedQuestionCount ?? briefing.questionCount ?? BASELINE_SCAN_PILLAR_COUNT;
}

/** User-facing briefing copy — always pre-formatted strings, never JSX adjacency. */
export function formatBriefingDomainsHeadline(count: number): string {
  return formatCountPhrase(count, "domain", "you'll rate");
}

export function formatBriefingGovernanceDomains(count: number): string {
  return formatUnitCount(count, "governance domain", "governance domains");
}

export function formatBriefingOverviewMeta(domainCount: number, frameworkCount: number): string {
  return `${formatUnitCount(domainCount, "domain")} · ${formatUnitCount(frameworkCount, "framework")}`;
}

export function formatBriefingStep3Footer(
  domainCount: number,
  frameworkLabels: string[]
): string {
  const frameworks =
    frameworkLabels.length > 0 ? frameworkLabels.join(", ") : "selected frameworks";
  return `${formatUnitCount(domainCount, "domain")} · ${frameworks}`;
}

export function formatBriefingFrameworksInScope(frameworkCount: number): string {
  return `${formatUnitCount(frameworkCount, "framework")} in scope`;
}

export function formatBriefingFrameworks(labels: string[]): string {
  return labels.length > 0 ? labels.join(" · ") : "your selected frameworks";
}

export function buildMaturitySurveyBriefing(
  catalog: SurveyPillarGroup[],
  frameworkLabels: string[]
): MaturitySurveyBriefing {
  const questionCount = countSurveyQuestions(catalog);
  return normalizeMaturitySurveyBriefing({
    questionCount,
    expectedQuestionCount: Math.max(BASELINE_SCAN_PILLAR_COUNT, questionCount),
    pillarCount: catalog.length,
    frameworkLabels,
    pillars: catalog.map((group) => ({
      pillarId: group.pillarId,
      pillarLabel: group.pillarLabel,
      pillarDescription: group.pillarDescription,
      criticality: group.criticality,
    })),
    maturityLevels: defaultMaturityLevels(),
    ratingInstructions: MATURITY_RATING_INSTRUCTIONS,
  })!;
}
