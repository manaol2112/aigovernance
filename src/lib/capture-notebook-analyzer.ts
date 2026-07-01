import { callOpenAIJson } from "@/lib/openai-client";
import {
  CAPTURE_ASSESS_SYSTEM_PROMPT,
  CAPTURE_INDEX_SYSTEM_PROMPT,
  buildCaptureAssessUserPrompt,
  buildCaptureIndexUserPrompt,
  buildPillarSupplementalIndexPrompt,
} from "@/lib/transcript-analysis-prompts";
import {
  buildTranscriptAnalysisContext,
  formatContextForPrompt,
  formatPillarIndexContext,
} from "@/lib/transcript-analysis-context";
import { getPillarControlTreeForAssessment, type PillarControlGroup } from "@/lib/pillar-control-tree";
import type { CitationDraft } from "@/lib/control-analyzer";
import { runWithConcurrency } from "@/lib/concurrency";
import {
  ensureCaptureIndex,
  formatChunksForPrompt,
  getCorpusForAnalysis,
  retrieveRelevantChunks,
} from "@/lib/capture-vector-index";
import {
  buildEvidenceTextMap,
  formatSourceCorpusForPrompt,
  toCaptureSourceDocs,
  type CaptureSourceDoc,
} from "@/lib/capture-source-corpus";
import {
  normalizeFindingItems,
  resolveCaptureSectionFallbacks,
  coerceFindingItems,
} from "@/lib/capture-finding-format";
import { formatFindingSectionWithCitations } from "@/lib/finding-citations";
import { loadControlRequirementSummaries } from "@/lib/control-requirement-context";
import type { GroundedFact, PersistedControlAssessment } from "@/lib/capture-analysis-types";
import { persistControlAssessment } from "@/lib/capture-control-persist";
import { runTargetedControlPass } from "@/lib/capture-targeted-assess";
import type { TranscriptSource } from "@/lib/transcript-processor";

export type { GroundedFact, PersistedControlAssessment } from "@/lib/capture-analysis-types";

const PILLAR_CONCURRENCY = 4;
const SUPPLEMENTAL_INDEX_CONCURRENCY = 3;
const PILLAR_CHUNK_TOP_K = 10;
const INITIAL_INDEX_TOP_K = 36;

export type NotebookAnalysisResult = {
  summary: string;
  topicsNotDiscussed: string[];
  processingWarnings: string[];
  factsIndexed: number;
  apiCalls: number;
  model: string;
  assessments: PersistedControlAssessment[];
  sourceDocs: CaptureSourceDoc[];
  vectorChunksUsed: number;
  usedVectorRetrieval: boolean;
  targetedAssessedCount: number;
};

type IndexResponse = {
  summary?: string;
  facts?: GroundedFact[];
  topicsNotDiscussed?: string[];
  processingWarnings?: string[];
};

type AssessmentCitation = {
  section: CitationDraft["section"];
  claimText: string;
  factId: string;
};

type AssessmentRow = {
  controlCode: string;
  complianceStatus?: PersistedControlAssessment["complianceStatus"];
  inPlaceFindings?: string[];
  gapFindings?: string[];
  recommendations?: string[];
  citations?: AssessmentCitation[];
};

type AssessResponse = {
  assessments?: AssessmentRow[];
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function dedupeFacts(facts: GroundedFact[]): GroundedFact[] {
  const seen = new Set<string>();
  const out: GroundedFact[] = [];
  for (const fact of facts) {
    const key = normalizeWhitespace(fact.excerpt).slice(0, 120).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(fact);
  }
  return out;
}

function mergeFacts(existing: GroundedFact[], incoming: GroundedFact[], idPrefix: string): GroundedFact[] {
  const merged = [...existing];
  const seen = new Set(
    existing.map((f) => normalizeWhitespace(f.excerpt).slice(0, 120).toLowerCase())
  );
  let counter = existing.length + 1;

  for (const fact of incoming) {
    const key = normalizeWhitespace(fact.excerpt).slice(0, 120).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({
      ...fact,
      factId: fact.factId?.trim() ? `${idPrefix}${fact.factId}` : `${idPrefix}${counter++}`,
    });
  }

  return merged;
}

function normalizeAssessmentRow(row: AssessmentRow): AssessmentRow {
  const inPlaceRaw = coerceFindingItems(row.inPlaceFindings);
  const gapRaw = coerceFindingItems(row.gapFindings);
  const recRaw = coerceFindingItems(row.recommendations);

  const inPlaceFindings = normalizeFindingItems(inPlaceRaw);
  const gapFindings = normalizeFindingItems(gapRaw);
  const recommendations = normalizeFindingItems(recRaw);

  const citations = row.citations?.map((c) => {
    const originals =
      c.section === "in_place" ? inPlaceRaw : c.section === "gap" ? gapRaw : recRaw;
    const normalizedItems =
      c.section === "in_place"
        ? inPlaceFindings
        : c.section === "gap"
          ? gapFindings
          : recommendations;
    const idx = originals.findIndex((o) => o === c.claimText);
    if (idx >= 0 && normalizedItems[idx]) {
      return { ...c, claimText: normalizedItems[idx] };
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

function buildAssessmentFromRow(
  row: AssessmentRow,
  controlId: string,
  facts: GroundedFact[],
  factById: Map<string, GroundedFact>,
  sourceById: Map<string, CaptureSourceDoc>
): PersistedControlAssessment {
  const normalized = normalizeAssessmentRow(row);
  const inPlaceItems = normalized.inPlaceFindings ?? [];
  const gapItems = normalized.gapFindings ?? [];
  const recItems = normalized.recommendations ?? [];

  const relatedFacts = facts.filter((f) =>
    f.controlCodes.some((code) => code.toUpperCase() === row.controlCode.toUpperCase())
  );

  for (const cite of normalized.citations ?? []) {
    if (!cite.factId) continue;
    const fact = factById.get(cite.factId) ?? factById.get(cite.factId.toUpperCase());
    if (fact && !relatedFacts.some((f) => f.factId === fact.factId)) {
      relatedFacts.push(fact);
    }
  }
  const hasWorkshopCoverage = relatedFacts.length > 0;

  const citations: CitationDraft[] = [];
  const counter = { value: 1 };

  const inPlace = formatFindingSectionWithCitations({
    section: "in_place",
    items: inPlaceItems,
    rawCitations: normalized.citations,
    factById,
    sourceById,
    controlFacts: relatedFacts,
    outCitations: citations,
    citationCounter: counter,
  });

  const gaps = formatFindingSectionWithCitations({
    section: "gap",
    items: gapItems,
    rawCitations: normalized.citations,
    factById,
    sourceById,
    controlFacts: relatedFacts,
    outCitations: citations,
    citationCounter: counter,
  });

  const recs = formatFindingSectionWithCitations({
    section: "recommendation",
    items: recItems,
    rawCitations: normalized.citations,
    factById,
    sourceById,
    controlFacts: relatedFacts,
    outCitations: citations,
    citationCounter: counter,
    numberRecommendations: true,
  });

  const workshopNotes = relatedFacts
    .map((f) => `[${f.sourceFile}] ${f.fact}\n"${f.excerpt}"`)
    .join("\n\n");

  const fallbacks = resolveCaptureSectionFallbacks({
    hasWorkshopCoverage,
    gapItems,
    inPlaceItems,
    recommendationItems: recItems,
    complianceStatus: normalized.complianceStatus ?? row.complianceStatus,
  });

  return {
    controlId,
    controlCode: row.controlCode,
    inPlaceFindings: inPlace || fallbacks.inPlace,
    gapFindings: gaps || fallbacks.gap,
    recommendations: recs || fallbacks.recommendation,
    complianceStatus: hasWorkshopCoverage
      ? (normalized.complianceStatus ?? row.complianceStatus ?? "not_assessed")
      : "not_assessed",
    citations,
    workshopNotes,
  };
}

async function assessPillarBatch(options: {
  pillar: PillarControlGroup;
  factLedgerJson: string;
  pillarContext: string;
  requirementByCode: Map<
    string,
    { frameworkRequirements: string[]; procedureSummary?: string }
  >;
}): Promise<AssessResponse | null> {
  const assessResult = await callOpenAIJson<AssessResponse>({
    system: CAPTURE_ASSESS_SYSTEM_PROMPT,
    user: buildCaptureAssessUserPrompt({
      factLedgerJson: options.factLedgerJson,
      pillarLabel: options.pillar.pillarLabel,
      pillarContext: options.pillarContext,
      controls: options.pillar.controls.map((c) => {
        const req = options.requirementByCode.get(c.code.toUpperCase());
        return {
          code: c.code,
          title: c.title,
          description: c.description,
          frameworkRequirements: req?.frameworkRequirements ?? [],
          procedureSummary: req?.procedureSummary,
        };
      }),
    }),
    temperature: 0.1,
    maxTokens: 12_000,
  });

  if (!assessResult.ok) return null;
  return assessResult.data;
}

async function indexSupplementalPillarFacts(
  assessmentId: string,
  pillar: PillarControlGroup
): Promise<GroundedFact[]> {
  const query = [
    pillar.pillarLabel,
    ...pillar.controls.map((c) => `${c.code} ${c.title}`),
  ].join(" ");

  const chunks = await retrieveRelevantChunks(assessmentId, query, PILLAR_CHUNK_TOP_K);
  if (chunks.length === 0) return [];

  const indexResult = await callOpenAIJson<IndexResponse>({
    system: CAPTURE_INDEX_SYSTEM_PROMPT,
    user: buildPillarSupplementalIndexPrompt({
      pillarContext: formatPillarIndexContext(
        pillar.pillarLabel,
        pillar.controls.map((c) => ({
          code: c.code,
          title: c.title,
          description: c.description,
        }))
      ),
      sourceCorpus: formatChunksForPrompt(chunks),
    }),
    temperature: 0.1,
    maxTokens: 8_000,
  });

  if (!indexResult.ok) return [];
  return indexResult.data.facts ?? [];
}

export async function runCaptureNotebookAnalysis(
  assessmentId: string,
  sources: TranscriptSource[]
): Promise<NotebookAnalysisResult> {
  const sourceDocs = toCaptureSourceDocs(sources);
  const sourceById = new Map(sourceDocs.map((s) => [s.id, s]));
  const fullCorpus = formatSourceCorpusForPrompt(sourceDocs);
  const totalChars = sourceDocs.reduce((n, s) => n + s.text.length, 0);

  await ensureCaptureIndex(assessmentId);

  const indexQuery =
    "AI governance workshop policies controls risk compliance gaps practices evidence";
  const corpusSelection = await getCorpusForAnalysis(
    assessmentId,
    indexQuery,
    fullCorpus,
    totalChars,
    INITIAL_INDEX_TOP_K
  );

  const context = await buildTranscriptAnalysisContext(assessmentId);
  const frameworkContext = formatContextForPrompt(context);

  let apiCalls = 0;
  let model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const indexResult = await callOpenAIJson<IndexResponse>({
    system: CAPTURE_INDEX_SYSTEM_PROMPT,
    user: buildCaptureIndexUserPrompt({
      frameworkContext,
      sourceCorpus: corpusSelection.corpus,
      vectorMode: corpusSelection.usedVectorRetrieval,
    }),
    temperature: 0.1,
    maxTokens: 12_000,
  });
  apiCalls++;

  if (!indexResult.ok) {
    throw new Error(indexResult.error);
  }
  model = indexResult.model;

  let facts = dedupeFacts(indexResult.data.facts ?? []);
  const pillarsWithControls = (await getPillarControlTreeForAssessment(assessmentId)).filter(
    (p) => p.controls.length > 0
  );

  const supplementalResults = await runWithConcurrency(
    pillarsWithControls,
    SUPPLEMENTAL_INDEX_CONCURRENCY,
    async (pillar) => indexSupplementalPillarFacts(assessmentId, pillar)
  );
  apiCalls += pillarsWithControls.length;

  for (let i = 0; i < supplementalResults.length; i++) {
    const pillarFacts = supplementalResults[i];
    if (pillarFacts.length === 0) continue;
    facts = mergeFacts(facts, pillarFacts, `P${i + 1}-`);
  }
  facts = dedupeFacts(facts);

  const factById = new Map(facts.map((f) => [f.factId, f]));
  const factLedgerJson = JSON.stringify({ facts }, null, 0);

  const pillarTree = pillarsWithControls;
  const codeToId = new Map<string, string>();
  for (const pillar of pillarTree) {
    for (const c of pillar.controls) {
      codeToId.set(c.code.toUpperCase(), c.id);
    }
  }

  const allControlIds = pillarTree.flatMap((p) => p.controls.map((c) => c.id));
  const requirementSummaries = await loadControlRequirementSummaries(allControlIds);
  const requirementByCode = new Map(
    [...requirementSummaries.values()].map((summary) => [
      summary.code.toUpperCase(),
      {
        frameworkRequirements: summary.frameworkRequirements,
        procedureSummary: summary.procedureSummary,
      },
    ])
  );

  const pillarResults = await runWithConcurrency(
    pillarTree,
    PILLAR_CONCURRENCY,
    async (pillar) => {
      const controlQuery = [
        pillar.pillarLabel,
        ...pillar.controls.map((c) => `${c.code} ${c.title}`),
      ].join(" ");

      const chunks = await retrieveRelevantChunks(assessmentId, controlQuery, PILLAR_CHUNK_TOP_K);
      const pillarContext = chunks.length > 0 ? formatChunksForPrompt(chunks) : "";

      const data = await assessPillarBatch({
        pillar,
        factLedgerJson,
        pillarContext,
        requirementByCode,
      });
      return { pillar, data, pillarContext };
    }
  );

  apiCalls += pillarsWithControls.length;

  const allAssessments: PersistedControlAssessment[] = [];

  for (const { data } of pillarResults) {
    if (!data?.assessments) continue;

    for (const row of data.assessments) {
      const controlId = codeToId.get(row.controlCode.toUpperCase());
      if (!controlId) continue;

      const assessment = buildAssessmentFromRow(row, controlId, facts, factById, sourceById);
      await persistControlAssessment(assessmentId, controlId, {
        workshopNotes: assessment.workshopNotes,
        inPlaceFindings: assessment.inPlaceFindings,
        gapFindings: assessment.gapFindings,
        recommendations: assessment.recommendations,
        complianceStatus: assessment.complianceStatus,
        citations: assessment.citations,
      });
      allAssessments.push(assessment);
    }
  }

  const targetedPass = await runTargetedControlPass({
    assessmentId,
    pillarTree,
    existingAssessments: allAssessments,
    requirementByCode,
  });
  apiCalls += targetedPass.apiCalls;

  const mergedByCode = new Map(allAssessments.map((a) => [a.controlCode.toUpperCase(), a]));
  for (const targeted of targetedPass.assessed) {
    mergedByCode.set(targeted.controlCode.toUpperCase(), targeted);
  }
  const finalAssessments = [...mergedByCode.values()];

  const warnings = [
    ...(indexResult.data.processingWarnings ?? []),
    targetedPass.assessed.length > 0
      ? `Targeted retrieval pass mapped ${targetedPass.assessed.length} additional control(s) from workshop sources.`
      : "",
  ].filter(Boolean);

  return {
    summary:
      indexResult.data.summary?.trim() ||
      `Indexed ${facts.length} facts from ${sources.length} source(s); assessed ${finalAssessments.length} control(s) (${targetedPass.assessed.length} via targeted retrieval) using ${apiCalls} API call(s).`,
    topicsNotDiscussed: indexResult.data.topicsNotDiscussed ?? [],
    processingWarnings: warnings,
    factsIndexed: facts.length,
    apiCalls,
    model,
    assessments: finalAssessments,
    sourceDocs,
    vectorChunksUsed: corpusSelection.chunkCount,
    usedVectorRetrieval: corpusSelection.usedVectorRetrieval,
    targetedAssessedCount: targetedPass.assessed.length,
  };
}

export { buildEvidenceTextMap };
