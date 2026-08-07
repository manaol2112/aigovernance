import { prisma } from "@/lib/db";
import { assignRequirementToPillar } from "@/lib/pillar-mapping";
import { RISK_PILLARS } from "@/lib/risk-control-matrix";
import {
  assignRequirementToSubPillar,
  getPillarDef,
  getSubPillarsForPillar,
} from "@/lib/risk-sub-pillars";
import { buildUseCaseWhereForDepartment } from "@/lib/workshop-department";
import { dedupeCriticalEvidenceProbes, type CriticalEvidenceProbe } from "@/lib/critical-evidence";
import {
  buildSubPillarWorkshopBlock,
  type ExpectedEvidenceItem,
  type RequirementRef,
  type SubPillarWorkshopBlock,
} from "@/lib/sub-pillar-workshop-questions";

export type PillarWorkshopGuide = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  subPillars: SubPillarWorkshopBlock[];
  /** Must-have evidence for the whole pillar — separate from facilitation questions. */
  criticalEvidenceProbes: CriticalEvidenceProbe[];
  criticalEvidenceCount: number;
  supportingEvidenceTypeCount: number;
  totalRequirements: number;
  totalControls: number;
  coverageComplete: boolean;
};

async function getScopedRequirementsForAssessment(
  assessmentId: string,
  department?: string | null
) {
  const rows = await prisma.useCaseRequirement.findMany({
    where: {
      included: true,
      useCase: buildUseCaseWhereForDepartment(assessmentId, department),
    },
    include: {
      requirement: {
        include: {
          framework: true,
          controlLinks: { include: { control: true } },
        },
      },
    },
  });

  const seen = new Map<string, (typeof rows)[0]["requirement"]>();
  for (const row of rows) {
    seen.set(row.requirement.id, row.requirement);
  }
  return [...seen.values()];
}

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

type ReqWithControls = {
  id: string;
  controlLinks: Array<{ control: { id: string; code: string } }>;
};

function buildControlCodeByReqId(reqs: ReqWithControls[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const req of reqs) {
    const codes = req.controlLinks.map((l) => l.control.code);
    if (codes.length > 0) map.set(req.id, codes.sort().join(", "));
  }
  return map;
}

function collectExpectedEvidence(
  reqs: ReqWithControls[],
  evidenceByControlId: Map<string, ExpectedEvidenceItem[]>
): ExpectedEvidenceItem[] {
  const byKey = new Map<string, ExpectedEvidenceItem>();

  for (const req of reqs) {
    for (const link of req.controlLinks) {
      for (const ev of evidenceByControlId.get(link.control.id) ?? []) {
        const key = `${ev.evidenceType}::${ev.description}`;
        const existing = byKey.get(key);
        if (existing) {
          const merged = new Set([...(existing.sourceControlIds ?? []), link.control.id]);
          existing.sourceControlIds = [...merged];
          continue;
        }
        byKey.set(key, {
          ...ev,
          sourceControlIds: [...new Set([...(ev.sourceControlIds ?? []), link.control.id])],
        });
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.evidenceType.localeCompare(b.evidenceType));
}

async function loadEvidenceByControlId(
  controlIds: string[]
): Promise<Map<string, ExpectedEvidenceItem[]>> {
  if (controlIds.length === 0) return new Map();

  const rows = await prisma.evidence.findMany({
    where: { controlId: { in: controlIds } },
    orderBy: { evidenceType: "asc" },
  });

  const map = new Map<string, ExpectedEvidenceItem[]>();
  for (const row of rows) {
    const list = map.get(row.controlId) ?? [];
    list.push({
      id: row.id,
      evidenceType: row.evidenceType,
      description: row.description,
      collectionMethod: row.collectionMethod,
      retentionPeriod: row.retentionPeriod,
      sourceControlIds: [row.controlId],
    });
    map.set(row.controlId, list);
  }
  return map;
}

/** Build sub-pillar workshop guide for one risk pillar (assessment-scoped requirements). */
export async function getPillarWorkshopGuide(
  assessmentId: string,
  pillarId: string,
  department?: string | null
): Promise<PillarWorkshopGuide | null> {
  const pillar = getPillarDef(pillarId);
  if (!pillar) return null;

  const allReqs = await getScopedRequirementsForAssessment(assessmentId, department);
  const pillarReqs = allReqs.filter((req) => assignRequirementToPillar(req).id === pillarId);

  if (pillarReqs.length === 0) {
    return {
      pillarId,
      pillarLabel: pillar.label,
      pillarDescription: pillar.description,
      subPillars: [],
      criticalEvidenceProbes: [],
      criticalEvidenceCount: 0,
      supportingEvidenceTypeCount: 0,
      totalRequirements: 0,
      totalControls: 0,
      coverageComplete: true,
    };
  }

  const controlCodeByReqId = buildControlCodeByReqId(pillarReqs);
  const allControlIds = [
    ...new Set(pillarReqs.flatMap((r) => r.controlLinks.map((l) => l.control.id))),
  ];
  const evidenceByControlId = await loadEvidenceByControlId(allControlIds);

  const subPillarReqMap = new Map<string, RequirementRef[]>();
  const subPillarReqObjects = new Map<string, typeof pillarReqs>();
  for (const sub of getSubPillarsForPillar(pillarId)) {
    subPillarReqMap.set(sub.id, []);
    subPillarReqObjects.set(sub.id, []);
  }

  for (const req of pillarReqs) {
    const sub = assignRequirementToSubPillar(req, pillarId);
    const list = subPillarReqMap.get(sub.id) ?? [];
    list.push(toRequirementRef(req, "full"));
    subPillarReqMap.set(sub.id, list);
    const objList = subPillarReqObjects.get(sub.id) ?? [];
    objList.push(req);
    subPillarReqObjects.set(sub.id, objList);
  }

  const subPillars: SubPillarWorkshopBlock[] = [];
  const allControlCodes = new Set<string>();

  for (const sub of getSubPillarsForPillar(pillarId)) {
    const reqs = subPillarReqMap.get(sub.id) ?? [];
    if (reqs.length === 0) continue;

    const reqObjects = subPillarReqObjects.get(sub.id) ?? [];
    const expectedEvidence = collectExpectedEvidence(reqObjects, evidenceByControlId);
    const block = buildSubPillarWorkshopBlock(
      sub,
      pillar.label,
      reqs,
      controlCodeByReqId,
      expectedEvidence
    );
    subPillars.push(block);
    for (const c of block.controlCodes) allControlCodes.add(c);
  }

  const coveredIds = new Set(subPillars.flatMap((s) => s.requirementCoverage.map((r) => r.id)));
  const allQuestioned = subPillars.every((s) => s.allRequirementsCovered);
  const criticalEvidenceProbes = dedupeCriticalEvidenceProbes(
    subPillars.flatMap((s) => s.criticalEvidenceProbes)
  );
  const supportingEvidenceTypeCount = subPillars.reduce(
    (n, s) => n + s.supportingEvidenceTypeCount,
    0
  );

  return {
    pillarId,
    pillarLabel: pillar.label,
    pillarDescription: pillar.description,
    subPillars,
    criticalEvidenceProbes,
    criticalEvidenceCount: criticalEvidenceProbes.length,
    supportingEvidenceTypeCount,
    totalRequirements: pillarReqs.length,
    totalControls: allControlCodes.size,
    coverageComplete: coveredIds.size === pillarReqs.length && allQuestioned,
  };
}

/** All pillars with sub-pillar workshop blocks for an assessment. */
export async function getAssessmentWorkshopGuide(
  assessmentId: string,
  department?: string | null
): Promise<PillarWorkshopGuide[]> {
  const guides: PillarWorkshopGuide[] = [];
  for (const pillar of RISK_PILLARS) {
    const guide = await getPillarWorkshopGuide(assessmentId, pillar.id, department);
    if (guide && guide.subPillars.length > 0) guides.push(guide);
  }
  return guides;
}

/** Sub-pillar blocks relevant to a specific control (for control-level reviewer guide). */
export async function getSubPillarBlocksForControl(
  assessmentId: string,
  controlId: string,
  department?: string | null
): Promise<SubPillarWorkshopBlock[]> {
  const control = await prisma.canonicalControl.findUnique({
    where: { id: controlId },
    include: {
      requirementLinks: {
        include: {
          requirement: {
            include: { framework: true, controlLinks: { include: { control: true } } },
          },
        },
      },
    },
  });
  if (!control) return [];

  const scopedIds = new Set(
    (
      await prisma.useCaseRequirement.findMany({
        where: {
          included: true,
          useCase: buildUseCaseWhereForDepartment(assessmentId, department),
        },
        select: { requirementId: true },
      })
    ).map((r) => r.requirementId)
  );

  const relevantReqs = control.requirementLinks
    .filter((l) => scopedIds.has(l.requirement.id))
    .map((l) => ({ req: l.requirement, coverage: l.coverage }));

  if (relevantReqs.length === 0) return [];

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

  const blocks: SubPillarWorkshopBlock[] = [];

  for (const [pillarId, subMap] of byPillarSub) {
    const pillar = getPillarDef(pillarId);
    if (!pillar) continue;

    const allPillarReqs = relevantReqs
      .filter(({ req }) => assignRequirementToPillar(req).id === pillarId)
      .map(({ req }) => req);
    const controlCodeByReqId = buildControlCodeByReqId(allPillarReqs);
    const controlIds = [
      ...new Set(allPillarReqs.flatMap((r) => r.controlLinks.map((l) => l.control.id))),
    ];
    const evidenceByControlId = await loadEvidenceByControlId(controlIds);

    for (const sub of getSubPillarsForPillar(pillarId)) {
      const reqs = subMap.get(sub.id);
      if (!reqs?.length) continue;
      const reqObjects = relevantReqs
        .filter(({ req }) => assignRequirementToSubPillar(req, pillarId).id === sub.id)
        .map(({ req }) => req);
      const expectedEvidence = collectExpectedEvidence(reqObjects, evidenceByControlId);
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

  return blocks;
}
