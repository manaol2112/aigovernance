import type { CoverageLevel } from "@prisma/client";

export type CoverageUpgrade = {
  control: string;
  framework: string;
  clauseId: string;
  coverage: CoverageLevel;
};

/**
 * Upgrades partial→full or adds full links where existing control scope matches
 * requirement text in seed/playbook sources. Does not invent new controls.
 */
export const coverageUpgrades: CoverageUpgrade[] = [
  // GOVERN-1.6 (playbook): AI system inventory — CTRL-CLASS-001 procedure step 1 inventories systems
  { control: "CTRL-CLASS-001", framework: "NIST-AI-RMF", clauseId: "GOVERN-1.6", coverage: "full" },
  { control: "CTRL-GOV-001", framework: "NIST-AI-RMF", clauseId: "GOVERN-2.2", coverage: "full" },
  { control: "CTRL-ISO-ROLES-001", framework: "NIST-AI-RMF", clauseId: "GOVERN-3.2", coverage: "full" },
  { control: "CTRL-FEEDBACK-001", framework: "NIST-AI-RMF", clauseId: "GOVERN-4.1", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "NIST-AI-RMF", clauseId: "GOVERN-4.3", coverage: "full" },
  { control: "CTRL-TRAIN-001", framework: "NIST-AI-RMF", clauseId: "GOVERN-5.1", coverage: "full" },
  { control: "CTRL-IMPACT-001", framework: "NIST-AI-RMF", clauseId: "MANAGE-2.4", coverage: "full" },
  { control: "CTRL-MON-001", framework: "NIST-AI-RMF", clauseId: "MANAGE-4.1", coverage: "full" },
  { control: "CTRL-GOV-002", framework: "NIST-AI-RMF", clauseId: "MAP-1.5", coverage: "full" },
  { control: "CTRL-DOC-001", framework: "NIST-AI-RMF", clauseId: "MAP-2.1", coverage: "full" },
  { control: "CTRL-RM-001", framework: "NIST-AI-RMF", clauseId: "MAP-3.1", coverage: "full" },
  { control: "CTRL-GOV-002", framework: "NIST-AI-RMF", clauseId: "MAP-3.2", coverage: "full" },
  { control: "CTRL-DEPLOY-001", framework: "NIST-AI-RMF", clauseId: "MAP-3.3", coverage: "full" },
  { control: "CTRL-ISO-COMM-001", framework: "NIST-AI-RMF", clauseId: "MAP-5.2", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-1.1", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-1.2", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-1.3", coverage: "full" },
  { control: "CTRL-IMPACT-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-2.2", coverage: "full" },
  { control: "CTRL-TRANS-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-2.8", coverage: "full" },
  { control: "CTRL-TRANS-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-2.9", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-2.13", coverage: "full" },
  { control: "CTRL-MON-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-3.1", coverage: "full" },
  { control: "CTRL-MON-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-4.1", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-4.2", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "NIST-AI-RMF", clauseId: "MEASURE-4.3", coverage: "full" },
  { control: "CTRL-IMPACT-001", framework: "NIST-AI-RMF", clauseId: "MAP-1.1", coverage: "full" },
  { control: "CTRL-IMPACT-001", framework: "EU-AIA", clauseId: "Art-27", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "ISO-42001", clauseId: "5.1", coverage: "full" },
  { control: "CTRL-DATA-001", framework: "ISO-42001", clauseId: "A.7.5", coverage: "full" },
  { control: "CTRL-CONFORM-001", framework: "EU-AIA", clauseId: "Art-16", coverage: "full" },
  { control: "CTRL-INC-001", framework: "EU-AIA", clauseId: "Art-20", coverage: "full" },
  { control: "CTRL-3RD-001", framework: "EU-AIA", clauseId: "Art-25", coverage: "full" },
  { control: "CTRL-IMPACT-001", framework: "OECD-AI", clauseId: "Principle-1", coverage: "full" },
  { control: "CTRL-ENV-001", framework: "OECD-AI", clauseId: "Principle-1", coverage: "partial" },
  { control: "CTRL-TRANS-001", framework: "EU-AIA", clauseId: "Art-19", coverage: "full" },
  { control: "CTRL-OVER-001", framework: "OECD-AI", clauseId: "Principle-2", coverage: "full" },
  { control: "CTRL-GPAI-001", framework: "OECD-AI", clauseId: "Principle-4", coverage: "full" },
  { control: "CTRL-INC-001", framework: "COSO-ERM", clauseId: "Comp4-Principle17", coverage: "full" },
  { control: "CTRL-GOV-002", framework: "COSO-ERM", clauseId: "Comp3-Principle12", coverage: "full" },
  { control: "CTRL-CLASS-001", framework: "COSO-ERM", clauseId: "Comp2-Principle6", coverage: "full" },
  { control: "CTRL-PRIV-001", framework: "OECD-AI", clauseId: "Principle-2.1", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "OECD-AI", clauseId: "Principle-4.1", coverage: "full" },
  { control: "CTRL-TEST-001", framework: "OECD-AI", clauseId: "Principle-4.2", coverage: "full" },
  { control: "CTRL-GOV-001", framework: "OECD-AI", clauseId: "Principle-5", coverage: "full" },
  { control: "CTRL-GOV-001", framework: "OECD-AI", clauseId: "Principle-5.2", coverage: "full" },
  { control: "CTRL-TRAIN-001", framework: "OECD-AI", clauseId: "Principle-1", coverage: "full" },
  { control: "CTRL-QMS-001", framework: "ISO-42001", clauseId: "9.1", coverage: "full" },
  { control: "CTRL-DEPLOY-001", framework: "EU-AIA", clauseId: "Art-14(4)(a)", coverage: "full" },
];
