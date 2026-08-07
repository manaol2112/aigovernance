/** Client-safe follow-up question types (no Prisma). */

export type FollowUpQuestionItem = {
  id: string;
  text: string;
  source: "workshop" | "template" | "probe" | "custom";
  phaseLabel?: string;
};

export type ControlFollowUpEntry = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  pillarId: string;
  pillarLabel: string;
  ownerRole: string;
  complianceStatus: string;
  reason: "not_assessed" | "not_discussed" | "never_analyzed";
  standardQuestions: FollowUpQuestionItem[];
  customQuestions: FollowUpQuestionItem[];
  frameworkCodes: string[];
};

export type FollowUpPack = {
  assessmentId: string;
  generatedAt: string;
  totalInScope: number;
  coverageGapCount: number;
  entries: ControlFollowUpEntry[];
};
