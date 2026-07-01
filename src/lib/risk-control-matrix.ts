import { prisma } from "@/lib/db";
import {
  FRAMEWORK_COLUMNS,
  RISK_PILLARS,
  type RiskPillarDef,
} from "@/lib/risk-pillars";

export { FRAMEWORK_COLUMNS, RISK_PILLARS, type RiskPillarDef } from "@/lib/risk-pillars";

export type MatrixRequirement = {
  clauseId: string;
  title: string;
  coverage: string;
};

export type MatrixControl = {
  code: string;
  title: string;
  ownerRole: string;
};

export type PillarMatrixRow = {
  pillar: RiskPillarDef;
  risks: Array<{ code: string; statement: string; category: string }>;
  controls: MatrixControl[];
  frameworkCoverage: Record<
    string,
    { count: number; requirements: MatrixRequirement[] }
  >;
  crossFrameworkScore: number;
  totalRequirements: number;
};

export async function buildRiskControlMatrix(): Promise<PillarMatrixRow[]> {
  const [risks, controls, frameworks] = await Promise.all([
    prisma.riskStatement.findMany({ orderBy: { code: "asc" } }),
    prisma.canonicalControl.findMany({
      include: {
        riskLinks: { include: { risk: true } },
        requirementLinks: {
          include: {
            requirement: { include: { framework: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.framework.findMany({ orderBy: { code: "asc" } }),
  ]);

  const frameworkCodes = frameworks.map((f) => f.code);

  return RISK_PILLARS.map((pillar) => {
    const pillarRisks = risks.filter((r) => pillar.categories.includes(r.category));
    const pillarRiskIds = new Set(pillarRisks.map((r) => r.id));

    const pillarControls = controls
      .filter((c) => c.riskLinks.some((rl) => pillarRiskIds.has(rl.riskId)))
      .map((c) => ({
        code: c.code,
        title: c.title,
        ownerRole: c.ownerRole,
      }));

    const controlIds = new Set(
      controls
        .filter((c) => c.riskLinks.some((rl) => pillarRiskIds.has(rl.riskId)))
        .map((c) => c.id)
    );

    const frameworkCoverage: PillarMatrixRow["frameworkCoverage"] = {};

    for (const fwCode of frameworkCodes) {
      frameworkCoverage[fwCode] = { count: 0, requirements: [] };
    }

    const seenReqs = new Set<string>();

    for (const control of controls) {
      if (!controlIds.has(control.id)) continue;
      for (const link of control.requirementLinks) {
        const fwCode = link.requirement.framework.code;
        const key = `${fwCode}:${link.requirement.clauseId}`;
        if (seenReqs.has(key)) continue;
        seenReqs.add(key);

        if (!frameworkCoverage[fwCode]) {
          frameworkCoverage[fwCode] = { count: 0, requirements: [] };
        }
        frameworkCoverage[fwCode].requirements.push({
          clauseId: link.requirement.clauseId,
          title: link.requirement.title,
          coverage: link.coverage,
        });
        frameworkCoverage[fwCode].count++;
      }
    }

    const frameworksWithCoverage = FRAMEWORK_COLUMNS.filter(
      (f) => (frameworkCoverage[f.code]?.count ?? 0) > 0
    ).length;

    const totalRequirements = Object.values(frameworkCoverage).reduce(
      (sum, fc) => sum + fc.count,
      0
    );

    return {
      pillar,
      risks: pillarRisks.map((r) => ({
        code: r.code,
        statement: r.statement,
        category: r.category,
      })),
      controls: pillarControls,
      frameworkCoverage,
      crossFrameworkScore: frameworksWithCoverage,
      totalRequirements,
    };
  });
}

export async function getMatrixSummary() {
  const matrix = await buildRiskControlMatrix();
  const fullyCrossed = matrix.filter((r) => r.crossFrameworkScore >= 4).length;
  const criticalPillars = matrix.filter((r) => r.pillar.criticality === "critical").length;
  return {
    pillarCount: matrix.length,
    fullyCrossed,
    criticalPillars,
    totalControls: new Set(matrix.flatMap((r) => r.controls.map((c) => c.code))).size,
  };
}
