/** Client-safe risk pillar catalog (no Prisma). */

export const FRAMEWORK_COLUMNS = [
  { code: "NIST-AI-RMF", short: "NIST", color: "bg-blue-600" },
  { code: "ISO-42001", short: "ISO 42001", color: "bg-emerald-600" },
  { code: "EU-AIA", short: "EU AI Act", color: "bg-violet-600" },
  { code: "OECD-AI", short: "OECD", color: "bg-amber-600" },
  { code: "COSO-ERM", short: "COSO ERM", color: "bg-rose-600" },
] as const;

export type RiskPillarDef = {
  id: string;
  label: string;
  description: string;
  categories: string[];
  criticality: "critical" | "high" | "medium";
};

/** Eleven-pillar baseline taxonomy — order matches baseline scan wizard flow. */
export const RISK_PILLARS: RiskPillarDef[] = [
  {
    id: "governance",
    label: "Governance & Accountability",
    description:
      "Board oversight, policies, roles, risk appetite, and organizational accountability for AI.",
    categories: ["governance", "accountability", "legal"],
    criticality: "critical",
  },
  {
    id: "compliance",
    label: "Compliance, Documentation & Traceability",
    description:
      "Technical documentation, logging, record-keeping, and quality management.",
    categories: ["compliance"],
    criticality: "high",
  },
  {
    id: "safety-reliability",
    label: "Safety & Reliability",
    description:
      "Physical/psychological harm prevention, accuracy, robustness, security, and system resilience.",
    categories: ["safety", "reliability", "security"],
    criticality: "critical",
  },
  {
    id: "oversight",
    label: "Human Oversight & Operations",
    description:
      "Human-in-the-loop, override mechanisms, monitoring, and incident response.",
    categories: ["operational"],
    criticality: "critical",
  },
  {
    id: "systemic",
    label: "Systemic & GPAI Risk",
    description:
      "General-purpose AI models with systemic impact and large-scale societal harm.",
    categories: ["systemic"],
    criticality: "critical",
  },
  {
    id: "supply-chain",
    label: "Third Party, Supply Chain & Ecosystem Risk",
    description:
      "Vendor AI risk, third-party components, ecosystem partners, and supply chain dependencies.",
    categories: ["supply_chain", "ecosystem"],
    criticality: "high",
  },
  {
    id: "transparency",
    label: "Transparency & Explainability",
    description:
      "Disclosure, interpretability, user information, and decision transparency.",
    categories: ["transparency"],
    criticality: "high",
  },
  {
    id: "fairness",
    label: "Fairness, Bias & Fundamental Rights",
    description:
      "Discrimination, bias, impact on protected groups, and fundamental rights assessments.",
    categories: ["fairness", "fundamental_rights"],
    criticality: "critical",
  },
  {
    id: "privacy-data",
    label: "Privacy & Data Governance",
    description:
      "Personal data protection, data quality, provenance, and lifecycle data management.",
    categories: ["privacy", "data"],
    criticality: "critical",
  },
  {
    id: "workforce",
    label: "Workforce & Human Capital Risk",
    description:
      "AI workforce competency, training, role clarity, and human capital readiness for responsible AI.",
    categories: ["workforce"],
    criticality: "high",
  },
  {
    id: "financial-resilience",
    label: "Financial & Operational Resilience Risk",
    description:
      "Business continuity, financial impact, operational resilience, and sustainability of AI operations.",
    categories: ["financial", "operational_resilience", "environmental"],
    criticality: "high",
  },
];

/** Map retired pillar IDs from earlier taxonomy versions. */
export const LEGACY_PILLAR_ID_ALIASES: Record<string, string> = {
  security: "safety-reliability",
};

export function resolvePillarId(pillarId: string): string {
  return LEGACY_PILLAR_ID_ALIASES[pillarId] ?? pillarId;
}
