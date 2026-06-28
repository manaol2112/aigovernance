import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      scope: true,
      responses: {
        include: {
          control: {
            include: {
              requirementLinks: {
                include: { requirement: { include: { framework: true } } },
              },
            },
          },
        },
      },
      gaps: {
        include: {
          requirement: { include: { framework: true } },
          control: true,
          risk: true,
        },
      },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const report = {
    assessment: {
      id: assessment.id,
      name: assessment.name,
      description: assessment.description,
      status: assessment.status,
      createdAt: assessment.createdAt,
      scope: assessment.scope,
    },
    summary: {
      totalControls: assessment.responses.length,
      gaps: assessment.gaps.length,
      maturityBreakdown: assessment.responses.reduce(
        (acc, r) => {
          acc[r.maturity] = (acc[r.maturity] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
    responses: assessment.responses.map((r) => ({
      controlCode: r.control.code,
      controlTitle: r.control.title,
      maturity: r.maturity,
      evidenceNotes: r.evidenceNotes,
      implementationNotes: r.implementationNotes,
      linkedRequirements: r.control.requirementLinks.map((l) => ({
        framework: l.requirement.framework.code,
        clauseId: l.requirement.clauseId,
        title: l.requirement.title,
        coverage: l.coverage,
      })),
    })),
    gaps: assessment.gaps.map((g) => ({
      severity: g.severity,
      title: g.title,
      description: g.description,
      remediation: g.remediation,
      controlCode: g.control?.code,
      requirement: g.requirement
        ? {
            framework: g.requirement.framework.code,
            clauseId: g.requirement.clauseId,
            title: g.requirement.title,
          }
        : null,
      riskCode: g.risk?.code,
    })),
  };

  if (format === "csv") {
    const rows = [
      ["Control Code", "Control Title", "Maturity", "Evidence Notes", "Implementation Notes", "Gap Severity", "Gap Title"],
      ...assessment.responses.map((r) => {
        const gap = assessment.gaps.find((g) => g.controlId === r.controlId);
        return [
          r.control.code,
          r.control.title,
          r.maturity,
          r.evidenceNotes ?? "",
          r.implementationNotes ?? "",
          gap?.severity ?? "",
          gap?.title ?? "",
        ];
      }),
    ];
    const csv = rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="assessment-${assessment.id}-gap-report.csv"`,
      },
    });
  }

  return NextResponse.json(report, {
    headers: {
      "Content-Disposition": `attachment; filename="assessment-${assessment.id}-gap-report.json"`,
    },
  });
}
