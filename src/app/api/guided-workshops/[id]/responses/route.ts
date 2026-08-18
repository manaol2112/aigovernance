import { NextResponse } from "next/server";
import { prisma, assertGuidedWorkshopPrismaReady } from "@/lib/db";
import type { MaturityLevel } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertGuidedWorkshopPrismaReady();
  const body = await request.json();
  const { controlId, pillarId, maturity, facilitatorNotes } = body as {
    controlId: string;
    pillarId: string;
    maturity: MaturityLevel;
    facilitatorNotes?: string;
  };

  if (!controlId || !pillarId || !maturity) {
    return NextResponse.json(
      { error: "controlId, pillarId, and maturity are required." },
      { status: 400 }
    );
  }

  const workshop = await prisma.guidedWorkshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
  }
  if (workshop.status === "completed") {
    return NextResponse.json({ error: "Workshop is already completed." }, { status: 400 });
  }

  const response = await prisma.guidedWorkshopResponse.upsert({
    where: {
      workshopId_pillarId_controlId: { workshopId: id, pillarId, controlId },
    },
    create: {
      workshopId: id,
      controlId,
      pillarId,
      maturity,
      facilitatorNotes: facilitatorNotes?.trim() || null,
    },
    update: {
      maturity,
      ...(facilitatorNotes !== undefined
        ? { facilitatorNotes: facilitatorNotes?.trim() || null }
        : {}),
      pillarId,
    },
  });

  if (workshop.status === "draft") {
    await prisma.guidedWorkshop.update({
      where: { id },
      data: { status: "in_progress" },
    });
  }

  return NextResponse.json(response);
}
