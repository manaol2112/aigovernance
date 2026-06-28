import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const responses = await prisma.workshopPillarResponse.findMany({
      where: { useCase: { assessmentId: id } },
      include: {
        useCase: true,
        evidenceFiles: true,
      },
      orderBy: [{ useCase: { sortOrder: "asc" } }, { pillarLabel: "asc" }],
    });
    return NextResponse.json(responses);
  } catch (error) {
    console.error("[workshop GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workshop" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const pillarResponseId = formData.get("pillarResponseId") as string;
    const file = formData.get("file") as File;
    const description = formData.get("description") as string | null;

    if (!pillarResponseId || !file) {
      return NextResponse.json({ error: "pillarResponseId and file required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = join(process.cwd(), "uploads", id);
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    const evidence = await prisma.pillarEvidence.create({
      data: {
        workshopPillarResponseId: pillarResponseId,
        fileName: file.name,
        filePath: `uploads/${id}/${safeName}`,
        mimeType: file.type || "application/octet-stream",
        fileSize: buffer.length,
        description: description || null,
      },
    });

    return NextResponse.json(evidence);
  }

  const body = await request.json();
  const { pillarResponseId, clientNotes, facilitatorNotes } = body;

  const updated = await prisma.workshopPillarResponse.update({
    where: { id: pillarResponseId },
    data: {
      clientNotes: clientNotes ?? undefined,
      facilitatorNotes: facilitatorNotes ?? undefined,
    },
    include: { evidenceFiles: true, useCase: true },
  });

  return NextResponse.json(updated);
}
