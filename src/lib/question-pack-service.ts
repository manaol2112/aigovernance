import { prisma } from "@/lib/db";
import { parseQuestionPackCsv } from "@/lib/question-pack-csv";
import {
  buildPackSnapshots,
  isQuestionPackProduct,
  packPillarCoverage,
  sortPackQuestions,
  type PackQuestionInput,
  type QuestionPackProduct,
} from "@/lib/pillar-questionnaire";

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
    const coverage = packPillarCoverage(pack.questions);
    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      product: pack.product,
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
  const pack = await prisma.questionPack.findUnique({
    where: { id },
    include: { questions: { orderBy: [{ pillarId: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!pack) return null;
  return {
    ...pack,
    coverage: packPillarCoverage(pack.questions),
  };
}

export async function createQuestionPack(input: {
  name: string;
  description?: string | null;
  product: QuestionPackProduct;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Pack name is required.");
  if (!isQuestionPackProduct(input.product)) {
    throw new Error("Choose whether this pack is for maturity assessment or guided workshop.");
  }
  return prisma.questionPack.create({
    data: {
      name,
      description: input.description?.trim() || null,
      product: input.product,
    },
  });
}

export async function updateQuestionPack(
  id: string,
  input: { name?: string; description?: string | null }
) {
  const data: { name?: string; description?: string | null } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Pack name is required.");
    data.name = name;
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  return prisma.questionPack.update({ where: { id }, data });
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
    include: { questions: true },
  });
  if (!pack) throw new Error("Question pack not found.");

  return prisma.questionPack.create({
    data: {
      name: `${pack.name} copy`,
      description: pack.description,
      product: pack.product,
      questions: {
        create: pack.questions.map((question) => ({
          pillarId: question.pillarId,
          prompt: question.prompt,
          helpText: question.helpText,
          sortOrder: question.sortOrder,
          active: question.active,
        })),
      },
    },
  });
}

export async function addQuestion(packId: string, input: PackQuestionInput) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Question text is required.");
  if (!input.pillarId) throw new Error("Choose a pillar.");

  const maxSort = await prisma.question.aggregate({
    where: { packId, pillarId: input.pillarId },
    _max: { sortOrder: true },
  });

  return prisma.question.create({
    data: {
      packId,
      pillarId: input.pillarId,
      prompt,
      helpText: input.helpText?.trim() || null,
      sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      active: input.active ?? true,
    },
  });
}

export async function updateQuestion(
  id: string,
  input: Partial<Pick<PackQuestionInput, "pillarId" | "prompt" | "helpText" | "sortOrder" | "active">>
) {
  const data: Record<string, unknown> = {};
  if (input.pillarId) data.pillarId = input.pillarId;
  if (input.prompt !== undefined) {
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error("Question text is required.");
    data.prompt = prompt;
  }
  if (input.helpText !== undefined) data.helpText = input.helpText?.trim() || null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.active !== undefined) data.active = input.active;
  return prisma.question.update({ where: { id }, data });
}

export async function deleteQuestion(id: string) {
  return prisma.question.delete({ where: { id } });
}

export async function importQuestionsFromCsv(packId: string, csvText: string, mode: "replace" | "append") {
  const parsed = parseQuestionPackCsv(csvText);
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
      data: sortPackQuestions(parsed.questions).map((question, index) => ({
        packId,
        pillarId: question.pillarId,
        prompt: question.prompt,
        helpText: question.helpText ?? null,
        sortOrder: offset + index,
        active: true,
      })),
    });
  });

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
  const snapshots = buildPackSnapshots(pack.questions);
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
    sortOrder: snapshot.sortOrder,
  }));
}
