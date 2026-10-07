import { prisma } from "@/lib/db";
import { getPackPillarCatalog } from "@/lib/pack-pillar-catalog";
import { clampPackWeight, PACK_WEIGHT_DEFAULT } from "@/lib/pack-weights";
import { parseQuestionPackCsv } from "@/lib/question-pack-csv";
import {
  buildPackSnapshots,
  inferPackPillarSetFromName,
  isPackPillarSet,
  isQuestionPackProduct,
  isRiskPillarId,
  packPillarCoverage,
  resolvePackPillarSet,
  sortPackQuestions,
  type PackPillarSet,
  type PackQuestionInput,
  type QuestionPackProduct,
} from "@/lib/pillar-questionnaire";

const DEFAULT_PILLAR_WEIGHT_BY_CRITICALITY: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

function packSetFromRecord(pack: { pillarSet?: string | null; name: string }): PackPillarSet {
  return resolvePackPillarSet({ pillarSet: pack.pillarSet, name: pack.name });
}

function defaultPillarWeight(
  pillarSet: PackPillarSet,
  criticality: "critical" | "high" | "medium"
): number {
  if (pillarSet === "tmt_6") return PACK_WEIGHT_DEFAULT;
  return DEFAULT_PILLAR_WEIGHT_BY_CRITICALITY[criticality] ?? PACK_WEIGHT_DEFAULT;
}

export async function ensurePackPillarWeights(packId: string) {
  const pack = await prisma.questionPack.findUnique({ where: { id: packId } });
  if (!pack) throw new Error("Question pack not found.");
  const pillarSet = packSetFromRecord(pack);
  const catalog = getPackPillarCatalog(pillarSet);
  const existing = await prisma.questionPackPillarWeight.findMany({ where: { packId } });
  const existingIds = new Set(existing.map((row) => row.pillarId));
  const missing = catalog.filter((pillar) => !existingIds.has(pillar.id));
  if (missing.length === 0) return;

  await prisma.questionPackPillarWeight.createMany({
    data: missing.map((pillar) => ({
      packId,
      pillarId: pillar.id,
      weight: defaultPillarWeight(pillarSet, pillar.criticality),
    })),
  });
}

async function pillarWeightMap(packId: string): Promise<Record<string, number>> {
  await ensurePackPillarWeights(packId);
  const rows = await prisma.questionPackPillarWeight.findMany({ where: { packId } });
  return Object.fromEntries(rows.map((row) => [row.pillarId, clampPackWeight(row.weight)]));
}

export async function listQuestionPacks(product?: QuestionPackProduct) {
  const packs = await prisma.questionPack.findMany({
    where: {
      archivedAt: null,
      ...(product ? { product } : {}),
    },
    include: { questions: true },
    orderBy: { updatedAt: "desc" },
  });

  const settings = await prisma.appSetting.findUnique({ where: { id: "singleton" } });

  return packs.map((pack) => {
    const pillarSet = packSetFromRecord(pack);
    const coverage = packPillarCoverage(pack.questions, pillarSet);
    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      product: pack.product,
      pillarSet,
      pillarCount: coverage.pillarCount,
      questionCount: coverage.questionCount,
      coverageComplete: coverage.complete,
      missingPillarIds: coverage.missingPillarIds,
      coveredPillarIds: coverage.coveredPillarIds,
      isDefaultForMaturity: settings?.defaultMaturityQuestionPackId === pack.id,
      isDefaultForWorkshop: settings?.defaultWorkshopQuestionPackId === pack.id,
      updatedAt: pack.updatedAt,
    };
  });
}

export async function getQuestionPack(id: string) {
  const existing = await prisma.questionPack.findUnique({ where: { id } });
  if (!existing) return null;

  await ensurePackPillarWeights(id);

  const pack = await prisma.questionPack.findUnique({
    where: { id },
    include: {
      questions: { orderBy: [{ pillarId: "asc" }, { sortOrder: "asc" }] },
      pillarWeights: true,
    },
  });
  if (!pack) return null;

  const pillarSet = packSetFromRecord(pack);
  const catalog = getPackPillarCatalog(pillarSet);
  const weightById = new Map(
    pack.pillarWeights.map((row) => [row.pillarId, clampPackWeight(row.weight)])
  );

  return {
    ...pack,
    pillarSet,
    coverage: packPillarCoverage(pack.questions, pillarSet),
    pillarWeights: catalog.map((pillar) => ({
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      weight: weightById.get(pillar.id) ?? defaultPillarWeight(pillarSet, pillar.criticality),
    })),
  };
}

export async function createQuestionPack(input: {
  name: string;
  description?: string | null;
  product: QuestionPackProduct;
  pillarSet?: PackPillarSet | string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Pack name is required.");
  if (!isQuestionPackProduct(input.product)) {
    throw new Error("Choose whether this pack is for maturity assessment or guided workshop.");
  }
  const pillarSet = isPackPillarSet(input.pillarSet)
    ? input.pillarSet
    : inferPackPillarSetFromName(name);
  const pack = await prisma.questionPack.create({
    data: {
      name,
      description: input.description?.trim() || null,
      product: input.product,
      pillarSet,
    },
  });
  await ensurePackPillarWeights(pack.id);
  return pack;
}

export async function updateQuestionPack(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    pillarSet?: PackPillarSet | string | null;
  }
) {
  const data: {
    name?: string;
    description?: string | null;
    pillarSet?: PackPillarSet;
  } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Pack name is required.");
    data.name = name;
    if (input.pillarSet === undefined) {
      data.pillarSet = inferPackPillarSetFromName(name);
    }
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.pillarSet !== undefined) {
    if (!isPackPillarSet(input.pillarSet)) {
      throw new Error("Pillar set must be standard_11 or tmt_6.");
    }
    data.pillarSet = input.pillarSet;
  }
  const pack = await prisma.questionPack.update({ where: { id }, data });
  if (data.pillarSet) {
    await prisma.questionPackPillarWeight.deleteMany({ where: { packId: id } });
    await ensurePackPillarWeights(id);
  }
  return pack;
}

export async function updatePackPillarWeights(
  packId: string,
  weights: Array<{ pillarId: string; weight: number }>
) {
  const pack = await prisma.questionPack.findUnique({ where: { id: packId } });
  if (!pack) throw new Error("Question pack not found.");
  const pillarSet = packSetFromRecord(pack);
  const catalogIds = new Set(getPackPillarCatalog(pillarSet).map((pillar) => pillar.id));

  for (const row of weights) {
    if (!catalogIds.has(row.pillarId)) {
      throw new Error(`Unknown pillar "${row.pillarId}" for this pack.`);
    }
  }

  await prisma.$transaction(
    weights.map((row) => {
      const weight = clampPackWeight(row.weight);
      return prisma.questionPackPillarWeight.upsert({
        where: { packId_pillarId: { packId, pillarId: row.pillarId } },
        create: { packId, pillarId: row.pillarId, weight },
        update: { weight },
      });
    })
  );

  return getQuestionPack(packId);
}

export async function archiveQuestionPack(id: string) {
  const settings = await prisma.appSetting.findUnique({ where: { id: "singleton" } });
  if (
    settings?.defaultMaturityQuestionPackId === id ||
    settings?.defaultWorkshopQuestionPackId === id
  ) {
    throw new Error("Clear this pack as the default before archiving it.");
  }
  return prisma.questionPack.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function duplicateQuestionPack(id: string) {
  const pack = await prisma.questionPack.findUnique({
    where: { id },
    include: { questions: true, pillarWeights: true },
  });
  if (!pack) throw new Error("Question pack not found.");

  const created = await prisma.questionPack.create({
    data: {
      name: `${pack.name} copy`,
      description: pack.description,
      product: pack.product,
      pillarSet: pack.pillarSet,
      questions: {
        create: pack.questions.map((question) => ({
          pillarId: question.pillarId,
          prompt: question.prompt,
          helpText: question.helpText,
          weight: clampPackWeight(question.weight),
          sortOrder: question.sortOrder,
          active: question.active,
        })),
      },
      pillarWeights: {
        create: pack.pillarWeights.map((row) => ({
          pillarId: row.pillarId,
          weight: clampPackWeight(row.weight),
        })),
      },
    },
  });
  await ensurePackPillarWeights(created.id);
  return created;
}

export async function addQuestion(packId: string, input: PackQuestionInput) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Question text is required.");
  if (!input.pillarId) throw new Error("Choose a pillar.");

  const pack = await prisma.questionPack.findUnique({ where: { id: packId } });
  if (!pack) throw new Error("Question pack not found.");
  const pillarSet = packSetFromRecord(pack);
  if (!isRiskPillarId(input.pillarId, pillarSet)) {
    throw new Error("That pillar is not part of this pack’s pillar set.");
  }

  const maxSort = await prisma.question.aggregate({
    where: { packId, pillarId: input.pillarId },
    _max: { sortOrder: true },
  });

  await ensurePackPillarWeights(packId);

  return prisma.question.create({
    data: {
      packId,
      pillarId: input.pillarId,
      prompt,
      helpText: input.helpText?.trim() || null,
      weight: clampPackWeight(input.weight),
      sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      active: input.active ?? true,
    },
  });
}

export async function updateQuestion(
  id: string,
  input: Partial<
    Pick<PackQuestionInput, "pillarId" | "prompt" | "helpText" | "weight" | "sortOrder" | "active">
  >
) {
  const data: Record<string, unknown> = {};
  if (input.pillarId) {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { pack: true },
    });
    if (!existing) throw new Error("Question not found.");
    const pillarSet = packSetFromRecord(existing.pack);
    if (!isRiskPillarId(input.pillarId, pillarSet)) {
      throw new Error("That pillar is not part of this pack’s pillar set.");
    }
    data.pillarId = input.pillarId;
  }
  if (input.prompt !== undefined) {
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error("Question text is required.");
    data.prompt = prompt;
  }
  if (input.helpText !== undefined) data.helpText = input.helpText?.trim() || null;
  if (input.weight !== undefined) data.weight = clampPackWeight(input.weight);
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.active !== undefined) data.active = input.active;
  return prisma.question.update({ where: { id }, data });
}

export async function deleteQuestion(id: string) {
  return prisma.question.delete({ where: { id } });
}

export async function importQuestionsFromCsv(
  packId: string,
  csvText: string,
  mode: "replace" | "append"
) {
  const pack = await prisma.questionPack.findUnique({ where: { id: packId } });
  if (!pack) throw new Error("Question pack not found.");
  const pillarSet = packSetFromRecord(pack);

  const parsed = parseQuestionPackCsv(csvText, pillarSet);
  if (parsed.errors.length > 0 && parsed.questions.length === 0) {
    throw new Error(parsed.errors[0]);
  }
  if (parsed.questions.length === 0) {
    throw new Error("No valid questions found in the CSV.");
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.question.deleteMany({ where: { packId } });
    }
    const existingMax = await tx.question.aggregate({
      where: { packId },
      _max: { sortOrder: true },
    });
    const offset = mode === "append" ? (existingMax._max.sortOrder ?? -1) + 1 : 0;
    await tx.question.createMany({
      data: sortPackQuestions(parsed.questions, pillarSet).map((question, index) => ({
        packId,
        pillarId: question.pillarId,
        prompt: question.prompt,
        helpText: question.helpText ?? null,
        weight: clampPackWeight(question.weight),
        sortOrder: offset + index,
        active: true,
      })),
    });
  });

  await ensurePackPillarWeights(packId);

  return {
    imported: parsed.questions.length,
    errors: parsed.errors,
    pack: await getQuestionPack(packId),
  };
}

export async function snapshotPackQuestions(packId: string, expectedProduct?: QuestionPackProduct) {
  const pack = await prisma.questionPack.findUnique({
    where: { id: packId },
    include: { questions: true },
  });
  if (!pack || pack.archivedAt) {
    throw new Error("Question pack not found.");
  }
  if (expectedProduct && pack.product !== expectedProduct) {
    throw new Error(
      `This pack belongs to ${pack.product === "guided_workshop" ? "guided workshop" : "maturity assessment"}, not the session you are starting.`
    );
  }
  const pillarSet = packSetFromRecord(pack);
  const pillarWeights = await pillarWeightMap(packId);
  const snapshots = buildPackSnapshots(pack.questions, pillarSet, pillarWeights);
  if (snapshots.length === 0) {
    throw new Error("This pack has no active questions.");
  }
  return { pack, snapshots };
}

export function packQuestionCreateData(snapshots: ReturnType<typeof buildPackSnapshots>) {
  return snapshots.map((snapshot) => ({
    sourceQuestionId: snapshot.sourceQuestionId,
    pillarId: snapshot.pillarId,
    prompt: snapshot.prompt,
    helpText: snapshot.helpText,
    weight: snapshot.weight,
    pillarWeight: snapshot.pillarWeight,
    sortOrder: snapshot.sortOrder,
  }));
}
