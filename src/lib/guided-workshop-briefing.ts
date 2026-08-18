import { getFrameworkShortLabel } from "@/lib/framework-library";
import { getPillarCriticalQuestion } from "@/lib/maturity-survey-quick-questions";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import { countSurveyQuestions } from "@/lib/maturity-survey-types";

export type GuidedWorkshopBriefingPillar = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  controlCount: number;
  criticalQuestion: string;
};

export type GuidedWorkshopBriefing = {
  organizationName: string;
  facilitatorName: string | null;
  clientContactName: string | null;
  frameworkLabels: string[];
  totalQuestions: number;
  pillarCount: number;
  pillars: GuidedWorkshopBriefingPillar[];
};

export const WORKSHOP_ANSWER_INSTRUCTIONS = [
  {
    title: "Use the discussion guide",
    description:
      "Each control includes a discussion guide you can review together. Use it to align on what the question is asking before selecting an answer.",
  },
  {
    title: "Select one statement only",
    description:
      "Choose the single statement that best describes your organisation's current practice today — not aspirational future state.",
  },
  {
    title: "Map conversation to options",
    description:
      "If discussion spans multiple levels, agree on the closest match. When uncertain, select the lower maturity level until evidence supports a higher rating.",
  },
  {
    title: "No free-text scoring",
    description:
      "Answers are structured maturity ratings (levels 1–6). Narrative context can be discussed live, but the recorded answer is always one of the predefined statements.",
  },
] as const;

export const WORKSHOP_EXPECTATIONS = [
  {
    title: "What this workshop covers",
    description:
      "A live walkthrough of framework-mapped governance controls across eleven risk pillars — aligned to the standards you selected at setup.",
  },
  {
    title: "What you will receive",
    description:
      "A pillar-level scorecard, maturity summary, and client-presentable results showing strengths, priority areas, and how ratings were derived.",
  },
  {
    title: "Time and pace",
    description:
      "Questions are grouped by pillar. Choose any pillar to start or switch focus anytime — progress saves automatically as you go.",
  },
  {
    title: "Who should participate",
    description:
      "Include owners who can speak to policy, operations, and evidence for each pillar (e.g. risk, legal, technology, and business leads).",
  },
] as const;

export function buildGuidedWorkshopBriefing(input: {
  catalog: SurveyPillarGroup[];
  organizationName: string | null;
  facilitatorName?: string | null;
  clientContactName?: string | null;
  frameworkCodes: string[];
}): GuidedWorkshopBriefing {
  const pillars: GuidedWorkshopBriefingPillar[] = input.catalog.map((group) => {
    const critical = getPillarCriticalQuestion(group.pillarId);
    return {
      pillarId: group.pillarId,
      pillarLabel: group.pillarLabel,
      pillarDescription: group.pillarDescription,
      criticality: group.criticality,
      controlCount: group.controls.length,
      criticalQuestion: critical.prompt,
    };
  });

  return {
    organizationName: input.organizationName?.trim() || "Your organisation",
    facilitatorName: input.facilitatorName?.trim() || null,
    clientContactName: input.clientContactName?.trim() || null,
    frameworkLabels: input.frameworkCodes.map(getFrameworkShortLabel),
    totalQuestions: countSurveyQuestions(input.catalog),
    pillarCount: pillars.length,
    pillars,
  };
}
