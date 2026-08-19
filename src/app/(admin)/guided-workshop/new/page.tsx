import { NewGuidedWorkshopForm } from "@/components/guided-workshop-new-form";
import { PillarQuestionnaireNewForm } from "@/components/pillar-questionnaire-new-form";
import { getProductCatalogSettings } from "@/lib/question-catalog-settings";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ catalog?: string }> };

export default async function NewGuidedWorkshopPage({ searchParams }: PageProps) {
  const { catalog } = await searchParams;

  try {
    const settings = await getProductCatalogSettings("guided_workshop");
    const forceFramework = catalog === "framework" && settings.allowOverride;
    const usePack =
      !forceFramework &&
      settings.source === "pack" &&
      settings.defaultPack &&
      settings.defaultPack.coverageComplete;

    if (usePack && settings.defaultPack) {
      return (
        <PillarQuestionnaireNewForm
          product="workshop"
          pack={settings.defaultPack}
          allowOverride={settings.allowOverride}
        />
      );
    }
  } catch {
    /* Keep the working framework form if settings are unavailable. */
  }

  return <NewGuidedWorkshopForm />;
}
