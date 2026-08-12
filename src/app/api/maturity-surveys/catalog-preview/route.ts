import { NextResponse } from "next/server";
import { buildMaturitySurveyCatalog } from "@/lib/maturity-survey-catalog-server";
import { buildMaturitySurveyBriefing } from "@/lib/maturity-survey-briefing";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import type { SurveyMode } from "@/lib/maturity-survey-mode";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { frameworkCodes, surveyMode = "quick" } = body as {
      frameworkCodes?: string[];
      surveyMode?: SurveyMode;
    };

    const allowedFrameworkCodes = new Set<string>(
      FRAMEWORK_COLUMNS.map((f) => f.code)
    );
    const resolvedFrameworkCodes = Array.isArray(frameworkCodes)
      ? [...new Set(frameworkCodes.filter((code) => allowedFrameworkCodes.has(code)))]
      : [];

    if (resolvedFrameworkCodes.length === 0) {
      return NextResponse.json(
        { error: "Select at least one framework." },
        { status: 400 }
      );
    }

    const mode: SurveyMode = surveyMode === "deep_dive" ? "deep_dive" : "quick";
    const catalog = await buildMaturitySurveyCatalog(resolvedFrameworkCodes, mode);
    const shortLabels = Object.fromEntries(FRAMEWORK_COLUMNS.map((f) => [f.code, f.short]));
    const frameworkLabels = resolvedFrameworkCodes.map((code) => shortLabels[code] ?? code);

    return NextResponse.json(
      buildMaturitySurveyBriefing(catalog, frameworkLabels)
    );
  } catch (error) {
    console.error("[maturity-surveys/catalog-preview]", error);
    return NextResponse.json({ error: "Failed to load survey preview." }, { status: 500 });
  }
}
