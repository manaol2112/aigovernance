import { NextResponse } from "next/server";
import { prisma, assertPrismaReady } from "@/lib/db";
import type { MaturityLevel } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertPrismaReady();
  const body = await request.json();
  const { controlId, pillarId, maturity, notes } = body as {
    controlId: string;
    pillarId: string;
    maturity: MaturityLevel;
    notes?: string;
  };

  if (!controlId || !pillarId || !maturity) {
    return NextResponse.json({ error: "controlId, pillarId, and maturity are required." }, { status: 400 });
  }

  const survey = await prisma.maturitySurvey.findUnique({ where: { id } });
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }
  if (survey.status === "completed") {
    return NextResponse.json({ error: "Survey is already completed." }, { status: 400 });
  }

  const response = await prisma.maturitySurveyResponse.upsert({
    where: { surveyId_controlId: { surveyId: id, controlId } },
    create: {
      surveyId: id,
      controlId,
      pillarId,
      maturity,
      notes: notes?.trim() || null,
    },
    update: {
      maturity,
      notes: notes?.trim() || null,
      pillarId,
    },
  });

  if (survey.status === "draft") {
    await prisma.maturitySurvey.update({
      where: { id },
      data: { status: "in_progress" },
    });
  }

  return NextResponse.json(response);
}
