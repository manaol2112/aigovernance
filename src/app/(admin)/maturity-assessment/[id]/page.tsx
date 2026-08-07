import { notFound, redirect } from "next/navigation";
import {
  loadMaturitySurveyBundle,
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";
import { MaturitySurveyWizard } from "@/components/maturity-survey-wizard";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

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

    return (
      <MaturitySurveyWizard
        initial={{
          survey: {
            ...bundle.survey,
            responses: bundle.survey.responses,
          },
          catalog: bundle.catalog,
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
