import {
  listGuidedWorkshopsForPage,
  isGuidedWorkshopDbError,
  guidedWorkshopDbMessage,
} from "@/lib/guided-workshop-service";
import { GuidedWorkshopLanding } from "@/components/guided-workshop-list";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

export const dynamic = "force-dynamic";

export default async function GuidedWorkshopPage() {
  try {
    const workshops = await listGuidedWorkshopsForPage();
    return <GuidedWorkshopLanding workshops={workshops} />;
  } catch (error) {
    if (isGuidedWorkshopDbError(error)) {
      return <DatabaseSetupNotice message={guidedWorkshopDbMessage(error)} />;
    }
    throw error;
  }
}
