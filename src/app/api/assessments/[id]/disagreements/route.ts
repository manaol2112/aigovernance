import { NextResponse } from "next/server";
import {
  listDisagreements,
  resolveDisagreement,
  buildSystematicAmbiguityReport,
} from "@/lib/governance-v2/reviewer-disagreement";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const [disagreements, report] = await Promise.all([
    listDisagreements(id),
    buildSystematicAmbiguityReport(id),
  ]);
  return NextResponse.json({ disagreements, report });
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => ({}));
  const { disagreementId, resolution, resolvedBy } = body;
  if (!disagreementId || !resolution || !resolvedBy) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const updated = await resolveDisagreement(disagreementId, resolution, resolvedBy);
  return NextResponse.json({ disagreement: updated });
}
