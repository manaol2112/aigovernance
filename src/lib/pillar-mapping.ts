import { RISK_PILLARS, type RiskPillarDef } from "@/lib/risk-pillars";

type RequirementLike = {
  id: string;
  clauseId: string;
  title: string;
  theme: string | null;
  requirementType: string;
  framework: { code: string };
};

export function assignRequirementToPillar(req: RequirementLike): RiskPillarDef {
  const text = `${req.title} ${req.theme ?? ""} ${req.clauseId}`.toLowerCase();

  const themeMap: Record<string, string> = {
    govern: "governance",
    governance: "governance",
    legal: "governance",
    accountability: "governance",
    risk: "governance",
    bias: "fairness",
    fair: "fairness",
    discrimination: "fairness",
    fundamental: "fairness",
    rights: "fairness",
    privacy: "privacy-data",
    data: "privacy-data",
    safety: "safety-reliability",
    reliable: "safety-reliability",
    robust: "safety-reliability",
    accuracy: "safety-reliability",
    security: "security",
    cyber: "security",
    adversarial: "security",
    transparent: "transparency",
    explain: "transparency",
    disclosure: "transparency",
    human: "oversight",
    oversight: "oversight",
    operational: "oversight",
    incident: "oversight",
    monitor: "oversight",
    document: "compliance",
    record: "compliance",
    log: "compliance",
    quality: "compliance",
    compliance: "compliance",
    third: "supply-chain",
    vendor: "supply-chain",
    supplier: "supply-chain",
    supply: "supply-chain",
    gpai: "systemic",
    systemic: "systemic",
    general: "systemic",
  };

  for (const [keyword, pillarId] of Object.entries(themeMap)) {
    if (text.includes(keyword)) {
      const pillar = RISK_PILLARS.find((p) => p.id === pillarId);
      if (pillar) return pillar;
    }
  }

  if (req.framework.code === "EU-AIA") return RISK_PILLARS.find((p) => p.id === "compliance")!;
  if (req.framework.code === "COSO-ERM") return RISK_PILLARS.find((p) => p.id === "governance")!;
  if (req.framework.code === "OECD-AI") return RISK_PILLARS.find((p) => p.id === "governance")!;

  return RISK_PILLARS.find((p) => p.id === "governance")!;
}

export type PillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  requirements: RequirementLike[];
  linkedControlCodes: string[];
  frameworkCounts: Record<string, number>;
};

export function buildPillarQuestion(
  pillar: RiskPillarDef,
  useCaseName: string,
  requirements: RequirementLike[],
  controlCodes: string[]
): string {
  const fwSummary = requirements.reduce(
    (acc, r) => {
      acc[r.framework.code] = (acc[r.framework.code] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const fwList = Object.entries(fwSummary)
    .map(([fw, n]) => `${fw} (${n} requirements)`)
    .join(", ");

  const sampleClauses = requirements
    .slice(0, 6)
    .map((r) => `${r.framework.code} ${r.clauseId}: ${r.title}`)
    .join("\n  • ");

  return `## ${pillar.label} — ${useCaseName}

${pillar.description}

This pillar consolidates ${requirements.length} scoped requirements across: ${fwList}.
${controlCodes.length > 0 ? `Linked canonical controls: ${controlCodes.join(", ")}.` : ""}

**Sample mapped requirements:**
  • ${sampleClauses}${requirements.length > 6 ? `\n  • ...and ${requirements.length - 6} more` : ""}

**Workshop questions for the client:**
1. What policies, processes, or controls does the organization have in place for ${pillar.label.toLowerCase()}?
2. Who is the accountable owner for this risk area?
3. What evidence can the client provide (policies, audit reports, test results, training records)?
4. Are there known gaps or planned remediation activities in this area?
5. How does this apply specifically to the "${useCaseName}" AI use case?`;
}
