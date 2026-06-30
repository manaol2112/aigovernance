import { NextResponse } from "next/server";
import { buildControlReviewReportData } from "@/lib/control-review-reports";
import { ALL_DEPARTMENTS } from "@/lib/workshop-department";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const departmentParam = searchParams.get("department");
    const department =
      departmentParam && departmentParam !== ALL_DEPARTMENTS ? departmentParam : null;
    const refresh = searchParams.get("refresh") === "1";

    const report = await buildControlReviewReportData(id, department, {
      refreshNarratives: refresh,
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error("[control-review reports GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build report" },
      { status: 500 }
    );
  }
}
