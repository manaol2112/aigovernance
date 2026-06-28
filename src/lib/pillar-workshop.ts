import { prisma } from "@/lib/db";
import { assignRequirementToPillar, buildPillarQuestion } from "@/lib/pillar-mapping";

export async function initPillarWorkshop(assessmentId: string): Promise<number> {
  const useCases = await prisma.useCase.findMany({
    where: { assessmentId },
    include: {
      scopedRequirements: {
        where: { included: true },
        include: {
          requirement: {
            include: {
              framework: true,
              controlLinks: { include: { control: true } },
            },
          },
        },
      },
    },
  });

  let created = 0;

  for (const uc of useCases) {
    // Group requirements by pillar for this use case
    const pillarMap = new Map<
      string,
      {
        pillar: ReturnType<typeof assignRequirementToPillar>;
        requirements: typeof uc.scopedRequirements;
        controls: Set<string>;
      }
    >();

    for (const scoped of uc.scopedRequirements) {
      const pillar = assignRequirementToPillar(scoped.requirement);
      const existing = pillarMap.get(pillar.id) ?? {
        pillar,
        requirements: [],
        controls: new Set<string>(),
      };
      existing.requirements.push(scoped);
      for (const link of scoped.requirement.controlLinks) {
        existing.controls.add(link.control.code);
      }
      pillarMap.set(pillar.id, existing);
    }

    // Delete old per-requirement workshop rows for this use case
    await prisma.workshopResponse.deleteMany({ where: { useCaseId: uc.id } });

    for (const [, group] of pillarMap) {
      const reqIds = group.requirements.map((r) => r.requirementId);
      const controlCodes = [...group.controls];
      const fwSummary = group.requirements.reduce(
        (acc, r) => {
          const code = r.requirement.framework.code;
          acc[code] = (acc[code] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const prompt = buildPillarQuestion(
        group.pillar,
        uc.name,
        group.requirements.map((r) => r.requirement),
        controlCodes
      );

      await prisma.workshopPillarResponse.upsert({
        where: { useCaseId_pillarId: { useCaseId: uc.id, pillarId: group.pillar.id } },
        create: {
          useCaseId: uc.id,
          pillarId: group.pillar.id,
          pillarLabel: group.pillar.label,
          questionPrompt: prompt,
          requirementIds: reqIds,
          linkedControls: controlCodes,
          frameworkSummary: fwSummary,
        },
        update: {
          pillarLabel: group.pillar.label,
          questionPrompt: prompt,
          requirementIds: reqIds,
          linkedControls: controlCodes,
          frameworkSummary: fwSummary,
        },
      });
      created++;
    }
  }

  return created;
}

export async function getPillarWorkshopForAssessment(assessmentId: string) {
  return prisma.workshopPillarResponse.findMany({
    where: { useCase: { assessmentId } },
    include: {
      useCase: true,
      evidenceFiles: true,
    },
    orderBy: [{ useCase: { sortOrder: "asc" } }, { pillarLabel: "asc" }],
  });
}

export async function getPillarNotesForRequirement(
  useCaseId: string,
  requirementId: string
): Promise<{ clientNotes: string | null; facilitatorNotes: string | null; evidenceCount: number }> {
  const pillarResponses = await prisma.workshopPillarResponse.findMany({
    where: { useCaseId, requirementIds: { has: requirementId } },
    include: { evidenceFiles: true },
  });

  if (pillarResponses.length === 0) {
    return { clientNotes: null, facilitatorNotes: null, evidenceCount: 0 };
  }

  const p = pillarResponses[0];
  return {
    clientNotes: p.clientNotes,
    facilitatorNotes: p.facilitatorNotes,
    evidenceCount: p.evidenceFiles.length,
  };
}
