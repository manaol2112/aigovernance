import { NextResponse } from "next/server";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import { validateOrganizationName } from "@/lib/ai-system-register";

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
  console.error("[organizations/:id]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { systems: true } },
      },
    });
    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    return NextResponse.json(organization);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: { name?: string; industry?: string | null; notes?: string | null } = {};

    if (body.name !== undefined) {
      const nameError = validateOrganizationName(String(body.name ?? ""));
      if (nameError) {
        return NextResponse.json({ error: nameError }, { status: 400 });
      }
      data.name = String(body.name).trim();
    }
    if (body.industry !== undefined) {
      data.industry = typeof body.industry === "string" ? body.industry.trim() || null : null;
    }
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }

    const organization = await prisma.organization.update({
      where: { id },
      data,
      include: { _count: { select: { systems: true } } },
    });
    return NextResponse.json(organization);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const existing = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { systems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    await prisma.organization.delete({ where: { id } });
    return NextResponse.json({ ok: true, deletedSystems: existing._count.systems });
  } catch (error) {
    return toErrorResponse(error);
  }
}
