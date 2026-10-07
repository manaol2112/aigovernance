import { NextResponse } from "next/server";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import {
  emptyFactorScores,
  parseFactorScores,
  scoreRiskAssessment,
  type RiskAssessmentFactorScores,
  type RiskStepId,
} from "@/lib/ai-system-register-risk-assessment";
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
import {
  assertFormalCompleteAllowed,
  extractTreatmentPlanFromScores,
} from "@/lib/ai-system-register-audit-controls";

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
  console.error("[ai-system-register/risk-assessment]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const system = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!system) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }
    const assessments = await prisma.aiSystemRiskAssessment.findMany({
      where: { systemId: id },
      orderBy: { version: "desc" },
    });
    return NextResponse.json(assessments);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const system = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!system) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(system.organizationId, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "run_assessment");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    if (access.bootstrap) await ensureBootstrapAdmin(system.organizationId, access.actor);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "save");
    const factorScores = parseFactorScores(body.factorScores ?? emptyFactorScores());
    const narrative =
      typeof body.narrative === "string"
        ? body.narrative.trim() || null
        : typeof factorScores.answers.findings_summary?.value === "string"
          ? String(factorScores.answers.findings_summary.value).trim() || null
          : null;
    const assessorName =
      typeof body.assessorName === "string" ? body.assessorName.trim() || null : null;

    const scored = scoreRiskAssessment(factorScores, {
      decisionImpact: system.decisionImpact,
      autonomyLevel: system.autonomyLevel,
      euAnnexIiiRelevance: system.euAnnexIiiRelevance,
      personalDataInvolved: system.personalDataInvolved,
      specialCategoryData: system.specialCategoryData,
    });

    if (action === "start") {
      const latest = await prisma.aiSystemRiskAssessment.findFirst({
        where: { systemId: id },
        orderBy: { version: "desc" },
      });
      const version = (latest?.version ?? 0) + 1;
      const assessment = await prisma.aiSystemRiskAssessment.create({
        data: {
          systemId: system.id,
          organizationId: system.organizationId,
          version,
          status: "in_progress",
          factorScores: factorScores as object,
          inherentScore: scored.inherentScore,
          residualScore: scored.residualScore,
          inherentTier: scored.inherentTier,
          residualTier: scored.residualTier,
          hardRulesFired: scored.hardRulesFired,
          narrative,
          assessorName,
        },
      });
      await prisma.aiSystemRegisterItem.update({
        where: { id: system.id },
        data: {
          riskAssessmentStatus: "in_progress",
          riskSource: system.riskSource === "manual" ? "manual" : "not_assessed",
        },
      });
      return NextResponse.json(assessment, { status: 201 });
    }

    const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : null;
    if (!assessmentId) {
      return NextResponse.json({ error: "assessmentId is required." }, { status: 400 });
    }

    const existing = await prisma.aiSystemRiskAssessment.findFirst({
      where: { id: assessmentId, systemId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const complete = action === "complete";
    if (complete) {
      if (!narrative?.trim()) {
        return NextResponse.json(
          { error: "Overall rating rationale is required before applying the residual rating." },
          { status: 400 }
        );
      }
      const suiteBlocked = assertFormalCompleteAllowed(
        system.assessmentSuite,
        system.riskAssessmentStatus
      );
      if (suiteBlocked) {
        return NextResponse.json({ error: suiteBlocked }, { status: 400 });
      }
    }

    const completedStepIds = Array.isArray(factorScores.completedStepIds)
      ? (factorScores.completedStepIds as RiskStepId[])
      : [];

    const nextScores: RiskAssessmentFactorScores = {
      ...factorScores,
      completedStepIds,
    };

    const assessment = await prisma.aiSystemRiskAssessment.update({
      where: { id: existing.id },
      data: {
        status: complete ? "completed" : "in_progress",
        factorScores: nextScores as object,
        inherentScore: scored.inherentScore,
        residualScore: scored.residualScore,
        inherentTier: scored.inherentTier,
        residualTier: scored.residualTier,
        hardRulesFired: scored.hardRulesFired,
        narrative,
        assessorName,
        completedAt: complete ? new Date() : existing.completedAt,
      },
    });

    if (complete) {
      const treatment = extractTreatmentPlanFromScores(nextScores);
      const completedAt = new Date();
      await prisma.aiSystemRegisterItem.update({
        where: { id: system.id },
        data: {
          riskAssessmentStatus: "completed",
          riskSource: "assessed",
          riskTier: scored.residualTier,
          inherentRiskTier: scored.inherentTier,
          residualRiskTier: scored.residualTier,
          inherentRiskScore: scored.inherentScore,
          residualRiskScore: scored.residualScore,
          riskSummary: narrative,
          treatmentPlan: treatment,
          keyRiskThemes: scored.hardRulesFired,
          riskAcceptanceStatus: initialAcceptanceStatus(scored.residualTier),
          riskAcceptedBy: null,
          riskAcceptedByEmail: null,
          riskAcceptedAt: null,
          riskAcceptanceNote: null,
          riskSecondReviewer: null,
          riskSecondReviewerEmail: null,
          riskSecondReviewedAt: null,
          lastReviewedAt: completedAt,
          nextReviewAt: computeNextReviewAt(scored.residualTier, completedAt),
        },
      });
      await writeChangeLog({
        systemId: system.id,
        organizationId: system.organizationId,
        action: "assessment_completed",
        summary: `Risk assessment v${assessment.version} completed — residual ${scored.residualTier}.`,
        newValue: narrative,
        actor: access.actor,
      });
    } else {
      await prisma.aiSystemRegisterItem.update({
        where: { id: system.id },
        data: {
          riskAssessmentStatus: "in_progress",
          inherentRiskTier: scored.inherentTier,
          residualRiskTier: scored.residualTier,
          inherentRiskScore: scored.inherentScore,
          residualRiskScore: scored.residualScore,
          riskSummary: narrative,
        },
      });
    }

    return NextResponse.json({
      assessment,
      score: scored,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
