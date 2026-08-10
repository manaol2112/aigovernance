/** Client-safe labels — no internal/consultant jargon on maturity surfaces. */

export const GAP_SEVERITY_LABELS = {
  critical: "Critical priority",
  high: "Address this quarter",
  medium: "Improvement area",
} as const;

export function formatGapSeverity(severity: keyof typeof GAP_SEVERITY_LABELS): string {
  return GAP_SEVERITY_LABELS[severity] ?? severity;
}

export const CLIENT_TERMS = {
  baselineScan: "Baseline scan",
  detailedPillarAssessment: "Detailed pillar assessment",
  fromBaseline: "From baseline",
  quickScan: "Baseline scan",
  deepDive: "Detailed assessment",
} as const;
