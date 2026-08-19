import { NextResponse } from "next/server";
import { questionPackCsvTemplate } from "@/lib/question-pack-csv";

export async function GET() {
  return new NextResponse(questionPackCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pillar-question-pack-template.csv"',
    },
  });
}
