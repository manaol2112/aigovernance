import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import {
  formatAiSystemCode,
  normalizeStringList,
  validateAiSystemCreate,
  type AiSystemRegisterCreateInput,
} from "@/lib/ai-system-register";
import {
  assertPermission,
  ensureBootstrapAdmin,
  parseRegisterActor,
  resolveRegisterAccess,
  writeChangeLog,
} from "@/lib/ai-system-register-actor";
import {
  computeNextReviewAt,
  initialAcceptanceStatus,
} from "@/lib/ai-system-register-governance";
import { rebuildAssessmentSuite } from "@/lib/ai-system-register-assessment-suite";
import {
  assertLifecycleTransitionAllowed,
  assertManualRiskAllowed,
} from "@/lib/ai-system-register-audit-controls";

function toErrorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError || isDatabaseSetupError(error)) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Database client is out of date. Restart the dev server.",
      },
      { status: 503 }
    );
  }
  console.error("[ai-system-register]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

export async function GET(req: Request) {
  try {
    assertAiRegisterPrismaReady();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const systems = await prisma.aiSystemRegisterItem.findMany({
      where: { organizationId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        _count: { select: { evidence: true, riskAssessments: true } },
      },
    });
    return NextResponse.json(systems);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    assertAiRegisterPrismaReady();
    const body = (await req.json().catch(() => ({}))) as AiSystemRegisterCreateInput;
    const error = validateAiSystemCreate(body);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: body.organizationId } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(body.organizationId, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "write_system");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    if (access.bootstrap) await ensureBootstrapAdmin(body.organizationId, access.actor);

    const count = await prisma.aiSystemRegisterItem.count({
      where: { organizationId: body.organizationId },
    });
    const code = formatAiSystemCode(count + 1);

    const riskSource = body.riskSource ?? "not_assessed";
    const riskTier = body.riskTier ?? null;
    const now = new Date();
    const status = body.status ?? "discovery";
    const deploymentStage = body.deploymentStage ?? "idea";

    if (riskSource === "manual") {
      const manualBlocked = assertManualRiskAllowed({
        currentStatus: status,
        currentDeploymentStage: deploymentStage,
        nextStatus: status,
        nextDeploymentStage: deploymentStage,
      });
      if (manualBlocked) {
        return NextResponse.json({ error: manualBlocked }, { status: 400 });
      }
    }

    const lifecycleBlocked = assertLifecycleTransitionAllowed({
      status,
      deploymentStage,
      riskSource,
      riskAssessmentStatus: "not_started",
      riskTier,
      riskAcceptanceStatus: "not_required",
      assessmentSuite: null,
    });
    if (lifecycleBlocked) {
      return NextResponse.json({ error: lifecycleBlocked }, { status: 400 });
    }

    const createData = {
      organizationId: body.organizationId,
      code,
      name: body.name.trim(),
      description: body.description.trim(),
      intendedPurpose: body.intendedPurpose?.trim() || null,
      useCaseType: body.useCaseType,
      status,
      department: body.department?.trim() || null,
      businessOwner: body.businessOwner?.trim() || null,
      technicalOwner: body.technicalOwner?.trim() || null,
      riskOwner: body.riskOwner?.trim() || null,
      humanOversightOwner: body.humanOversightOwner?.trim() || null,
      stewardTeam: body.stewardTeam?.trim() || null,
      actorRole: body.actorRole ?? null,
      euAnnexIiiRelevance: body.euAnnexIiiRelevance?.trim() || null,
      euArticle50Triggers: normalizeStringList(body.euArticle50Triggers),
      friaStatus: body.friaStatus ?? "not_required",
      dpiaStatus: body.dpiaStatus ?? "not_required",
      ropaLinked: Boolean(body.ropaLinked),
      sectorDomain: body.sectorDomain?.trim() || null,
      applicableFrameworks: normalizeStringList(body.applicableFrameworks),
      intendedUsers: normalizeStringList(body.intendedUsers),
      affectedPopulations: body.affectedPopulations?.trim() || null,
      decisionImpact: body.decisionImpact ?? "unclear",
      autonomyLevel: body.autonomyLevel ?? "medium",
      humanInTheLoop: body.humanInTheLoop ?? true,
      overrideEscalationPath: body.overrideEscalationPath?.trim() || null,
      aiCapabilities: normalizeStringList(body.aiCapabilities),
      customerFacing: Boolean(body.customerFacing),
      employeeFacing: Boolean(body.employeeFacing),
      externalFacing: Boolean(body.externalFacing),
      criticalBusinessProcess: Boolean(body.criticalBusinessProcess),
      businessCriticality: body.businessCriticality ?? "unclear",
      failureImpact: body.failureImpact?.trim() || null,
      regulatoryJurisdictions: normalizeStringList(body.regulatoryJurisdictions),
      prohibitedUseNotes: body.prohibitedUseNotes?.trim() || null,
      developerProvider: body.developerProvider?.trim() || null,
      dataCategories: normalizeStringList(body.dataCategories),
      personalDataInvolved: Boolean(body.personalDataInvolved),
      specialCategoryData: Boolean(body.specialCategoryData),
      dataSources: body.dataSources?.trim() || null,
      dataOutputs: body.dataOutputs?.trim() || null,
      retentionPolicy: body.retentionPolicy?.trim() || null,
      crossBorderTransfers: Boolean(body.crossBorderTransfers),
      lawfulBasis: body.lawfulBasis?.trim() || null,
      buildType: body.buildType ?? "mixed",
      vendor: body.vendor?.trim() || body.developerProvider?.trim() || null,
      modelProvider: body.modelProvider?.trim() || null,
      modelNameVersion: body.modelNameVersion?.trim() || null,
      modelType: body.modelType ?? "llm",
      hostingLocation: body.hostingLocation?.trim() || null,
      subprocessors: body.subprocessors?.trim() || null,
      trainsOnCustomerData: body.trainsOnCustomerData?.trim() || null,
      contractDpaStatus: body.contractDpaStatus?.trim() || null,
      dependencies: body.dependencies?.trim() || null,
      regions: normalizeStringList(body.regions),
      deploymentStage,
      shadowAi: Boolean(body.shadowAi),
      nextAction: body.nextAction?.trim() || null,
      riskTier,
      riskSource,
      manualRiskRationale:
        riskSource === "manual" ? body.manualRiskRationale?.trim() || null : null,
      riskAssessmentStatus: "not_started" as const,
      riskAcceptanceStatus:
        riskSource === "manual" ? initialAcceptanceStatus(riskTier) : "not_required",
      lastReviewedAt: riskSource === "manual" ? now : null,
      nextReviewAt: riskSource === "manual" ? computeNextReviewAt(riskTier, now) : null,
      details: (body.details ?? undefined) as Prisma.InputJsonValue | undefined,
    };

    const assessmentSuite = rebuildAssessmentSuite(createData as Record<string, unknown>);

    const system = await prisma.aiSystemRegisterItem.create({
      data: {
        ...createData,
        assessmentSuite: assessmentSuite as object,
      },
      include: {
        _count: { select: { evidence: true, riskAssessments: true } },
      },
    });

    await writeChangeLog({
      systemId: system.id,
      organizationId: system.organizationId,
      action: "system_created",
      summary: `System ${system.code} created.`,
      actor: access.actor,
    });

    return NextResponse.json(system, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
