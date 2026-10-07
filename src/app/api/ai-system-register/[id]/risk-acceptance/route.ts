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
  computeNextReviewAt,
  normalizeEmail,
  requiresSecondReviewer,
  validateRiskAcceptance,
} from "@/lib/ai-system-register-governance";

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
  console.error("[ai-system-register/risk-acceptance]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
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
    const denied = assertPermission(access, "accept_risk");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    if (access.bootstrap) await ensureBootstrapAdmin(system.organizationId, access.actor);

    if (system.riskAssessmentStatus === "stale") {
      return NextResponse.json(
        { error: "Re-run the risk assessment before accepting residual risk." },
        { status: 400 }
      );
    }
    if (system.riskSource !== "assessed") {
      return NextResponse.json(
        {
          error:
            "Risk acceptance requires a completed formal assessment. Manual classification alone is not sufficient.",
        },
        { status: 400 }
      );
    }
    if (!system.riskTier) {
      return NextResponse.json(
        { error: "Set or assess a risk tier before acceptance." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "accept");

    // Dual-control step 2: designated second reviewer attests separately.
    if (action === "second_approve") {
      if (system.riskAcceptanceStatus !== "pending_second_review") {
        return NextResponse.json(
          { error: "No pending second-reviewer approval for this system." },
          { status: 400 }
        );
      }
      const designated = normalizeEmail(system.riskSecondReviewerEmail ?? "");
      const actorEmail = normalizeEmail(access.actor.email);
      if (!designated || actorEmail !== designated) {
        return NextResponse.json(
          {
            error:
              "Only the designated second reviewer can approve this residual risk acceptance.",
          },
          { status: 403 }
        );
      }
      if (actorEmail === normalizeEmail(system.riskAcceptedByEmail ?? "")) {
        return NextResponse.json(
          { error: "Second reviewer must be different from the original accepter." },
          { status: 400 }
        );
      }

      const now = new Date();
      const updated = await prisma.aiSystemRegisterItem.update({
        where: { id },
        data: {
          riskAcceptanceStatus: "accepted",
          riskSecondReviewer: access.actor.displayName,
          riskSecondReviewerEmail: actorEmail,
          riskSecondReviewedAt: now,
          lastReviewedAt: now,
          nextReviewAt: computeNextReviewAt(system.riskTier, now),
        },
        include: {
          organization: true,
          evidence: { orderBy: { uploadedAt: "desc" } },
          riskAssessments: { orderBy: { version: "desc" } },
        },
      });

      await writeChangeLog({
        systemId: id,
        organizationId: system.organizationId,
        action: "risk_second_approved",
        summary: `Second reviewer ${access.actor.displayName} approved residual risk (${system.riskTier}).`,
        actor: access.actor,
      });

      return NextResponse.json(updated);
    }

    if (system.riskAcceptanceStatus === "accepted") {
      return NextResponse.json(
        { error: "Residual risk is already accepted. Re-assess if the rating changed." },
        { status: 400 }
      );
    }

    const note = String(body.note ?? "").trim();
    const secondReviewerName =
      typeof body.secondReviewerName === "string" ? body.secondReviewerName.trim() : "";
    const secondReviewerEmail =
      typeof body.secondReviewerEmail === "string"
        ? body.secondReviewerEmail.trim().toLowerCase()
        : "";

    const needsSecond = requiresSecondReviewer(system.riskTier);
    const validationError = validateRiskAcceptance({
      tier: system.riskTier,
      accepterEmail: access.actor.email,
      accepterName: access.actor.displayName,
      note,
      secondReviewerEmail: needsSecond ? secondReviewerEmail : null,
      secondReviewerName: needsSecond ? secondReviewerName : null,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (needsSecond) {
      const reviewer = await prisma.organizationMember.findFirst({
        where: {
          organizationId: system.organizationId,
          email: secondReviewerEmail,
          role: { in: ["admin", "risk_owner"] },
        },
      });
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId: system.organizationId },
      });
      if (memberCount > 0 && !reviewer) {
        return NextResponse.json(
          {
            error:
              "Second reviewer must be an organization member with risk owner or admin role.",
          },
          { status: 400 }
        );
      }

      const now = new Date();
      const updated = await prisma.aiSystemRegisterItem.update({
        where: { id },
        data: {
          riskAcceptanceStatus: "pending_second_review",
          riskAcceptedBy: access.actor.displayName,
          riskAcceptedByEmail: access.actor.email,
          riskAcceptedAt: now,
          riskAcceptanceNote: note,
          riskSecondReviewer: secondReviewerName,
          riskSecondReviewerEmail: secondReviewerEmail,
          riskSecondReviewedAt: null,
        },
        include: {
          organization: true,
          evidence: { orderBy: { uploadedAt: "desc" } },
          riskAssessments: { orderBy: { version: "desc" } },
        },
      });

      await writeChangeLog({
        systemId: id,
        organizationId: system.organizationId,
        action: "risk_acceptance_pending_second",
        summary: `Residual risk (${system.riskTier}) accepted pending second review by ${secondReviewerName}.`,
        newValue: note,
        actor: access.actor,
      });

      return NextResponse.json(updated);
    }

    const now = new Date();
    const updated = await prisma.aiSystemRegisterItem.update({
      where: { id },
      data: {
        riskAcceptanceStatus: "accepted",
        riskAcceptedBy: access.actor.displayName,
        riskAcceptedByEmail: access.actor.email,
        riskAcceptedAt: now,
        riskAcceptanceNote: note,
        riskSecondReviewer: null,
        riskSecondReviewerEmail: null,
        riskSecondReviewedAt: null,
        lastReviewedAt: now,
        nextReviewAt: computeNextReviewAt(system.riskTier, now),
      },
      include: {
        organization: true,
        evidence: { orderBy: { uploadedAt: "desc" } },
        riskAssessments: { orderBy: { version: "desc" } },
      },
    });

    await writeChangeLog({
      systemId: id,
      organizationId: system.organizationId,
      action: "risk_accepted",
      summary: `Residual risk (${system.riskTier}) accepted.`,
      newValue: note,
      actor: access.actor,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
