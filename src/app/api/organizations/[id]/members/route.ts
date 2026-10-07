import { NextResponse } from "next/server";
import type { AiRegisterOrgRole } from "@prisma/client";
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
} from "@/lib/ai-system-register-actor";
import { normalizeEmail } from "@/lib/ai-system-register-governance";

type Ctx = { params: Promise<{ id: string }> };

const ROLES: AiRegisterOrgRole[] = ["admin", "risk_owner", "contributor", "viewer"];

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
  console.error("[organizations/members]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(id, actor);
    // Allow reading members when bootstrap or any authenticated member
    if ("error" in access && access.status === 401) {
      return NextResponse.json({ error: access.error }, { status: 401 });
    }
    if ("error" in access) {
      return NextResponse.json({ members: [], access: null });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: id },
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
    });

    return NextResponse.json({
      members,
      access: { role: access.role, bootstrap: access.bootstrap, actor: access.actor },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(id, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "manage_members");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    if (access.bootstrap) await ensureBootstrapAdmin(id, access.actor);

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email ?? ""));
    const displayName = String(body.displayName ?? "").trim();
    const role = String(body.role ?? "contributor") as AiRegisterOrgRole;
    if (!email || !displayName) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const member = await prisma.organizationMember.upsert({
      where: { organizationId_email: { organizationId: id, email } },
      create: { organizationId: id, email, displayName, role },
      update: { displayName, role },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(id, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "manage_members");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await prisma.organizationMember.deleteMany({
      where: { organizationId: id, email },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
