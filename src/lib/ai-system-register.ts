import type {
  AiRegisterBuildType,
  AiRegisterBusinessCriticality,
  AiRegisterComplianceStatus,
  AiRegisterDecisionImpact,
  AiSystemLifecycleStatus,
  AiSystemRiskSource,
  ActorType,
  AutonomyLevel,
  DeploymentStage,
  RiskTier,
  UseCaseType,
  AISystemModelType,
} from "@prisma/client";

export const AI_SYSTEM_LIFECYCLE_OPTIONS: Array<{
  value: AiSystemLifecycleStatus;
  label: string;
}> = [
  { value: "discovery", label: "Discovery" },
  { value: "proposed", label: "Proposed" },
  { value: "pilot", label: "Pilot" },
  { value: "production", label: "Production" },
  { value: "suspended", label: "Suspended" },
  { value: "retired", label: "Retired" },
  { value: "prohibited_blocked", label: "Blocked / prohibited" },
];

export const AI_REGISTER_COMPLIANCE_OPTIONS: Array<{
  value: AiRegisterComplianceStatus;
  label: string;
}> = [
  { value: "not_required", label: "Not required" },
  { value: "screening", label: "Screening" },
  { value: "required", label: "Required" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "waived", label: "Waived" },
];

export const AI_REGISTER_DECISION_IMPACT_OPTIONS: Array<{
  value: AiRegisterDecisionImpact;
  label: string;
}> = [
  { value: "advisory", label: "Advisory only" },
  { value: "decision_support", label: "Decision support" },
  { value: "automated_recommendation", label: "Automated recommendation" },
  { value: "automated_decision", label: "Automated decision" },
  { value: "unclear", label: "Unclear" },
];

export const AI_REGISTER_BUILD_TYPE_OPTIONS: Array<{
  value: AiRegisterBuildType;
  label: string;
}> = [
  { value: "internal", label: "Internal build" },
  { value: "vendor", label: "Vendor" },
  { value: "open_source", label: "Open source" },
  { value: "mixed", label: "Mixed stack" },
];

export const ARTICLE_50_TRIGGER_OPTIONS = [
  "chatbot",
  "content_generation",
  "deepfake_synthetic",
  "emotion_recognition",
  "biometric_categorisation",
  "none",
] as const;

export const AI_CAPABILITY_OPTIONS = [
  { value: "genai", label: "Generative AI / LLM" },
  { value: "predictive", label: "Predictive / scoring" },
  { value: "recommendation", label: "Recommendation" },
  { value: "agentic", label: "Agentic / autonomous agents" },
  { value: "computer_vision", label: "Computer vision" },
  { value: "speech_audio", label: "Speech / audio" },
  { value: "nlp_classification", label: "NLP / classification" },
  { value: "optimization", label: "Optimization / planning" },
  { value: "biometric", label: "Biometric" },
  { value: "other", label: "Other" },
] as const;

export const REGULATORY_JURISDICTION_OPTIONS = [
  { value: "eu_ai_act", label: "EU AI Act" },
  { value: "gdpr", label: "GDPR / EU privacy" },
  { value: "uk", label: "UK" },
  { value: "us_federal", label: "US federal" },
  { value: "us_state", label: "US state (e.g. CO, CA)" },
  { value: "canada", label: "Canada" },
  { value: "apac", label: "APAC" },
  { value: "sector_specific", label: "Sector-specific (finance, health, etc.)" },
  { value: "none_unclear", label: "None / unclear" },
] as const;

export const AI_REGISTER_BUSINESS_CRITICALITY_OPTIONS: Array<{
  value: AiRegisterBusinessCriticality;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "mission_critical", label: "Mission critical" },
  { value: "unclear", label: "Unclear" },
];

export const AI_REGISTER_MODEL_TYPE_OPTIONS: Array<{
  value: AISystemModelType;
  label: string;
}> = [
  { value: "llm", label: "Foundation model / LLM" },
  { value: "ml", label: "Classical ML / predictive model" },
  { value: "agent", label: "Agent framework" },
  { value: "rule_based", label: "Rules / heuristics" },
];

export type AiSystemRegisterCreateInput = {
  organizationId: string;
  name: string;
  description: string;
  intendedPurpose?: string | null;
  useCaseType: UseCaseType;
  status?: AiSystemLifecycleStatus;
  department?: string | null;
  businessOwner?: string | null;
  technicalOwner?: string | null;
  riskOwner?: string | null;
  humanOversightOwner?: string | null;
  stewardTeam?: string | null;
  actorRole?: ActorType | null;
  euAnnexIiiRelevance?: string | null;
  euArticle50Triggers?: string[];
  friaStatus?: AiRegisterComplianceStatus;
  dpiaStatus?: AiRegisterComplianceStatus;
  ropaLinked?: boolean;
  sectorDomain?: string | null;
  applicableFrameworks?: string[];
  intendedUsers?: string[];
  affectedPopulations?: string | null;
  decisionImpact?: AiRegisterDecisionImpact;
  autonomyLevel?: AutonomyLevel;
  humanInTheLoop?: boolean;
  overrideEscalationPath?: string | null;
  aiCapabilities?: string[];
  customerFacing?: boolean;
  employeeFacing?: boolean;
  externalFacing?: boolean;
  criticalBusinessProcess?: boolean;
  businessCriticality?: AiRegisterBusinessCriticality;
  failureImpact?: string | null;
  regulatoryJurisdictions?: string[];
  prohibitedUseNotes?: string | null;
  developerProvider?: string | null;
  dataCategories?: string[];
  personalDataInvolved?: boolean;
  specialCategoryData?: boolean;
  dataSources?: string | null;
  dataOutputs?: string | null;
  retentionPolicy?: string | null;
  crossBorderTransfers?: boolean;
  lawfulBasis?: string | null;
  buildType?: AiRegisterBuildType;
  vendor?: string | null;
  modelProvider?: string | null;
  modelNameVersion?: string | null;
  modelType?: AISystemModelType;
  hostingLocation?: string | null;
  subprocessors?: string | null;
  trainsOnCustomerData?: string | null;
  contractDpaStatus?: string | null;
  dependencies?: string | null;
  regions?: string[];
  deploymentStage?: DeploymentStage;
  shadowAi?: boolean;
  nextAction?: string | null;
  riskTier?: RiskTier | null;
  riskSource?: AiSystemRiskSource;
  manualRiskRationale?: string | null;
  details?: Record<string, unknown> | null;
};

export function formatAiSystemCode(sequence: number): string {
  return `AI-SYS-${String(sequence).padStart(4, "0")}`;
}

export function validateOrganizationName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Organization name is required.";
  if (trimmed.length < 2) return "Organization name must be at least 2 characters.";
  return null;
}

export function validateAiSystemCreate(input: AiSystemRegisterCreateInput): string | null {
  if (!input.organizationId?.trim()) return "Organization is required.";
  if (!input.name?.trim()) return "System name is required.";
  if (!input.description?.trim()) return "Description is required.";
  if (!input.intendedPurpose?.trim()) return "AI use case / purpose is required.";
  if (!input.useCaseType) return "Use case type is required.";
  if (!input.businessOwner?.trim()) return "Business owner is required.";
  if (!input.technicalOwner?.trim()) return "AI system owner is required.";
  if (!input.aiCapabilities?.length) return "Select at least one AI capability.";
  if (input.riskSource === "manual") {
    if (!input.riskTier || input.riskTier === "general") {
      return "Select a risk tier when setting risk manually.";
    }
    if (!input.manualRiskRationale?.trim()) {
      return "Rationale is required when setting risk tier manually.";
    }
  }
  return null;
}

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}
