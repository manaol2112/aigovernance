/** Client-safe labels — no internal/consultant jargon on maturity surfaces. */

/** Pillar taxonomy weight — not an audited severity rating. */
export const GAP_SEVERITY_LABELS = {
  critical: "Higher-stakes area",
  high: "Elevated-stakes area",
  medium: "Standard area",
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

/** Client-facing copy for the custom-question maturity assessment (never mention packs or frameworks). */
export const PACK_ASSESSMENT_COPY = {
  productLabel: "Maturity assessment",
  modeLabel: "Baseline scan",
  modeDescription:
    "A focused set of questions across your governance pillars — the recommended starting point for leadership teams.",
  heroEyebrow: "AI governance diagnostic",
  heroTitleAccent: "maturity baseline",
  heroSubtitle:
    "A short engagement setup — confirm the organization, review pillar coverage, then open a board-ready diagnostic.",
  overviewTitle: "What you will cover",
  overviewSubtitle:
    "Confirm how to answer and which governance pillars this baseline will score.",
  howToAnswerTitle: "How to answer",
  howToAnswer: [
    "Yes — this is in place today.",
    "Partial — work has started, but it is not complete.",
    "No — this is not yet in place.",
    "Don't know — you will confirm later. It is flagged as a follow-up, not a gap.",
  ] as const,
  pillarsHeading: "Governance pillars you will review",
  reportBadge: "Maturity assessment",
  printTitle: "AI Governance Maturity Report",
  postureScaleTitle: "How to read posture",
  postureScaleNote:
    "Each area is rated Early, Building, Established, or Strong — based on what you confirmed is in place today.",
  scoreHeroNote:
    "Based on your self-reported answers. Items marked Don’t know are listed separately and are not scored as gaps.",
  heroStatPriorities: "open gaps",
  heroStatToConfirm: "unresolved",
  sectionPriorities: "Open gaps",
  sectionPrioritiesEyebrow: "No responses",
  sectionPrioritiesDescription:
    "Highest-stakes No responses first, ranked by area importance and question weight. Expand to see the full list — not an audit severity rating.",
  sectionImprovementsEyebrow: "Partial responses",
  sectionImprovementsDescription:
    "Highest-priority Partial responses first — work has started, but is not yet complete. Expand to see the full list.",
  sectionToConfirmEyebrow: "Don’t know responses",
  sectionToConfirmDescription:
    "Highest-priority Don’t know responses first. Confirm with an owner before treating the baseline as closed. Expand to see the full list.",
  sectionRoadmapEyebrow: "Suggested sequencing",
  sectionRoadmapTitle: "Your action plan",
  sectionRoadmapDescription:
    "Highest-priority moves first in each time window, ranked by stakes and weight. Expand a column to see the full list.",
  sectionStrengthsEyebrow: "Yes responses",
  sectionStrengthsTitle: "Operating today",
  sectionStrengthsDescription:
    "Highest-stakes Yes responses first, ranked by area importance and question weight. Expand to see the full list — self-reported, not independently validated.",
  sectionInsightsEyebrow: "Key findings",
  sectionInsightsTitle: "What matters most",
  sectionInsightsDescription: "",
  sectionProfileEyebrow: "Pillar view",
  sectionProfileTitle: "Where you stand",
  sectionProfileDescription:
    "Expand any pillar for a clear reading of the current posture and what it takes to reach the next level.",
  shareSummary:
    "Self-reported posture by pillar, open gaps, work in progress, and unresolved follow-ups.",
  aboutReportTitle: "About this report",
  aboutReport:
    "This baseline reflects your self-reported answers across governance pillars. Yes means you reported a practice as operating — it is not an audited strength. Area labels such as higher-stakes reflect the model’s pillar weighting, not a verified severity finding.",
  printConfidential: "Confidential — for authorized organizational use only",
  sessionTitleLabel: "Assessment title (optional)",
  sessionTitlePlaceholder: "Q3 governance baseline",
  startButton: "Start assessment",
  loadingLabel: "Opening your assessment",
  backLink: "Back to overview",
  backHref: "/maturity-assessment",
  overrideLink: "Use the standards-based assessment instead",
  overrideHref: "/maturity-assessment/new?catalog=framework",
  completeToast: "Assessment complete.",
  setupStepOrganization: "Organization",
  setupStepOrganizationDescription: "Who this assessment is for",
  setupStepOverview: "Overview",
  setupStepOverviewDescription: "Coverage & how to answer",
  orgSectionTitle: "Organization details",
  orgSectionDescription: "Used on your executive summary and results export.",
  orgNameLabel: "Organization name",
  leadNameLabel: "Your name",
  leadRoleLabel: "Your role",
  notesLabel: "Optional context",
  notesHint: "(visible in your report)",
  notesPlaceholder:
    "Add context for leadership — current state, owners, or what still needs confirmation.",
  allAnsweredBanner: "All questions answered — you can review and submit when ready.",
  preparingReportLabel: "Preparing your report",
  reviewSubmitLabel: "Submit & view results",
  reviewTitle: "Review your answers",
  reviewDescription:
    "Confirm each response below — tap any row to edit before we generate your report.",
  heroPostureSuffix: "governance posture",
} as const;

/** Client-facing copy for the custom-question guided workshop. */
export const PACK_WORKSHOP_COPY = {
  productLabel: "Guided workshop",
  modeLabel: "Live client session",
  modeDescription:
    "Walk your client through current-state questions pillar by pillar — capture answers and facilitator notes for a workshop summary.",
  heroEyebrow: "Workshop setup",
  heroTitleAccent: "client workshop",
  heroSubtitle:
    "Two quick steps — client and facilitator details, then a short overview of the pillar questions before you begin.",
  overviewTitle: "Session overview",
  overviewSubtitle: "What you and your client will cover in this workshop.",
  howToAnswerTitle: "How to capture answers",
  howToAnswer: [
    "Yes — the client confirms this is in place today.",
    "Partial — work has started, but it is not complete.",
    "No — this is not yet in place.",
    "Don't know — flag for follow-up after the session; not counted as a gap.",
  ] as const,
  pillarsHeading: "Pillars in this workshop",
  reportBadge: "Workshop summary",
  printTitle: "AI Governance Workshop Summary",
  postureScaleTitle: "How to read posture",
  postureScaleNote:
    "Each pillar is rated Early, Building, Established, or Strong — based on what the client confirmed is in place today.",
  scoreHeroNote:
    "Based on answers captured in the session. Items marked Don’t know are listed separately and are not scored as gaps.",
  heroStatPriorities: "open gaps",
  heroStatToConfirm: "unresolved",
  sectionPriorities: "Open gaps",
  sectionPrioritiesEyebrow: "No responses",
  sectionPrioritiesDescription:
    "Highest-stakes No responses first, ranked by area importance and question weight. Expand to see the full list — not an audit severity rating.",
  sectionImprovementsEyebrow: "Partial responses",
  sectionImprovementsDescription:
    "Highest-priority Partial responses first — work has started, but is not yet complete. Expand to see the full list.",
  sectionToConfirmEyebrow: "Don’t know responses",
  sectionToConfirmDescription:
    "Highest-priority Don’t know responses first. Confirm with an owner before treating the baseline as closed. Expand to see the full list.",
  sectionRoadmapEyebrow: "Suggested sequencing",
  sectionRoadmapTitle: "Workshop action plan",
  sectionRoadmapDescription:
    "Highest-priority moves first in each time window, ranked by stakes and weight. Expand a column to see the full list.",
  sectionStrengthsEyebrow: "Yes responses",
  sectionStrengthsTitle: "Operating today",
  sectionStrengthsDescription:
    "Highest-stakes Yes responses first, ranked by area importance and question weight. Expand to see the full list — session-reported, not independently validated.",
  sectionInsightsEyebrow: "Key findings",
  sectionInsightsTitle: "What matters most",
  sectionInsightsDescription: "",
  sectionProfileEyebrow: "Pillar view",
  sectionProfileTitle: "Where you stand",
  sectionProfileDescription:
    "Expand any pillar for a clear reading of the current posture and what it takes to reach the next level.",
  shareSummary:
    "Session-reported posture by pillar, open gaps, work in progress, and unresolved follow-ups.",
  aboutReportTitle: "About this summary",
  aboutReport:
    "This summary reflects answers captured in the workshop. Yes means the client reported a practice as operating — it is not an audited strength. Area labels such as higher-stakes reflect the model’s pillar weighting, not a verified severity finding.",
  printConfidential: "Confidential — for authorized client use only",
  sessionTitleLabel: "Workshop title (optional)",
  sessionTitlePlaceholder: "Auto-generated from organization name",
  startButton: "Start a guided workshop",
  loadingLabel: "Opening your workshop",
  backLink: "Back to workshops",
  backHref: "/guided-workshop",
  overrideLink: "Use the framework-aligned workshop instead",
  overrideHref: "/guided-workshop/new?catalog=framework",
  completeToast: "Workshop complete.",
  setupStepOrganization: "Client & team",
  setupStepOrganizationDescription: "Who this workshop is for",
  setupStepOverview: "Overview",
  setupStepOverviewDescription: "Questions & how to capture answers",
  orgSectionTitle: "Client organization",
  orgSectionDescription: "Who this workshop is for — shown on the workshop summary.",
  orgNameLabel: "Client organization name",
  leadNameLabel: "Facilitator name",
  leadRoleLabel: "Facilitator role",
  clientContactNameLabel: "Client contact name",
  clientContactRoleLabel: "Client contact role",
  notesLabel: "Facilitator notes",
  notesHint: "(included in the workshop summary)",
  notesPlaceholder:
    "Capture discussion points, owners, evidence gaps, or follow-ups from the room.",
  allAnsweredBanner: "All questions captured — review and finalize when the session is complete.",
  preparingReportLabel: "Preparing workshop summary",
  reviewSubmitLabel: "Finalize & view summary",
  reviewTitle: "Review session responses",
  reviewDescription:
    "Confirm each answer captured during the workshop — tap any row to edit before generating the client summary.",
  heroPostureSuffix: "workshop posture",
} as const;

export type PackClientCopy = typeof PACK_ASSESSMENT_COPY | typeof PACK_WORKSHOP_COPY;

export function getPackClientCopy(product: "maturity" | "workshop"): PackClientCopy {
  return product === "workshop" ? PACK_WORKSHOP_COPY : PACK_ASSESSMENT_COPY;
}
