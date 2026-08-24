import { NextResponse } from "next/server";
import {
  listGuidedWorkshopsForPage,
  isGuidedWorkshopDbError,
  guidedWorkshopDbMessage,
} from "@/lib/guided-workshop-service";

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

/** Returns only workshops whose IDs the client already knows (browser-owned resume). */
export async function GET(request: Request) {
  try {
    const ids = parseIds(request);
    if (ids.length === 0) {
      return NextResponse.json([]);
    }
    const workshops = await listGuidedWorkshopsForPage(ids);
    return NextResponse.json(workshops);
  } catch (error) {
    if (isGuidedWorkshopDbError(error)) {
      return NextResponse.json({ error: guidedWorkshopDbMessage(error) }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to load workshops." }, { status: 500 });
  }
}
