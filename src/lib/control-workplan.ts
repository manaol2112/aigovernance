import { prisma } from "@/lib/db";
import { assignRequirementToPillar } from "@/lib/pillar-mapping";
import {
  assignRequirementToSubPillar,
  getPillarDef,
  getSubPillarsForPillar,
} from "@/lib/risk-sub-pillars";
import {
  buildEvidenceProbe,
  isCriticalEvidence,
  pickCriticalEvidence,
  type CriticalEvidenceProbe,
} from "@/lib/critical-evidence";
import {
  buildSubPillarWorkshopBlock,
  type ExpectedEvidenceItem,
  type RequirementRef,
  type SubPillarWorkshopBlock,
} from "@/lib/sub-pillar-workshop-questions";
import {
  buildFrameworkGroundedAssessmentProgram,
  type ControlAssessmentTestProgram,
} from "@/lib/control-assessment-procedure";

export type ControlWorkplanRequirement = {
  id: string;
  frameworkCode: string;
  clauseId: string;
  title: string;
  requirementText: string;
  coverage: string;
  theme: string | null;
  sourceDocument: string;
  sourcePage: string | null;
};

export type ControlWorkplanEvidence = {
  id: string;
  evidenceType: string;
  description: string;
  retentionPeriod: string | null;
  collectionMethod: string | null;
  critical: boolean;
  probe: string | null;
  rationale: string | null;
};

export type ControlWorkplan = {
  control: {
    id: string;
    code: string;
    title: string;
    description: string;
    ownerRole: string;
    controlType: string;
    frequency: string;
    verificationStatus: string;
    cosoIcfComponent: string | null;
    cosoIcfPrinciple: string | null;
  };
  frameworkRequirements: ControlWorkplanRequirement[];
  assessmentTestProgram: ControlAssessmentTestProgram;
  evidenceRequired: ControlWorkplanEvidence[];
  criticalEvidenceProbes: CriticalEvidenceProbe[];
  workshopBlocks: SubPillarWorkshopBlock[];
  stats: {
    requirementCount: number;
    assessmentStepCount: number;
    evidenceCount: number;
    criticalEvidenceCount: number;
    questionCount: number;
    workshopTopicCount: number;
    coverageComplete: boolean;
  };
};

function toRequirementRef(
  req: {
    id: string;
    clauseId: string;
    title: string;
    theme: string | null;
    requirementText: string;
    framework: { code: string };
  },
  coverage: string
): RequirementRef {
  return {
    id: req.id,
    frameworkCode: req.framework.code,
    clauseId: req.clauseId,
    title: req.title,
    requirementText: req.requirementText,
    theme: req.theme,
    coverage,
    inAssessmentScope: true,
  };
}

async function buildWorkshopBlocksForControl(controlId: string): Promise<SubPillarWorkshopBlock[]> {
  const control = await prisma.canonicalControl.findUnique({
    where: { id: controlId },
    include: {
      evidences: { orderBy: { evidenceType: "asc" } },
      requirementLinks: {
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

  if (!control || control.requirementLinks.length === 0) return [];

  const relevantReqs = control.requirementLinks.map((link) => ({
    req: link.requirement,
    coverage: link.coverage,
  }));

  const byPillarSub = new Map<string, Map<string, RequirementRef[]>>();

  for (const { req, coverage } of relevantReqs) {
    const pillarId = assignRequirementToPillar(req).id;
    const sub = assignRequirementToSubPillar(req, pillarId);
    const pillarMap = byPillarSub.get(pillarId) ?? new Map();
    const list = pillarMap.get(sub.id) ?? [];
    list.push(toRequirementRef(req, coverage));
    pillarMap.set(sub.id, list);
    byPillarSub.set(pillarId, pillarMap);
  }

  const expectedEvidence: ExpectedEvidenceItem[] = control.evidences.map((item) => ({
    id: item.id,
    evidenceType: item.evidenceType,
    description: item.description,
    collectionMethod: item.collectionMethod,
    retentionPeriod: item.retentionPeriod,
    sourceControlIds: [control.id],
  }));

  const blocks: SubPillarWorkshopBlock[] = [];

  for (const [pillarId, subMap] of byPillarSub) {
    const pillar = getPillarDef(pillarId);
    if (!pillar) continue;

    const controlCodeByReqId = new Map<string, string>();
    for (const { req } of relevantReqs) {
      if (assignRequirementToPillar(req).id !== pillarId) continue;
      const codes = req.controlLinks.map((link) => link.control.code).sort().join(", ");
      if (codes) controlCodeByReqId.set(req.id, codes);
    }

    for (const sub of getSubPillarsForPillar(pillarId)) {
      const reqs = subMap.get(sub.id);
      if (!reqs?.length) continue;
      blocks.push(
        buildSubPillarWorkshopBlock(
          sub,
          pillar.label,
          reqs,
          controlCodeByReqId,
          expectedEvidence
        )
      );
    }
  }

  return blocks.sort((a, b) => a.subPillarLabel.localeCompare(b.subPillarLabel));
}

export async function getControlWorkplan(controlCode: string): Promise<ControlWorkplan | null> {
  const control = await prisma.canonicalControl.findUnique({
    where: { code: controlCode },
    include: {
      evidences: { orderBy: { evidenceType: "asc" } },
      requirementLinks: {
        include: {
          requirement: {
            include: { framework: true },
          },
        },
        orderBy: { requirement: { framework: { code: "asc" } } },
      },
    },
  });

  if (!control) return null;

  const workshopBlocks = await buildWorkshopBlocksForControl(control.id);
  const criticalItems = pickCriticalEvidence(
    control.evidences.map((item) => ({
      id: item.id,
      evidenceType: item.evidenceType,
      description: item.description,
      collectionMethod: item.collectionMethod,
      retentionPeriod: item.retentionPeriod,
      sourceControlIds: [control.id],
    }))
  );
  const criticalProbeByType = new Map(
    criticalItems.map((item) => [item.evidenceType.toLowerCase(), buildEvidenceProbe(item)])
  );

  const evidenceRequired: ControlWorkplanEvidence[] = control.evidences.map((item) => {
    const expectedItem: ExpectedEvidenceItem = {
      id: item.id,
      evidenceType: item.evidenceType,
      description: item.description,
      collectionMethod: item.collectionMethod,
      retentionPeriod: item.retentionPeriod,
      sourceControlIds: [control.id],
    };
    const critical = isCriticalEvidence(expectedItem);
    const probe = criticalProbeByType.get(item.evidenceType.toLowerCase());
    return {
      id: item.id,
      evidenceType: item.evidenceType,
      description: item.description,
      retentionPeriod: item.retentionPeriod,
      collectionMethod: item.collectionMethod,
      critical,
      probe: probe?.probe ?? null,
      rationale: probe?.rationale ?? null,
    };
  });

  const frameworkRequirements: ControlWorkplanRequirement[] = control.requirementLinks.map((link) => ({
    id: link.requirement.id,
    frameworkCode: link.requirement.framework.code,
    clauseId: link.requirement.clauseId,
    title: link.requirement.title,
    requirementText: link.requirement.requirementText,
    coverage: link.coverage,
    theme: link.requirement.theme,
    sourceDocument: link.requirement.sourceDocument,
    sourcePage: link.requirement.sourcePage,
  }));

  const assessmentTestProgram = buildFrameworkGroundedAssessmentProgram({
    controlCode: control.code,
    controlTitle: control.title,
    controlDescription: control.description,
    ownerRole: control.ownerRole,
    frequency: control.frequency,
    requirements: frameworkRequirements,
    evidence: evidenceRequired,
  });

  const questionCount = workshopBlocks.reduce((total, block) => total + block.questionCount, 0);
  const coverageComplete =
    workshopBlocks.length > 0 && workshopBlocks.every((block) => block.allRequirementsCovered);

  return {
    control: {
      id: control.id,
      code: control.code,
      title: control.title,
      description: control.description,
      ownerRole: control.ownerRole,
      controlType: control.controlType,
      frequency: control.frequency,
      verificationStatus: control.verificationStatus,
      cosoIcfComponent: control.cosoIcfComponent,
      cosoIcfPrinciple: control.cosoIcfPrinciple,
    },
    frameworkRequirements,
    assessmentTestProgram,
    evidenceRequired,
    criticalEvidenceProbes: criticalItems.map((item) => buildEvidenceProbe(item)),
    workshopBlocks,
    stats: {
      requirementCount: control.requirementLinks.length,
      assessmentStepCount: assessmentTestProgram.totalSteps,
      evidenceCount: control.evidences.length,
      criticalEvidenceCount: criticalItems.length,
      questionCount,
      workshopTopicCount: workshopBlocks.length,
      coverageComplete,
    },
  };
}
