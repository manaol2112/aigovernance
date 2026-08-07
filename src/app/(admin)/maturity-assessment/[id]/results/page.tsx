import { notFound, redirect } from "next/navigation";
import {
  loadMaturitySurveyBundle,
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";
import { MaturitySurveyResults } from "@/components/maturity-survey-results";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
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
    return <MaturitySurveyResults report={report} />;
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseSetupNotice message={databaseSetupMessage(error)} />;
    }
    throw error;
  }
}
