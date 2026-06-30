import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { displayDepartment } from "@/lib/workshop-department";
import {
  getSuggestedDepartmentsForAssessment,
  mergeDepartmentOptions,
} from "@/lib/workshop-departments";
import { getDepartmentsForFrameworks } from "@/lib/workshop-departments-catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scope = await prisma.assessmentScope.findUnique({
      where: { assessmentId: id },
      select: { frameworkCodes: true },
    });
    const frameworkCodes = scope?.frameworkCodes ?? [];

    const suggested = await getSuggestedDepartmentsForAssessment(id);

    let assigned: string[] = [];
    try {
      const useCases = await prisma.useCase.findMany({
        where: { assessmentId: id },
        select: { department: true },
      });
      assigned = [...new Set(useCases.map((uc) => displayDepartment(uc.department)))].filter(
        (d) => d !== "Unassigned"
      );
    } catch (error) {
      console.error("[departments GET] use case departments", error);
    }

    const options = mergeDepartmentOptions(
      suggested.length > 0 ? suggested : getDepartmentsForFrameworks(frameworkCodes),
      assigned
    );

    return NextResponse.json({
      suggested,
      assigned,
      options,
      frameworkCodes,
    });
  } catch (error) {
    console.error("[departments GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load departments" },
      { status: 500 }
    );
  }
}
