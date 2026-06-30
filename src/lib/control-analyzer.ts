import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import { CONTROL_ANALYSIS_SYSTEM_PROMPT } from "@/lib/transcript-analysis-prompts";
import { formatRequirementBlockFromControl } from "@/lib/control-requirement-context";
import { resolveCaptureSectionFallbacks } from "@/lib/capture-finding-format";

export type TextSource = {
  id: string | null;
  type: "workshop_notes" | "facilitator_notes" | "evidence";
  label: string;
  text: string;
};

export type CitationDraft = {
  section: "in_place" | "gap" | "recommendation";
  claimIndex: number;
  claimText: string;
  sourceType: string;
  sourceId: string | null;
  sourceLabel: string;
  excerpt: string;
  startOffset: number;
  endOffset: number;
  citationIndex: number;
};

export type ControlAnalysisResult = {
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: "aligned" | "partial" | "gap" | "not_assessed";
  citations: CitationDraft[];
  aiGenerated: boolean;
};

const POSITIVE = [
  "policy", "documented", "approved", "implemented", "trained", "audit",
  "monitoring", "tested", "validated", "governance", "oversight", "procedure",
  "logged", "reviewed", "established", "maintained", "formal", "certified",
];

const GAP = [
  "none", "not implemented", "no policy", "missing", "gap", "lack",
  "informal", "ad hoc", "undocumented", "unknown", "not yet", "planned",
  "partial", "manual only", "no evidence",
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function controlKeywords(code: string, title: string, description: string): string[] {
  const words = `${code} ${title} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return [...new Set([code.toLowerCase(), ...words])];
}

function sentenceRelevance(sentence: string, keywords: string[]): number {
  const lower = sentence.toLowerCase();
  return keywords.filter((k) => lower.includes(k)).length;
}

function findSpan(source: TextSource, excerpt: string): { startOffset: number; endOffset: number } | null {
  const idx = source.text.indexOf(excerpt);
  if (idx >= 0) return { startOffset: idx, endOffset: idx + excerpt.length };
  const normalized = excerpt.trim();
  const idx2 = source.text.indexOf(normalized);
  if (idx2 >= 0) return { startOffset: idx2, endOffset: idx2 + normalized.length };
  return null;
}

function makeCitation(
  section: CitationDraft["section"],
  claimIndex: number,
  claimText: string,
  source: TextSource,
  excerpt: string,
  citationIndex: number
): CitationDraft | null {
  const span = findSpan(source, excerpt);
  if (!span) return null;
  return {
    section,
    claimIndex,
    claimText,
    sourceType: source.type,
    sourceId: source.id,
    sourceLabel: source.label,
    excerpt: source.text.slice(span.startOffset, span.endOffset),
    startOffset: span.startOffset,
    endOffset: span.endOffset,
    citationIndex,
  };
}

function classifySentence(sentence: string): "positive" | "gap" | "neutral" {
  const lower = sentence.toLowerCase();
  const gapHits = GAP.filter((g) => lower.includes(g)).length;
  const posHits = POSITIVE.filter((p) => lower.includes(p)).length;
  if (gapHits > posHits) return "gap";
  if (posHits > 0) return "positive";
  return "neutral";
}

function formatWithCitations(claims: Array<{ text: string; citationIndex: number | null }>): string {
  return claims
    .map((c) => (c.citationIndex != null ? `${c.text} [{${c.citationIndex}}]` : c.text))
    .join("\n");
}

export async function gatherAssessmentSources(
  assessmentId: string,
  controlId?: string
): Promise<TextSource[]> {
  const repo = await prisma.assessmentRepository.findUnique({ where: { assessmentId } });
  const evidence = await prisma.assessmentEvidence.findMany({
    where: { assessmentId },
    orderBy: { uploadedAt: "asc" },
  });

  let controlCode: string | null = null;
  let controlEvalNotes: string | null = null;
  if (controlId) {
    const control = await prisma.canonicalControl.findUnique({ where: { id: controlId } });
    controlCode = control?.code ?? null;
    const evalRow = await prisma.controlEvaluation.findUnique({
      where: { assessmentId_controlId: { assessmentId, controlId } },
    });
    controlEvalNotes = evalRow?.workshopNotes ?? null;
    if (evalRow?.facilitatorNotes) {
      controlEvalNotes = `${controlEvalNotes ?? ""}\n${evalRow.facilitatorNotes}`.trim();
    }
  }

  const sources: TextSource[] = [];

  if (controlEvalNotes) {
    sources.push({
      id: null,
      type: "workshop_notes",
      label: controlCode ? `${controlCode} — Control Notes` : "Control Notes",
      text: controlEvalNotes,
    });
  }

  if (repo?.workshopNotes?.trim()) {
    sources.push({
      id: null,
      type: "workshop_notes",
      label: "Bulk Workshop Notes",
      text: repo.workshopNotes.trim(),
    });
  }
  if (repo?.facilitatorNotes?.trim()) {
    sources.push({
      id: null,
      type: "facilitator_notes",
      label: "Bulk Facilitator Notes",
      text: repo.facilitatorNotes.trim(),
    });
  }
  for (const file of evidence) {
    if (!file.extractedText?.trim()) continue;
    if (controlCode && file.controlCodes.length > 0 && !file.controlCodes.includes(controlCode)) {
      continue;
    }
    sources.push({
      id: file.id,
      type: "evidence",
      label: file.description?.startsWith("[transcript]")
        ? `Transcript: ${file.fileName}`
        : file.fileName,
      text: file.extractedText.trim(),
    });
  }

  return sources;
}

export async function analyzeControlGrounded(
  controlId: string,
  sources: TextSource[]
): Promise<ControlAnalysisResult> {
  const control = await prisma.canonicalControl.findUnique({
    where: { id: controlId },
    include: {
      requirementLinks: {
        include: { requirement: { include: { framework: true } } },
      },
      procedures: true,
    },
  });

  if (!control) throw new Error("Control not found");

  const keywords = controlKeywords(control.code, control.title, control.description);
  const citations: CitationDraft[] = [];
  let citationCounter = 1;

  const relevantSentences: Array<{
    sentence: string;
    source: TextSource;
    classification: "positive" | "gap" | "neutral";
    relevance: number;
  }> = [];

  for (const source of sources) {
    for (const sentence of splitSentences(source.text)) {
      const relevance = sentenceRelevance(sentence, keywords);
      const classification = classifySentence(sentence);
      if (relevance > 0 || classification !== "neutral") {
        relevantSentences.push({ sentence, source, classification, relevance });
      }
    }
  }

  relevantSentences.sort((a, b) => b.relevance - a.relevance || (a.classification === "positive" ? -1 : 1));

  const inPlaceClaims: Array<{ text: string; citationIndex: number | null }> = [];
  const gapClaims: Array<{ text: string; citationIndex: number | null }> = [];

  for (const item of relevantSentences.filter((s) => s.classification === "positive").slice(0, 5)) {
    const cite = makeCitation("in_place", inPlaceClaims.length, item.sentence, item.source, item.sentence, citationCounter);
    if (cite) {
      citations.push(cite);
      inPlaceClaims.push({ text: item.sentence, citationIndex: citationCounter });
      citationCounter++;
    }
  }

  for (const item of relevantSentences.filter((s) => s.classification === "gap").slice(0, 5)) {
    const cite = makeCitation("gap", gapClaims.length, item.sentence, item.source, item.sentence, citationCounter);
    if (cite) {
      citations.push(cite);
      gapClaims.push({ text: item.sentence, citationIndex: citationCounter });
      citationCounter++;
    }
  }

  const hasEvidence = sources.some((s) => s.type === "evidence");
  const hasNotes = sources.some((s) => s.type === "workshop_notes" || s.type === "facilitator_notes");

  if (sources.length === 0) {
    return {
      inPlaceFindings: "No workshop notes or evidence uploaded yet.",
      gapFindings: `This control was not assessed — no workshop notes or evidence uploaded for ${control.code}.`,
      recommendations: "Upload workshop transcripts or evidence covering this control, then re-analyze.",
      complianceStatus: "not_assessed",
      citations: [],
      aiGenerated: false,
    };
  }

  const hasRelevantContent = relevantSentences.some((s) => s.relevance > 0);

  if (inPlaceClaims.length === 0 && gapClaims.length === 0) {
    if (!hasRelevantContent) {
      gapClaims.push({
        text: `This control was not addressed in workshop materials. No gap was inferred without source evidence.`,
        citationIndex: null,
      });
    } else {
      const fallback = relevantSentences[0] ?? null;
      if (fallback) {
        const cite = makeCitation(
          "gap",
          0,
          `Workshop materials reference related topics but do not establish alignment with ${control.code}.`,
          fallback.source,
          fallback.sentence,
          citationCounter
        );
        if (cite) {
          citations.push(cite);
          gapClaims.push({
            text: `Insufficient workshop evidence to confirm ${control.title} (${control.code}) against framework requirements. Related context: "${fallback.sentence.slice(0, 120)}..."`,
            citationIndex: citationCounter,
          });
          citationCounter++;
        }
      }
    }
  }

  let complianceStatus: ControlAnalysisResult["complianceStatus"];
  if (inPlaceClaims.length >= 2 && gapClaims.length === 0 && hasEvidence) {
    complianceStatus = "aligned";
  } else if (inPlaceClaims.length >= 1 || (hasEvidence && gapClaims.length <= 1)) {
    complianceStatus = "partial";
  } else if (gapClaims.length > 0) {
    complianceStatus = "gap";
  } else {
    complianceStatus = "not_assessed";
  }

  const recClaims: Array<{ text: string; citationIndex: number | null }> = [];
  const reqSummary = control.requirementLinks
    .slice(0, 3)
    .map((l) => `${l.requirement.framework.code} ${l.requirement.clauseId}`)
    .join(", ");

  if (complianceStatus === "gap" || complianceStatus === "partial") {
    const recText = gapClaims[0]?.text
      ? `Address the identified gap for ${control.code} per linked requirements (${reqSummary || "see crosswalk"}).`
      : `${control.code}: Review alignment with ${control.title} requirement.`;
    recClaims.push({ text: recText, citationIndex: null });
  } else if (complianceStatus === "aligned") {
    recClaims.push({
      text: `Maintain ${control.code} and schedule periodic review per linked requirements (${reqSummary || "see crosswalk"}).`,
      citationIndex: null,
    });
  }

  const sectionFallbacks = resolveCaptureSectionFallbacks({
    hasWorkshopCoverage: hasRelevantContent || inPlaceClaims.length > 0 || gapClaims.length > 0,
    gapItems: gapClaims.map((c) => c.text),
    inPlaceItems: inPlaceClaims.map((c) => c.text),
    recommendationItems: recClaims.map((c) => c.text),
    complianceStatus,
  });

  return {
    inPlaceFindings: inPlaceClaims.length
      ? formatWithCitations(inPlaceClaims)
      : sectionFallbacks.inPlace,
    gapFindings: gapClaims.length
      ? formatWithCitations(gapClaims)
      : sectionFallbacks.gap,
    recommendations: recClaims.length
      ? formatWithCitations(recClaims)
      : sectionFallbacks.recommendation,
    complianceStatus,
    citations,
    aiGenerated: false,
  };
}

async function analyzeWithOpenAI(
  control: {
    code: string;
    title: string;
    description: string;
    requirementLinks?: Array<{
      requirement: {
        clauseId: string;
        title: string;
        requirementText: string;
        framework: { code: string };
      };
    }>;
    procedures?: Array<{ steps: string }>;
  },
  sources: TextSource[]
): Promise<ControlAnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const sourceBlock = sources
    .map((s, i) => `--- SOURCE ${i + 1} (${s.label}, type=${s.type}, id=${s.id ?? "n/a"}) ---\n${s.text.slice(0, 8000)}`)
    .join("\n\n");

  const requirementBlock = formatRequirementBlockFromControl(control);

  const prompt = `Analyze control ${control.code} (${control.title}) using ONLY the sources below.

${requirementBlock}

ANALYSIS METHOD:
1. If sources do not discuss this control topic at all → complianceStatus "not_assessed", explain topic was not covered, empty gapFindings, no recommendations.
2. If sources discuss the topic → compare observed practices against the canonical requirement and linked framework obligations above.
3. Record gaps when sources show informal, incomplete, missing, or unimplemented elements required by the control — even if the word "gap" was not used.
4. Do NOT invent gaps for requirement elements never mentioned in sources.

Sources:
${sourceBlock}

Return JSON:
{
  "complianceStatus": "aligned"|"partial"|"gap"|"not_assessed",
  "inPlaceFindings": ["Observed practice: ... Evidence: ..."],
  "gapFindings": ["Gap: <requirement element not met/evidenced>. Basis: <verbatim-supported workshop evidence>"],
  "recommendations": ["Recommendation: ... Rationale: ... — only when a gap was identified from sources"],
  "citations": [{"section":"in_place|gap|recommendation","claimText":"must match a finding string exactly","sourceLabel":"...","sourceType":"...","excerpt":"exact verbatim excerpt copied from source — required for in_place and gap"}]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: CONTROL_ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const parsed = JSON.parse(data.choices[0]?.message?.content ?? "{}") as {
      complianceStatus?: ControlAnalysisResult["complianceStatus"];
      inPlaceFindings?: string[];
      gapFindings?: string[];
      recommendations?: string[];
      citations?: Array<{
        section: CitationDraft["section"];
        claimText: string;
        sourceLabel: string;
        sourceType: string;
        excerpt: string;
      }>;
    };

    const citations: CitationDraft[] = [];
    let citationCounter = 1;
    const sections: Array<{ key: CitationDraft["section"]; items: string[] }> = [
      { key: "in_place", items: parsed.inPlaceFindings ?? [] },
      { key: "gap", items: parsed.gapFindings ?? [] },
      { key: "recommendation", items: parsed.recommendations ?? [] },
    ];

    const formatted: Record<string, string> = {};

    for (const { key, items } of sections) {
      const lines: string[] = [];
      items.forEach((claim, claimIndex) => {
        const rawCites = (parsed.citations ?? []).filter((c) => c.section === key && c.claimText === claim);
        const citeMeta = rawCites[0];
        if (citeMeta) {
          const source = sources.find((s) => s.label === citeMeta.sourceLabel || s.type === citeMeta.sourceType);
          if (source) {
            const cite = makeCitation(key, claimIndex, claim, source, citeMeta.excerpt, citationCounter);
            if (cite) {
              citations.push(cite);
              lines.push(`${claim} [{${citationCounter}}]`);
              citationCounter++;
              return;
            }
          }
        }
        lines.push(claim);
      });
      formatted[key] = lines.join("\n");
    }

    return {
      inPlaceFindings: formatted.in_place || "No in-place findings from AI analysis.",
      gapFindings: formatted.gap || "This control was not addressed in workshop materials.",
      recommendations:
        formatted.recommendation ||
        "No remediation action applies until workshop evidence establishes a specific gap.",
      complianceStatus: parsed.complianceStatus ?? "not_assessed",
      citations,
      aiGenerated: true,
    };
  } catch {
    return null;
  }
}

export async function analyzeAndPersistControl(
  assessmentId: string,
  controlId: string
): Promise<ControlAnalysisResult> {
  const control = await prisma.canonicalControl.findUnique({
    where: { id: controlId },
    include: {
      requirementLinks: {
        include: { requirement: { include: { framework: true } } },
      },
      procedures: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });
  if (!control) throw new Error("Control not found");

  const sources = await gatherAssessmentSources(assessmentId, controlId);
  const taggedSources = sources;

  let result = await analyzeWithOpenAI(control, taggedSources);
  if (!result) {
    result = await analyzeControlGrounded(controlId, taggedSources);
  }

  await prisma.evaluationCitation.deleteMany({
    where: { controlEvaluation: { assessmentId, controlId } },
  });

  const evaluation = await prisma.controlEvaluation.upsert({
    where: { assessmentId_controlId: { assessmentId, controlId } },
    create: {
      assessmentId,
      controlId,
      inPlaceFindings: result.inPlaceFindings,
      gapFindings: result.gapFindings,
      recommendations: result.recommendations,
      complianceStatus: result.complianceStatus,
      status: "ai_draft",
      aiGenerated: result.aiGenerated,
      analyzedAt: new Date(),
    },
    update: {
      inPlaceFindings: result.inPlaceFindings,
      gapFindings: result.gapFindings,
      recommendations: result.recommendations,
      complianceStatus: result.complianceStatus,
      status: "ai_draft",
      aiGenerated: result.aiGenerated,
      analyzedAt: new Date(),
      reviewerComplete: null,
      reviewerAccurate: null,
      reviewerNoHallucination: null,
      confirmedBy: null,
      confirmedAt: null,
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

  return result;
}

export async function analyzeAllControls(assessmentId: string): Promise<number> {
  const controls = await getScopedControlsForAssessment(assessmentId);
  let count = 0;
  for (const c of controls) {
    await analyzeAndPersistControl(assessmentId, c.id);
    count++;
  }
  return count;
}

/** Run grounded control analysis for every control that has workshop notes from capture. */
export async function analyzeControlsWithWorkshopNotes(assessmentId: string): Promise<number> {
  const evals = await prisma.controlEvaluation.findMany({
    where: { assessmentId, workshopNotes: { not: null } },
    select: { controlId: true },
  });
  let count = 0;
  for (const row of evals) {
    await analyzeAndPersistControl(assessmentId, row.controlId);
    count++;
  }
  return count;
}
