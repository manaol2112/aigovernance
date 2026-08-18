import type { MaturityLevel } from "@prisma/client";
import {
  MATURITY_LEVELS,
  MATURITY_LEVEL_GUIDANCE,
  MATURITY_SCORE,
} from "@/lib/maturity-survey-constants";

/** Normalized weight (0–100) for client-facing scorecards. */
export function maturityToWeightPct(level: MaturityLevel): number {
  const max = MATURITY_SCORE.optimized;
  return Math.round((MATURITY_SCORE[level] / max) * 100);
}

export type WorkshopAnswerOption = {
  level: MaturityLevel;
  label: string;
  headline: string;
  weightPct: number;
  /** Plain-language explanation for the client of what this rating means. */
  clientExplanation: string;
  /** How this answer contributes to the pillar score. */
  scoringNote: string;
};

const CLIENT_EXPLANATIONS: Record<MaturityLevel, { clientExplanation: string; scoringNote: string }> =
  {
    not_implemented: {
      clientExplanation:
        "No formal capability exists. This represents the highest governance exposure for this control area.",
      scoringNote: "Contributes 0% of the maximum possible points for this question.",
    },
    initial: {
      clientExplanation:
        "Awareness exists but practices are ad hoc. Risk remains elevated until ownership and documentation improve.",
      scoringNote: "Contributes ~17% of the maximum possible points for this question.",
    },
    developing: {
      clientExplanation:
        "Early or partial practices are in place in some teams, but not consistently across the organization.",
      scoringNote: "Contributes ~33% of the maximum possible points for this question.",
    },
    defined: {
      clientExplanation:
        "Policies and procedures are documented, though execution and measurement may still vary.",
      scoringNote: "Contributes ~50% of the maximum possible points for this question.",
    },
    managed: {
      clientExplanation:
        "The control operates with assigned owners, routine execution, and periodic review.",
      scoringNote: "Contributes ~67% of the maximum possible points for this question.",
    },
    optimized: {
      clientExplanation:
        "Leading practice with continuous improvement — benchmark-ready for audit and regulatory scrutiny.",
      scoringNote: "Contributes 100% of the maximum possible points for this question.",
    },
  };

export function getWorkshopAnswerOptions(): WorkshopAnswerOption[] {
  return MATURITY_LEVELS.map((level) => {
    const meta = CLIENT_EXPLANATIONS[level];
    const guidance = MATURITY_LEVEL_GUIDANCE[level];
    return {
      level,
      label: guidance.label,
      headline: guidance.headline,
      weightPct: maturityToWeightPct(level),
      clientExplanation: meta.clientExplanation,
      scoringNote: meta.scoringNote,
    };
  });
}

export function averageWeightPct(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function weightPctToMaturityBand(pct: number): "critical" | "developing" | "strong" {
  if (pct >= 67) return "strong";
  if (pct >= 40) return "developing";
  return "critical";
}
