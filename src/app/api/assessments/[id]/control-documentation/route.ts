import { NextResponse } from "next/server";
import {
  loadControlDocumentationPackage,
  validateControlDocumentation,
} from "@/lib/governance-v2/control-documentation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const controlCode = searchParams.get("controlCode")?.trim();

  if (!controlCode) {
    return NextResponse.json({ error: "controlCode query parameter required" }, { status: 400 });
  }

  try {
    const pkg = await loadControlDocumentationPackage(id, controlCode);
    if (!pkg) {
      return NextResponse.json({ error: "Control not found" }, { status: 404 });
    }
    return NextResponse.json(pkg);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load documentation package" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const controlCode = (body.controlCode as string)?.trim();

    if (!controlCode) {
      return NextResponse.json({ error: "controlCode required" }, { status: 400 });
    }

    if (body.action === "validate") {
      const pkg = await validateControlDocumentation(id, controlCode, {
        useAi: body.useAi !== false,
      });
      if (!pkg) {
        return NextResponse.json({ error: "Control not found" }, { status: 404 });
      }
      return NextResponse.json(pkg);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Documentation validation failed" },
      { status: 500 }
    );
  }
}
