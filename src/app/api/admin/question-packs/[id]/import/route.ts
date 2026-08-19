import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { importQuestionsFromCsv } from "@/lib/question-pack-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const body = (await request.json()) as { csv?: string; mode?: "replace" | "append" };
    if (!body.csv?.trim()) {
      return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
    }
    const result = await importQuestionsFromCsv(id, body.csv, body.mode === "append" ? "append" : "replace");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PrismaNotReadyError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to import questions." }, { status: 500 });
  }
}
