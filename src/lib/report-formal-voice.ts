import type { ControlReviewReportData } from "@/lib/control-review-reports";
import type { DisplayFindings, PriorityRiskSummary } from "@/lib/control-review-reports";

function reportSubject(clientName: string): string {
  const trimmed = clientName.trim();
  return trimmed || "The organization";
}

function reportPossessive(clientName: string): string {
  const subject = reportSubject(clientName);
  if (subject === "The organization") return "The organization's";
  return /s$/i.test(subject) ? `${subject}'` : `${subject}'s`;
}

/** Rewrite informal workshop pronouns into third-party formal report voice. */
export function formalizeReportProse(text: string, clientName: string): string {
  if (!text.trim()) return text;

  const client = reportSubject(clientName);
  const poss = reportPossessive(clientName);

  let result = text.replace(/\s+/g, " ").trim();

  const rules: Array<[RegExp, string]> = [
    [/\bWe haven't\b/g, `${client} has not`],
    [/\bwe haven't\b/g, `${client} has not`],
    [/\bWe have not\b/g, `${client} has not`],
    [/\bwe have not\b/g, `${client} has not`],
    [/\bWe've\b/g, `${client} has`],
    [/\bwe've\b/g, `${client} has`],
    [/\bWe have\b/g, `${client} has`],
    [/\bwe have\b/g, `${client} has`],
    [/\bWe don't\b/g, `${client} does not`],
    [/\bwe don't\b/g, `${client} does not`],
    [/\bWe do not\b/g, `${client} does not`],
    [/\bwe do not\b/g, `${client} does not`],
    [/\bWe didn't\b/g, `${client} did not`],
    [/\bwe didn't\b/g, `${client} did not`],
    [/\bWe did not\b/g, `${client} did not`],
    [/\bwe did not\b/g, `${client} did not`],
    [/\bWe aren't\b/g, `${client} is not`],
    [/\bwe aren't\b/g, `${client} is not`],
    [/\bWe are not\b/g, `${client} is not`],
    [/\bwe are not\b/g, `${client} is not`],
    [/\bWe're\b/g, `${client} is`],
    [/\bwe're\b/g, `${client} is`],
    [/\bWe are\b/g, `${client} is`],
    [/\bwe are\b/g, `${client} is`],
    [/\bWe were\b/g, `${client} was`],
    [/\bwe were\b/g, `${client} was`],
    [/\bWe\b/g, client],
    [/\bwe\b/g, client],
    [/\bThey lack\b/g, `${client} lacks`],
    [/\bthey lack\b/g, `${client} lacks`],
    [/\bThey lacked\b/g, `${client} lacked`],
    [/\bthey lacked\b/g, `${client} lacked`],
    [/\bThey need\b/g, `${client} needs`],
    [/\bthey need\b/g, `${client} needs`],
    [/\bThey haven't\b/g, `${client} has not`],
    [/\bthey haven't\b/g, `${client} has not`],
    [/\bThey have not\b/g, `${client} has not`],
    [/\bthey have not\b/g, `${client} has not`],
    [/\bThey've\b/g, `${client} has`],
    [/\bthey've\b/g, `${client} has`],
    [/\bThey have\b/g, `${client} has`],
    [/\bthey have\b/g, `${client} has`],
    [/\bThey don't\b/g, `${client} does not`],
    [/\bthey don't\b/g, `${client} does not`],
    [/\bThey do not\b/g, `${client} does not`],
    [/\bthey do not\b/g, `${client} does not`],
    [/\bThey're\b/g, `${client} is`],
    [/\bthey're\b/g, `${client} is`],
    [/\bThey are\b/g, `${client} is`],
    [/\bthey are\b/g, `${client} is`],
    [/\bThey were\b/g, `${client} was`],
    [/\bthey were\b/g, `${client} was`],
    [/\bThey\b/g, client],
    [/\bthey\b/g, client],
    [/\bHe doesn't\b/g, `${client} does not`],
    [/\bhe doesn't\b/g, `${client} does not`],
    [/\bShe doesn't\b/g, `${client} does not`],
    [/\bshe doesn't\b/g, `${client} does not`],
    [/\bHe does not\b/g, `${client} does not`],
    [/\bhe does not\b/g, `${client} does not`],
    [/\bShe does not\b/g, `${client} does not`],
    [/\bshe does not\b/g, `${client} does not`],
    [/\bHe has\b/g, `${client} has`],
    [/\bhe has\b/g, `${client} has`],
    [/\bShe has\b/g, `${client} has`],
    [/\bshe has\b/g, `${client} has`],
    [/\bHe is\b/g, `${client} is`],
    [/\bhe is\b/g, `${client} is`],
    [/\bShe is\b/g, `${client} is`],
    [/\bshe is\b/g, `${client} is`],
    [/\bHe\b/g, client],
    [/\bhe\b/g, client],
    [/\bShe\b/g, client],
    [/\bshe\b/g, client],
    [/\bHis\b/g, poss],
    [/\bhis\b/g, poss],
    [/\bHer\b/g, poss],
    [/\bher\b/g, poss],
    [/\bHim\b/g, client],
    [/\bhim\b/g, client],
    [/\bOurs\b/g, poss],
    [/\bours\b/g, poss],
    [/\bOur\b/g, poss],
    [/\bour\b/g, poss],
    [/\bTheir\b/g, poss],
    [/\btheir\b/g, poss],
    [/\bMy\b/g, poss],
    [/\bmy\b/g, poss],
    [/\bI am\b/g, `${client} is`],
    [/\bI'm\b/g, `${client} is`],
    [/\bI have\b/g, `${client} has`],
    [/\bI've\b/g, `${client} has`],
    [/\bI\b/g, client],
  ];

  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

function formalizeDisplayFindings(
  findings: DisplayFindings,
  clientName: string
): DisplayFindings {
  return {
    inPlace: formalizeReportProse(findings.inPlace, clientName),
    gap: formalizeReportProse(findings.gap, clientName),
    recommendation: formalizeReportProse(findings.recommendation, clientName),
  };
}

function formalizePriorityRisk(risk: PriorityRiskSummary, clientName: string): PriorityRiskSummary {
  return {
    ...risk,
    summary: formalizeReportProse(risk.summary, clientName),
    businessImpact: risk.businessImpact
      ? formalizeReportProse(risk.businessImpact, clientName)
      : undefined,
  };
}

export function applyFormalVoiceToReport(report: ControlReviewReportData): ControlReviewReportData {
  const clientName = report.clientName;

  return {
    ...report,
    executiveSummary: {
      ...report.executiveSummary,
      headline: formalizeReportProse(report.executiveSummary.headline, clientName),
      narrative: formalizeReportProse(report.executiveSummary.narrative, clientName),
      topGaps: report.executiveSummary.topGaps.map((gap) => formalizePriorityRisk(gap, clientName)),
      boardActions: report.executiveSummary.boardActions.map((action) =>
        formalizeReportProse(action, clientName)
      ),
    },
    reviewedControls: report.reviewedControls.map((control) => ({
      ...control,
      displayFindings: control.displayFindings
        ? formalizeDisplayFindings(control.displayFindings, clientName)
        : undefined,
      inPlaceFindings: formalizeReportProse(control.inPlaceFindings, clientName),
      gapFindings: formalizeReportProse(control.gapFindings, clientName),
      recommendations: formalizeReportProse(control.recommendations, clientName),
    })),
    roadmap: report.roadmap.map((step) => ({
      ...step,
      action: formalizeReportProse(step.action, clientName),
    })),
  };
}
