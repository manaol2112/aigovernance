import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import type { AiRegisterEvidenceType } from "@prisma/client";
import {
  assertAiRegisterPrismaReady,
  isDatabaseSetupError,
  prisma,
  PrismaNotReadyError,
} from "@/lib/db";
import { ensureAiRegisterEvidenceDir } from "@/lib/ai-system-register-storage";
import {
  assertPermission,
  ensureBootstrapAdmin,
  parseRegisterActor,
  resolveRegisterAccess,
  writeChangeLog,
} from "@/lib/ai-system-register-actor";

type Ctx = { params: Promise<{ id: string }> };

function toErrorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError || isDatabaseSetupError(error)) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Database client is out of date. Restart the dev server.",
      },
      { status: 503 }
    );
  }
  console.error("[ai-system-register/evidence]", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 }
  );
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const system = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!system) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }
    const evidence = await prisma.aiSystemEvidence.findMany({
      where: { systemId: id },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(evidence);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertAiRegisterPrismaReady();
    const { id } = await ctx.params;
    const system = await prisma.aiSystemRegisterItem.findUnique({ where: { id } });
    if (!system) {
      return NextResponse.json({ error: "System not found." }, { status: 404 });
    }

    const actor = parseRegisterActor(req);
    const access = await resolveRegisterAccess(system.organizationId, actor);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const denied = assertPermission(access, "manage_evidence");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    if (access.bootstrap) await ensureBootstrapAdmin(system.organizationId, access.actor);

    const form = await req.formData();
    const title = String(form.get("title") ?? "").trim();
    const evidenceType = (String(form.get("evidenceType") ?? "other") ||
      "other") as AiRegisterEvidenceType;
    const notes = String(form.get("notes") ?? "").trim() || null;
    const externalUrl = String(form.get("externalUrl") ?? "").trim() || null;
    const linkedAssessmentType =
      String(form.get("linkedAssessmentType") ?? "").trim() || null;
    const file = form.get("file");

    if (!title) {
      return NextResponse.json({ error: "Evidence title is required." }, { status: 400 });
    }

    let fileName: string | null = null;
    let filePath: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    if (file instanceof File && file.size > 0) {
      const dir = await ensureAiRegisterEvidenceDir(system.organizationId, system.id);
      const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_");
      fileName = safeName;
      const stored = `${randomUUID()}-${safeName}`;
      filePath = join(dir, stored);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      mimeType = file.type || null;
      fileSize = file.size;
    } else if (!externalUrl) {
      return NextResponse.json(
        { error: "Attach a file or provide an external URL." },
        { status: 400 }
      );
    }

    const evidence = await prisma.aiSystemEvidence.create({
      data: {
        systemId: system.id,
        organizationId: system.organizationId,
        evidenceType,
        title,
        fileName,
        filePath,
        mimeType,
        fileSize,
        externalUrl,
        notes,
        linkedAssessmentType,
      },
    });

    await writeChangeLog({
      systemId: system.id,
      organizationId: system.organizationId,
      action: "evidence_added",
      summary: linkedAssessmentType
        ? `Evidence added: ${title} (linked to ${linkedAssessmentType.replace(/_/g, " ")})`
        : `Evidence added: ${title}`,
      actor: access.actor,
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
