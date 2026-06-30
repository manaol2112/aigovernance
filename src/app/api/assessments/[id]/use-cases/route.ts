import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncCheckpoints } from "@/lib/workflow";
import { normalizeDepartmentName } from "@/lib/workshop-department";
import type { UseCaseType, ActorType, RiskTier } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const count = await prisma.useCase.count({ where: { assessmentId: id } });

    const useCase = await prisma.useCase.create({
      data: {
        assessmentId: id,
        name: body.name,
        description: body.description,
        useCaseType: body.useCaseType as UseCaseType,
        actorRole: (body.actorRole as ActorType) ?? null,
        riskTier: (body.riskTier as RiskTier) ?? null,
        dataCategories: body.dataCategories ?? [],
        department: normalizeDepartmentName(body.department),
        sortOrder: body.sortOrder ?? count,
      },
    });

    await syncCheckpoints(id);
    return NextResponse.json(useCase);
  } catch (error) {
    console.error("[use-cases POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create use case";
    const hint = message.includes("Unknown field `department`")
      ? " Restart the dev server (npm run dev) so Prisma picks up the department field."
      : "";
    return NextResponse.json({ error: message + hint }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { useCaseId, department, name, description } = body as {
      useCaseId?: string;
      department?: string | null;
      name?: string;
      description?: string;
    };

    if (!useCaseId) {
      return NextResponse.json({ error: "useCaseId required" }, { status: 400 });
    }

    const useCase = await prisma.useCase.updateMany({
      where: { id: useCaseId, assessmentId: id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(department !== undefined ? { department: normalizeDepartmentName(department) } : {}),
      },
    });

    if (useCase.count === 0) {
      return NextResponse.json({ error: "Use case not found" }, { status: 404 });
    }

    const updated = await prisma.useCase.findUnique({ where: { id: useCaseId } });
    await syncCheckpoints(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[use-cases PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update use case" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const useCaseId = searchParams.get("useCaseId");
    if (!useCaseId) {
      return NextResponse.json({ error: "useCaseId required" }, { status: 400 });
    }

    await prisma.useCase.deleteMany({ where: { id: useCaseId, assessmentId: id } });
    await syncCheckpoints(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[use-cases DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete use case" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const useCases = await prisma.useCase.findMany({
      where: { assessmentId: id },
      include: {
        _count: { select: { scopedRequirements: true, pillarWorkshopResponses: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(useCases);
  } catch (error) {
    console.error("[use-cases GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load use cases" },
      { status: 500 }
    );
  }
}
