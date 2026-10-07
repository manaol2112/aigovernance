import { NextResponse } from "next/server";
import type { RiskTier } from "@prisma/client";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import { normalizeStringList } from "@/lib/ai-system-register";
import {
  assertPermission,
  ensureBootstrapAdmin,
  parseRegisterActor,
  resolveRegisterAccess,
  writeChangeLog,
} from "@/lib/ai-system-register-actor";
import {
  computeNextReviewAt,
  diffMaterialChanges,
  initialAcceptanceStatus,
  materialChangesStaleAssessment,
  RISK_MATERIAL_FIELDS,
} from "@/lib/ai-system-register-governance";
import { rebuildAssessmentSuite } from "@/lib/ai-system-register-assessment-suite";
import {
  assertLifecycleTransitionAllowed,
  assertManualRiskAllowed,
  invalidateRatedModules,
} from "@/lib/ai-system-register-audit-controls";
import { parseAssessmentSuite } from "@/lib/ai-system-register-assessment-triggers";

type Ctx = { params: Promise<{ id: string }> };

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
  console.error("[ai-system-register/[id]]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

async function withKeyControls<T extends { keyControlCodes: string[] }>(system: T) {
  const keyControlCodes = system.keyControlCodes ?? [];
  const keyControls =
    keyControlCodes.length > 0
      ? await prisma.canonicalControl.findMany({
          where: { code: { in: keyControlCodes } },
          select: { code: true, title: true, ownerRole: true, description: true },
        })
      : [];
  const byCode = new Map(keyControls.map((control) => [control.code, control]));
  const orderedKeyControls = keyControlCodes.map((code) => {
    const control = byCode.get(code);
    return {
      controlCode: code,
      controlTitle: control?.title ?? code,
      ownerRole: control?.ownerRole ?? "—",
      description: control?.description ?? null,
    };
  });
  return { ...system, keyControls: orderedKeyControls };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const system = await prisma.aiSystemRegisterItem.findUnique({
      where: { id },
      include: {
        organization: true,
        evidence: { orderBy: { uploadedAt: "desc" } },
        riskAssessments: { orderBy: { version: "desc" } },
        _count: { select: { evidence: true, riskAssessments: true } },
      },
    });
    if (!system) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }

    return NextResponse.json(await withKeyControls(system));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const existing = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(existing.organizationId, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "write_system");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    if (access.bootstrap) await ensureBootstrapAdmin(existing.organizationId, access.actor);

    const body = await req.json().catch(() => ({}));

    if (body.riskSource === "manual") {
      if (!body.riskTier || body.riskTier === "general") {
        return NextResponse.json(
          { error: "Select a risk tier when setting risk manually." },
          { status: 400 }
        );
      }
      if (!String(body.manualRiskRationale ?? existing.manualRiskRationale ?? "").trim()) {
        return NextResponse.json(
          { error: "Rationale is required when setting risk tier manually." },
          { status: 400 }
        );
      }
      const manualBlocked = assertManualRiskAllowed({
        currentStatus: existing.status,
        currentDeploymentStage: existing.deploymentStage,
        nextStatus: body.status ?? existing.status,
        nextDeploymentStage: body.deploymentStage ?? existing.deploymentStage,
      });
      if (manualBlocked) {
        return NextResponse.json({ error: manualBlocked }, { status: 400 });
      }
    }

    const proposed: Record<string, unknown> = {};
    const assign = (key: string, value: unknown) => {
      if (value !== undefined) proposed[key] = value;
    };

    assign("name", body.name !== undefined ? String(body.name).trim() : undefined);
    assign(
      "description",
      body.description !== undefined ? String(body.description).trim() : undefined
    );
    assign(
      "intendedPurpose",
      body.intendedPurpose !== undefined ? body.intendedPurpose?.trim() || null : undefined
    );
    assign("useCaseType", body.useCaseType);
    assign("status", body.status);
    assign(
      "department",
      body.department !== undefined ? body.department?.trim() || null : undefined
    );
    assign(
      "businessOwner",
      body.businessOwner !== undefined ? body.businessOwner?.trim() || null : undefined
    );
    assign(
      "technicalOwner",
      body.technicalOwner !== undefined ? body.technicalOwner?.trim() || null : undefined
    );
    assign("riskOwner", body.riskOwner !== undefined ? body.riskOwner?.trim() || null : undefined);
    assign(
      "humanOversightOwner",
      body.humanOversightOwner !== undefined
        ? body.humanOversightOwner?.trim() || null
        : undefined
    );
    assign(
      "stewardTeam",
      body.stewardTeam !== undefined ? body.stewardTeam?.trim() || null : undefined
    );
    assign("actorRole", body.actorRole);
    assign(
      "euAnnexIiiRelevance",
      body.euAnnexIiiRelevance !== undefined
        ? body.euAnnexIiiRelevance?.trim() || null
        : undefined
    );
    assign(
      "euArticle50Triggers",
      body.euArticle50Triggers !== undefined
        ? normalizeStringList(body.euArticle50Triggers)
        : undefined
    );
    assign("friaStatus", body.friaStatus);
    assign("dpiaStatus", body.dpiaStatus);
    assign("ropaLinked", body.ropaLinked !== undefined ? Boolean(body.ropaLinked) : undefined);
    assign(
      "sectorDomain",
      body.sectorDomain !== undefined ? body.sectorDomain?.trim() || null : undefined
    );
    assign(
      "applicableFrameworks",
      body.applicableFrameworks !== undefined
        ? normalizeStringList(body.applicableFrameworks)
        : undefined
    );
    assign(
      "intendedUsers",
      body.intendedUsers !== undefined ? normalizeStringList(body.intendedUsers) : undefined
    );
    assign(
      "affectedPopulations",
      body.affectedPopulations !== undefined
        ? body.affectedPopulations?.trim() || null
        : undefined
    );
    assign("decisionImpact", body.decisionImpact);
    assign("autonomyLevel", body.autonomyLevel);
    assign(
      "humanInTheLoop",
      body.humanInTheLoop !== undefined ? Boolean(body.humanInTheLoop) : undefined
    );
    assign(
      "overrideEscalationPath",
      body.overrideEscalationPath !== undefined
        ? body.overrideEscalationPath?.trim() || null
        : undefined
    );
    assign(
      "aiCapabilities",
      body.aiCapabilities !== undefined ? normalizeStringList(body.aiCapabilities) : undefined
    );
    assign(
      "customerFacing",
      body.customerFacing !== undefined ? Boolean(body.customerFacing) : undefined
    );
    assign(
      "employeeFacing",
      body.employeeFacing !== undefined ? Boolean(body.employeeFacing) : undefined
    );
    assign(
      "externalFacing",
      body.externalFacing !== undefined ? Boolean(body.externalFacing) : undefined
    );
    assign(
      "criticalBusinessProcess",
      body.criticalBusinessProcess !== undefined
        ? Boolean(body.criticalBusinessProcess)
        : undefined
    );
    assign("businessCriticality", body.businessCriticality);
    assign(
      "failureImpact",
      body.failureImpact !== undefined ? body.failureImpact?.trim() || null : undefined
    );
    assign(
      "regulatoryJurisdictions",
      body.regulatoryJurisdictions !== undefined
        ? normalizeStringList(body.regulatoryJurisdictions)
        : undefined
    );
    assign(
      "prohibitedUseNotes",
      body.prohibitedUseNotes !== undefined
        ? body.prohibitedUseNotes?.trim() || null
        : undefined
    );
    assign(
      "developerProvider",
      body.developerProvider !== undefined
        ? body.developerProvider?.trim() || null
        : undefined
    );
    assign(
      "dataCategories",
      body.dataCategories !== undefined ? normalizeStringList(body.dataCategories) : undefined
    );
    assign(
      "personalDataInvolved",
      body.personalDataInvolved !== undefined ? Boolean(body.personalDataInvolved) : undefined
    );
    assign(
      "specialCategoryData",
      body.specialCategoryData !== undefined ? Boolean(body.specialCategoryData) : undefined
    );
    assign(
      "dataSources",
      body.dataSources !== undefined ? body.dataSources?.trim() || null : undefined
    );
    assign(
      "dataOutputs",
      body.dataOutputs !== undefined ? body.dataOutputs?.trim() || null : undefined
    );
    assign(
      "retentionPolicy",
      body.retentionPolicy !== undefined ? body.retentionPolicy?.trim() || null : undefined
    );
    assign(
      "crossBorderTransfers",
      body.crossBorderTransfers !== undefined ? Boolean(body.crossBorderTransfers) : undefined
    );
    assign(
      "lawfulBasis",
      body.lawfulBasis !== undefined ? body.lawfulBasis?.trim() || null : undefined
    );
    assign("buildType", body.buildType);
    assign("vendor", body.vendor !== undefined ? body.vendor?.trim() || null : undefined);
    assign(
      "modelProvider",
      body.modelProvider !== undefined ? body.modelProvider?.trim() || null : undefined
    );
    assign(
      "modelNameVersion",
      body.modelNameVersion !== undefined ? body.modelNameVersion?.trim() || null : undefined
    );
    assign("modelType", body.modelType);
    assign(
      "hostingLocation",
      body.hostingLocation !== undefined ? body.hostingLocation?.trim() || null : undefined
    );
    assign(
      "subprocessors",
      body.subprocessors !== undefined ? body.subprocessors?.trim() || null : undefined
    );
    assign(
      "trainsOnCustomerData",
      body.trainsOnCustomerData !== undefined
        ? body.trainsOnCustomerData?.trim() || null
        : undefined
    );
    assign(
      "contractDpaStatus",
      body.contractDpaStatus !== undefined ? body.contractDpaStatus?.trim() || null : undefined
    );
    assign(
      "dependencies",
      body.dependencies !== undefined ? body.dependencies?.trim() || null : undefined
    );
    assign("regions", body.regions !== undefined ? normalizeStringList(body.regions) : undefined);
    assign("deploymentStage", body.deploymentStage);
    assign("shadowAi", body.shadowAi !== undefined ? Boolean(body.shadowAi) : undefined);
    assign(
      "nextAction",
      body.nextAction !== undefined ? body.nextAction?.trim() || null : undefined
    );
    assign("riskTier", body.riskTier);
    assign("riskSource", body.riskSource);
    assign(
      "manualRiskRationale",
      body.manualRiskRationale !== undefined
        ? body.manualRiskRationale?.trim() || null
        : undefined
    );
    assign(
      "riskSummary",
      body.riskSummary !== undefined ? body.riskSummary?.trim() || null : undefined
    );
    assign(
      "treatmentPlan",
      body.treatmentPlan !== undefined ? body.treatmentPlan?.trim() || null : undefined
    );
    assign(
      "keyControlCodes",
      Array.isArray(body.keyControlCodes)
        ? body.keyControlCodes.map((code: unknown) => String(code).trim()).filter(Boolean)
        : undefined
    );
    assign("details", body.details);

    if (body.goLiveDate !== undefined) {
      assign("goLiveDate", body.goLiveDate ? new Date(body.goLiveDate) : null);
    }
    if (body.retirementDate !== undefined) {
      assign("retirementDate", body.retirementDate ? new Date(body.retirementDate) : null);
    }
    if (body.lastReviewedAt !== undefined) {
      assign("lastReviewedAt", body.lastReviewedAt ? new Date(body.lastReviewedAt) : null);
    }
    if (body.nextReviewAt !== undefined) {
      assign("nextReviewAt", body.nextReviewAt ? new Date(body.nextReviewAt) : null);
    }

    const materialDiff = diffMaterialChanges(
      existing as unknown as Record<string, unknown>,
      proposed,
      RISK_MATERIAL_FIELDS
    );
    const shouldStale =
      materialChangesStaleAssessment(materialDiff) &&
      (existing.riskAssessmentStatus === "completed" ||
        existing.riskAssessmentStatus === "stale" ||
        existing.riskSource === "assessed");

    const riskTierChanged =
      proposed.riskTier !== undefined && proposed.riskTier !== existing.riskTier;
    const riskSourceChanged =
      proposed.riskSource !== undefined && proposed.riskSource !== existing.riskSource;

    const nextTier = (proposed.riskTier ?? existing.riskTier) as RiskTier | null;
    const reviewTouched =
      riskTierChanged ||
      riskSourceChanged ||
      body.refreshReviewCadence === true ||
      body.markReviewed === true;

    const data: Record<string, unknown> = { ...proposed };

    if (shouldStale) {
      data.riskAssessmentStatus = "stale";
      data.riskAcceptanceStatus = initialAcceptanceStatus(nextTier);
      data.riskAcceptedBy = null;
      data.riskAcceptedByEmail = null;
      data.riskAcceptedAt = null;
      data.riskAcceptanceNote = null;
      data.riskSecondReviewer = null;
      data.riskSecondReviewerEmail = null;
      data.riskSecondReviewedAt = null;
    }

    if (riskTierChanged || riskSourceChanged) {
      data.riskAcceptanceStatus = initialAcceptanceStatus(nextTier);
      data.riskAcceptedBy = null;
      data.riskAcceptedByEmail = null;
      data.riskAcceptedAt = null;
      data.riskAcceptanceNote = null;
      data.riskSecondReviewer = null;
      data.riskSecondReviewerEmail = null;
      data.riskSecondReviewedAt = null;
    }

    if (body.markReviewed === true) {
      const reviewedAt = new Date();
      data.lastReviewedAt = reviewedAt;
      data.nextReviewAt = computeNextReviewAt(nextTier, reviewedAt);
    } else if (reviewTouched && proposed.nextReviewAt === undefined) {
      data.nextReviewAt = computeNextReviewAt(nextTier);
    }

    const mergedForSuite = {
      ...(existing as unknown as Record<string, unknown>),
      ...data,
    };

    let nextSuite = rebuildAssessmentSuite(mergedForSuite, existing.assessmentSuite);
    if (shouldStale) {
      nextSuite = invalidateRatedModules(parseAssessmentSuite(nextSuite));
    }
    data.assessmentSuite = nextSuite as object;

    const lifecycleBlocked = assertLifecycleTransitionAllowed({
      status: (data.status as string | undefined) ?? existing.status,
      deploymentStage:
        (data.deploymentStage as string | undefined) ?? existing.deploymentStage,
      riskSource: (data.riskSource as string | undefined) ?? existing.riskSource,
      riskAssessmentStatus:
        (data.riskAssessmentStatus as string | undefined) ?? existing.riskAssessmentStatus,
      riskTier: (data.riskTier as RiskTier | null | undefined) ?? existing.riskTier,
      riskAcceptanceStatus:
        (data.riskAcceptanceStatus as string | undefined) ?? existing.riskAcceptanceStatus,
      assessmentSuite: data.assessmentSuite,
    });
    if (lifecycleBlocked) {
      const enteringProduction =
        (body.status !== undefined && body.status !== existing.status) ||
        (body.deploymentStage !== undefined &&
          body.deploymentStage !== existing.deploymentStage);
      if (enteringProduction) {
        return NextResponse.json({ error: lifecycleBlocked }, { status: 400 });
      }
    }

    const system = await prisma.aiSystemRegisterItem.update({
      where: { id },
      data,
      include: {
        organization: true,
        evidence: { orderBy: { uploadedAt: "desc" } },
        riskAssessments: { orderBy: { version: "desc" } },
        _count: { select: { evidence: true, riskAssessments: true } },
      },
    });

    const allDiff = diffMaterialChanges(
      existing as unknown as Record<string, unknown>,
      proposed,
      Object.keys(proposed)
    );

    for (const change of allDiff.slice(0, 40)) {
      await writeChangeLog({
        systemId: id,
        organizationId: existing.organizationId,
        action: "field_update",
        summary: `Updated ${change.field}`,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        actor: access.actor,
      });
    }

    if (shouldStale) {
      await writeChangeLog({
        systemId: id,
        organizationId: existing.organizationId,
        action: "assessment_stale",
        summary:
          "Material profile changes marked the risk assessment stale. Re-run assessment before relying on the prior rating.",
        actor: access.actor,
      });
    }

    if (body.markReviewed === true) {
      await writeChangeLog({
        systemId: id,
        organizationId: existing.organizationId,
        action: "review_completed",
        summary: "Periodic review marked complete; next review date refreshed.",
        actor: access.actor,
      });
    }

    return NextResponse.json({
      ...(await withKeyControls(system)),
      _meta: {
        staleAssessment: shouldStale,
        materialChanges: materialDiff.map((c) => c.field),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const existing = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(existing.organizationId, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "write_system");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });

    await prisma.aiSystemRegisterItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
