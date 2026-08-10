import { NextResponse } from "next/server";
import { prisma, assertPrismaReady } from "@/lib/db";
import type { MaturityDocumentStatus } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertPrismaReady();
  const body = await request.json();
  const { documentId, pillarId, status } = body as {
    documentId: string;
    pillarId: string;
    status: MaturityDocumentStatus;
  };

  if (!documentId || !pillarId || !status) {
    return NextResponse.json(
      { error: "documentId, pillarId, and status are required." },
      { status: 400 }
    );
  }

  const survey = await prisma.maturitySurvey.findUnique({ where: { id } });
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }
  if (survey.status === "completed") {
    return NextResponse.json({ error: "Survey is already completed." }, { status: 400 });
  }

  const response = await prisma.maturitySurveyDocumentResponse.upsert({
    where: { surveyId_documentId: { surveyId: id, documentId } },
    create: {
      surveyId: id,
      documentId,
      pillarId,
      status,
    },
    update: {
      pillarId,
      status,
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
