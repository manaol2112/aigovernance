import { prisma } from "@/lib/db";
import { buildCaptureAnalysisSummary } from "@/lib/capture-analysis-summary";
import type { CaptureAnalysisSummary } from "@/lib/capture-analysis-types";
import { isAnalyzableEvidence } from "@/lib/transcript-evidence";
import { getCaptureSources } from "@/lib/capture-sources";

export type CaptureAnalysisMeta = {
  summary: string;
  topicsNotDiscussed: string[];
  warnings: string[];
  analyzedAt: string;
  sourceEvidenceIds: string[];
  fileNames: string[];
};

export type CaptureAnalysisState = {
  analysisSummary: CaptureAnalysisSummary | null;
  isStale: boolean;
  lastAnalyzedAt: string | null;
  newSourceCount: number;
  removedSourceCount: number;
};

function parseMeta(raw: unknown): CaptureAnalysisMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<CaptureAnalysisMeta>;
  if (!m.analyzedAt || !Array.isArray(m.sourceEvidenceIds)) return null;
  return {
    summary: m.summary ?? "",
    topicsNotDiscussed: Array.isArray(m.topicsNotDiscussed) ? m.topicsNotDiscussed : [],
    warnings: Array.isArray(m.warnings) ? m.warnings : [],
    analyzedAt: m.analyzedAt,
    sourceEvidenceIds: m.sourceEvidenceIds,
    fileNames: Array.isArray(m.fileNames) ? m.fileNames : [],
  };
}

export async function persistCaptureAnalysisMeta(
  assessmentId: string,
  meta: CaptureAnalysisMeta
): Promise<void> {
  await prisma.assessmentRepository.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      captureAnalysisMeta: meta,
    },
    update: {
      captureAnalysisMeta: meta,
    },
  });
}

export async function computeCaptureAnalysisStaleness(
  assessmentId: string,
  meta: CaptureAnalysisMeta | null,
  fallbackAnalyzedAt?: string | null
): Promise<{
  isStale: boolean;
  newSourceCount: number;
  removedSourceCount: number;
  currentSourceIds: string[];
  fileNames: string[];
}> {
  const evidence = await prisma.assessmentEvidence.findMany({
    where: { assessmentId },
    orderBy: { uploadedAt: "asc" },
  });

  const analyzableFiles = evidence.filter((e) =>
    isAnalyzableEvidence(e.description, e.extractedText)
  );
  const currentSourceIds = analyzableFiles.map((e) => e.id);
  const fileNames = analyzableFiles.map((e) => e.fileName);
  const analyzedAtIso = meta?.analyzedAt ?? fallbackAnalyzedAt ?? null;
  const analyzedAt = analyzedAtIso ? new Date(analyzedAtIso).getTime() : 0;

  let storedIds = new Set(meta?.sourceEvidenceIds ?? []);
  if (storedIds.size === 0 && analyzedAt > 0) {
    for (const file of analyzableFiles) {
      if (file.uploadedAt.getTime() <= analyzedAt + 1000) {
        storedIds.add(file.id);
      }
    }
  }

  const currentIds = new Set(currentSourceIds);
  const newSourceCount = currentSourceIds.filter((id) => !storedIds.has(id)).length;
  const removedSourceCount = [...storedIds].filter((id) => !currentIds.has(id)).length;

  const isStale =
    analyzedAt === 0 ||
    newSourceCount > 0 ||
    removedSourceCount > 0 ||
    currentSourceIds.length !== storedIds.size;

  return {
    isStale,
    newSourceCount,
    removedSourceCount,
    currentSourceIds,
    fileNames,
  };
}

export async function loadCaptureAnalysisState(assessmentId: string): Promise<CaptureAnalysisState> {
  const [repo, assessedCount, maxAnalyzed] = await Promise.all([
    prisma.assessmentRepository.findUnique({
      where: { assessmentId },
      select: { captureAnalysisMeta: true },
    }),
    prisma.controlEvaluation.count({
      where: { assessmentId, analyzedAt: { not: null } },
    }),
    prisma.controlEvaluation.aggregate({
      where: { assessmentId, analyzedAt: { not: null } },
      _max: { analyzedAt: true },
    }),
  ]);

  const meta = parseMeta(repo?.captureAnalysisMeta);
  const legacyAnalyzedAt = maxAnalyzed._max.analyzedAt?.toISOString() ?? null;
  const staleness = await computeCaptureAnalysisStaleness(
    assessmentId,
    meta,
    legacyAnalyzedAt
  );

  if (!meta && assessedCount === 0) {
    return {
      analysisSummary: null,
      isStale: staleness.currentSourceIds.length > 0,
      lastAnalyzedAt: null,
      newSourceCount: staleness.newSourceCount,
      removedSourceCount: staleness.removedSourceCount,
    };
  }

  const sources = await getCaptureSources(assessmentId);
  const fileNames =
    staleness.fileNames.length > 0 ? staleness.fileNames : sources.map((s) => s.fileName);

  const analysisSummary = await buildCaptureAnalysisSummary(assessmentId, {
    summary: meta?.summary,
    extractions: [],
    fileNames,
    topicsNotDiscussed: meta?.topicsNotDiscussed ?? [],
    warnings: meta?.warnings ?? [],
    unmappedSentences: 0,
  });

  if (analysisSummary.mappings.length === 0) {
    return {
      analysisSummary: null,
      isStale: staleness.isStale,
      lastAnalyzedAt: meta?.analyzedAt ?? legacyAnalyzedAt,
      newSourceCount: staleness.newSourceCount,
      removedSourceCount: staleness.removedSourceCount,
    };
  }

  return {
    analysisSummary,
    isStale: staleness.isStale,
    lastAnalyzedAt: meta?.analyzedAt ?? legacyAnalyzedAt,
    newSourceCount: staleness.newSourceCount,
    removedSourceCount: staleness.removedSourceCount,
  };
}
