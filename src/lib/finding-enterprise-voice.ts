import { callOpenAIJson } from "@/lib/openai-client";
import { coerceFindingItems } from "@/lib/capture-finding-format";
import { formalizeReportProse } from "@/lib/report-formal-voice";

export type FindingSection = "in_place" | "gap" | "recommendation";

export type FindingPolishContext = {
  controlCode?: string;
  controlTitle?: string;
  clientName?: string;
};

const VAGUE_PATTERNS = [
  /\bgood (ai )?governance\b/i,
  /\bcould be better\b/i,
  /\bneeds? improvement\b/i,
  /\bshould improve\b/i,
  /\bfollow industry best practices?\b/i,
  /\bimprove (ai )?governance maturity\b/i,
  /\bdocumentation could be better\b/i,
  /\bthe company has\b/i,
  /\bthey (have|lack|need)\b/i,
];

const FILLER_OPENERS =
  /^(?:it is (?:important|worth) to note that|overall|in conclusion|as mentioned above|note that)\s*,?\s*/i;

function stripCitationMarkers(text: string): string {
  return text.replace(/\[\{\d+\}\]/g, "").trim();
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function hasEnterpriseStructure(item: string, section: FindingSection): boolean {
  const text = stripCitationMarkers(item);
  if (section === "in_place") {
    return /^observed practice:/i.test(text) && /evidence:/i.test(text) && text.length >= 80;
  }
  if (section === "gap") {
    return /^gap:/i.test(text) && /basis:/i.test(text) && text.length >= 80;
  }
  return /^recommendation:/i.test(text) && /rationale:/i.test(text) && text.length >= 80;
}

function joinLabelParts(prefix: string, body: string, suffixLabel: string, suffix: string): string {
  const main = body.trim();
  const tail = suffix.trim();
  if (!main) return tail ? `${suffixLabel} ${tail}` : "";
  if (!tail) return main.startsWith(prefix) ? main : `${prefix} ${main}`;
  if (main.startsWith(prefix)) {
    return main.toLowerCase().includes(suffixLabel.toLowerCase()) ? main : `${main} ${suffixLabel} ${tail}`;
  }
  return `${prefix} ${main}. ${suffixLabel} ${tail}`;
}

function requirementLabel(ctx: FindingPolishContext): string {
  if (ctx.controlTitle && ctx.controlCode) {
    return `${ctx.controlTitle} (${ctx.controlCode})`;
  }
  if (ctx.controlTitle) return ctx.controlTitle;
  if (ctx.controlCode) return `control ${ctx.controlCode}`;
  return "the scoped control requirement";
}

function ensureInPlaceTemplate(text: string, ctx: FindingPolishContext): string {
  const cleaned = stripCitationMarkers(text).replace(FILLER_OPENERS, "").trim();
  if (!cleaned) return "";

  const evidenceSplit = cleaned.match(/^(.*?)(?:\.?\s*Evidence:\s*)([\s\S]+)$/i);
  if (evidenceSplit) {
    const practice = evidenceSplit[1]!.replace(/^observed practice:\s*/i, "").trim();
    return joinLabelParts("Observed practice:", practice, "Evidence:", evidenceSplit[2]!.trim());
  }

  const inPlaceSplit = cleaned.match(/^(?:in[- ]place|what(?:'s| is) in place):\s*(.+)$/i);
  if (inPlaceSplit) {
    return joinLabelParts(
      "Observed practice:",
      `Workshop evidence supports elements of ${requirementLabel(ctx)}.`,
      "Evidence:",
      inPlaceSplit[1]!.trim()
    );
  }

  if (/^observed practice:/i.test(cleaned)) {
    const body = cleaned.replace(/^observed practice:\s*/i, "").trim();
    if (/evidence:/i.test(body)) {
      return joinLabelParts("Observed practice:", body.split(/evidence:/i)[0]!.trim(), "Evidence:", body.split(/evidence:/i)[1]!.trim());
    }
    return joinLabelParts("Observed practice:", body, "Evidence:", "Supporting detail is documented in the cited workshop source.");
  }

  return joinLabelParts(
    "Observed practice:",
    `Workshop materials describe practices related to ${requirementLabel(ctx)}.`,
    "Evidence:",
    cleaned
  );
}

function ensureGapTemplate(text: string, ctx: FindingPolishContext): string {
  const cleaned = stripCitationMarkers(text).replace(FILLER_OPENERS, "").trim();
  if (!cleaned) return "";

  const basisSplit = cleaned.match(/^(.*?)(?:\.?\s*Basis:\s*)([\s\S]+)$/i);
  if (basisSplit) {
    const gap = basisSplit[1]!.replace(/^gap:\s*/i, "").trim();
    return joinLabelParts("Gap:", gap, "Basis:", basisSplit[2]!.trim());
  }

  const gapOnly = cleaned.match(/^gap:\s*(.+)$/i);
  if (gapOnly) {
    return joinLabelParts("Gap:", gapOnly[1]!.trim(), "Basis:", "Workshop sources do not establish full alignment with the control requirement.");
  }

  if (/not addressed|not covered|no gap was inferred/i.test(cleaned)) {
    return cleaned.startsWith("Gap:") ? cleaned : `Gap: ${cleaned}`;
  }

  return joinLabelParts(
    "Gap:",
    `Material elements of ${requirementLabel(ctx)} are not fully evidenced in workshop materials.`,
    "Basis:",
    cleaned
  );
}

function ensureRecommendationTemplate(text: string, ctx: FindingPolishContext): string {
  const cleaned = stripCitationMarkers(text)
    .replace(/^\d+\.\s*/, "")
    .replace(FILLER_OPENERS, "")
    .trim();
  if (!cleaned) return "";

  const rationaleSplit = cleaned.match(/^(.*?)(?:\.?\s*Rationale:\s*)([\s\S]+)$/i);
  if (rationaleSplit) {
    const rec = rationaleSplit[1]!.replace(/^recommendation:\s*/i, "").trim();
    return joinLabelParts("Recommendation:", rec, "Rationale:", rationaleSplit[2]!.trim());
  }

  const recOnly = cleaned.match(/^recommendation:\s*(.+)$/i);
  if (recOnly) {
    return joinLabelParts(
      "Recommendation:",
      recOnly[1]!.trim(),
      "Rationale:",
      `Addresses identified gaps against ${requirementLabel(ctx)} using workshop-evidenced remediation needs.`
    );
  }

  return joinLabelParts("Recommendation:", cleaned, "Rationale:", `Closes gaps identified for ${requirementLabel(ctx)} based on workshop evidence.`);
}

/** Apply enterprise structure and formal third-party voice to a single finding line. */
export function polishEnterpriseFindingItem(
  item: string,
  section: FindingSection,
  ctx: FindingPolishContext = {}
): string {
  let text = stripCitationMarkers(item).replace(/\s+/g, " ").trim();
  if (!text) return "";

  text = formalizeReportProse(text, ctx.clientName ?? "The organization");

  if (section === "in_place") text = ensureInPlaceTemplate(text, ctx);
  else if (section === "gap") text = ensureGapTemplate(text, ctx);
  else text = ensureRecommendationTemplate(text, ctx);

  text = capitalizeFirst(ensurePeriod(text));
  return text;
}

export function polishEnterpriseFindingItems(
  items: string[],
  section: FindingSection,
  ctx: FindingPolishContext = {}
): string[] {
  const seen = new Set<string>();
  const polished: string[] = [];

  for (const item of items) {
    const line = polishEnterpriseFindingItem(item, section, ctx);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    polished.push(line);
  }

  return polished;
}

export function needsEnterpriseRefinement(items: string[], section?: FindingSection): boolean {
  const list = items.filter(Boolean);
  if (list.length === 0) return false;

  return list.some((item) => {
    const text = stripCitationMarkers(item);
    if (text.length < 70) return true;
    if (VAGUE_PATTERNS.some((p) => p.test(text))) return true;
    if (section && !hasEnterpriseStructure(text, section)) return true;
    if (!section) {
      return (
        !hasEnterpriseStructure(text, "in_place") &&
        !hasEnterpriseStructure(text, "gap") &&
        !hasEnterpriseStructure(text, "recommendation")
      );
    }
    return false;
  });
}

export type AssessmentRowForRefine = {
  controlCode: string;
  complianceStatus?: string;
  inPlaceFindings?: unknown;
  gapFindings?: unknown;
  recommendations?: unknown;
  citations?: Array<{
    section: string;
    claimText?: string;
    factId?: string;
  }>;
};

type RefineResponse = {
  assessments?: AssessmentRowForRefine[];
};

const FINDING_ENTERPRISE_REFINE_SYSTEM = [
  "You are a senior internal audit writer upgrading AI governance control findings to enterprise assurance workbook quality.",
  "",
  "NON-NEGOTIABLE RULES:",
  "1. Use ONLY facts present in the input findings and FACT LEDGER excerpts. Never invent policies, systems, owners, dates, metrics, or commitments.",
  "2. Preserve complianceStatus for each control unless the input finding set is internally inconsistent — do not upgrade certainty.",
  "3. Preserve every factId in citations; claimText must match the refined finding string exactly.",
  "4. Do not add findings for controls not in the input. Do not remove controls that have substantive content.",
  "5. Expand thin/vague phrasing into precise audit language — but only using concepts already present in the input or ledger.",
  "6. Preserve uncertainty ('informal', 'in progress', 'not confirmed') — never upgrade to established practice.",
  "",
  "WRITING STANDARD:",
  "- Third-person advisory tone. Refer to the client as 'the organization' unless a client name is provided.",
  "- Name the specific control requirement element in each finding.",
  "- Each finding must follow its template exactly:",
  '  in_place: "Observed practice: <element + what exists>. Evidence: <workshop-supported detail>."',
  '  gap: "Gap: <element not met/weak/unverified>. Basis: <why, from sources>."',
  '  recommendation: "Recommendation: <specific action>. Rationale: <closes named gap / requirement element>."',
  "- Minimum ~25 words per finding when source material supports it.",
  "- No filler ('it is important to note', 'overall', 'best practices' without specificity).",
  "",
  "Return valid JSON only.",
].join("\n");

function buildFindingRefineUserPrompt(options: {
  pillarLabel: string;
  factLedgerJson: string;
  assessments: AssessmentRowForRefine[];
}): string {
  return [
    `Refine findings for risk pillar: ${options.pillarLabel}`,
    "",
    "--- FACT LEDGER (only additional evidence you may reference) ---",
    options.factLedgerJson.slice(0, 24_000),
    "--- END LEDGER ---",
    "",
    "--- ASSESSMENTS TO REFINE (preserve structure and factIds) ---",
    JSON.stringify({ assessments: options.assessments }, null, 0),
    "--- END ---",
    "",
    "Return JSON:",
    "{",
    '  "assessments": [{',
    '    "controlCode": "...",',
    '    "complianceStatus": "aligned"|"partial"|"gap"|"not_assessed",',
    '    "inPlaceFindings": ["Observed practice: ... Evidence: ..."],',
    '    "gapFindings": ["Gap: ... Basis: ..."],',
    '    "recommendations": ["Recommendation: ... Rationale: ..."],',
    '    "citations": [{ "section": "in_place"|"gap"|"recommendation", "claimText": "exact match", "factId": "F001" }]',
    "  }]",
    "}",
  ].join("\n");
}

function mergeRefinedCitations(
  original: AssessmentRowForRefine,
  refined: AssessmentRowForRefine
): AssessmentRowForRefine {
  if (!original.citations?.length) return refined;
  if (!refined.citations?.length) {
    return {
      ...refined,
      citations: original.citations.map((c) => {
        const section = c.section;
        const items =
          section === "in_place"
            ? coerceFindingItems(refined.inPlaceFindings)
            : section === "gap"
              ? coerceFindingItems(refined.gapFindings)
              : coerceFindingItems(refined.recommendations);
        const idx = coerceFindingItems(
          section === "in_place"
            ? original.inPlaceFindings
            : section === "gap"
              ? original.gapFindings
              : original.recommendations
        ).findIndex((o) => o === c.claimText);
        const claimText = idx >= 0 && items[idx] ? items[idx] : c.claimText;
        return { ...c, claimText };
      }),
    };
  }
  return refined;
}

/** Citation-locked LLM pass to elevate thin findings to enterprise audit voice. */
export async function refineAssessmentRowsWithAI(options: {
  assessments: AssessmentRowForRefine[];
  factLedgerJson: string;
  pillarLabel: string;
}): Promise<{ assessments: AssessmentRowForRefine[]; apiCalls: number } | null> {
  if (options.assessments.length === 0) return null;

  const needsRefine = options.assessments.some((row) => {
    const inPlace = coerceFindingItems(row.inPlaceFindings);
    const gaps = coerceFindingItems(row.gapFindings);
    const recs = coerceFindingItems(row.recommendations);
    return (
      needsEnterpriseRefinement(inPlace, "in_place") ||
      needsEnterpriseRefinement(gaps, "gap") ||
      needsEnterpriseRefinement(recs, "recommendation")
    );
  });

  if (!needsRefine) return null;

  const result = await callOpenAIJson<RefineResponse>({
    system: FINDING_ENTERPRISE_REFINE_SYSTEM,
    user: buildFindingRefineUserPrompt(options),
    temperature: 0.1,
    maxTokens: 12_000,
  });

  if (!result.ok || !result.data.assessments?.length) return null;

  const byCode = new Map(
    options.assessments.map((a) => [a.controlCode.toUpperCase(), a])
  );

  const merged = result.data.assessments.map((refined) => {
    const original = byCode.get(refined.controlCode.toUpperCase());
    if (!original) return refined;
    return mergeRefinedCitations(original, refined);
  });

  return { assessments: merged, apiCalls: 1 };
}

export function polishAssessmentRowFindings(
  row: AssessmentRowForRefine,
  ctx: FindingPolishContext = {}
): AssessmentRowForRefine {
  const polishCtx = { ...ctx, controlCode: row.controlCode };

  const inPlaceRaw = coerceFindingItems(row.inPlaceFindings);
  const gapRaw = coerceFindingItems(row.gapFindings);
  const recRaw = coerceFindingItems(row.recommendations);

  const inPlaceFindings = polishEnterpriseFindingItems(inPlaceRaw, "in_place", polishCtx);
  const gapFindings = polishEnterpriseFindingItems(gapRaw, "gap", polishCtx);
  const recommendations = polishEnterpriseFindingItems(recRaw, "recommendation", polishCtx);

  const citations = row.citations?.map((c) => {
    const originals =
      c.section === "in_place" ? inPlaceRaw : c.section === "gap" ? gapRaw : recRaw;
    const normalized =
      c.section === "in_place"
        ? inPlaceFindings
        : c.section === "gap"
          ? gapFindings
          : recommendations;
    const idx = originals.findIndex((o) => o === c.claimText);
    if (idx >= 0 && normalized[idx]) {
      return { ...c, claimText: normalized[idx] };
    }
    return c;
  });

  return {
    ...row,
    inPlaceFindings,
    gapFindings,
    recommendations,
    citations,
  };
}
