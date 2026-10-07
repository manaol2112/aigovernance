import { NextResponse } from "next/server";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import { validateOrganizationName } from "@/lib/ai-system-register";
import {
  ensureBootstrapAdmin,
  parseRegisterActor,
} from "@/lib/ai-system-register-actor";

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
  console.error("[organizations]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

export async function GET() {
  try {
    assertAiRegisterPrismaReady();
    const organizations = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { systems: true } },
      },
    });
    return NextResponse.json(organizations);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    assertAiRegisterPrismaReady();
    const body = await req.json().catch(() => ({}));
    const nameError = validateOrganizationName(String(body.name ?? ""));
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: {
        name: String(body.name).trim(),
        industry: typeof body.industry === "string" ? body.industry.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      },
      include: {
        _count: { select: { systems: true } },
      },
    });

    const actor = parseRegisterActor(req);
    if (actor) {
      await ensureBootstrapAdmin(organization.id, actor);
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
