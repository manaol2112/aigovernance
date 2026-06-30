import type { ExpectedEvidenceItem } from "@/lib/sub-pillar-workshop-questions";

export type CriticalEvidenceProbe = {
  evidenceType: string;
  description: string;
  probe: string;
  /** Why this evidence is must-have for framework defensibility. */
  rationale: string;
};

const CRITICAL_EVIDENCE_PATTERNS: Array<{ pattern: RegExp; rationale: string }> = [
  { pattern: /policy document|approved.*policy|governance policy/i, rationale: "Framework obligations require documented, approved policies." },
  { pattern: /approval|sign-off|signed|executive approval|board/i, rationale: "Auditors expect named approval authority for AI governance decisions." },
  { pattern: /risk assessment|impact assessment|dpia|fundamental rights/i, rationale: "High-risk and privacy requirements mandate formal assessments before deployment." },
  { pattern: /audit|internal audit|management review|conformity assessment/i, rationale: "ISO 42001 and EU AI Act expect demonstrable audit and review records." },
  { pattern: /validation|verification|test report|testing results|v&v/i, rationale: "Lifecycle safety and EU AI Act Article 15 require documented testing." },
  { pattern: /technical documentation|system documentation|model card|instructions for use/i, rationale: "Provider/deployer duties require maintained technical documentation." },
  { pattern: /raci|roles|responsibilit|accountability matrix/i, rationale: "ISO 42001 clause 5.3 requires defined roles and authorities." },
  { pattern: /training record|competency|proficiency|certification/i, rationale: "Personnel competence must be evidenced, not assumed." },
  { pattern: /register|inventory|record of processing|logging|audit trail/i, rationale: "Traceability and registration obligations need retrievable records." },
  { pattern: /incident report|corrective action|remediation plan/i, rationale: "Incident and corrective-action records prove operational control." },
  { pattern: /contract|vendor due diligence|third.party|supplier assessment/i, rationale: "Third-party AI risk requires documented supplier due diligence." },
  { pattern: /conformity|certificate|declaration|registration/i, rationale: "Regulatory conformity must be evidenced for high-risk systems." },
];

const SUPPORTING_ONLY_PATTERNS = [
  /^communication record$/i,
  /^meeting notes$/i,
  /^email thread$/i,
  /^screenshot$/i,
];

function truncate(text: string, max = 100): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function scoreEvidenceCriticality(item: ExpectedEvidenceItem): number {
  const text = `${item.evidenceType} ${item.description}`;
  if (SUPPORTING_ONLY_PATTERNS.some((p) => p.test(item.evidenceType.trim()))) return 0;

  let score = 0;
  for (const { pattern } of CRITICAL_EVIDENCE_PATTERNS) {
    if (pattern.test(text)) score += 2;
  }
  if (/policy|approval|assessment|audit|documentation|register|training/i.test(item.evidenceType)) {
    score += 1;
  }
  return score;
}

export function isCriticalEvidence(item: ExpectedEvidenceItem): boolean {
  return scoreEvidenceCriticality(item) >= 2;
}

export function pickCriticalEvidence(
  items: ExpectedEvidenceItem[],
  maxItems = 4
): ExpectedEvidenceItem[] {
  const seen = new Set<string>();
  const ranked = [...items]
    .map((item) => ({ item, score: scoreEvidenceCriticality(item) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score);

  const picked: ExpectedEvidenceItem[] = [];
  for (const { item } of ranked) {
    const key = item.evidenceType.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(item);
    if (picked.length >= maxItems) break;
  }

  if (picked.length === 0) {
    for (const item of items) {
      const key = item.evidenceType.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(item);
      if (picked.length >= Math.min(2, maxItems)) break;
    }
  }

  return picked;
}

function rationaleFor(item: ExpectedEvidenceItem): string {
  const text = `${item.evidenceType} ${item.description}`;
  for (const { pattern, rationale } of CRITICAL_EVIDENCE_PATTERNS) {
    if (pattern.test(text)) return rationale;
  }
  return "Required to demonstrate compliance with in-scope framework obligations.";
}

export function buildEvidenceProbe(item: ExpectedEvidenceItem): CriticalEvidenceProbe {
  const desc = truncate(item.description);
  const method = item.collectionMethod ? ` (${item.collectionMethod})` : "";

  return {
    evidenceType: item.evidenceType.trim(),
    description: desc,
    probe: `Do you currently have ${item.evidenceType.trim()}${method}? Specifically: "${desc}" — where is it stored, who owns it, and when was it last updated?`,
    rationale: rationaleFor(item),
  };
}

export function buildCriticalEvidenceProbes(
  items: ExpectedEvidenceItem[],
  maxItems = 4
): CriticalEvidenceProbe[] {
  return pickCriticalEvidence(items, maxItems).map(buildEvidenceProbe);
}

/** Deduplicate evidence probes by type (for pillar-level aggregation). */
export function dedupeCriticalEvidenceProbes(probes: CriticalEvidenceProbe[]): CriticalEvidenceProbe[] {
  const seen = new Set<string>();
  const result: CriticalEvidenceProbe[] = [];
  for (const probe of probes) {
    const key = probe.evidenceType.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(probe);
  }
  return result.sort((a, b) => a.evidenceType.localeCompare(b.evidenceType));
}

export function countSupportingEvidence(
  items: ExpectedEvidenceItem[],
  critical: ExpectedEvidenceItem[]
): number {
  const criticalKeys = new Set(critical.map((c) => c.evidenceType.trim().toLowerCase()));
  const types = new Set<string>();
  for (const item of items) {
    const key = item.evidenceType.trim().toLowerCase();
    if (!criticalKeys.has(key)) types.add(key);
  }
  return types.size;
}
