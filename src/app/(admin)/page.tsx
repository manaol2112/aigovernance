import { prisma } from "@/lib/db";
import { GovernanceDashboard } from "@/components/governance-dashboard";
import { getMatrixSummary } from "@/lib/risk-control-matrix";
import { getMissionControlSnapshot } from "@/lib/mission-control";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    frameworkCount,
    requirementCount,
    crosswalkCount,
    controlCount,
    riskCount,
    unmappedNist,
    assessmentCount,
  ] = await Promise.all([
    prisma.framework.count(),
    prisma.frameworkRequirement.count(),
    prisma.crosswalkMapping.count(),
    prisma.canonicalControl.count(),
    prisma.riskStatement.count(),
    prisma.frameworkRequirement.count({
      where: {
        framework: { code: "NIST-AI-RMF" },
        requirementType: "subcategory",
        crosswalkFrom: { none: {} },
      },
    }),
    prisma.assessment.count(),
  ]);
  return { frameworkCount, requirementCount, crosswalkCount, controlCount, riskCount, unmappedNist, assessmentCount };
}

export default async function DashboardPage() {
  const [stats, matrixSummary, mission, frameworks] = await Promise.all([
    getStats(),
    getMatrixSummary(),
    getMissionControlSnapshot(),
    prisma.framework.findMany({
      include: { _count: { select: { requirements: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <GovernanceDashboard
      stats={stats}
      matrixSummary={matrixSummary}
      mission={mission}
      frameworks={frameworks.map((framework) => ({
        id: framework.id,
        code: framework.code,
        name: framework.name,
        version: framework.version,
        publisher: framework.publisher,
        requirementCount: framework._count.requirements,
      }))}
    />
  );
}
