import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";

export type UpsellDeliverable = {
  id: string;
  title: string;
  description: string;
  highlight: string;
};

export type UpsellJourneyStep = {
  id: string;
  label: string;
  subtitle: string;
  unlocks: string;
};

export type MaturityUpsellContent = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  hookStat: { value: string; label: string };
  comparison: {
    snapshot: { title: string; items: string[] };
    fullAssessment: { title: string; items: string[] };
  };
  journey: UpsellJourneyStep[];
  deliverables: UpsellDeliverable[];
  proofPoints: string[];
  cta: { primary: string; secondary: string };
};

const JOURNEY: UpsellJourneyStep[] = [
  {
    id: "scope",
    label: "Scope",
    subtitle: "Client & use cases",
    unlocks: "Frameworks and AI systems mapped to your regulatory context",
  },
  {
    id: "facilitate",
    label: "Facilitate",
    subtitle: "Guided workshops",
    unlocks: "Stakeholder sessions with pillar-specific question guides",
  },
  {
    id: "evidence",
    label: "Evidence",
    subtitle: "Source analysis",
    unlocks: "Transcripts and documents analyzed against every control",
  },
  {
    id: "validate",
    label: "Validate",
    subtitle: "Human sign-off",
    unlocks: "Findings confirmed control-by-control — not self-reported",
  },
  {
    id: "deliver",
    label: "Deliver",
    subtitle: "Client package",
    unlocks: "Board-ready PDFs your leadership can act on immediately",
  },
];

const DELIVERABLES: UpsellDeliverable[] = [
  {
    id: "gap_assessment_report",
    title: "Gap Assessment Report",
    description: "Control-level findings with severity, framework traceability, and cited evidence.",
    highlight: "Audit-defensible",
  },
  {
    id: "remediation_roadmap",
    title: "Remediation Roadmap",
    description: "Prioritized 90-day, 6-month, and 12-month actions with named owners.",
    highlight: "Actionable",
  },
  {
    id: "risk_control_matrix",
    title: "Risk & Control Matrix",
    description: "Pillar maturity heatmap across your full in-scope control library.",
    highlight: "Executive view",
  },
  {
    id: "board_ready_summary",
    title: "Board-Ready Summary",
    description: "One-page narrative for leadership — posture, gaps, and investment case.",
    highlight: "Decision-ready",
  },
];

export function buildMaturityUpsellContent(report: MaturitySurveyReport): MaturityUpsellContent {
  const org = report.organizationName;
  const gaps = report.gaps.length;
  const criticalGaps = report.gaps.filter((g) => g.severity === "critical").length;
  const assessed = report.scope.controlsAssessed;
  const library = report.scope.libraryControlCount;
  const coverage = report.scope.coveragePct;
  const uncovered = Math.max(0, library - assessed);

  const headline =
    gaps > 0
      ? criticalGaps > 0
        ? `You've surfaced ${gaps} gap${gaps === 1 ? "" : "s"} — including ${criticalGaps} critical. Now validate what actually matters.`
        : `You've surfaced ${gaps} improvement area${gaps === 1 ? "" : "s"}. The next step is evidence, not estimates.`
      : `Your snapshot scores ${report.overallMaturityLabel} maturity. A full assessment proves it to auditors and the board.`;

  const subheadline =
    coverage < 100
      ? `This ${report.surveyModeLabel.toLowerCase()} assessed ${assessed} of ${library} in-scope controls (${coverage}% coverage). ${uncovered} control${uncovered === 1 ? "" : "s"} remain unvalidated — along with workshop evidence, stakeholder sign-off, and formal deliverables.`
      : `Self-reported maturity is a starting point. Regulators, auditors, and boards expect workshop evidence, control sign-off, and traceable findings — not survey scores alone.`;

  const hookStat =
    coverage < 50
      ? { value: `${coverage}%`, label: `of your control library validated` }
      : gaps > 0
        ? { value: String(gaps), label: `gap${gaps === 1 ? "" : "s"} to validate with evidence` }
        : { value: "4", label: "board-ready deliverables included" };

  const snapshotItems = [
    `${assessed} control${assessed === 1 ? "" : "s"} self-assessed across ${report.scope.pillarsAssessed} pillars`,
    "Directional maturity score — useful for conversation, not compliance",
    "Generic roadmap based on your ratings",
    "No workshop transcripts, document evidence, or human sign-off",
  ];

  const fullItems = [
    `Every in-scope control reviewed with cited evidence (${library}+ controls)`,
    "Live workshops with department-specific guides",
    "AI-analyzed transcripts mapped to canonical controls & frameworks",
    "Human-validated findings + PDF deliverables for leadership",
  ];

  const proofPoints = [
    `Mapped to ${report.frameworkCodes.join(", ")} — same frameworks in your snapshot`,
    gaps > 0
      ? `Validate whether your ${gaps} flagged gap${gaps === 1 ? "" : "s"} are real, partial, or already addressed`
      : "Confirm strengths before regulators or auditors challenge them",
    "End-to-end engagement workflow — scope, workshop, evidence, validate, deliver",
    "From workshop notes to board package in one platform",
  ];

  return {
    eyebrow: `What's next for ${org}`,
    headline,
    subheadline,
    hookStat,
    comparison: {
      snapshot: { title: "What you have today", items: snapshotItems },
      fullAssessment: { title: "Full AI governance assessment", items: fullItems },
    },
    journey: JOURNEY,
    deliverables: DELIVERABLES,
    proofPoints,
    cta: {
      primary: "Start a client assessment",
      secondary: "See how engagements work",
    },
  };
}
