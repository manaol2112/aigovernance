import { NextResponse } from "next/server";
import { assertPrismaReady, PrismaNotReadyError } from "@/lib/db";
import { isQuestionPackProduct } from "@/lib/pillar-questionnaire";
import { createQuestionPack, listQuestionPacks } from "@/lib/question-pack-service";

function errorResponse(error: unknown) {
  if (error instanceof PrismaNotReadyError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Failed to load question packs." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    assertPrismaReady();
    const productParam = new URL(request.url).searchParams.get("product");
    const product = isQuestionPackProduct(productParam) ? productParam : undefined;
    const packs = await listQuestionPacks(product);
    return NextResponse.json({ packs });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertPrismaReady();
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      product?: string;
    };
    const pack = await createQuestionPack({
      name: body.name ?? "",
      description: body.description,
      product: isQuestionPackProduct(body.product) ? body.product : "maturity_assessment",
    });
    return NextResponse.json(pack);
  } catch (error) {
    return errorResponse(error);
  }
}
