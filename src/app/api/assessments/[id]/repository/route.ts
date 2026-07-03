import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { extractTextFromFile, extractTextFromFileAsync } from "@/lib/evidence-text";
import {
  ALL_DEPARTMENTS,
  getNotesForDepartment,
  parseDepartmentNotes,
} from "@/lib/workshop-department";
import { classifyEvidenceFile } from "@/lib/evidence-classifier";
import { indexEvidenceFile } from "@/lib/capture-vector-index";
import {
  isControlDocumentationEvidence,
  isTranscriptEvidence,
  transcriptEvidenceDescription,
  type EvidenceKind,
} from "@/lib/transcript-evidence";

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

    const [repo, evidence] = await Promise.all([
      prisma.assessmentRepository.findUnique({ where: { assessmentId: id } }),
      prisma.assessmentEvidence.findMany({
        where: { assessmentId: id },
        orderBy: { uploadedAt: "desc" },
      }),
    ]);

    const departmentNotes = parseDepartmentNotes(repo?.departmentNotes);

    if (department) {
      const entry = getNotesForDepartment(departmentNotes, department);
      return NextResponse.json({
        workshopNotes: entry.workshopNotes ?? "",
        facilitatorNotes: entry.facilitatorNotes ?? "",
        evidence,
        department,
        departmentNotes,
      });
    }

    return NextResponse.json({
      workshopNotes: repo?.workshopNotes ?? "",
      facilitatorNotes: repo?.facilitatorNotes ?? "",
      evidence,
      department: ALL_DEPARTMENTS,
      departmentNotes,
      transcripts: evidence.filter((e) => e.description?.startsWith("[transcript]")),
      supportingEvidence: evidence.filter((e) => !e.description?.startsWith("[transcript]")),
    });
  } catch (error) {
    console.error("[repository GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load repository" },
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
    const file = formData.get("file") as File;
    const description = (formData.get("description") as string) || null;
    const category = (formData.get("category") as string) || null;
    const controlCodesRaw = (formData.get("controlCodes") as string) || "";
    const controlCodes = controlCodesRaw
      ? controlCodesRaw.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = join(process.cwd(), "uploads", id, "evidence");
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    const relativePath = `uploads/${id}/evidence/${safeName}`;
    const mimeType = file.type || "application/octet-stream";
    const extractedText =
      (await extractTextFromFileAsync(filePath, mimeType, file.name)) ??
      extractTextFromFile(filePath, mimeType, file.name);

    let finalDescription = description;
    let evidenceKind: EvidenceKind | null = null;

    if (category === "transcript" || category === "capture") {
      finalDescription = transcriptEvidenceDescription(file.name);
      evidenceKind = "workshop_notes";
    } else if (category === "control_documentation" && description) {
      finalDescription = description;
      evidenceKind = "supporting";
    } else if (!description || !isControlDocumentationEvidence(description)) {
      const classified = await classifyEvidenceFile({
        fileName: file.name,
        textPreview: extractedText ?? "",
      });
      finalDescription = classified.description;
      evidenceKind = classified.kind;
    }

    await prisma.assessmentRepository.upsert({
      where: { assessmentId: id },
      create: { assessmentId: id },
      update: {},
    });

    const evidence = await prisma.assessmentEvidence.create({
      data: {
        assessmentId: id,
        fileName: file.name,
        filePath: relativePath,
        mimeType,
        fileSize: buffer.length,
        description: finalDescription,
        extractedText,
        controlCodes,
      },
    });

    let indexResult: { chunksIndexed: number } | null = null;
    if (extractedText?.trim()) {
      try {
        indexResult = await indexEvidenceFile(id, evidence.id);
      } catch (error) {
        console.error("[repository] vector index failed", error);
      }
    }

    return NextResponse.json({ ...evidence, evidenceKind, indexResult });
  }

  const body = await request.json();
  const { workshopNotes, facilitatorNotes, department } = body as {
    workshopNotes?: string;
    facilitatorNotes?: string;
    department?: string;
  };

  if (department && department !== ALL_DEPARTMENTS) {
    const existing = await prisma.assessmentRepository.findUnique({
      where: { assessmentId: id },
    });
    const store = parseDepartmentNotes(existing?.departmentNotes);
    store[department] = {
      workshopNotes: workshopNotes ?? store[department]?.workshopNotes ?? "",
      facilitatorNotes: facilitatorNotes ?? store[department]?.facilitatorNotes ?? "",
    };

    const repo = await prisma.assessmentRepository.upsert({
      where: { assessmentId: id },
      create: {
        assessmentId: id,
        departmentNotes: store,
      },
      update: {
        departmentNotes: store,
      },
    });

    return NextResponse.json(repo);
  }

  const repo = await prisma.assessmentRepository.upsert({
    where: { assessmentId: id },
    create: {
      assessmentId: id,
      workshopNotes: workshopNotes ?? "",
      facilitatorNotes: facilitatorNotes ?? "",
    },
    update: {
      workshopNotes: workshopNotes ?? undefined,
      facilitatorNotes: facilitatorNotes ?? undefined,
    },
  });

  return NextResponse.json(repo);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const evidenceId = searchParams.get("evidenceId");
  if (!evidenceId) {
    return NextResponse.json({ error: "evidenceId required" }, { status: 400 });
  }

  const evidence = await prisma.assessmentEvidence.findFirst({
    where: { id: evidenceId, assessmentId: id },
  });
  if (!evidence) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await unlink(join(process.cwd(), evidence.filePath));
  } catch {
    /* file may already be gone */
  }

  await prisma.assessmentEvidence.delete({ where: { id: evidenceId } });
  return NextResponse.json({ deleted: true });
}
