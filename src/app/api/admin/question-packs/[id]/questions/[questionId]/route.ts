import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { deleteQuestion, updateQuestion } from "@/lib/question-pack-service";
import { isRiskPillarId } from "@/lib/pillar-questionnaire";

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { questionId } = await params;
    const body = (await request.json()) as {
      pillarId?: string;
      prompt?: string;
      helpText?: string | null;
      sortOrder?: number;
      active?: boolean;
    };
    if (body.pillarId && !isRiskPillarId(body.pillarId)) {
      return NextResponse.json({ error: "Choose a valid pillar." }, { status: 400 });
    }
    const question = await updateQuestion(questionId, body);
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof PrismaNotReadyError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update question." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { questionId } = await params;
    await deleteQuestion(questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PrismaNotReadyError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to delete question." }, { status: 500 });
  }
}
