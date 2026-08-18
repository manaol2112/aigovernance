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

  /** Longer / compound phrases first — longest match wins to avoid generic keyword collisions. */
  const themeMap: Record<string, string> = {
    "operational resilience": "financial-resilience",
    "business continuity": "financial-resilience",
    "human oversight": "oversight",
    "supply chain": "supply-chain",
    "third party": "supply-chain",
    "third-party": "supply-chain",
    govern: "governance",
    governance: "governance",
    legal: "governance",
    accountability: "governance",
    document: "compliance",
    record: "compliance",
    log: "compliance",
    quality: "compliance",
    compliance: "compliance",
    audit: "compliance",
    trace: "compliance",
    safety: "safety-reliability",
    reliable: "safety-reliability",
    robust: "safety-reliability",
    accuracy: "safety-reliability",
    security: "safety-reliability",
    cyber: "safety-reliability",
    adversarial: "safety-reliability",
    oversight: "oversight",
    incident: "oversight",
    monitor: "oversight",
    gpai: "systemic",
    systemic: "systemic",
    general: "systemic",
    ecosystem: "supply-chain",
    vendor: "supply-chain",
    supplier: "supply-chain",
    partner: "supply-chain",
    transparent: "transparency",
    explain: "transparency",
    disclosure: "transparency",
    bias: "fairness",
    fair: "fairness",
    discrimination: "fairness",
    fundamental: "fairness",
    rights: "fairness",
    privacy: "privacy-data",
    workforce: "workforce",
    training: "workforce",
    competency: "workforce",
    talent: "workforce",
    people: "workforce",
    financial: "financial-resilience",
    resilience: "financial-resilience",
    continuity: "financial-resilience",
    sustainability: "financial-resilience",
    environmental: "financial-resilience",
    decommission: "financial-resilience",
    operational: "oversight",
    human: "oversight",
    third: "supply-chain",
    supply: "supply-chain",
    data: "privacy-data",
    risk: "governance",
  };

  let bestPillar: RiskPillarDef | undefined;
  let bestKeywordLength = 0;

  for (const [keyword, pillarId] of Object.entries(themeMap)) {
    if (!text.includes(keyword)) continue;
    if (keyword.length <= bestKeywordLength) continue;
    const pillar = RISK_PILLARS.find((p) => p.id === pillarId);
    if (pillar) {
      bestPillar = pillar;
      bestKeywordLength = keyword.length;
    }
  }

  if (bestPillar) return bestPillar;

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
