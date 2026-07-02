import {
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";
import { MaturityAssessmentLanding } from "@/components/maturity-survey-list";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

export const dynamic = "force-dynamic";

/** Public marketing landing — no internal metrics or survey inventory exposed. */
export default async function MaturityAssessmentPage() {
  try {
    return <MaturityAssessmentLanding />;
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseSetupNotice message={databaseSetupMessage(error)} />;
    }
    throw error;
  }
}
