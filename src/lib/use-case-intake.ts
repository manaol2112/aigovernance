import type {
  ActorType,
  AutonomyLevel,
  DeploymentStage,
  RiskTier,
  UseCaseType,
} from "@prisma/client";
import { getUseCaseTypeDef } from "@/lib/use-case-types";

export type UseCaseIntakeMode = "established" | "discovery";

export type UseCaseIntakeDraft = {
  name: string;
  description: string;
  useCaseType: UseCaseType;
  actorRole: ActorType;
  riskTier: RiskTier;
  dataCategories: string[];
  department: string;
  businessOwner: string;
  vendor: string;
  deploymentStage: DeploymentStage;
  autonomyLevel: AutonomyLevel;
  regions: string[];
};

export const ACTOR_ROLE_OPTIONS: Array<{ value: ActorType; label: string; hint: string }> = [
  { value: "provider", label: "Provider", hint: "Develops or places an AI system on the market (EU AI Act)." },
  { value: "deployer", label: "Deployer", hint: "Uses an AI system under its authority in operations." },
  { value: "importer", label: "Importer", hint: "Places AI from a third country on the EU market." },
  { value: "distributor", label: "Distributor", hint: "Makes an AI system available without modifying it." },
  { value: "general", label: "General / shared", hint: "Role not yet determined or shared accountability." },
];

export const RISK_TIER_OPTIONS: Array<{ value: RiskTier; label: string; hint: string }> = [
  { value: "prohibited", label: "Prohibited", hint: "Unacceptable risk — banned practices under EU AI Act." },
  { value: "high", label: "High risk", hint: "Annex III / safety-critical systems with strict obligations." },
  { value: "gpai", label: "GPAI / foundation model", hint: "General-purpose AI provider or systemic model obligations." },
  { value: "limited", label: "Limited risk", hint: "Transparency obligations (e.g. chatbots, deepfakes)." },
  { value: "minimal", label: "Minimal risk", hint: "Voluntary codes of practice; lighter formal burden." },
  { value: "general", label: "Not yet classified", hint: "Classification pending legal / risk review." },
];

export const DEPLOYMENT_STAGE_OPTIONS: Array<{ value: DeploymentStage; label: string; hint: string }> = [
  { value: "idea", label: "Concept / R&D", hint: "Exploratory or design phase — not in production." },
  { value: "dev", label: "Pilot / pre-production", hint: "Limited rollout, UAT, or controlled pilot." },
  { value: "prod", label: "Production", hint: "Live in business operations affecting users or decisions." },
];

export const AUTONOMY_LEVEL_OPTIONS: Array<{ value: AutonomyLevel; label: string; hint: string }> = [
  { value: "low", label: "Low — human decides", hint: "AI informs; humans make final decisions." },
  { value: "medium", label: "Medium — human reviews", hint: "AI recommends; humans review before action." },
  { value: "high", label: "High — automated action", hint: "AI acts with minimal routine human intervention." },
];

export const DEPLOYMENT_REGION_OPTIONS = [
  "European Union",
  "United Kingdom",
  "United States",
  "Canada",
  "Asia-Pacific",
  "Latin America",
  "Middle East & Africa",
  "Global",
] as const;

export const GOVERNANCE_READINESS_OPTIONS: Array<{
  value: UseCaseIntakeMode;
  label: string;
  description: string;
}> = [
  {
    value: "discovery",
    label: "Early / no formal governance",
    description:
      "Client has AI in use but no risk tiering, owners, or policies yet. Capture systems now; classify during the workshop.",
  },
  {
    value: "established",
    label: "Established governance program",
    description:
      "Client has assigned owners, risk classifications, and deployment context. Capture full intake up front.",
  },
];

export function createEmptyUseCaseDraft(
  useCaseType: UseCaseType = "client_facing_product",
  mode: UseCaseIntakeMode = "discovery"
): UseCaseIntakeDraft {
  const def = getUseCaseTypeDef(useCaseType);
  const discovery = mode === "discovery";
  return {
    name: "",
    description: "",
    useCaseType,
    actorRole: discovery ? "general" : def.defaultActor,
    riskTier: discovery ? "general" : def.defaultRiskTier,
    dataCategories: discovery ? [] : [...def.dataCategories],
    department: "",
    businessOwner: "",
    vendor: "",
    deploymentStage: useCaseType === "research_prototype" ? "idea" : discovery ? "dev" : "prod",
    autonomyLevel: discovery ? "medium" : useCaseType === "autonomous_agent_system" ? "high" : "medium",
    regions: [],
  };
}

export function applyUseCaseTypeDefaults(
  draft: UseCaseIntakeDraft,
  useCaseType: UseCaseType,
  mode: UseCaseIntakeMode = "established"
): UseCaseIntakeDraft {
  const def = getUseCaseTypeDef(useCaseType);
  const discovery = mode === "discovery";
  return {
    ...draft,
    useCaseType,
    actorRole: discovery ? draft.actorRole || "general" : def.defaultActor,
    riskTier: discovery ? draft.riskTier || "general" : def.defaultRiskTier,
    dataCategories:
      draft.dataCategories.length > 0 ? draft.dataCategories : discovery ? [] : [...def.dataCategories],
    deploymentStage:
      useCaseType === "research_prototype"
        ? "idea"
        : draft.deploymentStage === "idea" && !discovery
          ? "prod"
          : draft.deploymentStage,
    autonomyLevel:
      discovery
        ? draft.autonomyLevel
        : useCaseType === "autonomous_agent_system"
          ? "high"
          : useCaseType === "automated_decision_support"
            ? "medium"
            : draft.autonomyLevel,
  };
}

/** Apply discovery-mode defaults before persisting so scoping can still run. */
export function normalizeUseCaseIntakeForSubmit(
  draft: UseCaseIntakeDraft,
  mode: UseCaseIntakeMode = "established"
) {
  const def = getUseCaseTypeDef(draft.useCaseType);
  const discovery = mode === "discovery";

  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    useCaseType: draft.useCaseType,
    actorRole: draft.actorRole || "general",
    riskTier: draft.riskTier || "general",
    dataCategories:
      draft.dataCategories.length > 0 ? draft.dataCategories : discovery ? [...def.dataCategories] : draft.dataCategories,
    department: draft.department.trim() || null,
    businessOwner: draft.businessOwner.trim() || null,
    vendor: draft.vendor.trim() || null,
    deploymentStage: draft.deploymentStage,
    autonomyLevel: draft.autonomyLevel,
    regions: draft.regions.length > 0 ? draft.regions : discovery ? ["Global"] : draft.regions,
  };
}

export function useCaseIntakeToPayload(
  draft: UseCaseIntakeDraft,
  mode: UseCaseIntakeMode = "established"
) {
  return normalizeUseCaseIntakeForSubmit(draft, mode);
}

export function validateUseCaseIntake(
  draft: UseCaseIntakeDraft,
  mode: UseCaseIntakeMode = "established"
): string | null {
  if (!draft.name.trim()) return "Use case name is required.";
  if (!draft.description.trim()) return "Use case description is required.";

  if (mode === "discovery") return null;

  if (draft.dataCategories.length === 0) return "Select at least one data category.";
  if (draft.regions.length === 0) return "Select at least one deployment region.";
  if (!draft.businessOwner.trim()) return "Business owner is required.";
  return null;
}

export function remapUseCasesForIntakeMode(
  drafts: UseCaseIntakeDraft[],
  mode: UseCaseIntakeMode
): UseCaseIntakeDraft[] {
  return drafts.map((draft) =>
    mode === "discovery"
      ? {
          ...draft,
          actorRole: draft.actorRole === "general" ? "general" : draft.actorRole || "general",
          riskTier: draft.riskTier === "general" ? "general" : draft.riskTier || "general",
        }
      : applyUseCaseTypeDefaults(draft, draft.useCaseType, "established")
  );
}
