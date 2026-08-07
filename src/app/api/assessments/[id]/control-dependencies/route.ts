import { NextResponse } from "next/server";
import {
  buildDependencyGraph,
  listControlDependencies,
  seedDefaultControlDependencies,
} from "@/lib/governance-v2/control-dependency-graph";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const graph = await buildDependencyGraph(id);
  const library = await listControlDependencies();
  return NextResponse.json({ graph, library });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (body.action === "seed_defaults") {
    const count = await seedDefaultControlDependencies();
    return NextResponse.json({ seeded: count });
  }

  if (body.action === "rebuild") {
    await seedDefaultControlDependencies();
  }

  const graph = await buildDependencyGraph(id);
  return NextResponse.json({ graph });
}
