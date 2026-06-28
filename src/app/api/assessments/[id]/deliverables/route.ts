import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDeliverable } from "@/lib/report-generator";
import type { DeliverableType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as DeliverableType | null;
  const format = searchParams.get("format") ?? "markdown";

  if (type) {
    const deliverable = await prisma.deliverable.findUnique({
      where: { assessmentId_type: { assessmentId: id, type } },
    });
    if (!deliverable) {
      const generated = await generateDeliverable(id, type);
      if (format === "json") {
        return NextResponse.json({ title: generated.title, content: generated.content });
      }
      return new NextResponse(generated.content, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${type}.md"`,
        },
      });
    }
    if (format === "json") {
      return NextResponse.json(deliverable);
    }
    return new NextResponse(deliverable.content, {
      headers: {
        "Content-Type": "text/markdown",
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
