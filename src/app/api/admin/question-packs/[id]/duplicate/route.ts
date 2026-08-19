import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { duplicateQuestionPack } from "@/lib/question-pack-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const pack = await duplicateQuestionPack(id);
    return NextResponse.json(pack);
  } catch (error) {
    if (error instanceof PrismaNotReadyError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to duplicate pack." }, { status: 500 });
  }
}
