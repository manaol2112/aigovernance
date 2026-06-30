import type { UseCaseType, ActorType, RiskTier } from "@prisma/client";

export type UseCaseTypeDef = {
  value: UseCaseType;
  label: string;
  description: string;
  defaultActor: ActorType;
  defaultRiskTier: RiskTier;
  dataCategories: string[];
  themes: string[];
  euHighRisk: boolean;
};

export const USE_CASE_TYPES: UseCaseTypeDef[] = [
  {
    value: "client_facing_product",
    label: "Client-Facing AI Product",
    description: "AI features embedded in products or services sold to external customers (chatbots, recommendations, credit scoring).",
    defaultActor: "provider",
    defaultRiskTier: "high",
    dataCategories: ["personal", "customer", "transactional"],
    themes: ["Transparency", "Fairness", "Human oversight", "Safety"],
    euHighRisk: true,
  },
  {
    value: "internal_operations_tool",
    label: "Internal Operations Tool",
    description: "AI used to automate or assist internal business processes (workflow automation, document processing, forecasting).",
    defaultActor: "deployer",
    defaultRiskTier: "limited",
    dataCategories: ["operational", "internal"],
    themes: ["Governance", "Risk management", "Documentation"],
    euHighRisk: false,
  },
  {
    value: "employee_workforce_ai",
    label: "Employee / Workforce AI",
    description: "AI for hiring, performance evaluation, scheduling, monitoring, or employee support (high fundamental rights impact).",
    defaultActor: "deployer",
    defaultRiskTier: "high",
    dataCategories: ["personal", "employment", "biometric"],
    themes: ["Fairness", "Human oversight", "Fundamental rights"],
    euHighRisk: true,
  },
  {
    value: "automated_decision_support",
    label: "Automated Decision Support",
    description: "AI that informs or makes decisions affecting individuals (eligibility, pricing, access, prioritization).",
    defaultActor: "deployer",
    defaultRiskTier: "high",
    dataCategories: ["personal", "financial", "health"],
    themes: ["Transparency", "Fairness", "Human oversight", "Accountability"],
    euHighRisk: true,
  },
  {
    value: "autonomous_agent_system",
    label: "Autonomous Agent System",
    description: "AI agents that execute multi-step tasks with minimal human intervention (agentic workflows, auto-approvals).",
    defaultActor: "deployer",
    defaultRiskTier: "high",
    dataCategories: ["operational", "personal", "system"],
    themes: ["Human oversight", "Safety", "Security", "Risk management"],
    euHighRisk: true,
  },
  {
    value: "generative_ai_content",
    label: "Generative AI Content",
    description: "LLM/GenAI for content creation, summarization, code generation, or customer communications.",
    defaultActor: "deployer",
    defaultRiskTier: "limited",
    dataCategories: ["content", "intellectual_property", "personal"],
    themes: ["Transparency", "Accuracy", "Copyright", "Safety"],
    euHighRisk: false,
  },
  {
    value: "biometric_identification",
    label: "Biometric Identification",
    description: "Facial recognition, voice identification, or other biometric categorization systems.",
    defaultActor: "provider",
    defaultRiskTier: "prohibited",
    dataCategories: ["biometric", "personal", "sensitive"],
    themes: ["Fundamental rights", "Legal", "Human oversight"],
    euHighRisk: true,
  },
  {
    value: "critical_infrastructure",
    label: "Critical Infrastructure AI",
    description: "AI in energy, transport, healthcare, water, or other essential services (safety-critical).",
    defaultActor: "provider",
    defaultRiskTier: "high",
    dataCategories: ["operational", "safety", "personal"],
    themes: ["Safety", "Robustness", "Security", "Incident response"],
    euHighRisk: true,
  },
  {
    value: "third_party_saas_embedded",
    label: "Third-Party / Embedded AI (SaaS)",
    description: "Vendor-provided AI embedded via API or SaaS (Copilot, embedded ML APIs, third-party models).",
    defaultActor: "deployer",
    defaultRiskTier: "limited",
    dataCategories: ["vendor", "personal", "operational"],
    themes: ["Supply chain", "Governance", "Third-party risk"],
    euHighRisk: false,
  },
  {
    value: "research_prototype",
    label: "Research / Prototype (Pre-Production)",
    description: "Experimental or R&D AI not yet deployed to production users.",
    defaultActor: "general",
    defaultRiskTier: "minimal",
    dataCategories: ["research", "synthetic"],
    themes: ["Governance", "Documentation", "Ethics review"],
    euHighRisk: false,
  },
  {
    value: "gpai_provider",
    label: "GPAI Model Provider",
    description: "Organization developing or providing general-purpose AI foundation models.",
    defaultActor: "provider",
    defaultRiskTier: "gpai",
    dataCategories: ["training_data", "model_weights", "systemic"],
    themes: ["GPAI", "Systemic risk", "Documentation", "Evaluation"],
    euHighRisk: false,
  },
  {
    value: "gpai_deployer",
    label: "GPAI Model Deployer / Integrator",
    description: "Organization integrating third-party foundation models into products or internal systems.",
    defaultActor: "deployer",
    defaultRiskTier: "gpai",
    dataCategories: ["prompts", "personal", "operational"],
    themes: ["Transparency", "Human oversight", "Third-party risk"],
    euHighRisk: false,
  },
];

export function getUseCaseTypeDef(type: UseCaseType): UseCaseTypeDef {
  return USE_CASE_TYPES.find((t) => t.value === type) ?? USE_CASE_TYPES[0];
}

export const DATA_CATEGORY_OPTIONS = [
  "personal",
  "sensitive",
  "biometric",
  "financial",
  "health",
  "employment",
  "customer",
  "operational",
  "training_data",
  "vendor",
  "public",
  "synthetic",
];

export const WORKFLOW_STEPS = [
  { stage: "client_setup", label: "Client & Frameworks", number: 1 },
  { stage: "use_cases", label: "Use Cases", number: 2 },
  { stage: "requirement_scoping", label: "Requirement Scoping", number: 3 },
  { stage: "workshop", label: "Workshop & Analysis", number: 4 },
  { stage: "deliverables", label: "Deliverables", number: 5 },
  { stage: "finalized", label: "Finalized", number: 6 },
] as const;

/** Maps legacy stages to the combined stepper index for display. */
export function displayStepIndex(stage: string): number {
  if (stage === "evaluation" || stage === "human_review") return 3;
  if (stage === "deliverables") return 4;
  if (stage === "finalized") return 5;
  const idx = WORKFLOW_STEPS.findIndex((s) => s.stage === stage);
  return idx >= 0 ? idx : 0;
}

export function isAnalysisStage(stage: string): boolean {
  return stage === "workshop" || stage === "evaluation" || stage === "human_review";
}
