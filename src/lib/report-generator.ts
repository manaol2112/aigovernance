import { prisma } from "@/lib/db";
import { buildRiskControlMatrix, RISK_PILLARS } from "@/lib/risk-control-matrix";
import type { DeliverableType } from "@prisma/client";

export async function generateDeliverable(
  assessmentId: string,
  type: DeliverableType
): Promise<{ title: string; content: string }> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      scope: true,
      useCases: {
        include: {
          scopedRequirements: {
            where: { included: true },
            include: { requirement: { include: { framework: true } } },
          },
        },
      },
      requirementEvaluations: {
        include: {
          requirement: { include: { framework: true } },
          useCase: true,
        },
      },
      checkpoints: true,
    },
  });

  if (!assessment) throw new Error("Assessment not found");

  switch (type) {
    case "gap_assessment_report":
      return {
        title: `Gap Assessment Report — ${assessment.clientName ?? assessment.name}`,
        content: generateGapReport(assessment),
      };
    case "remediation_roadmap":
      return {
        title: `Remediation Roadmap — ${assessment.clientName ?? assessment.name}`,
        content: generateRemediationRoadmap(assessment),
      };
    case "risk_control_matrix":
      return {
        title: `Risk & Control Matrix — ${assessment.clientName ?? assessment.name}`,
        content: await generateUseCaseMatrix(assessmentId, assessment),
      };
    case "board_ready_summary":
      return {
        title: `Board-Ready AI Governance Summary — ${assessment.clientName ?? assessment.name}`,
        content: generateBoardSummary(assessment),
      };
    default:
      throw new Error(`Unknown deliverable type: ${type}`);
  }
}

type AssessmentWithRelations = NonNullable<Awaited<ReturnType<typeof loadAssessment>>>;

async function loadAssessment(id: string) {
  return prisma.assessment.findUnique({
    where: { id },
    include: {
      scope: true,
      useCases: true,
      requirementEvaluations: { include: { requirement: { include: { framework: true } }, useCase: true } },
      checkpoints: true,
    },
  });
}

function generateGapReport(assessment: AssessmentWithRelations): string {
  const evals = assessment.requirementEvaluations;
  const gaps = evals.filter((e) => ["gap", "partial", "not_assessed"].includes(e.complianceStatus));
  const aligned = evals.filter((e) => e.complianceStatus === "aligned");

  let md = `# Gap Assessment Report\n\n`;
  md += `**Client:** ${assessment.clientName ?? "N/A"}\n`;
  md += `**Industry:** ${assessment.clientIndustry ?? "N/A"}\n`;
  md += `**Assessment:** ${assessment.name}\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n`;
  md += `**Frameworks:** ${assessment.scope?.frameworkCodes.join(", ") ?? "All"}\n\n`;
  md += `---\n\n## Executive Summary\n\n`;
  md += `- Total requirements evaluated: ${evals.length}\n`;
  md += `- Aligned: ${aligned.length}\n`;
  md += `- Gaps / Partial / Not assessed: ${gaps.length}\n\n`;

  md += `## Use Cases Assessed\n\n`;
  for (const uc of assessment.useCases) {
    md += `### ${uc.name}\n${uc.description}\n\n`;
  }

  md += `## Gap Findings\n\n`;
  for (const ev of gaps) {
    md += `### ${ev.requirement.framework.code} ${ev.citedClauseId} — ${ev.useCase.name}\n\n`;
    md += `**Requirement (source-verified):** ${ev.citedRequirementText.slice(0, 500)}...\n\n`;
    md += `**Status:** ${ev.complianceStatus}\n\n`;
    md += `**Gap Analysis:** ${ev.gapFindings}\n\n`;
    md += `**Recommendation:** ${ev.recommendations}\n\n`;
    if (ev.linkedControlCodes.length > 0) {
      md += `**Linked Controls:** ${ev.linkedControlCodes.join(", ")}\n\n`;
    }
    md += `---\n\n`;
  }

  md += `\n*This report is based on source-verified framework requirements from the crosswalk knowledge base. Human reviewer confirmation required before client delivery.*\n`;
  return md;
}

function generateRemediationRoadmap(assessment: AssessmentWithRelations): string {
  const evals = assessment.requirementEvaluations.filter(
    (e) => e.complianceStatus !== "aligned"
  );

  const byPriority = {
    critical: evals.filter((e) => e.complianceStatus === "gap" || e.complianceStatus === "not_assessed"),
    high: evals.filter((e) => e.complianceStatus === "partial"),
  };

  let md = `# Remediation Roadmap\n\n`;
  md += `**Client:** ${assessment.clientName ?? assessment.name}\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

  md += `## Phase 1 — Critical (0–90 days)\n\n`;
  for (const ev of byPriority.critical) {
    md += `- **${ev.citedClauseId}** (${ev.useCase.name}): ${ev.recommendations.split("\n")[0]}\n`;
  }

  md += `\n## Phase 2 — High Priority (90–180 days)\n\n`;
  for (const ev of byPriority.high) {
    md += `- **${ev.citedClauseId}** (${ev.useCase.name}): ${ev.recommendations.split("\n")[0]}\n`;
  }

  md += `\n## Phase 3 — Continuous Improvement (180+ days)\n\n`;
  md += `- Establish periodic AI governance review cycle\n`;
  md += `- Maintain evidence repository per canonical control library\n`;
  md += `- Re-assess upon material AI system changes\n\n`;

  md += `*Roadmap derived strictly from evaluated framework requirements and linked canonical controls.*\n`;
  return md;
}

async function generateUseCaseMatrix(
  assessmentId: string,
  assessment: AssessmentWithRelations
): Promise<string> {
  const matrix = await buildRiskControlMatrix();

  let md = `# Risk & Control Matrix (Use-Case Scoped)\n\n`;
  md += `**Client:** ${assessment.clientName ?? assessment.name}\n\n`;

  for (const uc of assessment.useCases) {
    md += `## Use Case: ${uc.name}\n\n`;
    md += `| Pillar | Framework Coverage | Controls | Status |\n`;
    md += `|--------|-------------------|----------|--------|\n`;

    const ucEvals = assessment.requirementEvaluations.filter((e) => e.useCaseId === uc.id);

    for (const pillar of RISK_PILLARS) {
      const row = matrix.find((r) => r.pillar.id === pillar.id);
      const pillarEvals = ucEvals.filter((e) => {
        const cat = e.requirement.theme?.toLowerCase() ?? "";
        return pillar.categories.some((c) => cat.includes(c) || e.requirement.title.toLowerCase().includes(c));
      });
      const gapCount = pillarEvals.filter((e) => e.complianceStatus !== "aligned").length;
      const fwCount = row?.crossFrameworkScore ?? 0;
      const controls = row?.controls.map((c) => c.code).join(", ") ?? "—";
      md += `| ${pillar.label} | ${fwCount}/5 frameworks | ${controls} | ${gapCount === 0 ? "Aligned" : `${gapCount} gaps`} |\n`;
    }
    md += `\n`;
  }

  return md;
}

function generateBoardSummary(assessment: AssessmentWithRelations): string {
  const evals = assessment.requirementEvaluations;
  const total = evals.length;
  const aligned = evals.filter((e) => e.complianceStatus === "aligned").length;
  const gaps = total - aligned;
  const pct = total > 0 ? Math.round((aligned / total) * 100) : 0;

  let md = `# Board-Ready AI Governance Summary\n\n`;
  md += `**Organization:** ${assessment.clientName ?? assessment.name}\n`;
  md += `**Industry:** ${assessment.clientIndustry ?? "N/A"}\n`;
  md += `**Assessment Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

  md += `## Key Findings for Board Oversight\n\n`;
  md += `1. **Overall Compliance Posture:** ${pct}% of scoped requirements show alignment based on workshop evidence.\n`;
  md += `2. **Gap Count:** ${gaps} requirements require remediation across ${assessment.useCases.length} AI use case(s).\n`;
  md += `3. **Frameworks Applied:** ${assessment.scope?.frameworkCodes.join(", ") ?? "Multi-framework crosswalk"}\n\n`;

  md += `## AI Use Cases in Scope\n\n`;
  for (const uc of assessment.useCases) {
    md += `- **${uc.name}** (${uc.useCaseType.replace(/_/g, " ")})\n`;
  }

  md += `\n## Top Risk Areas Requiring Board Attention\n\n`;
  const criticalGaps = evals
    .filter((e) => e.complianceStatus === "gap" || e.complianceStatus === "not_assessed")
    .slice(0, 5);

  for (const g of criticalGaps) {
    md += `- **${g.citedClauseId}** (${g.requirement.framework.code}): ${g.gapFindings.slice(0, 200)}...\n`;
  }

  md += `\n## Recommended Board Actions\n\n`;
  md += `1. Endorse AI governance policy framework and risk appetite statement\n`;
  md += `2. Approve remediation roadmap and resource allocation\n`;
  md += `3. Establish quarterly AI governance reporting to the board\n`;
  md += `4. Confirm human oversight mechanisms for high-risk AI use cases\n\n`;

  md += `*Summary based on verified crosswalk requirements. Pending human checkpoint approval before board distribution.*\n`;
  return md;
}

export async function persistDeliverable(assessmentId: string, type: DeliverableType) {
  const { title, content } = await generateDeliverable(assessmentId, type);
  return prisma.deliverable.upsert({
    where: { assessmentId_type: { assessmentId, type } },
    create: { assessmentId, type, title, content, status: "draft" },
    update: { title, content, generatedAt: new Date(), status: "draft" },
  });
}

export async function generateAllDeliverables(assessmentId: string) {
  const types: DeliverableType[] = [
    "gap_assessment_report",
    "remediation_roadmap",
    "risk_control_matrix",
    "board_ready_summary",
  ];
  const results = [];
  for (const type of types) {
    results.push(await persistDeliverable(assessmentId, type));
  }
  return results;
}
