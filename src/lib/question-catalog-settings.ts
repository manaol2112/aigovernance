import { prisma } from "@/lib/db";
import { packPillarCoverage, type QuestionPackProduct } from "@/lib/pillar-questionnaire";

export type ProductCatalogSettings = {
  source: "framework" | "pack";
  defaultPackId: string | null;
  defaultPack: {
    id: string;
    name: string;
    product: QuestionPackProduct;
    questionCount: number;
    coverageComplete: boolean;
    missingPillarIds: string[];
  } | null;
};

export type QuestionCatalogSettings = {
  allowOverride: boolean;
  maturity: ProductCatalogSettings;
  workshop: ProductCatalogSettings;
};

function packSummary(
  pack: {
    id: string;
    name: string;
    product: QuestionPackProduct;
    questions: Array<{ pillarId: string; prompt: string; active: boolean }>;
  } | null
): ProductCatalogSettings["defaultPack"] {
  if (!pack) return null;
  const coverage = packPillarCoverage(pack.questions);
  return {
    id: pack.id,
    name: pack.name,
    product: pack.product,
    questionCount: coverage.questionCount,
    coverageComplete: coverage.complete,
    missingPillarIds: coverage.missingPillarIds,
  };
}

const packInclude = {
  questions: { where: { active: true }, select: { pillarId: true, prompt: true, active: true } },
} as const;

async function ensureAppSetting() {
  return prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    include: {
      defaultMaturityQuestionPack: { include: packInclude },
      defaultWorkshopQuestionPack: { include: packInclude },
    },
  });
}

export async function getQuestionCatalogSettings(): Promise<QuestionCatalogSettings> {
  const setting = await ensureAppSetting();

  return {
    allowOverride: setting.allowQuestionCatalogOverride,
    maturity: {
      source: setting.maturityQuestionCatalogSource,
      defaultPackId: setting.defaultMaturityQuestionPackId,
      defaultPack: packSummary(setting.defaultMaturityQuestionPack),
    },
    workshop: {
      source: setting.workshopQuestionCatalogSource,
      defaultPackId: setting.defaultWorkshopQuestionPackId,
      defaultPack: packSummary(setting.defaultWorkshopQuestionPack),
    },
  };
}

export async function getProductCatalogSettings(
  product: QuestionPackProduct
): Promise<ProductCatalogSettings & { allowOverride: boolean }> {
  const settings = await getQuestionCatalogSettings();
  const slice = product === "guided_workshop" ? settings.workshop : settings.maturity;
  return { ...slice, allowOverride: settings.allowOverride };
}

async function validateDefaultPack(packId: string, product: QuestionPackProduct) {
  const pack = await prisma.questionPack.findUnique({
    where: { id: packId },
    include: { questions: true },
  });
  if (!pack || pack.archivedAt) {
    throw new Error("That question pack is not available.");
  }
  if (pack.product !== product) {
    throw new Error(
      `That pack is tagged for ${pack.product === "guided_workshop" ? "guided workshop" : "maturity assessment"} only.`
    );
  }
  const coverage = packPillarCoverage(pack.questions);
  if (!coverage.complete) {
    throw new Error(
      "The default pack needs at least one active question in each of the 11 pillars."
    );
  }
}

export async function updateQuestionCatalogSettings(input: {
  allowOverride?: boolean;
  maturitySource?: "framework" | "pack";
  maturityDefaultPackId?: string | null;
  workshopSource?: "framework" | "pack";
  workshopDefaultPackId?: string | null;
}): Promise<QuestionCatalogSettings> {
  const current = await ensureAppSetting();

  const nextMaturitySource = input.maturitySource ?? current.maturityQuestionCatalogSource;
  const nextWorkshopSource = input.workshopSource ?? current.workshopQuestionCatalogSource;
  const nextMaturityPackId =
    input.maturityDefaultPackId !== undefined
      ? input.maturityDefaultPackId
      : current.defaultMaturityQuestionPackId;
  const nextWorkshopPackId =
    input.workshopDefaultPackId !== undefined
      ? input.workshopDefaultPackId
      : current.defaultWorkshopQuestionPackId;

  if (nextMaturitySource === "pack") {
    if (!nextMaturityPackId) {
      throw new Error("Choose a maturity assessment pack before switching that product to questionnaires.");
    }
    await validateDefaultPack(nextMaturityPackId, "maturity_assessment");
  }

  if (nextWorkshopSource === "pack") {
    if (!nextWorkshopPackId) {
      throw new Error("Choose a guided workshop pack before switching that product to questionnaires.");
    }
    await validateDefaultPack(nextWorkshopPackId, "guided_workshop");
  }

  await prisma.appSetting.update({
    where: { id: "singleton" },
    data: {
      ...(input.allowOverride !== undefined
        ? { allowQuestionCatalogOverride: input.allowOverride }
        : {}),
      ...(input.maturitySource ? { maturityQuestionCatalogSource: input.maturitySource } : {}),
      ...(input.workshopSource ? { workshopQuestionCatalogSource: input.workshopSource } : {}),
      ...(input.maturityDefaultPackId !== undefined
        ? { defaultMaturityQuestionPackId: input.maturityDefaultPackId }
        : {}),
      ...(input.workshopDefaultPackId !== undefined
        ? { defaultWorkshopQuestionPackId: input.workshopDefaultPackId }
        : {}),
    },
  });

  return getQuestionCatalogSettings();
}
