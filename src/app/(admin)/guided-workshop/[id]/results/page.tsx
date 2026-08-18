import { notFound, redirect } from "next/navigation";
import {
  loadGuidedWorkshopBundle,
  isGuidedWorkshopDbError,
  guidedWorkshopDbMessage,
} from "@/lib/guided-workshop-service";
import { GuidedWorkshopResults } from "@/components/guided-workshop-results";
import type { GuidedWorkshopReport } from "@/lib/guided-workshop-analysis";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function GuidedWorkshopResultsPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const bundle = await loadGuidedWorkshopBundle(id);
    if (!bundle) notFound();

    if (bundle.workshop.status !== "completed") {
      redirect(`/guided-workshop/${id}`);
    }

    return (
      <GuidedWorkshopResults report={bundle.report as GuidedWorkshopReport} />
    );
  } catch (error) {
    if (isGuidedWorkshopDbError(error)) {
      return <DatabaseSetupNotice message={guidedWorkshopDbMessage(error)} />;
    }
    throw error;
  }
}
