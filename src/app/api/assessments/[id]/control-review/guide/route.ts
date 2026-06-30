import { NextResponse } from "next/server";
import { getControlWorkshopGuide } from "@/lib/control-workshop-guide";
import {
  getAssessmentWorkshopGuide,
  getPillarWorkshopGuide,
} from "@/lib/pillar-workshop-guide";
import { getDepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import { ALL_DEPARTMENTS } from "@/lib/workshop-department";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const url = new URL(request.url);
    const controlId = url.searchParams.get("controlId");
    const pillarId = url.searchParams.get("pillarId");
    const all = url.searchParams.get("all") === "true";
    const departmentParam = url.searchParams.get("department");
    const department =
      departmentParam && departmentParam !== ALL_DEPARTMENTS ? departmentParam : null;
    const facilitatorDepartment = url.searchParams.get("facilitatorDepartment");
    const departmentGuide = url.searchParams.get("departmentGuide") === "true";

    if (departmentGuide && facilitatorDepartment) {
      const guide = await getDepartmentWorkshopGuide(
        assessmentId,
        facilitatorDepartment,
        department
      );
      if (!guide) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }
      return NextResponse.json(guide);
    }

    if (all) {
      const guides = await getAssessmentWorkshopGuide(assessmentId, department);
      return NextResponse.json({ pillars: guides });
    }

    if (pillarId) {
      const guide = await getPillarWorkshopGuide(assessmentId, pillarId, department);
      if (!guide) {
        return NextResponse.json({ error: "Pillar not found" }, { status: 404 });
      }
      return NextResponse.json(guide);
    }

    if (!controlId) {
      return NextResponse.json(
        { error: "controlId, pillarId, or all=true query param required" },
        { status: 400 }
      );
    }

    const guide = await getControlWorkshopGuide(controlId, assessmentId, department);
    if (!guide) {
      return NextResponse.json({ error: "Control not found" }, { status: 404 });
    }

    return NextResponse.json(guide);
  } catch (error) {
    console.error("[control-review/guide GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load guide" },
      { status: 500 }
    );
  }
}
