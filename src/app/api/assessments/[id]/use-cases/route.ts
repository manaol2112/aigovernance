import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncCheckpoints } from "@/lib/workflow";
import type { UseCaseType, ActorType, RiskTier } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      sortOrder: body.sortOrder ?? count,
    },
  });

  await syncCheckpoints(id);
  return NextResponse.json(useCase);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const useCaseId = searchParams.get("useCaseId");
  if (!useCaseId) {
    return NextResponse.json({ error: "useCaseId required" }, { status: 400 });
  }

  await prisma.useCase.deleteMany({ where: { id: useCaseId, assessmentId: id } });
  await syncCheckpoints(id);
  return NextResponse.json({ deleted: true });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const useCases = await prisma.useCase.findMany({
    where: { assessmentId: id },
    include: {
      _count: { select: { scopedRequirements: true, pillarWorkshopResponses: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(useCases);
}
