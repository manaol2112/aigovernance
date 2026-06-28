import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MaturityLevel } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { controlId, maturity, evidenceNotes, implementationNotes } = body;

  const response = await prisma.assessmentResponse.upsert({
    where: { assessmentId_controlId: { assessmentId: id, controlId } },
    create: {
      assessmentId: id,
      controlId,
      maturity: maturity as MaturityLevel,
      evidenceNotes: evidenceNotes || null,
      implementationNotes: implementationNotes || null,
    },
    update: {
      maturity: maturity as MaturityLevel,
      evidenceNotes: evidenceNotes || null,
      implementationNotes: implementationNotes || null,
    },
    include: { control: true },
  });

  if (maturity === "managed" || maturity === "optimized" || maturity === "defined") {
    await prisma.gapFinding.deleteMany({
      where: { assessmentId: id, controlId },
    });
  } else {
    const control = await prisma.canonicalControl.findUnique({
      where: { id: controlId },
      include: {
        requirementLinks: {
          include: { requirement: { include: { framework: true } } },
        },
      },
    });
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { scope: true },
    });
    if (control && assessment?.scope) {
      for (const link of control.requirementLinks) {
        if (assessment.scope.frameworkCodes.includes(link.requirement.framework.code)) {
          const existing = await prisma.gapFinding.findFirst({
            where: {
              assessmentId: id,
              controlId,
              requirementId: link.requirementId,
            },
          });
          if (existing) {
            await prisma.gapFinding.update({
              where: { id: existing.id },
              data: {
                severity: maturity === "not_implemented" ? "high" : "medium",
                description: `Control at maturity "${maturity}" for ${link.requirement.clauseId}.`,
              },
            });
          } else {
            await prisma.gapFinding.create({
              data: {
                assessmentId: id,
                requirementId: link.requirementId,
                controlId,
                severity: maturity === "not_implemented" ? "high" : "medium",
                title: `Gap: ${control.title}`,
                description: `Control at maturity "${maturity}" for ${link.requirement.clauseId}.`,
                remediation: `Advance implementation of ${control.title}.`,
              },
            });
          }
        }
      }
    }
  }

  return NextResponse.json(response);
}
