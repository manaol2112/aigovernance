import { NextResponse } from "next/server";
import { prisma, assertGuidedWorkshopPrismaReady } from "@/lib/db";
import { isPillarQuestionAnswer } from "@/lib/pillar-questionnaire";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  assertGuidedWorkshopPrismaReady();
  const body = await request.json();
  const { questionId, answer, facilitatorNotes } = body as {
    questionId?: string;
    answer?: string;
    facilitatorNotes?: string;
  };

  if (!questionId || !isPillarQuestionAnswer(answer)) {
    return NextResponse.json({ error: "questionId and a valid answer are required." }, { status: 400 });
  }

  const workshop = await prisma.guidedWorkshop.findUnique({ where: { id } });
  if (!workshop) return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
  if (workshop.questionCatalogSource !== "pack") {
    return NextResponse.json({ error: "This workshop does not use a question pack." }, { status: 400 });
  }
  if (workshop.status === "completed") {
    return NextResponse.json({ error: "Workshop is already completed." }, { status: 400 });
  }

  const snapshot = await prisma.guidedWorkshopPackQuestion.findFirst({
    where: { id: questionId, workshopId: id },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Question not found on this workshop." }, { status: 404 });
  }

  const response = await prisma.guidedWorkshopPackResponse.upsert({
    where: { workshopId_questionId: { workshopId: id, questionId } },
    create: {
      workshopId: id,
      questionId,
      answer,
      facilitatorNotes: facilitatorNotes?.trim() || null,
    },
    update: {
      answer,
      ...(facilitatorNotes !== undefined
        ? { facilitatorNotes: facilitatorNotes.trim() || null }
        : {}),
    },
  });

  return NextResponse.json(response);
}
