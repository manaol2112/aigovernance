import { notFound, redirect } from "next/navigation";
import {
  loadGuidedWorkshopBundle,
  isGuidedWorkshopDbError,
  guidedWorkshopDbMessage,
} from "@/lib/guided-workshop-service";
import { GuidedWorkshopWizard } from "@/components/guided-workshop-wizard";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function GuidedWorkshopSessionPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const bundle = await loadGuidedWorkshopBundle(id);
    if (!bundle) notFound();

    if (bundle.workshop.status === "completed") {
      redirect(`/guided-workshop/${id}/results`);
    }

    return (
      <GuidedWorkshopWizard
        initial={{
          workshop: {
            ...bundle.workshop,
            responses: bundle.workshop.responses.map((r) => ({
              controlId: r.controlId,
              pillarId: r.pillarId,
              maturity: r.maturity,
              facilitatorNotes: r.facilitatorNotes,
            })),
          },
          catalog: bundle.catalog,
        }}
      />
    );
  } catch (error) {
    if (isGuidedWorkshopDbError(error)) {
      return <DatabaseSetupNotice message={guidedWorkshopDbMessage(error)} />;
    }
    throw error;
  }
}
