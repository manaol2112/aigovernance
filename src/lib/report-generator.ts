import { prisma } from "@/lib/db";
import { buildRiskControlMatrix, RISK_PILLARS } from "@/lib/risk-control-matrix";
import { buildControlReviewReportData, MATURITY_LABELS } from "@/lib/control-review-reports";
import { getDisplayFindings } from "@/lib/report-narrative-generator";
import type { DeliverableType } from "@prisma/client";

export async function generateDeliverable(
  assessmentId: string,
  type: DeliverableType
): Promise<{ title: string; content: string }> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      scope: true,
      useCases: true,
      checkpoints: true,
    },
  });

  if (!assessment) throw new Error("Assessment not found");

  const report = await buildControlReviewReportData(assessmentId);

  switch (type) {
    case "gap_assessment_report":
      return {
        title: `Gap Assessment Report — ${assessment.clientName ?? assessment.name}`,
        content: generateGapReport(assessment, report),
      };
    case "remediation_roadmap":
      return {
        title: `Remediation Roadmap — ${assessment.clientName ?? assessment.name}`,
        content: generateRemediationRoadmap(report),
      };
    case "risk_control_matrix":
      return {
        title: `Risk & Control Matrix — ${assessment.clientName ?? assessment.name}`,
        content: await generatePillarMaturityMatrix(assessmentId, assessment, report),
      };
    case "board_ready_summary":
      return {
        title: `Board-Ready AI Governance Summary — ${assessment.clientName ?? assessment.name}`,
        content: generateBoardSummary(assessment, report),
      };
    default:
      throw new Error(`Unknown deliverable type: ${type}`);
  }
}

type AssessmentBasic = NonNullable<
  Awaited<ReturnType<typeof prisma.assessment.findUnique>>
>;

function stripCitations(text: string): string {
  return text.replace(/\[\{\d+\}\]/g, "").trim();
}

function generateGapReport(
  assessment: AssessmentBasic & { scope?: { frameworkCodes: string[] } | null; useCases: Array<{ name: string; description: string }> },
  report: Awaited<ReturnType<typeof buildControlReviewReportData>>
): string {
  const gaps = report.reviewedControls.filter((c) =>
    ["gap", "partial", "not_assessed"].includes(c.complianceStatus)
  );
  const aligned = report.reviewedControls.filter((c) => c.complianceStatus === "aligned");

  let md = `# Gap Assessment Report\n\n`;
  md += `**Client:** ${assessment.clientName ?? "N/A"}\n`;
  md += `**Industry:** ${assessment.clientIndustry ?? "N/A"}\n`;
  md += `**Assessment:** ${assessment.name}\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n`;
  md += `**Frameworks:** ${assessment.scope?.frameworkCodes.join(", ") ?? "All"}\n\n`;
  md += `---\n\n## Executive Summary\n\n`;
  md += `${report.executiveSummary.narrative}\n\n`;
  md += `- Controls signed off for reporting: ${report.reviewedControls.length} of ${report.reviewStats.total}\n`;
  md += `- Aligned: ${aligned.length}\n`;
  md += `- Gaps / Partial: ${gaps.length}\n\n`;

  if (!report.reviewStats.reportingReady) {
    md += `> **Note:** ${report.reviewStats.pendingReview} control(s) are not yet signed off and are excluded from this report.\n\n`;
  }

  md += `## Use Cases Assessed\n\n`;
  for (const uc of assessment.useCases) {
    md += `### ${uc.name}\n${uc.description}\n\n`;
  }

  md += `## Gap Findings (Reviewer-Signed Controls)\n\n`;
  for (const ctrl of gaps) {
    md += `### ${ctrl.controlCode} — ${ctrl.controlTitle}\n\n`;
    md += `**Risk Pillar:** ${ctrl.pillarLabel}\n\n`;
    md += `**Status:** ${ctrl.complianceStatus}\n\n`;
    md += `**What's in place:** ${getDisplayFindings(ctrl, report.clientName).inPlace}\n\n`;
    md += `**Gap analysis:** ${getDisplayFindings(ctrl, report.clientName).gap}\n\n`;
    md += `**Recommendation:** ${getDisplayFindings(ctrl, report.clientName).recommendation}\n\n`;
    if (ctrl.confirmedBy) {
      md += `**Signed off by:** ${ctrl.confirmedBy} (${ctrl.confirmedAt?.split("T")[0] ?? "N/A"})\n\n`;
    }
    md += `---\n\n`;
  }

  md += `\n*This report includes only controls with human reviewer sign-off. Unreviewed controls are excluded.*\n`;
  return md;
}

function generateRemediationRoadmap(
  report: Awaited<ReturnType<typeof buildControlReviewReportData>>
): string {
  let md = `# Remediation Roadmap\n\n`;
  md += `**Client:** ${report.clientName}\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

  const phases = ["immediate", "short_term", "medium_term"] as const;
  for (const phase of phases) {
    const steps = report.roadmap.filter((r) => r.phase === phase);
    if (steps.length === 0) continue;
    md += `## ${steps[0].phaseLabel}\n\n`;
    for (const step of steps) {
      md += `${step.priority}. **${step.controlCode}** (${step.pillarLabel}): ${step.action}\n`;
    }
    md += `\n`;
  }

  md += `## Phase 4 — Continuous Improvement\n\n`;
  md += `- Establish periodic AI governance review cycle\n`;
  md += `- Maintain evidence repository per canonical control library\n`;
  md += `- Re-assess upon material AI system changes\n\n`;

  md += `*Roadmap derived from signed-off control recommendations, prioritized by pillar criticality and gap severity.*\n`;
  return md;
}

async function generatePillarMaturityMatrix(
  assessmentId: string,
  assessment: AssessmentBasic,
  report: Awaited<ReturnType<typeof buildControlReviewReportData>>
): Promise<string> {
  const matrix = await buildRiskControlMatrix();

  let md = `# Risk & Control Maturity Matrix\n\n`;
  md += `**Client:** ${assessment.clientName ?? assessment.name}\n\n`;
  md += `| Pillar | Maturity | Alignment | Reviewed | Framework Coverage |\n`;
  md += `|--------|----------|-----------|----------|--------------------|\n`;

  for (const pillar of report.pillarMaturity) {
    const row = matrix.find((r) => r.pillar.id === pillar.pillarId);
    const fwCount = row?.crossFrameworkScore ?? 0;
    md += `| ${pillar.pillarLabel} | ${pillar.maturityLabel} | ${pillar.alignmentPct}% | ${pillar.reviewedControls}/${pillar.totalControls} | ${fwCount}/5 |\n`;
  }

  md += `\n## Maturity Scale\n\n`;
  for (const pillar of RISK_PILLARS) {
    const m = report.pillarMaturity.find((p) => p.pillarId === pillar.id);
    if (!m || m.reviewedControls === 0) continue;
    md += `### ${pillar.label}\n`;
    md += `${MATURITY_LABELS[m.maturityLevel]} — ${m.alignmentPct}% of reviewed controls aligned.\n\n`;
  }

  return md;
}

function generateBoardSummary(
  assessment: AssessmentBasic & { scope?: { frameworkCodes: string[] } | null; useCases: Array<{ name: string; useCaseType: string }> },
  report: Awaited<ReturnType<typeof buildControlReviewReportData>>
): string {
  let md = `# Board-Ready AI Governance Summary\n\n`;
  md += `**Organization:** ${assessment.clientName ?? assessment.name}\n`;
  md += `**Industry:** ${assessment.clientIndustry ?? "N/A"}\n`;
  md += `**Assessment Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

  md += `## Executive Headline\n\n`;
  md += `${report.executiveSummary.headline}\n\n`;
  md += `${report.executiveSummary.narrative}\n\n`;

  md += `## Key Metrics\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Controls signed off | ${report.reviewStats.confirmed} / ${report.reviewStats.total} |\n`;
  md += `| Aligned controls | ${report.executiveSummary.alignedControls} |\n`;
  md += `| Material gaps | ${report.executiveSummary.gapControls} |\n`;
  md += `| Pillars at risk | ${report.executiveSummary.pillarsAtRisk} |\n\n`;

  md += `## AI Use Cases in Scope\n\n`;
  for (const uc of assessment.useCases) {
    md += `- **${uc.name}** (${uc.useCaseType.replace(/_/g, " ")})\n`;
  }

  md += `\n## Maturity by Risk Pillar\n\n`;
  for (const p of report.pillarMaturity.filter((x) => x.reviewedControls > 0)) {
    md += `- **${p.pillarLabel}:** ${p.maturityLabel} (${p.alignmentPct}% aligned)\n`;
  }

  md += `\n## Top Risk Areas Requiring Board Attention\n\n`;
  for (const g of report.executiveSummary.topGaps) {
    md += `- **${g.controlTitle}** (${g.pillarLabel}): ${g.summary}`;
    if (g.businessImpact) md += ` *Impact:* ${g.businessImpact}`;
    md += `\n`;
  }

  md += `\n## Recommended Board Actions\n\n`;
  const boardActions =
    report.executiveSummary.boardActions.length > 0
      ? report.executiveSummary.boardActions
      : [
          "Direct management to close material control gaps identified in the signed-off assessment.",
          "Approve a remediation roadmap with accountable owners and target dates.",
          "Establish quarterly AI governance reporting to leadership.",
        ];
  boardActions.forEach((action, i) => {
    md += `${i + 1}. ${action}\n`;
  });
  md += `\n`;

  if (!report.reviewStats.reportingReady) {
    md += `> **Review status:** ${report.reviewStats.pendingReview} control(s) pending sign-off. Board distribution should await complete review.\n\n`;
  }

  md += `*Summary based on human-signed control evaluations only.*\n`;
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
