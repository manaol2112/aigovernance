import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDeliverable } from "@/lib/report-generator";
import { generateDeliverablePdf } from "@/lib/report-pdf-generator";
import type { DeliverableType } from "@prisma/client";

export const runtime = "nodejs";

const VALID_TYPES: DeliverableType[] = [
  "gap_assessment_report",
  "remediation_roadmap",
  "risk_control_matrix",
  "board_ready_summary",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as DeliverableType | null;
  const format = searchParams.get("format") ?? "pdf";

  if (type && VALID_TYPES.includes(type)) {
    if (format === "pdf") {
      try {
        const generated = await generateDeliverablePdf(id, type);
        return new NextResponse(new Uint8Array(generated.buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${generated.filename}"`,
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        console.error("[deliverables PDF]", error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "PDF generation failed" },
          { status: 500 }
        );
      }
    }

    const generated = await generateDeliverable(id, type);
    if (format === "json") {
      return NextResponse.json({ title: generated.title, content: generated.content });
    }

    return new NextResponse(generated.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}.md"`,
      },
    });
  }

  const deliverables = await prisma.deliverable.findMany({ where: { assessmentId: id } });
  return NextResponse.json(deliverables);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type, approvedBy } = body as { type: DeliverableType; approvedBy: string };

  const updated = await prisma.deliverable.update({
    where: { assessmentId_type: { assessmentId: id, type } },
    data: { status: "approved", approvedBy, approvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
