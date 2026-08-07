import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";

/** Workshop stakeholder group aligned with ISO 42001 interested parties, NIST GOVERN actors, and EU AI Act roles. */
export type WorkshopDepartmentDef = {
  id: string;
  label: string;
  description: string;
  /** Framework codes where this department is typically engaged in AI governance workshops. */
  frameworks: string[];
  /** ISO / NIST / EU AI Act themes this department usually owns in workshop facilitation. */
  workshopThemes: string[];
};

export type WorkshopDepartmentOption = WorkshopDepartmentDef & {
  /** Present because a scoped control owner role maps to this department. */
  fromScopedControls?: boolean;
};

/**
 * Canonical workshop departments for AI governance assessments.
 * Derived from ISO 42001 clauses 4.2 & 5.3, NIST AI RMF GOVERN/MAP actors, and EU AI Act provider/deployer duties.
 */
export const WORKSHOP_DEPARTMENTS: WorkshopDepartmentDef[] = [
  {
    id: "executive-board",
    label: "Executive Leadership & Board",
    description: "Board oversight, executive accountability, and strategic AI commitment (ISO 5.1, NIST GOVERN-1).",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "COSO-ERM", "EU-AIA", "OECD-AI"],
    workshopThemes: ["leadership", "commitment", "policy", "oversight", "board"],
  },
  {
    id: "ai-governance-office",
    label: "AI Governance Office",
    description: "AIMS ownership, AI policy, governance operating model, and cross-functional coordination (ISO 5–8).",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "EU-AIA", "OECD-AI", "COSO-ERM"],
    workshopThemes: ["governance", "aims", "policy", "roles", "5.3", "govern"],
  },
  {
    id: "legal-regulatory",
    label: "Legal & Regulatory Affairs",
    description: "EU AI Act classification, conformity, contracts, regulatory filings, and legal review of AI use.",
    frameworks: ["EU-AIA", "ISO-42001", "OECD-AI"],
    workshopThemes: ["legal", "regulatory", "conformity", "classification", "provider", "deployer"],
  },
  {
    id: "enterprise-risk",
    label: "Enterprise Risk Management",
    description: "AI risk appetite, risk assessment, treatment, and enterprise risk reporting (ISO 6.1, COSO ERM).",
    frameworks: ["ISO-42001", "COSO-ERM", "NIST-AI-RMF", "EU-AIA"],
    workshopThemes: ["risk", "appetite", "treatment", "erm", "6.1"],
  },
  {
    id: "information-security",
    label: "Information Security (CISO)",
    description: "AI system security, access control, adversarial robustness, and security incident response (Annex A.6).",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "EU-AIA"],
    workshopThemes: ["security", "cyber", "access", "a.6", "protect"],
  },
  {
    id: "privacy-data",
    label: "Privacy & Data Protection (DPO)",
    description: "Personal data in AI, DPIAs, lawful basis, data minimization, and privacy-by-design obligations.",
    frameworks: ["ISO-42001", "EU-AIA", "NIST-AI-RMF", "OECD-AI"],
    workshopThemes: ["privacy", "personal data", "dpia", "data protection", "gdpr"],
  },
  {
    id: "engineering-rd",
    label: "Engineering & Software Development",
    description: "System design, SDLC integration, technical documentation, and secure AI engineering practices.",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "EU-AIA"],
    workshopThemes: ["development", "design", "sdlc", "engineering", "technical"],
  },
  {
    id: "data-science-ml",
    label: "Data Science & ML Engineering",
    description: "Model development, training data, experimentation, and ML lifecycle design decisions.",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "EU-AIA"],
    workshopThemes: ["model", "training", "data science", "ml", "measure"],
  },
  {
    id: "mlops-platform",
    label: "MLOps & Platform Engineering",
    description: "Model deployment pipelines, monitoring, drift detection, and production AI platform operations.",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "EU-AIA"],
    workshopThemes: ["mlops", "deployment", "monitoring", "platform", "operate"],
  },
  {
    id: "product-management",
    label: "Product Management",
    description: "AI product requirements, user-facing transparency, and product-level risk acceptance.",
    frameworks: ["EU-AIA", "NIST-AI-RMF", "ISO-42001", "OECD-AI"],
    workshopThemes: ["product", "user", "transparency", "client-facing"],
  },
  {
    id: "hr-workforce",
    label: "HR & People Operations",
    description: "Workforce AI, hiring/performance systems, employee monitoring, and fundamental rights at work.",
    frameworks: ["EU-AIA", "NIST-AI-RMF", "OECD-AI"],
    workshopThemes: ["workforce", "employment", "hiring", "hr", "fundamental rights"],
  },
  {
    id: "responsible-ai",
    label: "Responsible AI & Ethics",
    description: "Fairness, bias, impact assessment, human oversight, and trustworthy AI principles (NIST, OECD).",
    frameworks: ["NIST-AI-RMF", "OECD-AI", "EU-AIA", "ISO-42001"],
    workshopThemes: ["fairness", "bias", "ethics", "human oversight", "impact", "trustworthy"],
  },
  {
    id: "internal-audit",
    label: "Internal Audit & Assurance",
    description: "Independent AIMS audits, control testing, and assurance over AI governance effectiveness (ISO 9.2).",
    frameworks: ["ISO-42001", "COSO-ERM"],
    workshopThemes: ["audit", "assurance", "9.2", "internal audit"],
  },
  {
    id: "procurement-vendor",
    label: "Procurement & Third-Party Risk",
    description: "Third-party and GPAI model procurement, vendor due diligence, and supply chain AI risk.",
    frameworks: ["ISO-42001", "EU-AIA", "NIST-AI-RMF"],
    workshopThemes: ["vendor", "third-party", "procurement", "supply chain", "gpai"],
  },
  {
    id: "it-operations",
    label: "IT Operations & Infrastructure",
    description: "Production operations, change management, incident handling, and business continuity for AI systems.",
    frameworks: ["ISO-42001", "NIST-AI-RMF", "EU-AIA"],
    workshopThemes: ["operations", "incident", "continuity", "change", "run"],
  },
  {
    id: "quality-validation",
    label: "Quality Assurance & Validation",
    description: "Testing, validation, verification, and quality records for AI systems before and after release.",
    frameworks: ["ISO-42001", "EU-AIA", "NIST-AI-RMF"],
    workshopThemes: ["quality", "validation", "verification", "testing", "8.2"],
  },
  {
    id: "business-operations",
    label: "Business Operations & Line of Business",
    description: "Business unit deployers, operational use of AI, and frontline adoption of AI governance controls.",
    frameworks: ["EU-AIA", "NIST-AI-RMF", "ISO-42001", "OECD-AI"],
    workshopThemes: ["business", "deployer", "operations", "line of business", "use case"],
  },
];

const OWNER_ROLE_TO_DEPARTMENT: Array<{ patterns: string[]; departmentId: string }> = [
  { patterns: ["chief ai officer", "ai governance", "aims", "management system lead"], departmentId: "ai-governance-office" },
  { patterns: ["chief risk", "enterprise risk", "ai risk manager", "risk manager"], departmentId: "enterprise-risk" },
  { patterns: ["general counsel", "legal counsel", "legal", "regulatory affairs", "compliance lead"], departmentId: "legal-regulatory" },
  { patterns: ["privacy", "data governance", "dpo", "data protection"], departmentId: "privacy-data" },
  { patterns: ["ciso", "information security", "security"], departmentId: "information-security" },
  { patterns: ["mlops", "platform"], departmentId: "mlops-platform" },
  { patterns: ["data science", "ml engineer", "model owner", "gpai model"], departmentId: "data-science-ml" },
  { patterns: ["chief technology", "engineering", "software", "developer"], departmentId: "engineering-rd" },
  { patterns: ["product owner", "product"], departmentId: "product-management" },
  { patterns: ["responsible ai", "ethics"], departmentId: "responsible-ai" },
  { patterns: ["internal audit", "audit director"], departmentId: "internal-audit" },
  { patterns: ["vendor risk", "procurement", "third-party"], departmentId: "procurement-vendor" },
  { patterns: ["operations lead", "incident response", "it operations"], departmentId: "it-operations" },
  { patterns: ["quality manager", "quality assurance", "qa lead"], departmentId: "quality-validation" },
  { patterns: ["chief learning", "hr", "workforce", "people"], departmentId: "hr-workforce" },
  { patterns: ["ai system owner", "business"], departmentId: "business-operations" },
  { patterns: ["executive", "board", "cro", "ceo"], departmentId: "executive-board" },
  { patterns: ["sustainability"], departmentId: "responsible-ai" },
];

export function mapOwnerRoleToDepartmentId(ownerRole: string): string | null {
  const lower = ownerRole.toLowerCase();
  for (const rule of OWNER_ROLE_TO_DEPARTMENT) {
    if (rule.patterns.some((p) => lower.includes(p))) {
      return rule.departmentId;
    }
  }
  return null;
}

export function getDepartmentByLabel(label: string): WorkshopDepartmentDef | undefined {
  return WORKSHOP_DEPARTMENTS.find((d) => d.label === label);
}

export function getDepartmentsForFrameworks(frameworkCodes: string[]): WorkshopDepartmentDef[] {
  if (frameworkCodes.length === 0) return [...WORKSHOP_DEPARTMENTS];

  return WORKSHOP_DEPARTMENTS.filter((dept) =>
    dept.frameworks.some((f) => frameworkCodes.includes(f))
  );
}

export function mergeDepartmentOptions(
  suggested: WorkshopDepartmentOption[],
  assignedLabels: string[]
): WorkshopDepartmentOption[] {
  const byLabel = new Map(suggested.map((d) => [d.label, d]));

  for (const label of assignedLabels) {
    if (!label || byLabel.has(label)) continue;
    byLabel.set(label, {
      id: `custom-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label,
      description: "Assigned on a use case in this assessment.",
      frameworks: [],
      workshopThemes: [],
    });
  }

  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
}
