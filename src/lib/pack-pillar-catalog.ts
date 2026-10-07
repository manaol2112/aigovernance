/**
 * Pack-scoped pillar catalogs.
 * Framework / standard packs use the canonical 11 RISK_PILLARS.
 * TMT packs use a focused 6-pillar taxonomy for maturity + guided workshop questionnaires.
 */

import { RISK_PILLARS, type RiskPillarDef } from "@/lib/risk-pillars";

export const PACK_PILLAR_SETS = ["standard_11", "tmt_6"] as const;
export type PackPillarSet = (typeof PACK_PILLAR_SETS)[number];

export function isPackPillarSet(value: unknown): value is PackPillarSet {
  return value === "standard_11" || value === "tmt_6";
}

/** TMT sector pack — six operating risk pillars. */
export const TMT_PILLARS: RiskPillarDef[] = [
  {
    id: "human-capital",
    label: "Human Capital",
    description:
      "Workforce capability, AI literacy, role clarity, and change readiness for responsible AI adoption.",
    categories: ["workforce", "human_capital"],
    criticality: "high",
  },
  {
    id: "regulatory-financial",
    label: "Regulatory & Financial",
    description:
      "Regulatory exposure, financial impact, capital and reporting implications of AI products and controls.",
    categories: ["regulatory", "financial"],
    criticality: "critical",
  },
  {
    id: "operational-risk",
    label: "Operational",
    description:
      "Day-to-day operating resilience, process controls, incidents, and service continuity for AI-enabled operations.",
    categories: ["operational"],
    criticality: "critical",
  },
  {
    id: "ecosystem-risk",
    label: "Ecosystem",
    description:
      "Partners, platforms, vendors, and market ecosystem dependencies that import AI risk into the enterprise.",
    categories: ["ecosystem", "supply_chain"],
    criticality: "high",
  },
  {
    id: "technology-risk",
    label: "Technology",
    description:
      "Model, data, security, reliability, and platform technology risks across the AI stack.",
    categories: ["technology", "security", "reliability"],
    criticality: "critical",
  },
  {
    id: "compliance-risk",
    label: "Compliance",
    description:
      "Policy adherence, documentation, auditability, and compliance evidence for AI systems and controls.",
    categories: ["compliance"],
    criticality: "high",
  },
];

/** Normalize CSV pillar cells: case, punctuation, underscores, and spacing. */
function normalizePillarToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-") // en/em dash
    .replace(/&/g, " and ")
    .replace(/[_/]+/g, "-")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TMT_ALIASES: Record<string, string> = {
  // Full labels / phrases
  "human capital": "human-capital",
  "human capital risk": "human-capital",
  "regulatory and financial risk": "regulatory-financial",
  "regulatory financial risk": "regulatory-financial",
  "regulatory and financial": "regulatory-financial",
  "regulatory financial": "regulatory-financial",
  "operational risk": "operational-risk",
  "ecosystem risk": "ecosystem-risk",
  "technology risk": "technology-risk",
  "compliance risk": "compliance-risk",
  // Short names people put in pillar_id (common cause of "unknown pillar" skips)
  technology: "technology-risk",
  tech: "technology-risk",
  "tech risk": "technology-risk",
  operational: "operational-risk",
  operations: "operational-risk",
  "ops risk": "operational-risk",
  ecosystem: "ecosystem-risk",
  "eco system": "ecosystem-risk",
  compliance: "compliance-risk",
  regulatory: "regulatory-financial",
  financial: "regulatory-financial",
  "human-capital risk": "human-capital",
  "regulatory-financial risk": "regulatory-financial",
};

/**
 * When importing into a TMT pack, accept standard 11-pillar ids/labels and
 * fold them into the nearest TMT pillar so legacy CSVs do not silently skip.
 */
const STANDARD_TO_TMT: Record<string, string> = {
  workforce: "human-capital",
  "financial-resilience": "regulatory-financial",
  oversight: "operational-risk",
  "supply-chain": "ecosystem-risk",
  systemic: "ecosystem-risk",
  "safety-reliability": "technology-risk",
  "privacy-data": "technology-risk",
  compliance: "compliance-risk",
  governance: "compliance-risk",
  transparency: "compliance-risk",
  fairness: "compliance-risk",
};

const STANDARD_BY_ID = new Map(RISK_PILLARS.map((pillar) => [pillar.id, pillar]));
const STANDARD_BY_LABEL = new Map(
  RISK_PILLARS.map((pillar) => [pillar.label.trim().toLowerCase(), pillar])
);
const TMT_BY_ID = new Map(TMT_PILLARS.map((pillar) => [pillar.id, pillar]));
const TMT_BY_LABEL = new Map(
  TMT_PILLARS.map((pillar) => [pillar.label.trim().toLowerCase(), pillar])
);
const ALL_BY_ID = new Map<string, RiskPillarDef>([
  ...STANDARD_BY_ID.entries(),
  ...TMT_BY_ID.entries(),
]);

export function getPackPillarCatalog(pillarSet: PackPillarSet = "standard_11"): RiskPillarDef[] {
  return pillarSet === "tmt_6" ? TMT_PILLARS : RISK_PILLARS;
}

export function packPillarSetCount(pillarSet: PackPillarSet = "standard_11"): number {
  return getPackPillarCatalog(pillarSet).length;
}

/** Infer set from pack name (TMT), explicit field, or snapshot pillar ids. */
export function resolvePackPillarSet(input?: {
  pillarSet?: string | null;
  name?: string | null;
  packName?: string | null;
  pillarIds?: string[] | null;
}): PackPillarSet {
  const name = (input?.name ?? input?.packName ?? "").trim();
  // Name wins so existing “TMT …” packs work before/without a DB pillarSet flip.
  if (/\btmt\b/i.test(name)) return "tmt_6";

  if (isPackPillarSet(input?.pillarSet)) return input.pillarSet;

  const ids = input?.pillarIds?.filter(Boolean) ?? [];
  if (ids.length > 0) {
    const hasTmt = ids.some((id) => TMT_BY_ID.has(id));
    const hasStandardOnly = ids.some((id) => STANDARD_BY_ID.has(id) && !TMT_BY_ID.has(id));
    if (hasTmt && !hasStandardOnly) return "tmt_6";
  }

  return "standard_11";
}

export function inferPackPillarSetFromName(name: string): PackPillarSet {
  return /\btmt\b/i.test(name.trim()) ? "tmt_6" : "standard_11";
}

export function findPackPillar(
  pillarId: string,
  pillarSet?: PackPillarSet
): RiskPillarDef | undefined {
  if (pillarSet) {
    return getPackPillarCatalog(pillarSet).find((pillar) => pillar.id === pillarId);
  }
  return ALL_BY_ID.get(pillarId);
}

export function isPackPillarId(pillarId: string, pillarSet: PackPillarSet = "standard_11"): boolean {
  return getPackPillarCatalog(pillarSet).some((pillar) => pillar.id === pillarId);
}

export function resolvePackPillarIdForSet(
  raw: string,
  pillarSet: PackPillarSet = "standard_11"
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const catalog = getPackPillarCatalog(pillarSet);
  const byId = new Map(catalog.map((pillar) => [pillar.id, pillar]));
  if (byId.has(trimmed)) return trimmed;

  const normalized = normalizePillarToken(trimmed);
  const hyphenated = normalized.replace(/\s+/g, "-");

  // Exact id after normalizing underscores/spaces (technology_risk → technology-risk)
  if (byId.has(hyphenated)) return hyphenated;

  const byLabel = new Map(
    catalog.map((pillar) => [normalizePillarToken(pillar.label), pillar])
  );
  const fromLabel = byLabel.get(normalized);
  if (fromLabel) return fromLabel.id;

  if (pillarSet === "tmt_6") {
    const alias =
      TMT_ALIASES[normalized] ??
      TMT_ALIASES[hyphenated] ??
      TMT_ALIASES[`${normalized} risk`] ??
      TMT_ALIASES[normalized.replace(/-risk$/, "").replace(/\s+risk$/, "")];
    if (alias && byId.has(alias)) return alias;

    // technology → technology-risk when the short stem matches a TMT id prefix
    const withRisk = hyphenated.endsWith("-risk") ? hyphenated : `${hyphenated}-risk`;
    if (byId.has(withRisk)) return withRisk;

    // Remap legacy standard-11 ids and labels onto TMT pillars.
    const standardId = resolvePackPillarIdForSet(trimmed, "standard_11");
    if (standardId) {
      const mapped = STANDARD_TO_TMT[standardId];
      if (mapped && byId.has(mapped)) return mapped;
    }
  }

  return null;
}

/** Label lookup across both catalogs (for hydrated snapshots). */
export function packPillarLabelAny(pillarId: string): string {
  return ALL_BY_ID.get(pillarId)?.label ?? pillarId;
}

export function packCriticalityAny(pillarId: string): "critical" | "high" | "medium" {
  return ALL_BY_ID.get(pillarId)?.criticality ?? "medium";
}

export function packPillarDescriptionAny(pillarId: string): string | undefined {
  return ALL_BY_ID.get(pillarId)?.description;
}
