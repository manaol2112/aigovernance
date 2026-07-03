import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import { buildDependencyGraph } from "@/lib/governance-v2/control-dependency-graph";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import type { GovernanceScoreResult, ScoringDimensions } from "@/lib/governance-v2/types";

function statusToScore(compliance: string, implementation?: string | null): number {
  if (implementation === "effective" || compliance === "aligned") return 100;
  if (implementation === "implemented") return 85;
  if (implementation === "partial" || compliance === "partial") return 55;
  if (compliance === "not_assessed") return 0;
  return 25;
}

export async function computeGovernanceScores(
  assessmentId: string
): Promise<GovernanceScoreResult> {
  const [evaluations, graph, evidenceCount] = await Promise.all([
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      include: { control: { select: { id: true, code: true, title: true } } },
    }),
    buildDependencyGraph(assessmentId),
    prisma.governanceEvidence.count({ where: { assessmentId } }),
  ]);

  const scoped = await getScopedControlsForAssessment(assessmentId);
  const scopedIds = new Set(scoped.map((c) => c.id));
  const inScopeEvals = evaluations.filter((e) => scopedIds.has(e.controlId));

  if (inScopeEvals.length === 0) {
    return {
      overallMaturityPct: 0,
      riskAdjustedMaturityPct: 0,
      confidenceAdjustedMaturityPct: 0,
      dimensions: {
        evidenceStrength: 0,
        controlEffectiveness: 0,
        riskExposure: 100,
        dependencyCompleteness: 0,
      },
      byPillar: [],
    };
  }

  const effectivenessScores = inScopeEvals.map((e) =>
    statusToScore(e.complianceStatus, e.implementationStatus)
  );
  const overallMaturityPct = Math.round(
    effectivenessScores.reduce((a, b) => a + b, 0) / effectivenessScores.length
  );

  const evidenceStrengthScores = inScopeEvals.map((e) =>
    Math.round((e.evidenceStrength ?? (e.mappingConfidence ?? 0.3)) * 100)
  );
  const evidenceStrength = Math.round(
    evidenceStrengthScores.reduce((a, b) => a + b, 0) / evidenceStrengthScores.length
  );

  const controlEffectiveness = overallMaturityPct;

  const gapCount = inScopeEvals.filter(
    (e) => e.complianceStatus === "gap" || e.complianceStatus === "not_assessed"
  ).length;
  const riskExposure = Math.round((gapCount / inScopeEvals.length) * 100);

  const unblocked = graph.nodes.filter((n) => !n.blocked).length;
  const dependencyCompleteness =
    graph.nodes.length > 0 ? Math.round((unblocked / graph.nodes.length) * 100) : 100;

  const dimensions: ScoringDimensions = {
    evidenceStrength,
    controlEffectiveness,
    riskExposure,
    dependencyCompleteness,
  };

  const riskAdjustedMaturityPct = Math.round(
    overallMaturityPct * (1 - riskExposure / 200)
  );

  const avgConfidence =
    inScopeEvals.reduce((s, e) => s + (e.mappingConfidence ?? 0.5), 0) / inScopeEvals.length;
  const confidenceAdjustedMaturityPct = Math.round(overallMaturityPct * avgConfidence);

  const byPillar = RISK_PILLARS.map((pillar) => {
    const pillarEvals = inScopeEvals.filter((e) =>
      e.control.title.toLowerCase().includes(pillar.id.replace("-", " "))
    );
    const subset = pillarEvals.length > 0 ? pillarEvals : inScopeEvals.slice(0, 3);
    const maturityPct =
      subset.length > 0
        ? Math.round(
            subset.reduce((s, e) => s + statusToScore(e.complianceStatus, e.implementationStatus), 0) /
              subset.length
          )
        : overallMaturityPct;
    const confidencePct = Math.round(
      (subset.reduce((s, e) => s + (e.mappingConfidence ?? 0.5), 0) / Math.max(1, subset.length)) *
        100
    );
    return {
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      maturityPct,
      confidencePct,
    };
  }).slice(0, 10);

  void evidenceCount;

  return {
    overallMaturityPct,
    riskAdjustedMaturityPct,
    confidenceAdjustedMaturityPct,
    dimensions,
    byPillar,
  };
}
