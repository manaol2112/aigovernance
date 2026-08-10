import {
  isDatabaseSetupError,
  databaseSetupMessage,
  listMaturitySurveysForPage,
} from "@/lib/maturity-survey-service";
import { MaturityAssessmentLanding } from "@/components/maturity-survey-list";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

export const dynamic = "force-dynamic";

/** Public marketing landing — in-progress surveys shown for resume. */
export default async function MaturityAssessmentPage() {
  try {
    const surveys = await listMaturitySurveysForPage();
    const inProgressSurveys = surveys
      .filter((survey) => survey.status === "draft" || survey.status === "in_progress")
      .slice(0, 6);

    return <MaturityAssessmentLanding inProgressSurveys={inProgressSurveys} />;
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseSetupNotice message={databaseSetupMessage(error)} />;
    }
    throw error;
  }
}
