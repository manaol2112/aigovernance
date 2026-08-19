import { notFound, redirect } from "next/navigation";
import {
  loadGuidedWorkshopBundle,
  isGuidedWorkshopDbError,
  guidedWorkshopDbMessage,
} from "@/lib/guided-workshop-service";
import { GuidedWorkshopWizard } from "@/components/guided-workshop-wizard";
import { PillarQuestionnaireWizard } from "@/components/pillar-questionnaire-wizard";
import { isQuestionCatalogPack } from "@/lib/pillar-questionnaire";
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

    if (isQuestionCatalogPack(bundle.workshop.questionCatalogSource)) {
      return (
        <PillarQuestionnaireWizard
          product="workshop"
          sessionId={bundle.workshop.id}
          title={bundle.workshop.title}
          organizationName={bundle.workshop.organizationName}
          packName={bundle.workshop.questionPack?.name ?? null}
          snapshots={bundle.snapshots}
          initialAnswers={bundle.packAnswers}
          initialStepIndex={bundle.workshop.currentStepIndex}
        />
      );
    }

    return (
      <GuidedWorkshopWizard
        key={bundle.workshop.id}
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
