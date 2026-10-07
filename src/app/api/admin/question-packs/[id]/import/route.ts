import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { importQuestionsFromCsv } from "@/lib/question-pack-service";

type RouteParams = { params: Promise<{ id: string }> };

async function readCsvFromRequest(request: Request): Promise<{
  csv: string;
  mode: "replace" | "append";
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const mode = form.get("mode") === "append" ? "append" : "replace";
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new Error("CSV file is required.");
    }
    const csv = await file.text();
    return { csv, mode };
  }

  const body = (await request.json()) as { csv?: string; mode?: "replace" | "append" };
  return {
    csv: body.csv ?? "",
    mode: body.mode === "append" ? "append" : "replace",
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const { csv, mode } = await readCsvFromRequest(request);
    if (!csv.trim()) {
      return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
    }
    const result = await importQuestionsFromCsv(id, csv, mode);
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
