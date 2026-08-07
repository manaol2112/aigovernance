import type { ExplainabilityPayload, TraceabilityScoreBreakdown } from "@/lib/governance-v2/types";

export function buildExplainability(input: {
  controlCode: string;
  controlTitle: string;
  complianceStatus: string;
  inPlaceFindings?: string | null;
  gapFindings?: string | null;
  recommendations?: string | null;
  evidence: Array<{ excerpt: string; confidence: number; sourceLabel?: string | null }>;
  frameworkCodes?: string[];
  scoreBreakdown?: TraceabilityScoreBreakdown;
}): ExplainabilityPayload {
  const statusLabel =
    input.complianceStatus === "aligned"
      ? "aligned"
      : input.complianceStatus === "partial"
        ? "partially met"
        : input.complianceStatus === "gap"
          ? "gap identified"
          : "not assessed from sources";

  const summaryParts: string[] = [];
  if (input.inPlaceFindings?.trim()) {
    summaryParts.push(`In place: ${input.inPlaceFindings.trim().slice(0, 280)}`);
  }
  if (input.gapFindings?.trim()) {
    summaryParts.push(`Gaps: ${input.gapFindings.trim().slice(0, 280)}`);
  }

  const whyClassification =
    summaryParts.length > 0
      ? `${input.controlCode} (${input.controlTitle}) — ${statusLabel}. ${summaryParts.join(" ")}`
      : `${input.controlCode} (${input.controlTitle}) — ${statusLabel} based on ${input.evidence.length} linked source excerpt(s).`;

  const evidenceTriggers = input.evidence.map((item) => {
    const prefix = item.sourceLabel ? `${item.sourceLabel}: ` : "";
    return `[${Math.round(item.confidence * 100)}%] ${prefix}${item.excerpt.trim().slice(0, 200)}`;
  });

  const whatWouldChangeOutcome: string[] = [];
  if (input.complianceStatus === "gap" || input.complianceStatus === "partial") {
    whatWouldChangeOutcome.push("Documented implementation evidence addressing identified gaps");
  }
  if (input.evidence.length < 2) {
    whatWouldChangeOutcome.push("Additional independent source excerpts corroborating the assessment");
  }
  if (input.complianceStatus === "not_assessed") {
    whatWouldChangeOutcome.push("Workshop discussion or documentation covering this control area");
  }
  whatWouldChangeOutcome.push("Reviewer sign-off confirming AI assessment accuracy");

  return {
    whyClassification,
    evidenceTriggers,
    frameworkRequirements:
      input.frameworkCodes && input.frameworkCodes.length > 0
        ? input.frameworkCodes
        : ["Crosswalked to in-scope framework requirements via control library"],
    whatWouldChangeOutcome,
    scoreBreakdown: input.scoreBreakdown,
  };
}
