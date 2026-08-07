import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  listAISystems,
  syncAISystemsFromUseCases,
  createAISystem,
} from "@/lib/governance-v2/ai-system-registry";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const systems = await listAISystems(id);
  return NextResponse.json({ systems });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (body.action === "sync_from_use_cases") {
    const systems = await syncAISystemsFromUseCases(id);
    return NextResponse.json({ systems });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const system = await createAISystem(id, body);
  return NextResponse.json({ system });
}
