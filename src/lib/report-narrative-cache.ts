import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { ControlReviewReportData, ReviewedControlRecord } from "@/lib/control-review-reports";
import type { DisplayFindings, PriorityRiskSummary } from "@/lib/control-review-reports";

const CACHE_VERSION = 2;
const ALL_DEPARTMENTS_KEY = "__all__";

export type ControlNarrativeCacheEntry = {
  fingerprint: string;
  displayFindings: DisplayFindings;
  roadmapAction: string;
};

export type ExecutiveNarrativeCache = {
  fingerprint: string;
  headline: string;
  narrative: string;
  topGaps: PriorityRiskSummary[];
  boardActions: string[];
  source: "ai" | "deterministic";
  generatedAt: string;
};

export type DepartmentNarrativeCache = {
  controls: Record<string, ControlNarrativeCacheEntry>;
  executive?: ExecutiveNarrativeCache;
};

export type ReportNarrativeCacheStore = {
  version: number;
  departments: Record<string, DepartmentNarrativeCache>;
};

export function departmentCacheKey(department?: string | null): string {
  return department?.trim() ? department.trim() : ALL_DEPARTMENTS_KEY;
}

export function controlNarrativeFingerprint(control: ReviewedControlRecord): string {
  return createHash("sha256")
    .update(
      [
        control.controlId,
        control.complianceStatus,
        control.inPlaceFindings,
        control.gapFindings,
        control.recommendations,
        control.confirmedAt ?? "",
      ].join("\u001f")
    )
    .digest("hex");
}

export function executiveNarrativeFingerprint(report: ControlReviewReportData): string {
  const gapControls = report.reviewedControls
    .filter((c) => c.complianceStatus === "gap")
    .sort((a, b) => a.controlCode.localeCompare(b.controlCode))
    .map((c) => controlNarrativeFingerprint(c))
    .join("|");

  return createHash("sha256")
    .update(
      [
        report.clientName,
        String(report.reviewStats.total),
        String(report.reviewStats.confirmed),
        String(report.executiveSummary.alignedControls),
        String(report.executiveSummary.gapControls),
        String(report.executiveSummary.partialControls),
        gapControls,
      ].join("\u001f")
    )
    .digest("hex");
}

function parseCacheStore(raw: unknown): ReportNarrativeCacheStore {
  if (!raw || typeof raw !== "object") {
    return { version: CACHE_VERSION, departments: {} };
  }
  const store = raw as Partial<ReportNarrativeCacheStore>;
  if (store.version !== CACHE_VERSION || !store.departments || typeof store.departments !== "object") {
    return { version: CACHE_VERSION, departments: {} };
  }
  return { version: CACHE_VERSION, departments: store.departments };
}

let cacheStorageMode: "db" | "memory" | null = null;
const memoryStores = new Map<string, ReportNarrativeCacheStore>();

function isCacheStorageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("reportNarrativeCache") ||
    message.includes("report_narrative_cache") ||
    message.includes("Unknown field")
  );
}

async function resolveCacheStorageMode(): Promise<"db" | "memory"> {
  if (cacheStorageMode) return cacheStorageMode;
  try {
    await prisma.assessmentRepository.findFirst({
      select: { reportNarrativeCache: true },
      take: 1,
    });
    cacheStorageMode = "db";
  } catch (error) {
    if (!isCacheStorageError(error)) throw error;
    console.warn(
      "[report-narrative-cache] Persistent cache unavailable (stale Prisma client or missing migration). Using in-memory fallback; restart dev server after `npx prisma generate`."
    );
    cacheStorageMode = "memory";
  }
  return cacheStorageMode;
}

async function readCacheStore(assessmentId: string): Promise<ReportNarrativeCacheStore> {
  const mode = await resolveCacheStorageMode();
  if (mode === "memory") {
    return memoryStores.get(assessmentId) ?? { version: CACHE_VERSION, departments: {} };
  }

  try {
    const repo = await prisma.assessmentRepository.findUnique({
      where: { assessmentId },
      select: { reportNarrativeCache: true },
    });
    return parseCacheStore(repo?.reportNarrativeCache);
  } catch (error) {
    if (!isCacheStorageError(error)) throw error;
    cacheStorageMode = "memory";
    console.warn(
      "[report-narrative-cache] Falling back to in-memory cache after read failure."
    );
    return memoryStores.get(assessmentId) ?? { version: CACHE_VERSION, departments: {} };
  }
}

async function writeCacheStore(
  assessmentId: string,
  store: ReportNarrativeCacheStore
): Promise<void> {
  const mode = await resolveCacheStorageMode();
  if (mode === "memory") {
    memoryStores.set(assessmentId, store);
    return;
  }

  try {
    await prisma.assessmentRepository.upsert({
      where: { assessmentId },
      create: {
        assessmentId,
        reportNarrativeCache: store,
      },
      update: {
        reportNarrativeCache: store,
      },
    });
  } catch (error) {
    if (!isCacheStorageError(error)) throw error;
    cacheStorageMode = "memory";
    memoryStores.set(assessmentId, store);
    console.warn(
      "[report-narrative-cache] Falling back to in-memory cache after write failure."
    );
  }
}

export async function loadReportNarrativeCache(
  assessmentId: string,
  department?: string | null
): Promise<DepartmentNarrativeCache> {
  const store = await readCacheStore(assessmentId);
  return store.departments[departmentCacheKey(department)] ?? { controls: {} };
}

export async function saveReportNarrativeCache(
  assessmentId: string,
  department: string | null | undefined,
  departmentCache: DepartmentNarrativeCache
): Promise<void> {
  const store = await readCacheStore(assessmentId);
  store.departments[departmentCacheKey(department)] = departmentCache;
  await writeCacheStore(assessmentId, store);
}

export type NarrativeCachePlan = {
  controlsNeedingPolish: ReviewedControlRecord[];
  cachedControls: Map<string, ControlNarrativeCacheEntry>;
  refreshExecutive: boolean;
  cachedExecutive?: ExecutiveNarrativeCache;
  isFullyCached: boolean;
};

export function planNarrativeCacheRefresh(
  report: ControlReviewReportData,
  cache: DepartmentNarrativeCache
): NarrativeCachePlan {
  const cachedControls = new Map<string, ControlNarrativeCacheEntry>();
  const controlsNeedingPolish: ReviewedControlRecord[] = [];

  for (const control of report.reviewedControls) {
    const fingerprint = controlNarrativeFingerprint(control);
    const cached = cache.controls[control.controlCode];
    if (cached && cached.fingerprint === fingerprint) {
      cachedControls.set(control.controlCode, cached);
    } else {
      controlsNeedingPolish.push(control);
    }
  }

  const executiveFingerprint = executiveNarrativeFingerprint(report);
  const refreshExecutive =
    !cache.executive || cache.executive.fingerprint !== executiveFingerprint;

  const isFullyCached =
    controlsNeedingPolish.length === 0 && !refreshExecutive && !!cache.executive;

  return {
    controlsNeedingPolish,
    cachedControls,
    refreshExecutive,
    cachedExecutive: cache.executive,
    isFullyCached,
  };
}

export function applyCachedNarratives(
  report: ControlReviewReportData,
  cache: DepartmentNarrativeCache
): ControlReviewReportData {
  const reviewedControls = report.reviewedControls.map((control) => {
    const cached = cache.controls[control.controlCode];
    return cached
      ? { ...control, displayFindings: cached.displayFindings }
      : control;
  });

  const roadmap = report.roadmap.map((step) => ({
    ...step,
    action: cache.controls[step.controlCode]?.roadmapAction ?? step.action,
  }));

  const executive = cache.executive;
  if (!executive) return { ...report, reviewedControls, roadmap };

  return {
    ...report,
    reviewedControls,
    roadmap,
    executiveSummary: {
      ...report.executiveSummary,
      headline: executive.headline,
      narrative: executive.narrative,
      topGaps: executive.topGaps,
      boardActions: executive.boardActions,
      narrativesSource: executive.source,
    },
  };
}

export function buildDepartmentCacheFromEnrichment(
  report: ControlReviewReportData,
  existing: DepartmentNarrativeCache,
  enrichment: {
    source: "ai" | "deterministic";
    headline: string;
    narrative: string;
    topGaps: PriorityRiskSummary[];
    boardActions: string[];
    displayFindingsByCode: Map<string, DisplayFindings>;
    roadmapActionsByCode: Map<string, string>;
  }
): DepartmentNarrativeCache {
  const controls: Record<string, ControlNarrativeCacheEntry> = { ...existing.controls };

  for (const control of report.reviewedControls) {
    const displayFindings = enrichment.displayFindingsByCode.get(control.controlCode);
    if (!displayFindings) continue;
    controls[control.controlCode] = {
      fingerprint: controlNarrativeFingerprint(control),
      displayFindings,
      roadmapAction:
        enrichment.roadmapActionsByCode.get(control.controlCode) ??
        existing.controls[control.controlCode]?.roadmapAction ??
        control.recommendations,
    };
  }

  return {
    controls,
    executive: {
      fingerprint: executiveNarrativeFingerprint(report),
      headline: enrichment.headline,
      narrative: enrichment.narrative,
      topGaps: enrichment.topGaps,
      boardActions: enrichment.boardActions,
      source: enrichment.source,
      generatedAt: new Date().toISOString(),
    },
  };
}
