import { prisma } from "@/lib/db";

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

export type MatrixRequirement = {
  clauseId: string;
  title: string;
  coverage: string;
};

export type MatrixControl = {
  code: string;
  title: string;
  ownerRole: string;
};

export type PillarMatrixRow = {
  pillar: RiskPillarDef;
  risks: Array<{ code: string; statement: string; category: string }>;
  controls: MatrixControl[];
  frameworkCoverage: Record<
    string,
    { count: number; requirements: MatrixRequirement[] }
  >;
  crossFrameworkScore: number;
  totalRequirements: number;
};

export async function buildRiskControlMatrix(): Promise<PillarMatrixRow[]> {
  const [risks, controls, frameworks] = await Promise.all([
    prisma.riskStatement.findMany({ orderBy: { code: "asc" } }),
    prisma.canonicalControl.findMany({
      include: {
        riskLinks: { include: { risk: true } },
        requirementLinks: {
          include: {
            requirement: { include: { framework: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.framework.findMany({ orderBy: { code: "asc" } }),
  ]);

  const frameworkCodes = frameworks.map((f) => f.code);

  return RISK_PILLARS.map((pillar) => {
    const pillarRisks = risks.filter((r) => pillar.categories.includes(r.category));
    const pillarRiskIds = new Set(pillarRisks.map((r) => r.id));

    const pillarControls = controls
      .filter((c) => c.riskLinks.some((rl) => pillarRiskIds.has(rl.riskId)))
      .map((c) => ({
        code: c.code,
        title: c.title,
        ownerRole: c.ownerRole,
      }));

    const controlIds = new Set(
      controls
        .filter((c) => c.riskLinks.some((rl) => pillarRiskIds.has(rl.riskId)))
        .map((c) => c.id)
    );

    const frameworkCoverage: PillarMatrixRow["frameworkCoverage"] = {};

    for (const fwCode of frameworkCodes) {
      frameworkCoverage[fwCode] = { count: 0, requirements: [] };
    }

    const seenReqs = new Set<string>();

    for (const control of controls) {
      if (!controlIds.has(control.id)) continue;
      for (const link of control.requirementLinks) {
        const fwCode = link.requirement.framework.code;
        const key = `${fwCode}:${link.requirement.clauseId}`;
        if (seenReqs.has(key)) continue;
        seenReqs.add(key);

        if (!frameworkCoverage[fwCode]) {
          frameworkCoverage[fwCode] = { count: 0, requirements: [] };
        }
        frameworkCoverage[fwCode].requirements.push({
          clauseId: link.requirement.clauseId,
          title: link.requirement.title,
          coverage: link.coverage,
        });
        frameworkCoverage[fwCode].count++;
      }
    }

    const frameworksWithCoverage = FRAMEWORK_COLUMNS.filter(
      (f) => (frameworkCoverage[f.code]?.count ?? 0) > 0
    ).length;

    const totalRequirements = Object.values(frameworkCoverage).reduce(
      (sum, fc) => sum + fc.count,
      0
    );

    return {
      pillar,
      risks: pillarRisks.map((r) => ({
        code: r.code,
        statement: r.statement,
        category: r.category,
      })),
      controls: pillarControls,
      frameworkCoverage,
      crossFrameworkScore: frameworksWithCoverage,
      totalRequirements,
    };
  });
}

export async function getMatrixSummary() {
  const matrix = await buildRiskControlMatrix();
  const fullyCrossed = matrix.filter((r) => r.crossFrameworkScore >= 4).length;
  const criticalPillars = matrix.filter((r) => r.pillar.criticality === "critical").length;
  return {
    pillarCount: matrix.length,
    fullyCrossed,
    criticalPillars,
    totalControls: new Set(matrix.flatMap((r) => r.controls.map((c) => c.code))).size,
  };
}
