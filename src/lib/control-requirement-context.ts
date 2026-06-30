import { prisma } from "@/lib/db";

export type ControlRequirementSummary = {
  code: string;
  title: string;
  description: string;
  frameworkRequirements: string[];
  procedureSummary?: string;
};

export async function loadControlRequirementSummaries(
  controlIds: string[]
): Promise<Map<string, ControlRequirementSummary>> {
  if (controlIds.length === 0) return new Map();

  const controls = await prisma.canonicalControl.findMany({
    where: { id: { in: controlIds } },
    include: {
      requirementLinks: {
        include: { requirement: { include: { framework: true } } },
      },
      procedures: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  const map = new Map<string, ControlRequirementSummary>();
  for (const control of controls) {
    const frameworkRequirements = control.requirementLinks.map((link) => {
      const req = link.requirement;
      const text = req.requirementText.replace(/\s+/g, " ").trim().slice(0, 280);
      return `${req.framework.code} ${req.clauseId} — ${req.title}: ${text}`;
    });

    map.set(control.code.toUpperCase(), {
      code: control.code,
      title: control.title,
      description: control.description,
      frameworkRequirements,
      procedureSummary: control.procedures[0]?.steps.replace(/\s+/g, " ").trim().slice(0, 320),
    });
  }

  return map;
}

export function formatControlRequirementBlock(summary: ControlRequirementSummary): string {
  const lines = [
    `- ${summary.code}: ${summary.title}`,
    `  Canonical requirement: ${summary.description.slice(0, 400)}`,
  ];

  if (summary.frameworkRequirements.length > 0) {
    lines.push("  Linked framework obligations:");
    for (const req of summary.frameworkRequirements.slice(0, 6)) {
      lines.push(`    • ${req}`);
    }
  }

  if (summary.procedureSummary) {
    lines.push(`  Operating procedure (reference): ${summary.procedureSummary}`);
  }

  return lines.join("\n");
}

export function formatRequirementBlockFromControl(control: {
  code: string;
  title: string;
  description: string;
  requirementLinks?: Array<{
    requirement: {
      clauseId: string;
      title: string;
      requirementText: string;
      framework: { code: string };
    };
  }>;
  procedures?: Array<{ steps: string }>;
}): string {
  const frameworkRequirements =
    control.requirementLinks?.map((link) => {
      const req = link.requirement;
      const text = req.requirementText.replace(/\s+/g, " ").trim().slice(0, 280);
      return `${req.framework.code} ${req.clauseId} — ${req.title}: ${text}`;
    }) ?? [];

  return formatControlRequirementBlock({
    code: control.code,
    title: control.title,
    description: control.description,
    frameworkRequirements,
    procedureSummary: control.procedures?.[0]?.steps.replace(/\s+/g, " ").trim().slice(0, 320),
  });
}
