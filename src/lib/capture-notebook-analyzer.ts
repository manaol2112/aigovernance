import { prisma } from "@/lib/db";
import { callOpenAIJson } from "@/lib/openai-client";
import {
  CAPTURE_ASSESS_SYSTEM_PROMPT,
  CAPTURE_INDEX_SYSTEM_PROMPT,
  buildCaptureAssessUserPrompt,
  buildCaptureIndexUserPrompt,
} from "@/lib/transcript-analysis-prompts";
import {
  buildTranscriptAnalysisContext,
  formatContextForPrompt,
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
  findExcerptSpan,
  formatSourceCorpusForPrompt,
  toCaptureSourceDocs,
  type CaptureSourceDoc,
} from "@/lib/capture-source-corpus";
import {
  normalizeFindingItems,
  resolveCaptureSectionFallbacks,
} from "@/lib/capture-finding-format";
import { loadControlRequirementSummaries } from "@/lib/control-requirement-context";
import type { TranscriptSource } from "@/lib/transcript-processor";

const PILLAR_CONCURRENCY = 4;

export type GroundedFact = {
  factId: string;
  fact: string;
  sourceId: string;
  sourceFile: string;
  excerpt: string;
  controlCodes: string[];
  pillarLabel?: string;
};

export type PersistedControlAssessment = {
  controlId: string;
  controlCode: string;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: "aligned" | "partial" | "gap" | "not_assessed";
  citations: CitationDraft[];
  workshopNotes: string;
};

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

function formatSectionWithCitations(
  section: CitationDraft["section"],
  items: string[],
  rawCitations: AssessmentCitation[] | undefined,
  factById: Map<string, GroundedFact>,
  sourceById: Map<string, CaptureSourceDoc>,
  citations: CitationDraft[],
  citationCounter: { value: number }
): string {
  const sectionCitations = rawCitations?.filter((c) => c.section === section) ?? [];
  const lines: string[] = [];

  items.forEach((claim, claimIndex) => {
    const meta =
      sectionCitations.find((c) => c.claimText === claim) ?? sectionCitations[claimIndex];
    const fact = meta ? factById.get(meta.factId) : undefined;
    const source = fact ? sourceById.get(fact.sourceId) : undefined;

    if (fact && source) {
      const span = findExcerptSpan(source.text, fact.excerpt);
      if (span) {
        const idx = citationCounter.value;
        citations.push({
          section,
          claimIndex,
          claimText: claim,
          sourceType: "evidence",
          sourceId: fact.sourceId,
          sourceLabel: `Transcript: ${fact.sourceFile}`,
          excerpt: source.text.slice(span.startOffset, span.endOffset),
          startOffset: span.startOffset,
          endOffset: span.endOffset,
          citationIndex: idx,
        });
        lines.push(`${claim} [{${idx}}]`);
        citationCounter.value++;
        return;
      }
    }
    lines.push(claim);
  });

  return lines.join("\n");
}

async function persistAssessment(
  assessmentId: string,
  controlId: string,
  result: Omit<PersistedControlAssessment, "controlId" | "controlCode">
): Promise<void> {
  await prisma.evaluationCitation.deleteMany({
    where: { controlEvaluation: { assessmentId, controlId } },
  });

  const evaluation = await prisma.controlEvaluation.upsert({
    where: { assessmentId_controlId: { assessmentId, controlId } },
    create: {
      assessmentId,
      controlId,
      workshopNotes: result.workshopNotes,
      inPlaceFindings: result.inPlaceFindings,
      gapFindings: result.gapFindings,
      recommendations: result.recommendations,
      complianceStatus: result.complianceStatus,
      status: "ai_draft",
      aiGenerated: true,
      analyzedAt: new Date(),
    },
    update: {
      workshopNotes: result.workshopNotes,
      inPlaceFindings: result.inPlaceFindings,
      gapFindings: result.gapFindings,
      recommendations: result.recommendations,
      complianceStatus: result.complianceStatus,
      status: "ai_draft",
      aiGenerated: true,
      analyzedAt: new Date(),
    },
  });

  if (result.citations.length > 0) {
    await prisma.evaluationCitation.createMany({
      data: result.citations.map((c) => ({
        controlEvaluationId: evaluation.id,
        section: c.section,
        claimIndex: c.claimIndex,
        claimText: c.claimText,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        sourceLabel: c.sourceLabel,
        excerpt: c.excerpt,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        citationIndex: c.citationIndex,
      })),
    });
  }
}

function normalizeAssessmentRow(row: AssessmentRow): AssessmentRow {
  const inPlaceRaw = row.inPlaceFindings ?? [];
  const gapRaw = row.gapFindings ?? [];
  const recRaw = row.recommendations ?? [];

  const inPlaceFindings = normalizeFindingItems(inPlaceRaw);
  const gapFindings = normalizeFindingItems(gapRaw);
  const recommendations = normalizeFindingItems(recRaw);

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

function buildAssessmentFromRow(
  row: AssessmentRow,
  controlId: string,
  facts: GroundedFact[],
  factById: Map<string, GroundedFact>,
  sourceById: Map<string, CaptureSourceDoc>
): PersistedControlAssessment {
  const normalized = normalizeAssessmentRow(row);
  const citations: CitationDraft[] = [];
  const counter = { value: 1 };

  const inPlace = formatSectionWithCitations(
    "in_place",
    normalized.inPlaceFindings ?? [],
    normalized.citations,
    factById,
    sourceById,
    citations,
    counter
  );
  const gaps = formatSectionWithCitations(
    "gap",
    normalized.gapFindings ?? [],
    normalized.citations,
    factById,
    sourceById,
    citations,
    counter
  );
  const recs = formatSectionWithCitations(
    "recommendation",
    normalized.recommendations ?? [],
    normalized.citations,
    factById,
    sourceById,
    citations,
    counter
  );

  const relatedFacts = facts.filter((f) =>
    f.controlCodes.some((code) => code.toUpperCase() === row.controlCode.toUpperCase())
  );
  const hasWorkshopCoverage = relatedFacts.length > 0;
  const workshopNotes = relatedFacts
    .map((f) => `[${f.sourceFile}] ${f.fact}\n"${f.excerpt}"`)
    .join("\n\n");

  const fallbacks = resolveCaptureSectionFallbacks({
    hasWorkshopCoverage,
    gapItems: normalized.gapFindings ?? [],
    inPlaceItems: normalized.inPlaceFindings ?? [],
    recommendationItems: normalized.recommendations ?? [],
    complianceStatus: row.complianceStatus,
  });

  return {
    controlId,
    controlCode: row.controlCode,
    inPlaceFindings: inPlace || fallbacks.inPlace,
    gapFindings: gaps || fallbacks.gap,
    recommendations: recs || fallbacks.recommendation,
    complianceStatus: hasWorkshopCoverage
      ? (row.complianceStatus ?? "not_assessed")
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
    maxTokens: 8_000,
  });

  if (!assessResult.ok) return null;
  return assessResult.data;
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
    28
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

  const facts = indexResult.data.facts ?? [];
  const factById = new Map(facts.map((f) => [f.factId, f]));
  const factLedgerJson = JSON.stringify({ facts }, null, 0);

  const pillarTree = await getPillarControlTreeForAssessment(assessmentId);
  const codeToId = new Map<string, string>();
  for (const pillar of pillarTree) {
    for (const c of pillar.controls) {
      codeToId.set(c.code.toUpperCase(), c.id);
    }
  }

  const pillarsWithControls = pillarTree.filter((p) => p.controls.length > 0);
  const allControlIds = pillarsWithControls.flatMap((p) => p.controls.map((c) => c.id));
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
    pillarsWithControls,
    PILLAR_CONCURRENCY,
    async (pillar) => {
      const controlQuery = [
        pillar.pillarLabel,
        ...pillar.controls.map((c) => `${c.code} ${c.title}`),
      ].join(" ");

      let pillarContext = "";
      if (corpusSelection.usedVectorRetrieval) {
        const chunks = await retrieveRelevantChunks(assessmentId, controlQuery, 8);
        pillarContext = formatChunksForPrompt(chunks);
      }

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
      await persistAssessment(assessmentId, controlId, assessment);
      allAssessments.push(assessment);
    }
  }

  const warnings = [...(indexResult.data.processingWarnings ?? [])];

  return {
    summary:
      indexResult.data.summary?.trim() ||
      `Indexed ${facts.length} facts from ${sources.length} source(s), assessed ${allAssessments.length} control(s) using ${apiCalls} API call(s).`,
    topicsNotDiscussed: indexResult.data.topicsNotDiscussed ?? [],
    processingWarnings: warnings,
    factsIndexed: facts.length,
    apiCalls,
    model,
    assessments: allAssessments,
    sourceDocs,
    vectorChunksUsed: corpusSelection.chunkCount,
    usedVectorRetrieval: corpusSelection.usedVectorRetrieval,
  };
}

export { buildEvidenceTextMap };
