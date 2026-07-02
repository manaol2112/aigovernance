import { callOpenAIJson } from "@/lib/openai-client";
import { normalizeFindingItems } from "@/lib/capture-finding-format";
import type {
  ControlReviewReportData,
  DisplayFindings,
  PriorityRiskSummary,
  ReviewedControlRecord,
  RoadmapStep,
} from "@/lib/control-review-reports";
import {
  applyCachedNarratives,
  buildDepartmentCacheFromEnrichment,
  loadReportNarrativeCache,
  planNarrativeCacheRefresh,
  saveReportNarrativeCache,
  type ControlNarrativeCacheEntry,
  type ExecutiveNarrativeCache,
} from "@/lib/report-narrative-cache";
import { applyFormalVoiceToReport, formalizeReportProse } from "@/lib/report-formal-voice";

export type { DisplayFindings, PriorityRiskSummary } from "@/lib/control-review-reports";

type NarrativeEnrichment = {
  headline: string;
  narrative: string;
  topGaps: PriorityRiskSummary[];
  boardActions: string[];
  displayFindingsByCode: Map<string, DisplayFindings>;
  roadmapActionsByCode: Map<string, string>;
  source: "ai" | "deterministic";
};

const SECTION_PREFIX =
  /^(?:gap|in place|in-place|recommendation|basis|finding|status|what(?:'s| is) in place)\s*:\s*/i;

const INSUFFICIENT_EVIDENCE =
  /insufficient (?:workshop )?evidence|not (?:explicitly )?(?:confirmed|documented|evidenced)|no evidence (?:that|of|in)/i;

export function stripReportCitations(text: string): string {
  return text.replace(/\[\{\d+\}\]/g, "").trim();
}

/** Remove analyst section labels and normalize whitespace for reporting. */
export function cleanFindingText(text: string): string {
  const lines = stripReportCitations(text)
    .split(/\n+/)
    .map((line) => line.replace(SECTION_PREFIX, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return "";
  return normalizeFindingItems(lines).join(" ");
}

function sentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function ensurePeriod(text: string): string {
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function isInsufficientEvidence(text: string): boolean {
  return INSUFFICIENT_EVIDENCE.test(text);
}

function buildDeterministicDisplayFindings(
  control: ReviewedControlRecord,
  clientName: string
): DisplayFindings {
  const inPlace = formalizeReportProse(cleanFindingText(control.inPlaceFindings), clientName);
  const gap = formalizeReportProse(cleanFindingText(control.gapFindings), clientName);
  const recommendation = formalizeReportProse(cleanFindingText(control.recommendations), clientName);

  return {
    inPlace: inPlace || "No in-place practices were confirmed in signed-off workshop findings.",
    gap:
      gap ||
      (isInsufficientEvidence(control.gapFindings)
        ? `Workshop evidence did not confirm whether ${control.controlTitle.toLowerCase()} requirements are met.`
        : `A material gap was identified for ${control.controlTitle.toLowerCase()}.`),
    recommendation:
      recommendation ||
      "Schedule a focused review or obtain additional evidence before finalizing remediation planning.",
  };
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
}

/** Reject AI prose that introduces concepts not present in signed-off source text. */
function isSummaryGrounded(summary: string, sources: string[]): boolean {
  const sourceBlob = sources.join(" ").toLowerCase();
  const tokens = significantTokens(summary);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => sourceBlob.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}

function buildDeterministicPriorityRisk(
  control: ReviewedControlRecord,
  clientName: string
): PriorityRiskSummary {
  const gap = formalizeReportProse(cleanFindingText(control.gapFindings), clientName);

  let summary: string;
  if (!gap || isInsufficientEvidence(gap)) {
    summary = `${clientName} has not demonstrated ${control.controlTitle.toLowerCase()} through workshop evidence reviewed and signed off by assessors.`;
  } else {
    summary = gap;
    if (!summary.toLowerCase().includes(control.controlTitle.toLowerCase().slice(0, 12))) {
      summary = `${control.controlTitle}: ${sentenceCase(summary)}`;
    } else {
      summary = ensurePeriod(sentenceCase(summary));
    }
  }

  return {
    controlCode: control.controlCode,
    controlTitle: control.controlTitle,
    pillarLabel: control.pillarLabel,
    summary: ensurePeriod(summary),
    businessImpact: recommendationImpact(control, clientName),
  };
}

function recommendationImpact(
  control: ReviewedControlRecord,
  clientName: string
): string | undefined {
  const rec = formalizeReportProse(cleanFindingText(control.recommendations), clientName);
  if (!rec || isInsufficientEvidence(rec)) return undefined;
  return ensurePeriod(sentenceCase(rec.split(/[.!?]/)[0] ?? rec));
}

function buildDeterministicBoardActions(
  controls: ReviewedControlRecord[],
  clientName: string,
  limit = 5
): string[] {
  const seen = new Set<string>();
  const actions: string[] = [];

  for (const control of controls) {
    const rec = formalizeReportProse(cleanFindingText(control.recommendations), clientName);
    if (!rec || isInsufficientEvidence(rec)) continue;
    const line = ensurePeriod(sentenceCase(rec.split(/[.!?]/)[0] ?? rec));
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push(line);
    if (actions.length >= limit) break;
  }

  if (actions.length > 0) return actions;

  return [
    "Direct management to close material control gaps identified in the signed-off assessment.",
    "Approve a remediation roadmap with accountable owners and target dates.",
    "Establish quarterly AI governance reporting to leadership.",
  ];
}

function buildDeterministicEnrichment(report: ControlReviewReportData): NarrativeEnrichment {
  const clientName = report.clientName;
  const gapControls = report.reviewedControls.filter((c) => c.complianceStatus === "gap");
  const priorityControls = gapControls.slice(0, 5);

  const displayFindingsByCode = new Map<string, DisplayFindings>();
  for (const control of report.reviewedControls) {
    displayFindingsByCode.set(
      control.controlCode,
      buildDeterministicDisplayFindings(control, clientName)
    );
  }

  const roadmapActionsByCode = new Map<string, string>();
  for (const step of report.roadmap) {
    const control = report.reviewedControls.find((c) => c.controlCode === step.controlCode);
    const rec = control
      ? formalizeReportProse(cleanFindingText(control.recommendations), clientName)
      : formalizeReportProse(cleanFindingText(step.action), clientName);
    roadmapActionsByCode.set(
      step.controlCode,
      rec ? ensurePeriod(sentenceCase(rec)) : ensurePeriod(sentenceCase(step.action))
    );
  }

  const topGaps =
    priorityControls.length > 0
      ? priorityControls.map((control) => buildDeterministicPriorityRisk(control, clientName))
      : report.executiveSummary.topGaps.map((g) => {
          const control = report.reviewedControls.find((c) => c.controlCode === g.controlCode);
          return control
            ? buildDeterministicPriorityRisk(control, clientName)
            : {
                controlCode: g.controlCode,
                controlTitle: g.controlCode,
                pillarLabel: g.pillarLabel,
                summary: ensurePeriod(
                  formalizeReportProse(cleanFindingText(g.summary), clientName)
                ),
              };
        });

  const headline = report.reviewStats.reportingReady
    ? `${report.clientName} AI governance assessment complete — ${report.executiveSummary.gapControls} material gap${report.executiveSummary.gapControls === 1 ? "" : "s"} require board attention`
    : `${report.clientName} AI governance review in progress — ${report.reviewStats.pendingReview} control${report.reviewStats.pendingReview === 1 ? "" : "s"} pending sign-off`;

  const narrative = report.reviewStats.reportingReady
    ? `Assessors have signed off on all ${report.reviewStats.total} in-scope controls. ${report.executiveSummary.alignedControls} control${report.executiveSummary.alignedControls === 1 ? " is" : "s are"} aligned with requirements, while ${report.executiveSummary.gapControls} present material gaps and ${report.executiveSummary.partialControls} show partial coverage across ${report.executiveSummary.pillarsAtRisk} risk pillar${report.executiveSummary.pillarsAtRisk === 1 ? "" : "s"}.`
    : report.executiveSummary.narrative;

  return {
    headline,
    narrative,
    topGaps,
    boardActions: buildDeterministicBoardActions(
      gapControls.length ? gapControls : report.reviewedControls,
      clientName
    ),
    displayFindingsByCode,
    roadmapActionsByCode,
    source: "deterministic",
  };
}

type AiNarrativeResponse = {
  headline: string;
  narrative: string;
  priorityRisks: Array<{
    controlCode: string;
    summary: string;
  }>;
  boardActions: string[];
  roadmapActions: Array<{ controlCode: string; action: string }>;
  polishedFindings: Array<{
    controlCode: string;
    inPlace: string;
    gap: string;
    recommendation: string;
  }>;
};

const REPORT_NARRATIVE_SYSTEM = `You are an enterprise AI governance report writer preparing board-ready deliverables.

STRICT GROUNDING RULES (non-negotiable):
1. Use ONLY facts explicitly stated in the provided reviewer-signed control findings. These findings were human-attested.
2. Do NOT invent policies, systems, tools, timelines, budgets, owners, or remediation steps not present in the source material.
3. Do NOT assume root causes, maturity levels, or compliance outcomes beyond what findings state.
4. If a finding indicates insufficient or unconfirmed evidence, preserve that uncertainty — write "workshop evidence did not confirm…" rather than asserting a specific failure mode.
5. Remove internal analyst labels (Gap:, Basis:, In place:, Recommendation:) and citation markers from prose.
6. Write in clear, authoritative language suitable for board and executive audiences. Avoid jargon where possible.
7. Each priority risk summary must be 1–2 sentences and traceable to the provided gap findings.
8. Board actions must be derived ONLY from provided recommendations — do not add generic governance platitudes unless no recommendations exist.
9. Do NOT include a separate businessImpact field — only rewrite the provided gap findings.
10. Do not introduce new concepts (e.g., "bias", "regulatory fines", "reputational harm") unless those exact concepts appear in the source findings.
11. FORMAL VOICE: Write in third-party advisory tone for board distribution. Never use first-person pronouns (we, our, us, I, my) or personal pronouns (he, she, his, her, they, their). Refer to the client using the provided clientName (e.g., "[Client Name] does not…", "[Client Name]'s policy…"). Use "the organization" only if clientName is empty.

Return valid JSON with this exact shape:
{
  "headline": "one-line executive headline",
  "narrative": "2-4 sentence executive summary",
  "priorityRisks": [{ "controlCode": "...", "summary": "..." }],
  "boardActions": ["..."],
  "roadmapActions": [{ "controlCode": "...", "action": "..." }],
  "polishedFindings": [{ "controlCode": "...", "inPlace": "...", "gap": "...", "recommendation": "..." }]
}`;

async function buildAiEnrichment(
  report: ControlReviewReportData,
  options: {
    controlsToPolish: ReviewedControlRecord[];
    refreshExecutive: boolean;
    cachedControls: Map<string, ControlNarrativeCacheEntry>;
    cachedExecutive?: ExecutiveNarrativeCache;
  }
): Promise<NarrativeEnrichment | null> {
  if (options.controlsToPolish.length === 0 && !options.refreshExecutive) {
    return null;
  }

  const payload = {
    clientName: report.clientName,
    assessmentName: report.assessmentName,
    reviewStats: report.reviewStats,
    metrics: {
      aligned: report.executiveSummary.alignedControls,
      gaps: report.executiveSummary.gapControls,
      partial: report.executiveSummary.partialControls,
      pillarsAtRisk: report.executiveSummary.pillarsAtRisk,
    },
    refreshExecutive: options.refreshExecutive,
    controlsToPolish: options.controlsToPolish.map((c) => ({
      controlCode: c.controlCode,
      controlTitle: c.controlTitle,
      pillarLabel: c.pillarLabel,
      complianceStatus: c.complianceStatus,
      inPlaceFindings: cleanFindingText(c.inPlaceFindings),
      gapFindings: cleanFindingText(c.gapFindings),
      recommendations: cleanFindingText(c.recommendations),
      confirmedBy: c.confirmedBy,
    })),
    priorityControls: report.reviewedControls
      .filter((c) => c.complianceStatus === "gap")
      .slice(0, 8)
      .map((c) => ({
        controlCode: c.controlCode,
        controlTitle: c.controlTitle,
        pillarLabel: c.pillarLabel,
        complianceStatus: c.complianceStatus,
        inPlaceFindings: cleanFindingText(c.inPlaceFindings),
        gapFindings: cleanFindingText(c.gapFindings),
        recommendations: cleanFindingText(c.recommendations),
        confirmedBy: c.confirmedBy,
      })),
    roadmapControls: options.controlsToPolish
      .map((c) => report.roadmap.find((r) => r.controlCode === c.controlCode))
      .filter((r): r is RoadmapStep => !!r)
      .map((r) => ({
        controlCode: r.controlCode,
        controlTitle: r.controlTitle,
        phase: r.phase,
        rawAction: cleanFindingText(r.action),
      })),
  };

  const result = await callOpenAIJson<AiNarrativeResponse>({
    system: `${REPORT_NARRATIVE_SYSTEM}

When refreshExecutive is false, omit headline, narrative, priorityRisks, and boardActions from your JSON response.
Only include polishedFindings and roadmapActions for controls listed in controlsToPolish.`,
    user: JSON.stringify(payload, null, 2),
    temperature: 0.1,
    maxTokens: 8000,
  });

  if (!result.ok) {
    console.warn("[report-narrative] AI enrichment unavailable:", result.error);
    return null;
  }

  const clientName = report.clientName;
  const data = result.data;
  const controlByCode = new Map(report.reviewedControls.map((c) => [c.controlCode, c]));
  const polishCodes = new Set(options.controlsToPolish.map((c) => c.controlCode));

  const displayFindingsByCode = new Map<string, DisplayFindings>();
  for (const [code, cached] of options.cachedControls) {
    displayFindingsByCode.set(code, cached.displayFindings);
  }

  for (const item of data.polishedFindings ?? []) {
    if (!polishCodes.has(item.controlCode)) continue;
    const control = controlByCode.get(item.controlCode);
    if (!control) continue;
    const sources = [
      cleanFindingText(control.inPlaceFindings),
      cleanFindingText(control.gapFindings),
      cleanFindingText(control.recommendations),
    ];
    const polished: DisplayFindings = {
      inPlace: ensurePeriod(sentenceCase(item.inPlace ?? "")),
      gap: ensurePeriod(sentenceCase(item.gap ?? "")),
      recommendation: ensurePeriod(sentenceCase(item.recommendation ?? "")),
    };
    const grounded =
      isSummaryGrounded(polished.gap, [sources[1]]) &&
      isSummaryGrounded(polished.inPlace, [sources[0]]) &&
      isSummaryGrounded(polished.recommendation, [sources[2]]);
    displayFindingsByCode.set(
      item.controlCode,
      grounded ? polished : buildDeterministicDisplayFindings(control, clientName)
    );
  }
  for (const control of options.controlsToPolish) {
    if (!displayFindingsByCode.has(control.controlCode)) {
      displayFindingsByCode.set(
        control.controlCode,
        buildDeterministicDisplayFindings(control, clientName)
      );
    }
  }

  const roadmapActionsByCode = new Map<string, string>();
  for (const [code, cached] of options.cachedControls) {
    roadmapActionsByCode.set(code, cached.roadmapAction);
  }
  for (const item of data.roadmapActions ?? []) {
    if (!polishCodes.has(item.controlCode) || !controlByCode.has(item.controlCode)) continue;
    roadmapActionsByCode.set(item.controlCode, ensurePeriod(sentenceCase(item.action)));
  }
  for (const control of options.controlsToPolish) {
    if (roadmapActionsByCode.has(control.controlCode)) continue;
    const step = report.roadmap.find((r) => r.controlCode === control.controlCode);
    const fallback = formalizeReportProse(
      cleanFindingText(control.recommendations) || cleanFindingText(step?.action ?? ""),
      clientName
    );
    roadmapActionsByCode.set(
      control.controlCode,
      fallback ? ensurePeriod(sentenceCase(fallback)) : ensurePeriod(sentenceCase(step?.action ?? ""))
    );
  }

  const fallback = buildDeterministicEnrichment(report);

  let headline = options.cachedExecutive?.headline ?? fallback.headline;
  let narrative = options.cachedExecutive?.narrative ?? fallback.narrative;
  let topGaps = options.cachedExecutive?.topGaps ?? fallback.topGaps;
  let boardActions = options.cachedExecutive?.boardActions ?? fallback.boardActions;

  if (options.refreshExecutive) {
    const topGapsFromAi: PriorityRiskSummary[] = (data.priorityRisks ?? [])
      .filter((r) => controlByCode.has(r.controlCode))
      .slice(0, 5)
      .map((r) => {
        const control = controlByCode.get(r.controlCode)!;
        const sources = [
          cleanFindingText(control.gapFindings),
          cleanFindingText(control.inPlaceFindings),
          cleanFindingText(control.recommendations),
        ];
        const polishedSummary = ensurePeriod(sentenceCase(r.summary));
        if (!isSummaryGrounded(polishedSummary, sources)) {
          return buildDeterministicPriorityRisk(control, clientName);
        }
        return {
          controlCode: r.controlCode,
          controlTitle: control.controlTitle,
          pillarLabel: control.pillarLabel,
          summary: formalizeReportProse(polishedSummary, clientName),
          businessImpact: recommendationImpact(control, clientName),
        };
      });

    const allRecommendations = report.reviewedControls
      .map((c) => cleanFindingText(c.recommendations))
      .filter(Boolean);

    const validatedBoardActions = (data.boardActions ?? [])
      .filter(Boolean)
      .map((a) => ensurePeriod(sentenceCase(a)))
      .filter((a) => isSummaryGrounded(a, allRecommendations))
      .slice(0, 6);

    headline = data.headline?.trim() || fallback.headline;
    narrative = data.narrative?.trim() || fallback.narrative;
    topGaps = topGapsFromAi.length > 0 ? topGapsFromAi : fallback.topGaps;
    boardActions =
      validatedBoardActions.length > 0 ? validatedBoardActions : fallback.boardActions;
  }

  return {
    headline,
    narrative,
    topGaps,
    boardActions,
    displayFindingsByCode,
    roadmapActionsByCode,
    source: "ai",
  };
}

function buildPartialDeterministicEnrichment(
  report: ControlReviewReportData,
  controlsToPolish: ReviewedControlRecord[],
  options: {
    cachedControls: Map<string, ControlNarrativeCacheEntry>;
    refreshExecutive: boolean;
    cachedExecutive?: ExecutiveNarrativeCache;
  }
): NarrativeEnrichment {
  const fullFallback = buildDeterministicEnrichment(report);
  const displayFindingsByCode = new Map<string, DisplayFindings>();
  const roadmapActionsByCode = new Map<string, string>();

  for (const [code, cached] of options.cachedControls) {
    displayFindingsByCode.set(code, cached.displayFindings);
    roadmapActionsByCode.set(code, cached.roadmapAction);
  }

  for (const control of controlsToPolish) {
    const display = buildDeterministicDisplayFindings(control, report.clientName);
    displayFindingsByCode.set(control.controlCode, display);
    const step = report.roadmap.find((r) => r.controlCode === control.controlCode);
    const action = formalizeReportProse(
      cleanFindingText(control.recommendations) || cleanFindingText(step?.action ?? ""),
      report.clientName
    );
    roadmapActionsByCode.set(
      control.controlCode,
      action ? ensurePeriod(sentenceCase(action)) : ensurePeriod(sentenceCase(step?.action ?? ""))
    );
  }

  return {
    headline: options.refreshExecutive
      ? fullFallback.headline
      : (options.cachedExecutive?.headline ?? fullFallback.headline),
    narrative: options.refreshExecutive
      ? fullFallback.narrative
      : (options.cachedExecutive?.narrative ?? fullFallback.narrative),
    topGaps: options.refreshExecutive
      ? fullFallback.topGaps
      : (options.cachedExecutive?.topGaps ?? fullFallback.topGaps),
    boardActions: options.refreshExecutive
      ? fullFallback.boardActions
      : (options.cachedExecutive?.boardActions ?? fullFallback.boardActions),
    displayFindingsByCode,
    roadmapActionsByCode,
    source: "deterministic",
  };
}

export function getDisplayFindings(
  control: ReviewedControlRecord,
  clientName = ""
): DisplayFindings {
  if (control.displayFindings) return control.displayFindings;
  return buildDeterministicDisplayFindings(control, clientName);
}

export function getRoadmapAction(step: RoadmapStep, report: ControlReviewReportData): string {
  const control = report.reviewedControls.find((c) => c.controlCode === step.controlCode);
  if (control?.displayFindings?.recommendation) {
    return control.displayFindings.recommendation;
  }
  return ensurePeriod(
    sentenceCase(formalizeReportProse(cleanFindingText(step.action), report.clientName))
  );
}

export async function enrichReportNarratives(
  assessmentId: string,
  department: string | null | undefined,
  report: ControlReviewReportData,
  options?: { forceRefresh?: boolean }
): Promise<ControlReviewReportData> {
  if (report.reviewedControls.length === 0) {
    return {
      ...report,
      executiveSummary: {
        ...report.executiveSummary,
        boardActions: [],
        narrativesSource: "none",
      },
    };
  }

  const existingCache = options?.forceRefresh
    ? { controls: {} }
    : await loadReportNarrativeCache(assessmentId, department);
  const plan = planNarrativeCacheRefresh(report, existingCache);

  if (plan.isFullyCached && !options?.forceRefresh) {
    return applyFormalVoiceToReport(applyCachedNarratives(report, existingCache));
  }

  const enrichment =
    (await buildAiEnrichment(report, {
      controlsToPolish: plan.controlsNeedingPolish,
      refreshExecutive: plan.refreshExecutive,
      cachedControls: plan.cachedControls,
      cachedExecutive: plan.cachedExecutive,
    })) ??
    buildPartialDeterministicEnrichment(report, plan.controlsNeedingPolish, {
      cachedControls: plan.cachedControls,
      refreshExecutive: plan.refreshExecutive,
      cachedExecutive: plan.cachedExecutive,
    });

  const departmentCache = buildDepartmentCacheFromEnrichment(report, existingCache, enrichment);
  await saveReportNarrativeCache(assessmentId, department, departmentCache);

  const reviewedControls = report.reviewedControls.map((control) => ({
    ...control,
    displayFindings: enrichment.displayFindingsByCode.get(control.controlCode),
  }));

  const roadmap = report.roadmap.map((step) => ({
    ...step,
    action: enrichment.roadmapActionsByCode.get(step.controlCode) ?? step.action,
  }));

  return applyFormalVoiceToReport({
    ...report,
    reviewedControls,
    roadmap,
    executiveSummary: {
      ...report.executiveSummary,
      headline: enrichment.headline,
      narrative: enrichment.narrative,
      topGaps: enrichment.topGaps,
      boardActions: enrichment.boardActions,
      narrativesSource: enrichment.source,
    },
  });
}
