import { NextResponse } from "next/server";
import { prisma, assertPrismaReady } from "@/lib/db";
import { isPillarQuestionAnswer } from "@/lib/pillar-questionnaire";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertPrismaReady();
  const body = await request.json();
  const { questionId, answer, notes } = body as {
    questionId?: string;
    answer?: string;
    notes?: string;
  };

  if (!questionId || !isPillarQuestionAnswer(answer)) {
    return NextResponse.json({ error: "questionId and a valid answer are required." }, { status: 400 });
  }

  const survey = await prisma.maturitySurvey.findUnique({ where: { id } });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.questionCatalogSource !== "pack") {
    return NextResponse.json({ error: "This survey does not use a question pack." }, { status: 400 });
  }
  if (survey.status === "completed") {
    return NextResponse.json({ error: "Survey is already completed." }, { status: 400 });
  }

  const snapshot = await prisma.maturitySurveyPackQuestion.findFirst({
    where: { id: questionId, surveyId: id },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Question not found on this survey." }, { status: 404 });
  }

  const response = await prisma.maturitySurveyPackResponse.upsert({
    where: { surveyId_questionId: { surveyId: id, questionId } },
    create: {
      surveyId: id,
      questionId,
      answer,
      notes: notes?.trim() || null,
    },
    update: {
      answer,
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
  });

  if (survey.status === "draft") {
    await prisma.maturitySurvey.update({ where: { id }, data: { status: "in_progress" } });
  }

  return NextResponse.json(response);
}
