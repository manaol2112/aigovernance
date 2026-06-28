import type { CoverageLevel } from "@prisma/client";

export type ReqLink = { framework: string; clauseId: string; coverage: CoverageLevel };

/** Direct requirement links added to existing + new controls for 100% framework coverage */
export const requirementSupplements: Record<string, ReqLink[]> = {
  "CTRL-GOV-001": [
    { framework: "ISO-42001", clauseId: "A.2.3", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.2.4", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-5", coverage: "partial" },
    { framework: "OECD-AI", clauseId: "Principle-5.2", coverage: "partial" },
    { framework: "COSO-ERM", clauseId: "Comp1-Principle4", coverage: "full" },
  ],
  "CTRL-GOV-002": [
    { framework: "COSO-ERM", clauseId: "Comp3-Principle11", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp3-Principle12", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp2-Principle8", coverage: "full" },
  ],
  "CTRL-RM-001": [
    { framework: "EU-AIA", clauseId: "Art-9(2)", coverage: "full" },
    { framework: "EU-AIA", clauseId: "Art-9(4)", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp3-Principle10", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp3-Principle13", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp3-Principle15", coverage: "partial" },
  ],
  "CTRL-DATA-001": [
    { framework: "EU-AIA", clauseId: "Art-10(2)(a)", coverage: "full" },
    { framework: "EU-AIA", clauseId: "Art-10(2)(f)", coverage: "full" },
    { framework: "ISO-42001", clauseId: "8.3", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.7.2", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.7.3", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.7.6", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-2.2", coverage: "full" },
  ],
  "CTRL-TEST-001": [
    { framework: "EU-AIA", clauseId: "Art-10(2)(f)", coverage: "partial" },
    { framework: "ISO-42001", clauseId: "A.6.2.4", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-4.1", coverage: "partial" },
    { framework: "OECD-AI", clauseId: "Principle-4.2", coverage: "partial" },
  ],
  "CTRL-DOC-001": [
    { framework: "ISO-42001", clauseId: "7.5", coverage: "full" },
  ],
  "CTRL-TRANS-001": [
    { framework: "EU-AIA", clauseId: "Art-50", coverage: "full" },
    { framework: "EU-AIA", clauseId: "Art-52", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.8.5", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.9.4", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-3", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-3.2", coverage: "full" },
  ],
  "CTRL-OVER-001": [
    { framework: "EU-AIA", clauseId: "Art-14(4)(a)", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-2", coverage: "partial" },
    { framework: "OECD-AI", clauseId: "Principle-2.3", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-4.3", coverage: "full" },
  ],
  "CTRL-IMPACT-001": [
    { framework: "ISO-42001", clauseId: "6.1.4", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.5.3", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.5.5", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-1.1", coverage: "partial" },
  ],
  "CTRL-INC-001": [
    { framework: "ISO-42001", clauseId: "10.2", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp4-Principle17", coverage: "partial" },
  ],
  "CTRL-MON-001": [
    { framework: "ISO-42001", clauseId: "9.1", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp4-Principle18", coverage: "full" },
  ],
  "CTRL-QMS-001": [
    { framework: "ISO-42001", clauseId: "10.1", coverage: "full" },
    { framework: "ISO-42001", clauseId: "9.1", coverage: "partial" },
    { framework: "COSO-ERM", clauseId: "Comp4-Principle16", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp5-Principle19", coverage: "full" },
  ],
  "CTRL-3RD-001": [
    { framework: "ISO-42001", clauseId: "A.10.2", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.10.4", coverage: "full" },
    { framework: "EU-AIA", clauseId: "Art-25", coverage: "partial" },
  ],
  "CTRL-GPAI-001": [
    { framework: "OECD-AI", clauseId: "Principle-4", coverage: "partial" },
  ],
  "CTRL-CLASS-001": [
    { framework: "COSO-ERM", clauseId: "Comp2-Principle6", coverage: "partial" },
  ],
  "CTRL-CONFORM-001": [
    { framework: "EU-AIA", clauseId: "Art-19", coverage: "full" },
  ],
  "CTRL-DEPLOY-001": [
    { framework: "EU-AIA", clauseId: "Art-14(4)(a)", coverage: "partial" },
  ],
  "CTRL-REG-001": [
    { framework: "EU-AIA", clauseId: "Art-71", coverage: "full" },
  ],
  "CTRL-TRAIN-001": [
    { framework: "ISO-42001", clauseId: "7.2", coverage: "full" },
    { framework: "ISO-42001", clauseId: "7.3", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp1-Principle5", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-1", coverage: "partial" },
  ],
  "CTRL-RISK-PRI-001": [
    { framework: "COSO-ERM", clauseId: "Comp3-Principle14", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp3-Principle15", coverage: "full" },
  ],
  "CTRL-FEEDBACK-001": [
    { framework: "COSO-ERM", clauseId: "Comp5-Principle20", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-5.3", coverage: "full" },
  ],
  "CTRL-PRIV-001": [
    { framework: "OECD-AI", clauseId: "Principle-2.1", coverage: "partial" },
  ],
  "CTRL-ENV-001": [
    { framework: "OECD-AI", clauseId: "Principle-1.2", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-1", coverage: "partial" },
  ],
  "CTRL-LEGAL-001": [
    { framework: "ISO-42001", clauseId: "4.1", coverage: "full" },
    { framework: "ISO-42001", clauseId: "4.2", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp2-Principle6", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp2-Principle9", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-2.1", coverage: "full" },
  ],
  "CTRL-ACCT-001": [
    { framework: "EU-AIA", clauseId: "Art-21", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp1-Principle1", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp1-Principle2", coverage: "full" },
    { framework: "COSO-ERM", clauseId: "Comp1-Principle3", coverage: "full" },
    { framework: "ISO-42001", clauseId: "A.3.3", coverage: "full" },
    { framework: "OECD-AI", clauseId: "Principle-5", coverage: "full" },
  ],
  "CTRL-DRIFT-001": [
    { framework: "NIST-AI-RMF", clauseId: "MEASURE-3.2", coverage: "full" },
    { framework: "NIST-AI-RMF", clauseId: "MANAGE-4.2", coverage: "partial" },
  ],
};

/** COSO + OECD full direct coverage (all actionable requirements) */
export const cosoOecdFullLinks: ReqLink[] = [
  { framework: "COSO-ERM", clauseId: "Comp4-Principle17", coverage: "full" },
  { framework: "OECD-AI", clauseId: "Principle-1.1", coverage: "full" },
  { framework: "OECD-AI", clauseId: "Principle-2.2", coverage: "full" },
];
