import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { getQuestionCatalogSettings, updateQuestionCatalogSettings } from "@/lib/question-catalog-settings";

function errorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Failed to update questionnaire settings." }, { status: 500 });
}

export async function GET() {
  try {
    assertPrismaReady();
    const settings = await getQuestionCatalogSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertPrismaReady();
    const body = (await request.json()) as {
      allowOverride?: boolean;
      maturitySource?: "framework" | "pack";
      maturityDefaultPackId?: string | null;
      workshopSource?: "framework" | "pack";
      workshopDefaultPackId?: string | null;
    };
    const settings = await updateQuestionCatalogSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
