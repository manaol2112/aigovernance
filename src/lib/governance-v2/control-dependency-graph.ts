import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import type { DependencyGraph, DependencyNode, DependencyEdge } from "@/lib/governance-v2/types";

/** Default governance control chains — seed baseline for dependency reasoning. */
export const DEFAULT_DEPENDENCY_CHAINS: Array<{
  fromCode: string;
  toCode: string;
  relationType: "depends_on" | "enables" | "blocked_by";
  rationale: string;
  impactScore: number;
}> = [
  {
    fromCode: "GOV-001",
    toCode: "GOV-002",
    relationType: "depends_on",
    rationale: "AI inventory requires governance policy foundation",
    impactScore: 2,
  },
  {
    fromCode: "GOV-002",
    toCode: "RSK-001",
    relationType: "enables",
    rationale: "Inventory enables risk classification",
    impactScore: 2.5,
  },
  {
    fromCode: "RSK-001",
    toCode: "MON-001",
    relationType: "depends_on",
    rationale: "Monitoring requires risk classification",
    impactScore: 2,
  },
  {
    fromCode: "MON-001",
    toCode: "INC-001",
    relationType: "enables",
    rationale: "Monitoring feeds incident response",
    impactScore: 2,
  },
];

export async function seedDefaultControlDependencies() {
  const controls = await prisma.canonicalControl.findMany({
    select: { id: true, code: true },
  });
  const byCode = new Map(controls.map((c) => [c.code, c.id]));
  let created = 0;

  for (const edge of DEFAULT_DEPENDENCY_CHAINS) {
    const fromId = byCode.get(edge.fromCode);
    const toId = byCode.get(edge.toCode);
    if (!fromId || !toId) continue;

    await prisma.controlDependency.upsert({
      where: {
        controlId_dependsOnControlId_relationType: {
          controlId: fromId,
          dependsOnControlId: toId,
          relationType: edge.relationType,
        },
      },
      create: {
        controlId: fromId,
        dependsOnControlId: toId,
        relationType: edge.relationType,
        impactScore: edge.impactScore,
        rationale: edge.rationale,
      },
      update: {
        impactScore: edge.impactScore,
        rationale: edge.rationale,
      },
    });
    created++;
  }
  return created;
}

export async function buildDependencyGraph(assessmentId: string): Promise<DependencyGraph> {
  const [scopedControls, evaluations, dependencies] = await Promise.all([
    getScopedControlsForAssessment(assessmentId),
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      select: {
        controlId: true,
        implementationStatus: true,
        complianceStatus: true,
      },
    }),
    prisma.controlDependency.findMany({
      include: {
        control: { select: { id: true, code: true, title: true } },
        dependsOn: { select: { id: true, code: true, title: true } },
      },
    }),
  ]);

  const scopedIds = new Set(scopedControls.map((c) => c.id));
  const evalMap = new Map(evaluations.map((e) => [e.controlId, e]));

  const isEffective = (controlId: string) => {
    const ev = evalMap.get(controlId);
    if (!ev) return false;
    return (
      ev.implementationStatus === "effective" ||
      ev.implementationStatus === "implemented" ||
      ev.complianceStatus === "aligned"
    );
  };

  const relevantDeps = dependencies.filter(
    (d) => scopedIds.has(d.controlId) && scopedIds.has(d.dependsOnControlId)
  );

  const nodes: DependencyNode[] = scopedControls.map((c) => {
    const ev = evalMap.get(c.id);
    const status = ev?.implementationStatus ?? ev?.complianceStatus ?? "missing";
    const blocked = relevantDeps.some(
      (d) =>
        d.controlId === c.id &&
        d.relationType === "depends_on" &&
        !isEffective(d.dependsOnControlId)
    );
    return {
      controlId: c.id,
      controlCode: c.code,
      controlTitle: c.title,
      impactScore: 1,
      implementationStatus: String(status),
      blocked,
    };
  });

  const edges: DependencyEdge[] = relevantDeps.map((d) => ({
    id: d.id,
    fromControlId: d.controlId,
    toControlId: d.dependsOnControlId,
    relationType: d.relationType,
    impactScore: d.impactScore,
    rationale: d.rationale,
  }));

  const blockedControlIds = nodes.filter((n) => n.blocked).map((n) => n.controlId);

  const unlockPaths = blockedControlIds.slice(0, 10).map((controlId) => {
    const chain = relevantDeps
      .filter((d) => d.controlId === controlId && d.relationType === "depends_on")
      .map((d) => d.dependsOn.code);
    return { controlId, path: chain };
  });

  return { nodes, edges, blockedControlIds, unlockPaths };
}

export async function listControlDependencies() {
  return prisma.controlDependency.findMany({
    include: {
      control: { select: { code: true, title: true } },
      dependsOn: { select: { code: true, title: true } },
    },
    orderBy: { control: { code: "asc" } },
  });
}
