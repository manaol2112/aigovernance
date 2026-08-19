import { NextResponse } from "next/server";
import { prisma, assertGuidedWorkshopPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { packQuestionCreateData, snapshotPackQuestions } from "@/lib/question-pack-service";

function prismaErrorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string };
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
  console.error("[guided-workshops]", error);
  return NextResponse.json({ error: "Failed to process workshop request." }, { status: 500 });
}

export async function GET() {
  try {
    assertGuidedWorkshopPrismaReady();
    const workshops = await prisma.guidedWorkshop.findMany({
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(workshops);
  } catch (error) {
    return prismaErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertGuidedWorkshopPrismaReady();
    const body = await request.json();
    const {
      title,
      organizationName,
      clientIndustry,
      facilitatorName,
      facilitatorRole,
      clientContactName,
      clientContactRole,
      frameworkCodes,
      questionCatalogSource,
      questionPackId,
    } = body as {
      title?: string;
      organizationName: string;
      clientIndustry?: string;
      facilitatorName?: string;
      facilitatorRole?: string;
      clientContactName?: string;
      clientContactRole?: string;
      frameworkCodes?: string[];
      questionCatalogSource?: "framework" | "pack";
      questionPackId?: string;
    };

    if (!organizationName?.trim()) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }

    const resolvedTitle =
      title?.trim() || `${organizationName.trim()} AI Governance Workshop`;

    if (questionCatalogSource === "pack") {
      if (!questionPackId) {
        return NextResponse.json({ error: "A question pack is required." }, { status: 400 });
      }
      const { pack, snapshots } = await snapshotPackQuestions(
        questionPackId,
        "guided_workshop"
      );
      const workshop = await prisma.guidedWorkshop.create({
        data: {
          title: resolvedTitle,
          organizationName: organizationName.trim(),
          clientIndustry: clientIndustry?.trim() || null,
          facilitatorName: facilitatorName?.trim() || null,
          facilitatorRole: facilitatorRole?.trim() || null,
          clientContactName: clientContactName?.trim() || null,
          clientContactRole: clientContactRole?.trim() || null,
          frameworkCodes: [],
          questionCatalogSource: "pack",
          questionPackId: pack.id,
          status: "in_progress",
          packQuestions: { create: packQuestionCreateData(snapshots) },
        },
      });
      return NextResponse.json(workshop);
    }

    const allowedFrameworkCodes = new Set<string>(FRAMEWORK_COLUMNS.map((f) => f.code));
    const resolvedFrameworkCodes = Array.isArray(frameworkCodes)
      ? [...new Set(frameworkCodes.filter((code) => allowedFrameworkCodes.has(code)))]
      : [];

    if (resolvedFrameworkCodes.length === 0) {
      return NextResponse.json({ error: "Select at least one framework." }, { status: 400 });
    }

    const workshop = await prisma.guidedWorkshop.create({
      data: {
        title: resolvedTitle,
        organizationName: organizationName.trim(),
        clientIndustry: clientIndustry?.trim() || null,
        facilitatorName: facilitatorName?.trim() || null,
        facilitatorRole: facilitatorRole?.trim() || null,
        clientContactName: clientContactName?.trim() || null,
        clientContactRole: clientContactRole?.trim() || null,
        frameworkCodes: resolvedFrameworkCodes,
        status: "in_progress",
      },
    });

    return NextResponse.json(workshop);
  } catch (error) {
    return prismaErrorResponse(error);
  }
}
