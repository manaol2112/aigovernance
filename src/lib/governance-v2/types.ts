/** Governance Intelligence v2 — shared types (client-safe where noted). */

export type StructuredSignals = {
  linkedControlId?: string;
  controlCode?: string;
  aiUsageDetected?: boolean;
  humanOversight?: string | null;
  dataSensitivity?: string | null;
  decisionType?: string | null;
  governancePractices?: string[];
  riskIndicators?: string[];
  controlEvidence?: string[];
  mentionedSystems?: string[];
};

export type ScoreFactor = {
  label: string;
  detail: string;
  impact: "+" | "−" | "=";
};

export type TraceabilityScoreBreakdown = {
  traceability: number | null;
  evidenceStrength: number;
  verificationStatus: "source_grounded" | "partially_grounded" | "unverified";
  citationCount: number;
  sourcedCitationCount: number;
  factors: ScoreFactor[];
  reviewerRequired: boolean;
};

export type DocumentationValidationStatus =
  | "validated"
  | "partial"
  | "claimed_only"
  | "missing"
  | "not_validated"
  | "not_applicable";

export type DocumentationValidationItem = {
  expectedEvidenceId: string;
  evidenceType: string;
  description: string;
  status: DocumentationValidationStatus;
  workshopClaimed: boolean;
  uploadedFileIds: string[];
  uploadedFileNames: string[];
  validationNotes: string;
  frameworkRefs: string[];
};

export type DocumentationValidationResult = {
  validatedAt: string;
  overallStatus: "complete" | "partial" | "gaps";
  coveragePct: number;
  items: DocumentationValidationItem[];
  summary: string;
};

export type ExplainabilityPayload = {
  whyClassification: string;
  evidenceTriggers: string[];
  frameworkRequirements: string[];
  whatWouldChangeOutcome: string[];
  scoreBreakdown?: TraceabilityScoreBreakdown;
  documentationValidation?: DocumentationValidationResult;
};

export type GovernanceRoiInputs = {
  riskReduction: number;
  complianceCoverage: number;
  dependencyUnlock: number;
  effort: number;
};

export type DependencyNode = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  impactScore: number;
  implementationStatus?: string;
  blocked: boolean;
};

export type DependencyEdge = {
  id: string;
  fromControlId: string;
  toControlId: string;
  relationType: "depends_on" | "enables" | "blocked_by";
  impactScore: number;
  rationale?: string | null;
};

export type DependencyGraph = {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  blockedControlIds: string[];
  unlockPaths: Array<{ controlId: string; path: string[] }>;
};

export type ScoringDimensions = {
  evidenceStrength: number;
  controlEffectiveness: number;
  riskExposure: number;
  dependencyCompleteness: number;
};

export type GovernanceScoreResult = {
  overallMaturityPct: number;
  riskAdjustedMaturityPct: number;
  confidenceAdjustedMaturityPct: number;
  dimensions: ScoringDimensions;
  byPillar: Array<{
    pillarId: string;
    pillarLabel: string;
    maturityPct: number;
    confidencePct: number;
  }>;
};

export type SystematicAmbiguityReport = {
  openDisagreements: number;
  patterns: Array<{ tag: string; count: number; examples: string[] }>;
  topMismatchFields: string[];
};

export function computeGovernanceRoi(input: GovernanceRoiInputs): number {
  const { riskReduction, complianceCoverage, dependencyUnlock, effort } = input;
  const numerator = riskReduction + complianceCoverage + dependencyUnlock;
  return effort > 0 ? Math.round((numerator / effort) * 100) / 100 : numerator;
}

export function complianceToImplementationStatus(
  compliance: string
): "missing" | "partial" | "implemented" | "effective" {
  if (compliance === "aligned") return "effective";
  if (compliance === "partial") return "partial";
  if (compliance === "gap" || compliance === "not_assessed") return "missing";
  return "partial";
}

export function implementationToCompliance(status: string): string {
  switch (status) {
    case "effective":
      return "aligned";
    case "implemented":
      return "aligned";
    case "partial":
      return "partial";
    case "missing":
    default:
      return "gap";
  }
}
