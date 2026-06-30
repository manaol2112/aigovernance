export type RequirementRef = {
  id: string;
  frameworkCode: string;
  clauseId: string;
  title: string;
  requirementText: string;
  theme: string | null;
  coverage: string;
  inAssessmentScope: boolean;
};
