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

export const RISK_PILLARS: RiskPillarDef[] = [
  {
    id: "governance",
    label: "Governance & Accountability",
    description: "Board oversight, policies, roles, risk appetite, and organizational accountability for AI.",
    categories: ["governance", "accountability", "legal"],
    criticality: "critical",
  },
  {
    id: "fairness",
    label: "Fairness, Bias & Fundamental Rights",
    description: "Discrimination, bias, impact on protected groups, and fundamental rights assessments.",
    categories: ["fairness", "fundamental_rights"],
    criticality: "critical",
  },
  {
    id: "privacy-data",
    label: "Privacy & Data Governance",
    description: "Personal data protection, data quality, provenance, and lifecycle data management.",
    categories: ["privacy", "data"],
    criticality: "critical",
  },
  {
    id: "safety-reliability",
    label: "Safety & Reliability",
    description: "Physical/psychological harm prevention, accuracy, robustness, and system resilience.",
    categories: ["safety", "reliability"],
    criticality: "critical",
  },
  {
    id: "security",
    label: "Security & Adversarial Risk",
    description: "Cybersecurity, adversarial attacks, data poisoning, and system integrity.",
    categories: ["security"],
    criticality: "critical",
  },
  {
    id: "transparency",
    label: "Transparency & Explainability",
    description: "Disclosure, interpretability, user information, and decision transparency.",
    categories: ["transparency"],
    criticality: "high",
  },
  {
    id: "oversight",
    label: "Human Oversight & Operations",
    description: "Human-in-the-loop, override mechanisms, monitoring, and incident response.",
    categories: ["operational"],
    criticality: "critical",
  },
  {
    id: "compliance",
    label: "Compliance, Documentation & Traceability",
    description: "Technical documentation, logging, record-keeping, and quality management.",
    categories: ["compliance"],
    criticality: "high",
  },
  {
    id: "supply-chain",
    label: "Third-Party & Supply Chain",
    description: "Vendor AI risk, third-party components, and supply chain dependencies.",
    categories: ["supply_chain"],
    criticality: "high",
  },
  {
    id: "systemic",
    label: "Systemic & GPAI Risk",
    description: "General-purpose AI models with systemic impact and large-scale societal harm.",
    categories: ["systemic"],
    criticality: "critical",
  },
];
