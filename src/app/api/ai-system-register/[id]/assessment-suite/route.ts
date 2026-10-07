import { NextResponse } from "next/server";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import {
  assertPermission,
  ensureBootstrapAdmin,
  parseRegisterActor,
  resolveRegisterAccess,
  writeChangeLog,
} from "@/lib/ai-system-register-actor";
import {
  ASSESSMENT_MODULE_QUESTIONS,
  emptyModuleState,
  isModuleRiskRating,
  parseAssessmentSuite,
  type ModuleAnswerValue,
  type RegisterAssessmentTypeId,
} from "@/lib/ai-system-register-assessment-triggers";
import { rebuildAssessmentSuite } from "@/lib/ai-system-register-assessment-suite";
import {
  assertModuleCompleteRatingRationale,
  assertWaiverAllowed,
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
  console.error("[ai-system-register/assessment-suite]", error);
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

    const suite = rebuildAssessmentSuite(
      system as unknown as Record<string, unknown>,
      system.assessmentSuite
    );

    // Persist refreshed triggers so Risk tab stays current.
    if (JSON.stringify(suite.triggered) !== JSON.stringify(parseAssessmentSuite(system.assessmentSuite).triggered)) {
      await prisma.aiSystemRegisterItem.update({
        where: { id },
        data: { assessmentSuite: suite as object },
      });
    }

    return NextResponse.json(suite);
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
    const action = String(body.action ?? "save_module");
    const assessmentType = String(body.assessmentType ?? "") as RegisterAssessmentTypeId;

    let suite = rebuildAssessmentSuite(
      system as unknown as Record<string, unknown>,
      system.assessmentSuite
    );

    if (action === "recompute") {
      await prisma.aiSystemRegisterItem.update({
        where: { id },
        data: { assessmentSuite: suite as object },
      });
      return NextResponse.json(suite);
    }

    if (!suite.triggered.some((item) => item.assessmentType === assessmentType)) {
      return NextResponse.json(
        { error: "This assessment is not currently triggered for the use case." },
        { status: 400 }
      );
    }

    if (assessmentType === "formal_risk") {
      return NextResponse.json(
        {
          error:
            "Formal AI Risk Assessment is completed in the guided risk wizard, not this module form.",
        },
        { status: 400 }
      );
    }

    const moduleState = suite.modules[assessmentType] ?? emptyModuleState();

    const triggered = suite.triggered.find((item) => item.assessmentType === assessmentType);
    const priority = triggered?.priority ?? "recommended";

    if (action === "waive") {
      const reason = String(body.waivedReason ?? "").trim();
      if (!reason) {
        return NextResponse.json({ error: "Waiver rationale is required." }, { status: 400 });
      }
      if (!isModuleRiskRating(body.riskRating)) {
        return NextResponse.json(
          { error: "A risk rating is required when waiving this assessment." },
          { status: 400 }
        );
      }
      const ratingRationale =
        typeof body.riskRatingRationale === "string" ? body.riskRatingRationale.trim() : "";
      const waiverBlocked = assertWaiverAllowed({
        assessmentType,
        priority,
        riskRatingRationale: ratingRationale,
        actorRole: access.role,
        specialCategoryData: system.specialCategoryData,
        decisionImpact: system.decisionImpact,
        euAnnexIiiRelevance: system.euAnnexIiiRelevance,
      });
      if (waiverBlocked) {
        return NextResponse.json({ error: waiverBlocked }, { status: 400 });
      }
      suite.modules[assessmentType] = {
        ...moduleState,
        status: "waived",
        waivedReason: reason,
        riskRating: body.riskRating,
        riskRatingRationale: ratingRationale,
        completedAt: new Date().toISOString(),
      };
    } else if (action === "complete" || action === "save_module") {
      const answers = (body.answers ?? {}) as Record<string, ModuleAnswerValue>;
      const notes = typeof body.notes === "string" ? body.notes : moduleState.notes;
      const riskRating = isModuleRiskRating(body.riskRating)
        ? body.riskRating
        : moduleState.riskRating ?? null;
      const riskRatingRationale =
        typeof body.riskRatingRationale === "string"
          ? body.riskRatingRationale.trim()
          : moduleState.riskRatingRationale ?? null;
      const questions =
        ASSESSMENT_MODULE_QUESTIONS[
          assessmentType as Exclude<RegisterAssessmentTypeId, "formal_risk">
        ] ?? [];
      const answered = questions.filter((q) => {
        const value = answers[q.id];
        return value === "yes" || value === "partial" || value === "no" || value === "na";
      }).length;

      if (action === "complete" && answered < questions.length) {
        return NextResponse.json(
          { error: "Answer all module questions before completing." },
          { status: 400 }
        );
      }
      if (action === "complete" && !isModuleRiskRating(riskRating)) {
        return NextResponse.json(
          { error: "Assign a risk rating for this assessment before completing." },
          { status: 400 }
        );
      }
      if (action === "complete") {
        const rationaleError = assertModuleCompleteRatingRationale(riskRatingRationale);
        if (rationaleError) {
          return NextResponse.json({ error: rationaleError }, { status: 400 });
        }
      }

      const complete = action === "complete";

      suite.modules[assessmentType] = {
        status: complete
          ? "completed"
          : answered > 0 || isModuleRiskRating(riskRating)
            ? "in_progress"
            : "not_started",
        answers,
        notes,
        riskRating,
        riskRatingRationale: riskRatingRationale || null,
        completedAt: complete ? new Date().toISOString() : null,
        waivedReason: null,
      };
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    await prisma.aiSystemRegisterItem.update({
      where: { id },
      data: { assessmentSuite: suite as object },
    });

    await writeChangeLog({
      systemId: id,
      organizationId: system.organizationId,
      action: `assessment_module_${action}`,
      summary: `${assessmentType.replace(/_/g, " ")} assessment ${action.replace(/_/g, " ")}`,
      actor: access.actor,
    });

    return NextResponse.json(suite);
  } catch (error) {
    return toErrorResponse(error);
  }
}
