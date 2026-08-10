import { notFound, redirect } from "next/navigation";
import {
  loadMaturitySurveyBundle,
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";
import { getDeepDiveContinuationState } from "@/lib/maturity-survey-continue";
import { getCompletedPillarComparisons } from "@/lib/maturity-pillar-comparison";
import { MaturitySurveyResults } from "@/components/maturity-survey-results";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import { isPillarFocusedDeepDive } from "@/lib/maturity-survey-analysis";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function MaturitySurveyResultsPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const bundle = await loadMaturitySurveyBundle(id);
    if (!bundle) notFound();

    if (bundle.survey.status !== "completed") {
      redirect(`/maturity-assessment/${id}`);
    }

    const report = bundle.report as MaturitySurveyReport;

    let deepDiveContinuation = null;
    let quickScanReport: MaturitySurveyReport | null = null;
    let pillarComparisons: Awaited<ReturnType<typeof getCompletedPillarComparisons>> = [];

    if (report.surveyMode === "quick") {
      deepDiveContinuation = await getDeepDiveContinuationState(
        id,
        report.frameworkCodes,
        report.pillarMaturity
      );
      pillarComparisons = await getCompletedPillarComparisons(id, report.pillarMaturity);
    } else if (report.scope.parentQuickScanId && isPillarFocusedDeepDive(report)) {
      const parentBundle = await loadMaturitySurveyBundle(report.scope.parentQuickScanId);
      if (parentBundle) {
        quickScanReport = parentBundle.report as MaturitySurveyReport;
        deepDiveContinuation = await getDeepDiveContinuationState(
          report.scope.parentQuickScanId,
          quickScanReport.frameworkCodes,
          quickScanReport.pillarMaturity
        );
        pillarComparisons = await getCompletedPillarComparisons(
          report.scope.parentQuickScanId,
          quickScanReport.pillarMaturity
        );
      }
    }

    return (
      <MaturitySurveyResults
        surveyId={id}
        report={report}
        deepDiveContinuation={deepDiveContinuation}
        quickScanReport={quickScanReport}
        pillarComparisons={pillarComparisons}
      />
    );
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseSetupNotice message={databaseSetupMessage(error)} />;
    }
    throw error;
  }
}
