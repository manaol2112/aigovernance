import { prisma } from "@/lib/db";
import { buildUseCaseWhereForDepartment } from "@/lib/workshop-department";

export type ScopedControl = {
  id: string;
  code: string;
  title: string;
  description: string;
  controlType: string;
  ownerRole: string;
  requirementCount: number;
  frameworkCodes: string[];
};

/** Controls linked to requirements scoped for this assessment's use cases. */
export async function getScopedControlsForAssessment(
  assessmentId: string,
  department?: string | null
): Promise<ScopedControl[]> {
  const useCaseWhere = buildUseCaseWhereForDepartment(assessmentId, department);

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      useCases: {
        where: useCaseWhere,
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
      },
    },
  });

  if (!assessment) return [];

  const byControl = new Map<string, ScopedControl & { frameworks: Set<string> }>();

  for (const useCase of assessment.useCases) {
    for (const scoped of useCase.scopedRequirements) {
      for (const link of scoped.requirement.controlLinks) {
        const c = link.control;
        const existing = byControl.get(c.id);
        if (existing) {
          existing.requirementCount += 1;
          existing.frameworks.add(scoped.requirement.framework.code);
        } else {
          byControl.set(c.id, {
            id: c.id,
            code: c.code,
            title: c.title,
            description: c.description,
            controlType: c.controlType,
            ownerRole: c.ownerRole,
            requirementCount: 1,
            frameworkCodes: [],
            frameworks: new Set([scoped.requirement.framework.code]),
          });
        }
      }
    }
  }

  return [...byControl.values()]
    .map(({ frameworks, ...rest }) => ({
      ...rest,
      frameworkCodes: [...frameworks].sort(),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function initControlEvaluations(assessmentId: string): Promise<number> {
  const controls = await getScopedControlsForAssessment(assessmentId);
  let created = 0;

  for (const control of controls) {
    await prisma.controlEvaluation.upsert({
      where: {
        assessmentId_controlId: { assessmentId, controlId: control.id },
      },
      create: {
        assessmentId,
        controlId: control.id,
        status: "pending",
      },
      update: {},
    });
    created++;
  }

  await prisma.assessmentRepository.upsert({
    where: { assessmentId },
    create: { assessmentId },
    update: {},
  });

  return created;
}
