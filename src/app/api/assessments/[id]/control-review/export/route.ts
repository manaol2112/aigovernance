import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import {
  getAssessmentWorkshopGuide,
  getPillarWorkshopGuide,
} from "@/lib/pillar-workshop-guide";
import { ALL_DEPARTMENTS } from "@/lib/workshop-department";
import {
  buildWorkshopExportFilename,
  buildWorkshopQuestionsHtml,
} from "@/lib/workshop-questions-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const url = new URL(request.url);
    const pillarId = url.searchParams.get("pillarId");
    const all = url.searchParams.get("all") === "true";
    const departmentParam = url.searchParams.get("department");
    const scopeDepartment =
      departmentParam && departmentParam !== ALL_DEPARTMENTS ? departmentParam : null;
    const facilitatorDepartment = url.searchParams.get("facilitatorDepartment");
    const departmentGuide = url.searchParams.get("departmentGuide") === "true";
    const includeEvidence = url.searchParams.get("includeEvidence") !== "false";

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { scope: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const scopeLabel = scopeDepartment ?? "All organization";
    const frameworkCodes = assessment.scope?.frameworkCodes ?? [];

    if (departmentGuide && facilitatorDepartment) {
      const guide = await getDepartmentWorkshopGuide(
        assessmentId,
        facilitatorDepartment,
        scopeDepartment
      );
      if (!guide || guide.sections.length === 0) {
        return NextResponse.json({ error: "No workshop content for this department" }, { status: 404 });
      }

      const html = buildWorkshopQuestionsHtml(
        {
          assessmentName: assessment.name,
          clientName: assessment.clientName,
          clientIndustry: assessment.clientIndustry,
          frameworkCodes,
          scopeLabel,
          exportTitle: `${facilitatorDepartment} Workshop Questions`,
          exportSubtitle: `Cross-pillar facilitation questions for ${facilitatorDepartment} — for use during the AI governance workshop walkthrough.`,
          includeEvidence,
        },
        [],
        guide
      );

      const filename = buildWorkshopExportFilename({
        assessmentName: assessment.name,
        scopeLabel,
        exportTitle: `${facilitatorDepartment}-workshop`,
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    let guides;
    let exportTitle: string;

    if (pillarId) {
      const guide = await getPillarWorkshopGuide(assessmentId, pillarId, scopeDepartment);
      if (!guide || guide.subPillars.length === 0) {
        return NextResponse.json({ error: "No workshop content for this pillar" }, { status: 404 });
      }
      guides = [guide];
      exportTitle = `${guide.pillarLabel} Workshop Questions`;
    } else if (all) {
      guides = await getAssessmentWorkshopGuide(assessmentId, scopeDepartment);
      if (guides.length === 0) {
        return NextResponse.json({ error: "No workshop content in scope" }, { status: 404 });
      }
      exportTitle = "Complete Workshop Question Guide";
    } else {
      return NextResponse.json(
        { error: "Specify pillarId, all=true, or departmentGuide with facilitatorDepartment" },
        { status: 400 }
      );
    }

    const html = buildWorkshopQuestionsHtml(
      {
        assessmentName: assessment.name,
        clientName: assessment.clientName,
        clientIndustry: assessment.clientIndustry,
        frameworkCodes,
        scopeLabel,
        exportTitle,
        includeEvidence,
      },
      guides
    );

    const filename = buildWorkshopExportFilename({
      assessmentName: assessment.name,
      scopeLabel,
      exportTitle: pillarId ? guides[0]!.pillarLabel : "complete-workshop",
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[control-review/export GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
