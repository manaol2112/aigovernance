import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildFollowUpPack, buildFollowUpEntryForControl } from "@/lib/control-follow-up-pack";
import {
  buildFollowUpExportFilename,
  buildFollowUpQuestionsHtml,
} from "@/lib/follow-up-questions-export";
import {
  addCustomFollowUpQuestion,
  removeCustomFollowUpQuestion,
} from "@/lib/follow-up-questions-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const department = url.searchParams.get("department");
    const format = url.searchParams.get("format");
    const controlId = url.searchParams.get("controlId");

    const pack = await buildFollowUpPack(id, department);

    if (controlId && format !== "html" && format !== "markdown") {
      const entry = pack.entries.find((e) => e.controlId === controlId) ?? null;
      return NextResponse.json({
        entry,
        coverageGapCount: pack.coverageGapCount,
        totalInScope: pack.totalInScope,
      });
    }

    if (format === "html" || format === "markdown") {
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        select: { name: true, clientName: true },
      });

      if (format === "markdown") {
        const { formatFollowUpPackMarkdown } = await import("@/lib/control-follow-up-pack");
        const markdown = formatFollowUpPackMarkdown(pack, {
          assessmentName: assessment?.name,
          clientName: assessment?.clientName ?? undefined,
        });
        return new NextResponse(markdown, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="follow-up-questions-${id.slice(0, 8)}.md"`,
          },
        });
      }

      const html = buildFollowUpQuestionsHtml(pack, {
        assessmentName: assessment?.name ?? "Assessment",
        clientName: assessment?.clientName,
        scopeLabel: department ? `Department: ${department}` : "Assessment-wide",
      });
      const filename = buildFollowUpExportFilename({
        assessmentName: assessment?.name ?? "assessment",
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(pack);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load follow-up questions" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, controlId, question, questionId } = body as {
      action: string;
      controlId?: string;
      question?: string;
      questionId?: string;
    };

    if (!controlId) {
      return NextResponse.json({ error: "controlId required" }, { status: 400 });
    }

    switch (action) {
      case "add_custom": {
        if (!question?.trim()) {
          return NextResponse.json({ error: "question required" }, { status: 400 });
        }
        const item = await addCustomFollowUpQuestion(id, controlId, question);
        const entry = await buildFollowUpEntryForControl(id, controlId);
        return NextResponse.json({ item, entry });
      }
      case "remove_custom": {
        if (!questionId) {
          return NextResponse.json({ error: "questionId required" }, { status: 400 });
        }
        await removeCustomFollowUpQuestion(id, controlId, questionId);
        const entry = await buildFollowUpEntryForControl(id, controlId);
        return NextResponse.json({ entry });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update follow-up questions" },
      { status: 500 }
    );
  }
}
