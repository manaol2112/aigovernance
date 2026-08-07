import { prisma } from "@/lib/db";
import { getSubPillarBlocksForControl } from "@/lib/pillar-workshop-guide";
import type { SubPillarWorkshopBlock } from "@/lib/sub-pillar-workshop-questions";

export type ControlWorkshopGuide = {
  controlId: string;
  code: string;
  title: string;
  ownerRole: string;
  procedures: Array<{
    id: string;
    steps: string;
    responsibleRole: string;
    linkedPolicy: string | null;
  }>;
  expectedEvidence: Array<{
    id: string;
    evidenceType: string;
    description: string;
    retentionPeriod: string | null;
    collectionMethod: string | null;
  }>;
  /** Consolidated workshop questions grouped by risk sub-pillar (not per-requirement). */
  subPillarWorkshop: SubPillarWorkshopBlock[];
};

export async function getControlWorkshopGuide(
  controlId: string,
  assessmentId?: string,
  department?: string | null
): Promise<ControlWorkshopGuide | null> {
  const control = await prisma.canonicalControl.findUnique({
    where: { id: controlId },
    include: {
      evidences: { orderBy: { evidenceType: "asc" } },
      procedures: true,
      requirementLinks: {
        include: {
          requirement: { include: { framework: true } },
        },
      },
    },
  });

  if (!control) return null;

  const subPillarWorkshop =
    assessmentId != null
      ? await getSubPillarBlocksForControl(assessmentId, controlId, department)
      : [];

  return {
    controlId: control.id,
    code: control.code,
    title: control.title,
    ownerRole: control.ownerRole,
    procedures: control.procedures.map((p) => ({
      id: p.id,
      steps: p.steps,
      responsibleRole: p.responsibleRole,
      linkedPolicy: p.linkedPolicy,
    })),
    expectedEvidence: control.evidences.map((e) => ({
      id: e.id,
      evidenceType: e.evidenceType,
      description: e.description,
      retentionPeriod: e.retentionPeriod,
      collectionMethod: e.collectionMethod,
    })),
    subPillarWorkshop,
  };
}

export async function getControlGuidesForAssessment(
  assessmentId: string,
  controlIds: string[]
): Promise<Record<string, ControlWorkshopGuide>> {
  const guides: Record<string, ControlWorkshopGuide> = {};
  for (const id of controlIds) {
    const guide = await getControlWorkshopGuide(id, assessmentId);
    if (guide) guides[id] = guide;
  }
  return guides;
}
