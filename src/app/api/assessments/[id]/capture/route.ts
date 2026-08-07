import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { answerCaptureQuestion } from "@/lib/capture-qa";
import {
  getCaptureIndexStats,
  indexEvidenceFile,
  reindexAllCaptureSources,
} from "@/lib/capture-vector-index";
import { loadCaptureAnalysisState } from "@/lib/capture-analysis-persist";

export const maxDuration = 120;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [stats, repo, analysisState] = await Promise.all([
      getCaptureIndexStats(id),
      prisma.assessmentRepository.findUnique({
        where: { assessmentId: id },
        select: { captureQueries: true },
      }),
      loadCaptureAnalysisState(id),
    ]);

    return NextResponse.json({
      ...stats,
      queries: Array.isArray(repo?.captureQueries) ? repo!.captureQueries : [],
      analysisSummary: analysisState.analysisSummary,
      analysisStale: analysisState.isStale,
      lastAnalyzedAt: analysisState.lastAnalyzedAt,
      newSourceCount: analysisState.newSourceCount,
      removedSourceCount: analysisState.removedSourceCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load capture index" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, question, evidenceId } = body as {
      action: string;
      question?: string;
      evidenceId?: string;
    };

    switch (action) {
      case "query": {
        if (!question?.trim()) {
          return NextResponse.json({ error: "question required" }, { status: 400 });
        }
        const result = await answerCaptureQuestion(id, question);
        return NextResponse.json(result);
      }

      case "reindex": {
        const result = await reindexAllCaptureSources(id);
        return NextResponse.json(result);
      }

      case "index_file": {
        if (!evidenceId) {
          return NextResponse.json({ error: "evidenceId required" }, { status: 400 });
        }
        const result = await indexEvidenceFile(id, evidenceId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[capture POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Capture action failed" },
      { status: 400 }
    );
  }
}
