import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { initializeWorkflowCheckpoints, bootstrapAssessmentScoping } from "@/lib/workflow";
import type { RiskTier, UseCaseType, ActorType, AutonomyLevel, DeploymentStage } from "@prisma/client";

const ALL_FRAMEWORKS = ["NIST-AI-RMF", "ISO-42001", "EU-AIA", "OECD-AI", "COSO-ERM"];

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    description,
    clientName,
    clientIndustry,
    frameworkCodes = ALL_FRAMEWORKS,
    riskTiers = ["high", "gpai", "limited"],
    useCases = [],
  } = body;

  if (!name || !clientName) {
    return NextResponse.json({ error: "Assessment name and client name required" }, { status: 400 });
  }

  const assessment = await prisma.assessment.create({
    data: {
      name,
      description: description || null,
      clientName,
      clientIndustry: clientIndustry || null,
      status: "in_progress",
      workflowStage: "use_cases",
      scope: {
        create: {
          frameworkCodes,
          riskTiers: riskTiers as RiskTier[],
          systemName: clientName,
          systemDescription: description || null,
        },
      },
      useCases: {
        create: useCases.map(
          (uc: {
            name: string;
            description: string;
            useCaseType: UseCaseType;
            actorRole?: ActorType;
            riskTier?: RiskTier;
            dataCategories?: string[];
            department?: string | null;
            businessOwner?: string | null;
            vendor?: string | null;
            deploymentStage?: DeploymentStage;
            autonomyLevel?: AutonomyLevel;
            regions?: string[];
          }, i: number) => ({
            name: uc.name,
            description: uc.description,
            useCaseType: uc.useCaseType,
            actorRole: uc.actorRole ?? null,
            riskTier: uc.riskTier ?? null,
            dataCategories: uc.dataCategories ?? [],
            department: uc.department ?? null,
            businessOwner: uc.businessOwner ?? null,
            vendor: uc.vendor ?? null,
            deploymentStage: uc.deploymentStage ?? "prod",
            autonomyLevel: uc.autonomyLevel ?? "medium",
            regions: uc.regions ?? [],
            sortOrder: i,
          })
        ),
      },
    },
    include: { scope: true, useCases: true },
  });

  await initializeWorkflowCheckpoints(assessment.id);
  if (assessment.useCases.length > 0) {
    await bootstrapAssessmentScoping(assessment.id);
  }

  const refreshed = await prisma.assessment.findUnique({
    where: { id: assessment.id },
    include: { scope: true, useCases: true },
  });

  return NextResponse.json(refreshed ?? assessment);
}

export async function GET() {
  const assessments = await prisma.assessment.findMany({
    include: {
      scope: true,
      useCases: true,
      checkpoints: true,
      _count: { select: { requirementEvaluations: true, deliverables: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assessments);
}
