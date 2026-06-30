import type { RiskPillarDef } from "@/lib/risk-control-matrix";
import { RISK_PILLARS } from "@/lib/risk-control-matrix";

export type RiskSubPillarDef = {
  id: string;
  pillarId: string;
  label: string;
  description: string;
  themes: string[];
  /** Facilitation order within the parent pillar (lower = earlier). */
  workshopOrder: number;
};

export const RISK_SUB_PILLARS: RiskSubPillarDef[] = [
  {
    id: "gov-scope-context",
    pillarId: "governance",
    label: "Scope, Context & Interested Parties",
    description: "AIMS scope, organizational context, stakeholder expectations, and use-case boundaries.",
    themes: ["scope", "context", "interested", "stakeholder", "4.1", "4.2", "4.3", "govern-5"],
    workshopOrder: 1,
  },
  {
    id: "gov-policy-leadership",
    pillarId: "governance",
    label: "AI Policy & Leadership Commitment",
    description: "Board and executive direction, AI policy, and organizational commitment to responsible AI.",
    themes: ["policy", "leadership", "commitment", "5.2", "5.1", "govern-1", "principle 1", "a.2"],
    workshopOrder: 2,
  },
  {
    id: "gov-roles-accountability",
    pillarId: "governance",
    label: "Roles, Accountability & Decision Rights",
    description: "Defined ownership, RACI, escalation paths, and accountability for AI lifecycle decisions.",
    themes: ["role", "responsibilit", "accountab", "raci", "authority", "5.3", "govern-2", "a.3.2", "a.10.2"],
    workshopOrder: 3,
  },
  {
    id: "gov-risk-oversight",
    pillarId: "governance",
    label: "AI Risk Management & Oversight",
    description: "Risk assessment, treatment, appetite, and ongoing governance oversight of AI systems.",
    themes: ["risk", "oversight", "appetite", "6.1", "govern-1.3", "govern-6", "erm", "coso"],
    workshopOrder: 4,
  },
  {
    id: "fair-impact-assessment",
    pillarId: "fairness",
    label: "Impact Assessment & Fundamental Rights",
    description: "Assessing effects on individuals, groups, and fundamental rights before and during deployment.",
    themes: ["impact", "fundamental", "rights", "discriminat", "6.1.4", "a.5", "art-9", "art-27"],
    workshopOrder: 1,
  },
  {
    id: "fair-bias-mitigation",
    pillarId: "fairness",
    label: "Bias, Fairness & Non-Discrimination Controls",
    description: "Testing, monitoring, and mitigating unfair or discriminatory outcomes in AI systems.",
    themes: ["bias", "fair", "equit", "measure-2", "a.5.4", "art-10", "protected"],
    workshopOrder: 2,
  },
  {
    id: "data-governance-quality",
    pillarId: "privacy-data",
    label: "Data Governance & Quality",
    description: "Data management, quality, provenance, preparation, and lifecycle data controls.",
    themes: ["data", "quality", "provenance", "preparation", "8.3", "a.7", "a.4.3", "art-10"],
    workshopOrder: 1,
  },
  {
    id: "data-privacy-protection",
    pillarId: "privacy-data",
    label: "Privacy & Lawful Processing",
    description: "Personal data protection, consent, minimization, and privacy-by-design for AI.",
    themes: ["privacy", "personal", "pii", "gdpr", "consent", "a.7.3"],
    workshopOrder: 2,
  },
  {
    id: "safe-lifecycle-vv",
    pillarId: "safety-reliability",
    label: "Lifecycle Safety, Testing & Validation",
    description: "Verification, validation, robustness testing, and safe design through the AI lifecycle.",
    themes: ["valid", "verif", "test", "robust", "a.6.2.4", "art-15", "measure-2", "map-2"],
    workshopOrder: 1,
  },
  {
    id: "safe-deployment-ops",
    pillarId: "safety-reliability",
    label: "Safe Deployment & Operational Reliability",
    description: "Release criteria, deployment controls, performance reliability, and decommissioning.",
    themes: ["deploy", "operat", "reliab", "performance", "a.6.2.5", "a.6.2.6", "8.2"],
    workshopOrder: 2,
  },
  {
    id: "sec-ai-threats",
    pillarId: "security",
    label: "AI-Specific Security Threats",
    description: "Adversarial attacks, data poisoning, model theft, and integrity of AI components.",
    themes: ["security", "adversarial", "poison", "integrity", "manage-2.4", "cyber"],
    workshopOrder: 1,
  },
  {
    id: "sec-controls-access",
    pillarId: "security",
    label: "Access, Infrastructure & Tooling Security",
    description: "Secure tooling, compute, access controls, and protection of model/data assets.",
    themes: ["access", "tooling", "compute", "infrastructure", "a.4.4", "a.4.5"],
    workshopOrder: 2,
  },
  {
    id: "trans-user-disclosure",
    pillarId: "transparency",
    label: "User Disclosure & System Documentation",
    description: "Informing users about AI use, capabilities, limitations, and intended purpose.",
    themes: ["transparen", "disclos", "user", "document", "a.8.2", "art-13", "art-50", "art-52"],
    workshopOrder: 1,
  },
  {
    id: "trans-explainability",
    pillarId: "transparency",
    label: "Explainability & Interpretability",
    description: "Ability to explain AI decisions and provide meaningful information to affected parties.",
    themes: ["explain", "interpret", "meaningful", "measure-2.9", "a.8"],
    workshopOrder: 2,
  },
  {
    id: "over-human-loop",
    pillarId: "oversight",
    label: "Human Oversight & Override",
    description: "Human-in-the-loop, override mechanisms, and meaningful human control over AI decisions.",
    themes: ["human", "oversight", "override", "loop", "art-14", "govern-4", "a.9"],
    workshopOrder: 1,
  },
  {
    id: "over-monitoring-incident",
    pillarId: "oversight",
    label: "Monitoring, Incidents & Operational Response",
    description: "Continuous monitoring, drift detection, incident reporting, and corrective action.",
    themes: ["monitor", "incident", "drift", "corrective", "9.1", "a.6.2.6", "a.8.4", "art-72", "art-73"],
    workshopOrder: 2,
  },
  {
    id: "comp-documentation-records",
    pillarId: "compliance",
    label: "Documentation, Records & Traceability",
    description: "Technical documentation, logging, record-keeping, and audit trails for AI systems.",
    themes: ["document", "record", "log", "trace", "7.5", "a.6.2.7", "a.6.2.8", "art-11", "art-12"],
    workshopOrder: 1,
  },
  {
    id: "comp-conformity-audit",
    pillarId: "compliance",
    label: "Conformity, Audit & Management Review",
    description: "Internal audit, conformity assessment, management review, and continual improvement.",
    themes: ["audit", "conform", "review", "9.2", "9.3", "10.1", "art-43", "art-47"],
    workshopOrder: 2,
  },
  {
    id: "supply-vendor",
    pillarId: "supply-chain",
    label: "Vendor & Third-Party AI Risk",
    description: "Supplier due diligence, contractual controls, and third-party model/component governance.",
    themes: ["supplier", "vendor", "third", "partner", "a.10.3", "a.10.4", "gpai", "art-53"],
    workshopOrder: 1,
  },
  {
    id: "sys-gpai-systemic",
    pillarId: "systemic",
    label: "GPAI & Systemic Risk",
    description: "Foundation model governance, systemic impact evaluation, and large-scale societal risk.",
    themes: ["gpai", "systemic", "foundation", "general purpose", "art-51", "art-55"],
    workshopOrder: 1,
  },
];

export function getSubPillarsForPillar(pillarId: string): RiskSubPillarDef[] {
  return RISK_SUB_PILLARS.filter((s) => s.pillarId === pillarId).sort(
    (a, b) => a.workshopOrder - b.workshopOrder
  );
}

export function getPillarDef(pillarId: string): RiskPillarDef | undefined {
  return RISK_PILLARS.find((p) => p.id === pillarId);
}

type RequirementLike = {
  title: string;
  theme: string | null;
  clauseId: string;
  framework: { code: string };
};

export function assignRequirementToSubPillar(
  req: RequirementLike,
  pillarId: string
): RiskSubPillarDef {
  const candidates = getSubPillarsForPillar(pillarId);
  const text = `${req.title} ${req.theme ?? ""} ${req.clauseId} ${req.framework.code}`.toLowerCase();

  let best: RiskSubPillarDef | null = null;
  let bestScore = 0;

  for (const sub of candidates) {
    const score = sub.themes.filter((t) => text.includes(t.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      best = sub;
    }
  }

  return best ?? candidates[0] ?? RISK_SUB_PILLARS[0];
}
