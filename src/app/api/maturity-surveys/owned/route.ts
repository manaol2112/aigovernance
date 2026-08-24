import { NextResponse } from "next/server";
import {
  listMaturitySurveysForPage,
  isDatabaseSetupError,
  databaseSetupMessage,
} from "@/lib/maturity-survey-service";

function parseIds(request: Request): string[] {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("ids");
  if (fromQuery) {
    return fromQuery
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  return [];
}

/** Returns only the surveys whose IDs the client already knows (browser-owned resume). */
export async function GET(request: Request) {
  try {
    const ids = parseIds(request);
    if (ids.length === 0) {
      return NextResponse.json([]);
    }
    const surveys = await listMaturitySurveysForPage(ids);
    return NextResponse.json(surveys);
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return NextResponse.json({ error: databaseSetupMessage(error) }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to load surveys." }, { status: 500 });
  }
}
