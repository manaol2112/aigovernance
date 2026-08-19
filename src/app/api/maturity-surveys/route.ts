import { NextResponse } from "next/server";
import { prisma, assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { DEFAULT_SURVEY_MODE, type SurveyMode } from "@/lib/maturity-survey-mode";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { packQuestionCreateData, snapshotPackQuestions } from "@/lib/question-pack-service";

function prismaErrorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; message?: string };
    if (prismaError.code === "P2022" || prismaError.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Database schema is out of date. Run `npx prisma db push` and restart the dev server.",
        },
        { status: 503 }
      );
    }
  }
  console.error("[maturity-surveys]", error);
  return NextResponse.json({ error: "Failed to create survey." }, { status: 500 });
}

export async function GET() {
  try {
    assertPrismaReady();
    const surveys = await prisma.maturitySurvey.findMany({
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(surveys);
  } catch (error) {
    return prismaErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertPrismaReady();
    const body = await request.json();
    const {
      title,
      organizationName,
      respondentName,
      respondentRole,
      frameworkCodes,
      surveyMode = DEFAULT_SURVEY_MODE,
      questionCatalogSource,
      questionPackId,
    } = body as {
      title: string;
      organizationName: string;
      respondentName?: string;
      respondentRole?: string;
      frameworkCodes?: string[];
      surveyMode?: SurveyMode;
      questionCatalogSource?: "framework" | "pack";
      questionPackId?: string;
    };

    const mode: SurveyMode = surveyMode === "deep_dive" ? "deep_dive" : "quick";

    if (!organizationName?.trim()) {
      return NextResponse.json(
        { error: "Organization name is required." },
        { status: 400 }
      );
    }

    const resolvedTitle =
      title?.trim() ||
      `${organizationName.trim()} AI Maturity Assessment`;

    if (questionCatalogSource === "pack") {
      if (!questionPackId) {
        return NextResponse.json({ error: "A question pack is required." }, { status: 400 });
      }
      const { pack, snapshots } = await snapshotPackQuestions(
        questionPackId,
        "maturity_assessment"
      );
      const survey = await prisma.maturitySurvey.create({
        data: {
          title: resolvedTitle,
          organizationName: organizationName.trim(),
          respondentName: respondentName?.trim() || null,
          respondentRole: respondentRole?.trim() || null,
          frameworkCodes: [],
          surveyMode: "quick",
          questionCatalogSource: "pack",
          questionPackId: pack.id,
          status: "in_progress",
          packQuestions: { create: packQuestionCreateData(snapshots) },
        },
      });
      return NextResponse.json(survey);
    }

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

    const survey = await prisma.maturitySurvey.create({
      data: {
        title: resolvedTitle,
        organizationName: organizationName.trim(),
        respondentName: respondentName?.trim() || null,
        respondentRole: respondentRole?.trim() || null,
        frameworkCodes: resolvedFrameworkCodes,
        surveyMode: mode,
        status: "in_progress",
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    return prismaErrorResponse(error);
  }
}
