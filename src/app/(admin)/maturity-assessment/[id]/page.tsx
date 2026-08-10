import { notFound, redirect } from "next/navigation";
import {
  loadMaturitySurveyBundle,
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";
import { MaturitySurveyWizard } from "@/components/maturity-survey-wizard";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";
import { getParentQuickScanControlIds } from "@/lib/maturity-survey-continue";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import { formatFocusPillarLabels } from "@/lib/maturity-survey-types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function MaturitySurveyPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const bundle = await loadMaturitySurveyBundle(id);
    if (!bundle) notFound();

    if (bundle.survey.status === "completed") {
      redirect(`/maturity-assessment/${id}/results`);
    }

    const seededControlIds =
      bundle.survey.parentSurveyId && bundle.survey.surveyMode === "deep_dive"
        ? await getParentQuickScanControlIds(
            bundle.survey.parentSurveyId,
            bundle.survey.focusPillarIds ?? []
          )
        : [];
    const fullLibraryCatalog = await buildMaturitySurveyCatalog(
      bundle.survey.frameworkCodes,
      "deep_dive"
    );
    const focusPillarLabels = formatFocusPillarLabels(
      fullLibraryCatalog,
      bundle.survey.focusPillarIds ?? []
    );

    return (
      <MaturitySurveyWizard
        initial={{
          survey: {
            ...bundle.survey,
            responses: bundle.survey.responses,
            documentResponses: bundle.survey.documentResponses.map((response) => ({
              documentId: response.documentId,
              pillarId: response.pillarId,
              status: response.status,
            })),
          },
          catalog: bundle.catalog,
          seededControlIds,
          focusPillarLabels,
        }}
      />
    );
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseSetupNotice message={databaseSetupMessage(error)} />;
    }
    throw error;
  }
}
