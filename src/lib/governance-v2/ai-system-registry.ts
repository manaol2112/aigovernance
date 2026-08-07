import type {
  AISystemModelType,
  AutonomyLevel,
  DeploymentStage,
  RiskTier,
  UseCaseType,
} from "@prisma/client";
import { prisma } from "@/lib/db";

const MODEL_TYPE_MAP: Partial<Record<UseCaseType, AISystemModelType>> = {
  autonomous_agent_system: "agent",
  generative_ai_content: "llm",
  automated_decision_support: "ml",
  client_facing_product: "llm",
  internal_operations_tool: "ml",
  employee_workforce_ai: "llm",
  biometric_identification: "ml",
  critical_infrastructure: "ml",
  third_party_saas_embedded: "llm",
  research_prototype: "llm",
};

export async function syncAISystemsFromUseCases(assessmentId: string) {
  const useCases = await prisma.useCase.findMany({
    where: { assessmentId },
    orderBy: { sortOrder: "asc" },
  });

  const results = [];
  for (const uc of useCases) {
    const row = await prisma.aISystem.upsert({
      where: { useCaseId: uc.id },
      create: {
        assessmentId,
        useCaseId: uc.id,
        name: uc.name,
        useCaseSummary: uc.description,
        businessFunction: uc.department ?? undefined,
        modelType: MODEL_TYPE_MAP[uc.useCaseType] ?? "llm",
        vendor: uc.vendor ?? undefined,
        deploymentStage: uc.deploymentStage,
        riskLevel: uc.riskTier ?? undefined,
        dataTypes: uc.dataCategories,
        autonomyLevel: uc.autonomyLevel,
        users: uc.businessOwner ?? uc.actorRole ?? undefined,
        regions: uc.regions,
        detectedByAi: false,
        confidenceScore: 1,
      },
      update: {
        name: uc.name,
        useCaseSummary: uc.description,
        businessFunction: uc.department ?? undefined,
        modelType: MODEL_TYPE_MAP[uc.useCaseType] ?? "llm",
        vendor: uc.vendor ?? undefined,
        deploymentStage: uc.deploymentStage,
        riskLevel: uc.riskTier ?? undefined,
        dataTypes: uc.dataCategories,
        autonomyLevel: uc.autonomyLevel,
        users: uc.businessOwner ?? uc.actorRole ?? undefined,
        regions: uc.regions,
      },
    });
    results.push(row);
  }
  return results;
}

export async function listAISystems(assessmentId: string) {
  return prisma.aISystem.findMany({
    where: { assessmentId },
    orderBy: { name: "asc" },
    include: {
      useCase: { select: { id: true, name: true, department: true } },
      _count: { select: { governanceEvidence: true } },
    },
  });
}

export async function createAISystem(
  assessmentId: string,
  input: {
    name: string;
    useCaseSummary?: string;
    businessFunction?: string;
    modelType?: AISystemModelType;
    vendor?: string;
    deploymentStage?: DeploymentStage;
    riskLevel?: RiskTier;
    dataTypes?: string[];
    autonomyLevel?: AutonomyLevel;
    users?: string;
    regions?: string[];
    detectedByAi?: boolean;
    confidenceScore?: number;
  }
) {
  return prisma.aISystem.create({
    data: {
      assessmentId,
      name: input.name,
      useCaseSummary: input.useCaseSummary,
      businessFunction: input.businessFunction,
      modelType: input.modelType ?? "llm",
      vendor: input.vendor,
      deploymentStage: input.deploymentStage ?? "prod",
      riskLevel: input.riskLevel,
      dataTypes: input.dataTypes ?? [],
      autonomyLevel: input.autonomyLevel ?? "medium",
      users: input.users,
      regions: input.regions ?? [],
      detectedByAi: input.detectedByAi ?? false,
      confidenceScore: input.confidenceScore ?? 0.5,
    },
  });
}
