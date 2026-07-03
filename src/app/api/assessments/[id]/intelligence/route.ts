import { NextResponse } from "next/server";
import { syncAISystemsFromUseCases } from "@/lib/governance-v2/ai-system-registry";
import { structureEvidenceFromRepository } from "@/lib/governance-v2/evidence-structuring-engine";
import { mapEvidenceToControls } from "@/lib/governance-v2/control-mapping-v2";
import { buildDependencyGraph, seedDefaultControlDependencies } from "@/lib/governance-v2/control-dependency-graph";
import { computeGovernanceScores } from "@/lib/governance-v2/governance-scoring-v2";
import { generateGovernanceInitiatives, listGovernanceInitiatives } from "@/lib/governance-v2/roadmap-prioritization-v2";
import { buildSystematicAmbiguityReport } from "@/lib/governance-v2/reviewer-disagreement";
import { getControlMappingView } from "@/lib/governance-v2/control-mapping-v2";
import { listGovernanceEvidence } from "@/lib/governance-v2/evidence-structuring-engine";
import { listAISystems } from "@/lib/governance-v2/ai-system-registry";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  const [scores, graph, initiatives, ambiguity, mapping, evidence, systems] =
    await Promise.all([
      computeGovernanceScores(id),
      buildDependencyGraph(id),
      listGovernanceInitiatives(id),
      buildSystematicAmbiguityReport(id),
      getControlMappingView(id),
      listGovernanceEvidence(id),
      listAISystems(id),
    ]);

  return NextResponse.json({
    scores,
    graph,
    initiatives,
    ambiguity,
    mapping,
    evidence,
    systems,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    await seedDefaultControlDependencies();
    await syncAISystemsFromUseCases(id);

    if (body.runEvidence !== false) {
      await structureEvidenceFromRepository(id);
    }

    await mapEvidenceToControls(id);

    const [scores, initiatives, graph] = await Promise.all([
      computeGovernanceScores(id),
      generateGovernanceInitiatives(id),
      buildDependencyGraph(id),
    ]);

    return NextResponse.json({ ok: true, scores, initiatives, graph });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Intelligence pipeline failed" },
      { status: 500 }
    );
  }
}
