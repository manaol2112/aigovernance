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

/** Client-facing copy for the custom-question maturity assessment (never mention packs or frameworks). */
export const PACK_ASSESSMENT_COPY = {
  productLabel: "Maturity assessment",
  modeLabel: "Baseline scan",
  modeDescription:
    "A focused set of questions across your governance pillars — the recommended starting point for leadership teams.",
  heroEyebrow: "Configure your assessment",
  heroTitleAccent: "maturity baseline",
  heroSubtitle:
    "Two quick steps — organization details, then a short overview before you begin.",
  overviewTitle: "What you will cover",
  overviewSubtitle: "A snapshot of this assessment before you start.",
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
    "Reflects what is in place today. Items you flagged to confirm are listed separately — they are not treated as gaps.",
  heroStatPriorities: "priority improvements",
  heroStatToConfirm: "to confirm",
  sectionPriorities: "Priority improvements",
  sectionPrioritiesEyebrow: "What to address first",
  sectionPrioritiesDescription:
    "These practices are not yet in place. They are the recommended starting points for your governance program.",
  sectionImprovementsEyebrow: "Building momentum",
  sectionImprovementsDescription:
    "Work has started in these areas but is not yet complete.",
  sectionToConfirmEyebrow: "Open items",
  sectionToConfirmDescription:
    "You marked these for follow-up — a conversation or evidence check is needed before they can be rated.",
  sectionRoadmapEyebrow: "Recommended next steps",
  sectionRoadmapTitle: "Your action plan",
  sectionRoadmapDescription:
    "Phased actions based on priority improvements, areas underway, and items still to confirm.",
  sectionStrengthsEyebrow: "What's working",
  sectionStrengthsTitle: "Strengths",
  sectionStrengthsDescription: "Practices you confirmed are in place today.",
  shareSummary:
    "This includes posture by pillar, priority improvements, and a phased action plan prepared for leadership review.",
  aboutReportTitle: "About this report",
  aboutReport:
    "This report reflects your current-state responses across governance pillars. Use the findings to prioritize next steps, evidence collection, and policy work.",
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
    "Reflects what the client confirmed is in place. Items flagged to confirm are listed separately — they are not treated as gaps.",
  heroStatPriorities: "priority improvements",
  heroStatToConfirm: "to confirm",
  sectionPriorities: "Priority improvements",
  sectionPrioritiesEyebrow: "Discuss with the client",
  sectionPrioritiesDescription:
    "Practices not yet in place — use these to shape workshop follow-ups and the client's roadmap.",
  sectionImprovementsEyebrow: "Underway",
  sectionImprovementsDescription:
    "Work has started in these areas but is not yet complete.",
  sectionToConfirmEyebrow: "Follow up after the session",
  sectionToConfirmDescription:
    "The client flagged these for follow-up — schedule evidence checks or deeper conversations.",
  sectionRoadmapEyebrow: "Recommended next steps",
  sectionRoadmapTitle: "Workshop action plan",
  sectionRoadmapDescription:
    "Phased actions based on priority improvements, areas underway, and items still to confirm.",
  sectionStrengthsEyebrow: "Confirmed strengths",
  sectionStrengthsTitle: "What's working",
  sectionStrengthsDescription: "Practices the client confirmed are in place today.",
  shareSummary:
    "Workshop summary with posture by pillar, priority improvements, and a phased action plan for the client.",
  aboutReportTitle: "About this summary",
  aboutReport:
    "This summary reflects current-state responses captured during your guided workshop. Use it for client debriefs, follow-up planning, and evidence collection.",
  printConfidential: "Confidential — for authorized client use only",
  sessionTitleLabel: "Workshop title (optional)",
  sessionTitlePlaceholder: "Auto-generated from organization name",
  startButton: "Begin workshop",
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
