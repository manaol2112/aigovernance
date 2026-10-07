import { NextResponse } from "next/server";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import {
  buildControlRecommendations,
  mergeKeyControlCodes,
  type ControlCatalogItem,
} from "@/lib/ai-system-register-control-recommendations";
import {
  emptyFactorScores,
  parseFactorScores,
} from "@/lib/ai-system-register-risk-assessment";
import {
  assertPermission,
  ensureBootstrapAdmin,
  parseRegisterActor,
  resolveRegisterAccess,
  writeChangeLog,
} from "@/lib/ai-system-register-actor";

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
  console.error("[ai-system-register/control-recommendations]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

async function loadControlCatalog(): Promise<ControlCatalogItem[]> {
  const controls = await prisma.canonicalControl.findMany({
    include: {
      riskLinks: { include: { risk: { select: { category: true } } } },
    },
    orderBy: { code: "asc" },
  });

  return controls.map((control) => ({
    code: control.code,
    title: control.title,
    ownerRole: control.ownerRole,
    description: control.description,
    riskCategories: Array.from(
      new Set(control.riskLinks.map((link) => link.risk.category).filter(Boolean))
    ),
  }));
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const system = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!system) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "recommend");

    if (action === "accept" || action === "remove") {
      const actor = parseRegisterActor(req);
      const access = await resolveRegisterAccess(system.organizationId, actor);
      if ("error" in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
      const denied = assertPermission(access, "write_system");
      if (denied) return NextResponse.json({ error: denied }, { status: 403 });
      if (access.bootstrap) await ensureBootstrapAdmin(system.organizationId, access.actor);

      if (action === "accept") {
        const codes = Array.isArray(body.controlCodes)
          ? body.controlCodes.map((code: unknown) => String(code).trim()).filter(Boolean)
          : [];
        if (!codes.length) {
          return NextResponse.json(
            { error: "Select at least one control to accept." },
            { status: 400 }
          );
        }
        const keyControlCodes = mergeKeyControlCodes(system.keyControlCodes ?? [], codes);
        const updated = await prisma.aiSystemRegisterItem.update({
          where: { id: system.id },
          data: { keyControlCodes },
          include: {
            organization: true,
            evidence: { orderBy: { uploadedAt: "desc" } },
            riskAssessments: { orderBy: { version: "desc" } },
            _count: { select: { evidence: true, riskAssessments: true } },
          },
        });
        await writeChangeLog({
          systemId: system.id,
          organizationId: system.organizationId,
          action: "key_controls_accepted",
          summary: `Accepted key controls: ${codes.join(", ")}`,
          actor: access.actor,
        });
        return NextResponse.json({
          keyControlCodes: updated.keyControlCodes,
          system: updated,
        });
      }

      const removeCode = String(body.controlCode ?? "").trim();
      if (!removeCode) {
        return NextResponse.json({ error: "controlCode is required." }, { status: 400 });
      }
      const keyControlCodes = (system.keyControlCodes ?? []).filter((code) => code !== removeCode);
      const updated = await prisma.aiSystemRegisterItem.update({
        where: { id: system.id },
        data: { keyControlCodes },
      });
      await writeChangeLog({
        systemId: system.id,
        organizationId: system.organizationId,
        action: "key_control_removed",
        summary: `Removed key control: ${removeCode}`,
        actor: access.actor,
      });
      return NextResponse.json({ keyControlCodes: updated.keyControlCodes });
    }

    const factorScores = parseFactorScores(body.factorScores ?? emptyFactorScores());
    const catalog = await loadControlCatalog();
    const { gaps, recommendations } = buildControlRecommendations(
      factorScores,
      catalog,
      system.keyControlCodes ?? []
    );

    const keyControls = catalog.filter((control) =>
      (system.keyControlCodes ?? []).includes(control.code)
    );

    return NextResponse.json({
      gaps,
      recommendations,
      keyControls: keyControls.map((control) => ({
        controlCode: control.code,
        controlTitle: control.title,
        ownerRole: control.ownerRole,
        description: control.description,
      })),
      keyControlCodes: system.keyControlCodes ?? [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
