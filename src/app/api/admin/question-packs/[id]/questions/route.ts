import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { addQuestion } from "@/lib/question-pack-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const body = (await request.json()) as {
      pillarId?: string;
      prompt?: string;
      helpText?: string;
      weight?: number;
    };
    if (!body.pillarId) {
      return NextResponse.json({ error: "Choose a valid pillar." }, { status: 400 });
    }
    const question = await addQuestion(id, {
      pillarId: body.pillarId,
      prompt: body.prompt ?? "",
      helpText: body.helpText,
      weight: body.weight,
    });
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof PrismaNotReadyError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add question." }, { status: 500 });
  }
}
