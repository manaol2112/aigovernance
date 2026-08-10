import type { PillarMaturityRecord } from "@/lib/control-review-reports";
import { loadMaturitySurveyBundle } from "@/lib/maturity-survey-service";
import { isPillarFocusedDeepDive, type MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import { listDeepDiveChildren } from "@/lib/maturity-survey-continue";

export type PillarComparisonRecord = {
  pillarId: string;
  pillarLabel: string;
  baselineAlignmentPct: number;
  baselineMaturityLabel: string;
  detailedAlignmentPct: number;
  detailedMaturityLabel: string;
  gapCount: number;
  partialCount: number;
  childSurveyId: string;
};

export async function getCompletedPillarComparisons(
  quickScanSurveyId: string,
  baselinePillarMaturity: PillarMaturityRecord[]
): Promise<PillarComparisonRecord[]> {
  const children = await listDeepDiveChildren(quickScanSurveyId);
  const completedSinglePillar = children.filter(
    (child) => child.status === "completed" && child.focusPillarIds.length === 1
  );

  const baselineById = new Map(baselinePillarMaturity.map((p) => [p.pillarId, p]));
  const results: PillarComparisonRecord[] = [];

  for (const child of completedSinglePillar) {
    const pillarId = child.focusPillarIds[0];
    if (!pillarId) continue;

    const baseline = baselineById.get(pillarId);
    if (!baseline) continue;

    const bundle = await loadMaturitySurveyBundle(child.id);
    const report = bundle?.report as MaturitySurveyReport | undefined;
    if (!report || !isPillarFocusedDeepDive(report) || !report.pillarDeepDive) continue;

    results.push({
      pillarId,
      pillarLabel: report.pillarDeepDive.pillarLabel,
      baselineAlignmentPct: baseline.alignmentPct,
      baselineMaturityLabel: baseline.maturityLabel,
      detailedAlignmentPct: report.pillarDeepDive.alignmentPct,
      detailedMaturityLabel: report.pillarDeepDive.maturityLabel,
      gapCount: report.pillarDeepDive.gapCount,
      partialCount: report.pillarDeepDive.partialCount,
      childSurveyId: child.id,
    });
  }

  return results.sort((a, b) => a.detailedAlignmentPct - b.detailedAlignmentPct);
}
