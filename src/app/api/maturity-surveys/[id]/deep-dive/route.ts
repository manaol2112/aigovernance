import { NextResponse } from "next/server";
import { PrismaNotReadyError, assertPrismaReady } from "@/lib/db";
import { createDeepDiveFromQuickScan } from "@/lib/maturity-survey-continue";
import { normalizeFocusPillarIds } from "@/lib/maturity-survey-types";

type RouteParams = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("[maturity-surveys/deep-dive]", error);
  return NextResponse.json({ error: "Failed to start deep dive." }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertPrismaReady();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const focusPillarIds = normalizeFocusPillarIds(
      Array.isArray(body.focusPillarIds) ? body.focusPillarIds : []
    );

    const result = await createDeepDiveFromQuickScan(id, focusPillarIds);
    return NextResponse.json({
      surveyId: result.survey.id,
      created: result.created,
      prefilledCount: result.prefilledCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
