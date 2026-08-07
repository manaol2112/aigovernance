import { prisma } from "@/lib/db";
import { assignRequirementToPillar } from "@/lib/pillar-mapping";
import { RISK_PILLARS, type RiskPillarDef } from "@/lib/risk-control-matrix";
import { initControlEvaluations } from "@/lib/control-scoping";
import { buildUseCaseWhereForDepartment } from "@/lib/workshop-department";

export type PillarControl = {
  id: string;
  code: string;
  title: string;
  description: string;
  controlType: string;
  ownerRole: string;
};

export type PillarControlGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  requirementCount: number;
  frameworkCodes: string[];
  controls: PillarControl[];
};

/** Build risk-pillar → control tree from scoped requirements (assessment-wide). */
export async function getPillarControlTreeForAssessment(
  assessmentId: string,
  department?: string | null
): Promise<PillarControlGroup[]> {
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

  const pillarMap = new Map<
    string,
    {
      pillar: RiskPillarDef;
      requirementCount: number;
      frameworks: Set<string>;
      controls: Map<string, PillarControl>;
    }
  >();

  for (const useCase of assessment.useCases) {
    for (const scoped of useCase.scopedRequirements) {
      const req = scoped.requirement;
      const pillar = assignRequirementToPillar(req);
      const entry = pillarMap.get(pillar.id) ?? {
        pillar,
        requirementCount: 0,
        frameworks: new Set<string>(),
        controls: new Map<string, PillarControl>(),
      };
      entry.requirementCount += 1;
      entry.frameworks.add(req.framework.code);
      for (const link of req.controlLinks) {
        const c = link.control;
        entry.controls.set(c.id, {
          id: c.id,
          code: c.code,
          title: c.title,
          description: c.description,
          controlType: c.controlType,
          ownerRole: c.ownerRole,
        });
      }
      pillarMap.set(pillar.id, entry);
    }
  }

  return RISK_PILLARS.filter((p) => pillarMap.has(p.id)).map((p) => {
    const entry = pillarMap.get(p.id)!;
    return {
      pillarId: p.id,
      pillarLabel: p.label,
      pillarDescription: p.description,
      criticality: p.criticality,
      requirementCount: entry.requirementCount,
      frameworkCodes: [...entry.frameworks].sort(),
      controls: [...entry.controls.values()].sort((a, b) => a.code.localeCompare(b.code)),
    };
  });
}

export async function ensureControlReviewInitialized(assessmentId: string): Promise<number> {
  const scopedCount = await prisma.useCaseRequirement.count({
    where: { useCase: { assessmentId }, included: true },
  });
  if (scopedCount === 0) return 0;

  const existing = await prisma.controlEvaluation.count({ where: { assessmentId } });
  if (existing > 0) return existing;

  return initControlEvaluations(assessmentId);
}
