import { prisma } from "@/lib/db";
import { computeGovernanceRoi } from "@/lib/governance-v2/types";
import { buildDependencyGraph } from "@/lib/governance-v2/control-dependency-graph";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";

function effortFromControl(controlTitle: string): number {
  const t = controlTitle.toLowerCase();
  if (t.includes("policy") || t.includes("inventory")) return 2;
  if (t.includes("monitor") || t.includes("test")) return 3;
  if (t.includes("board") || t.includes("audit")) return 4;
  return 2.5;
}

function phaseFromGap(compliance: string, blocked: boolean): string {
  if (blocked) return "medium_term";
  if (compliance === "gap" || compliance === "not_assessed") return "immediate";
  if (compliance === "partial") return "short_term";
  return "medium_term";
}

export async function generateGovernanceInitiatives(assessmentId: string) {
  const [evaluations, graph, scoped] = await Promise.all([
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      include: { control: true },
    }),
    buildDependencyGraph(assessmentId),
    getScopedControlsForAssessment(assessmentId),
  ]);

  const scopedIds = new Set(scoped.map((c) => c.id));
  const blockedSet = new Set(graph.blockedControlIds);
  const unlockMap = new Map(graph.edges.map((e) => [e.fromControlId, e.toControlId]));

  const candidates = evaluations
    .filter((e) => scopedIds.has(e.controlId))
    .filter((e) => e.complianceStatus !== "aligned")
    .map((e) => {
      const blocked = blockedSet.has(e.controlId);
      const riskReduction =
        e.complianceStatus === "gap" || e.complianceStatus === "not_assessed" ? 3 : 1.5;
      const complianceCoverage = 2;
      const dependencyUnlock = blocked ? 1 : 2.5;
      const effort = effortFromControl(e.control.title);
      const governanceRoiScore = computeGovernanceRoi({
        riskReduction,
        complianceCoverage,
        dependencyUnlock,
        effort,
      });

      const dependsOn = graph.edges
        .filter((edge) => edge.fromControlId === e.controlId && edge.relationType === "depends_on")
        .map((edge) => edge.toControlId);

      const unlocks = graph.edges
        .filter((edge) => edge.toControlId === e.controlId && edge.relationType === "enables")
        .map((edge) => edge.fromControlId);

      return {
        assessmentId,
        title: `Strengthen ${e.control.title}`,
        description:
          e.gapFindings ||
          e.recommendations ||
          `Address ${e.control.code} to improve governance posture.`,
        governanceRoiScore,
        riskReduction,
        complianceCoverage,
        dependencyUnlock,
        effortEstimate: effort,
        dependsOnControlIds: dependsOn,
        unlocksControlIds: unlocks.length ? unlocks : [unlockMap.get(e.controlId) ?? e.controlId],
        phase: phaseFromGap(e.complianceStatus, blocked),
        whyPrioritized: blocked
          ? `Blocked until prerequisite controls are effective. ROI ${governanceRoiScore}.`
          : `High governance ROI (${governanceRoiScore}) from risk reduction and compliance coverage.`,
      };
    })
    .sort((a, b) => b.governanceRoiScore - a.governanceRoiScore);

  await prisma.governanceInitiative.deleteMany({ where: { assessmentId } });

  const top = candidates.slice(0, 15);
  for (let i = 0; i < top.length; i++) {
    await prisma.governanceInitiative.create({
      data: { ...top[i], rank: i + 1 },
    });
  }

  return prisma.governanceInitiative.findMany({
    where: { assessmentId },
    orderBy: { rank: "asc" },
  });
}

export async function listGovernanceInitiatives(assessmentId: string) {
  return prisma.governanceInitiative.findMany({
    where: { assessmentId },
    orderBy: { rank: "asc" },
  });
}
