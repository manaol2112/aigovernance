import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import {
  archiveQuestionPack,
  getQuestionPack,
  updateQuestionPack,
} from "@/lib/question-pack-service";

type RouteParams = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Failed to update question pack." }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const pack = await getQuestionPack(id);
    if (!pack) return NextResponse.json({ error: "Question pack not found." }, { status: 404 });
    return NextResponse.json(pack);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const body = (await request.json()) as { name?: string; description?: string | null };
    const pack = await updateQuestionPack(id, body);
    return NextResponse.json(pack);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    await archiveQuestionPack(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
