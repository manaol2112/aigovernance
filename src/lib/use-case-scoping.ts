import { prisma } from "@/lib/db";
import { getUseCaseTypeDef } from "@/lib/use-case-types";
import type { UseCaseType, ActorType, RiskTier } from "@prisma/client";

type ScopedRequirement = {
  requirementId: string;
  clauseId: string;
  frameworkCode: string;
  title: string;
  rationale: string;
};

export async function scopeRequirementsForUseCase(
  useCaseId: string,
  frameworkCodes: string[]
): Promise<ScopedRequirement[]> {
  const useCase = await prisma.useCase.findUnique({ where: { id: useCaseId } });
  if (!useCase) throw new Error("Use case not found");

  const typeDef = getUseCaseTypeDef(useCase.useCaseType);
  const storedActor = useCase.actorRole ?? typeDef.defaultActor;
  const storedRisk = useCase.riskTier ?? typeDef.defaultRiskTier;
  // When intake is discovery-mode, keep "general" on record but infer scoping from system category.
  const actor = storedActor === "general" ? typeDef.defaultActor : storedActor;
  const riskTier = storedRisk === "general" ? typeDef.defaultRiskTier : storedRisk;

  const requirements = await prisma.frameworkRequirement.findMany({
    where: {
      framework: { code: { in: frameworkCodes } },
      verificationStatus: "verified",
      OR: [
        { requirementType: { in: ["subcategory", "obligation", "control", "principle"] } },
      ],
    },
    include: { framework: true },
    orderBy: [{ sortOrder: "asc" }],
  });

  const scoped: ScopedRequirement[] = [];

  for (const req of requirements) {
    const rationale = shouldIncludeRequirement(req, useCase.useCaseType, actor, riskTier, typeDef.themes);
    if (rationale) {
      scoped.push({
        requirementId: req.id,
        clauseId: req.clauseId,
        frameworkCode: req.framework.code,
        title: req.title,
        rationale,
      });
    }
  }

  return scoped;
}

function shouldIncludeRequirement(
  req: {
    clauseId: string;
    title: string;
    requirementText: string;
    requirementType: string;
    riskTier: RiskTier | null;
    actor: ActorType | null;
    theme: string | null;
    framework: { code: string };
  },
  useCaseType: UseCaseType,
  actor: ActorType,
  riskTier: RiskTier,
  themes: string[]
): string | null {
  const fw = req.framework.code;
  const text = `${req.title} ${req.requirementText} ${req.theme ?? ""}`.toLowerCase();

  if (fw === "EU-AIA") {
    if (req.requirementType !== "obligation") return null;
    if (riskTier === "gpai" && (req.riskTier === "gpai" || req.clauseId.startsWith("Art-5"))) {
      return `EU AI Act GPAI obligation applicable to ${useCaseType} use case.`;
    }
    if (riskTier === "high" && req.riskTier === "high") {
      if (req.actor && req.actor !== actor && req.actor !== "general") return null;
      return `EU AI Act high-risk obligation for ${actor} role.`;
    }
    if (riskTier === "limited" && req.riskTier === "limited") {
      return `EU AI Act limited-risk transparency obligation.`;
    }
    if (["Art-17", "Art-9"].includes(req.clauseId.split("(")[0])) {
      return `Core EU AI Act governance obligation applicable across risk tiers.`;
    }
    return null;
  }

  if (fw === "NIST-AI-RMF") {
    if (req.requirementType === "function" || req.requirementType === "category") return null;
    if (req.requirementType === "subcategory") {
      const themeMatch = themes.some((t) => text.includes(t.toLowerCase()));
      if (themeMatch) return `NIST subcategory aligned to ${useCaseType} themes: ${themes.join(", ")}.`;
      const isHighRisk = ["high", "gpai", "prohibited"].includes(riskTier);
      if (isHighRisk) return `NIST AI RMF subcategory applicable to ${riskTier}-risk ${useCaseType} use case.`;
      if (req.clauseId.startsWith("GOVERN") || req.clauseId.startsWith("MANAGE")) {
        return `Core NIST governance/manage requirement for ${useCaseType}.`;
      }
    }
    return null;
  }

  if (fw === "ISO-42001") {
    if (req.requirementType === "control" || req.clauseId.startsWith("A.") || req.clauseId.match(/^[4-9]/)) {
      return `ISO 42001 AIMS requirement for ${useCaseType} AI management system.`;
    }
    return null;
  }

  if (fw === "OECD-AI") {
    if (req.requirementType === "principle" || req.requirementType === "recommendation") {
      return `OECD AI Principle applicable to ${useCaseType} responsible AI practices.`;
    }
    return null;
  }

  if (fw === "COSO-ERM") {
    if (req.requirementType === "principle") {
      return `COSO ERM principle for enterprise AI risk governance of ${useCaseType}.`;
    }
    return null;
  }

  return null;
}

export async function persistScopedRequirements(
  useCaseId: string,
  frameworkCodes: string[]
): Promise<number> {
  const scoped = await scopeRequirementsForUseCase(useCaseId, frameworkCodes);

  await prisma.useCaseRequirement.deleteMany({ where: { useCaseId } });

  for (const item of scoped) {
    await prisma.useCaseRequirement.create({
      data: {
        useCaseId,
        requirementId: item.requirementId,
        scopingRationale: item.rationale,
        included: true,
      },
    });
  }

  return scoped.length;
}

export async function scopeAllUseCasesForAssessment(assessmentId: string): Promise<number> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { scope: true, useCases: true },
  });
  if (!assessment?.scope) throw new Error("Assessment scope not defined");

  let total = 0;
  for (const uc of assessment.useCases) {
    total += await persistScopedRequirements(uc.id, assessment.scope.frameworkCodes);
  }
  return total;
}

export function buildWorkshopQuestion(
  clauseId: string,
  frameworkCode: string,
  title: string,
  requirementText: string
): string {
  return `[${frameworkCode} ${clauseId}] ${title}\n\nBased on the requirement: "${requirementText.slice(0, 300)}${requirementText.length > 300 ? "..." : ""}"\n\nWhat policies, processes, controls, or evidence does the client have in place to address this requirement? Describe current state, responsible owners, and any supporting documentation.`;
}
