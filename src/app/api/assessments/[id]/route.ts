import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rm } from "fs/promises";
import { join } from "path";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.assessment.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    await prisma.assessment.delete({ where: { id } });

    try {
      await rm(join(process.cwd(), "uploads", id), { recursive: true, force: true });
    } catch {
      // uploads folder may not exist
    }

    return NextResponse.json({ deleted: true, id: existing.id, name: existing.name });
  } catch (error) {
    console.error("[assessment DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete assessment" },
      { status: 500 }
    );
  }
}
