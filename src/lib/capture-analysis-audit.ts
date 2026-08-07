import { callOpenAIJson } from "@/lib/openai-client";
import type {
  CaptureAnalysisAudit,
  CaptureSecondPassFinding,
  CaptureSourceAudit,
} from "@/lib/capture-analysis-types";
import type { GroundedFact, PersistedControlAssessment } from "@/lib/capture-analysis-types";
import type { CaptureSource } from "@/lib/capture-sources";

type InScopeControl = {
  code: string;
  title: string;
};

type SecondPassResponse = {
  summary?: string;
  findings?: Array<{
    sourceId?: string;
    fileName: string;
    concern: string;
    candidateControlCodes?: string[];
    confidence?: "low" | "medium" | "high";
    rationale?: string;
  }>;
};

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function runSecondPassCoverageReview(input: {
  sources: CaptureSource[];
  sourceAudits: CaptureSourceAudit[];
  controlsInScope: InScopeControl[];
  assessedControlCodes: string[];
}): Promise<{
  summary: string;
  findings: CaptureSecondPassFinding[];
}> {
  const candidates = input.sourceAudits
    .filter((source) => source.status !== "cited_in_findings")
    .sort((a, b) => a.citationCount - b.citationCount || a.factCount - b.factCount)
    .slice(0, 6);

  if (candidates.length === 0) {
    return {
      summary: "Second-pass review found no under-covered source files requiring additional QA.",
      findings: [],
    };
  }

  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const candidateBlocks = candidates
    .map((audit) => {
      const source = sourceById.get(audit.sourceId);
      if (!source) return null;
      return [
        `[SOURCE id="${audit.sourceId}" file="${audit.fileName}" kind="${audit.kind}"]`,
        source.text.slice(0, 2_200),
        "[/SOURCE]",
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  const controlBlock = input.controlsInScope
    .map((control) => `- ${control.code}: ${control.title}`)
    .join("\n");

  if (!candidateBlocks.trim() || !process.env.OPENAI_API_KEY) {
    return {
      summary:
        "Second-pass review was limited to deterministic coverage checks. Manual spot-check is recommended for files with no citations.",
      findings: candidates.map((audit) => ({
        sourceId: audit.sourceId,
        fileName: audit.fileName,
        concern: "This source did not contribute to final cited findings in the first pass.",
        candidateControlCodes: audit.controlsReviewed,
        confidence: "low",
        rationale:
          "No citations were produced from this file in the first pass, so a manual spot-check is recommended.",
      })),
    };
  }

  const result = await callOpenAIJson<SecondPassResponse>({
    system: [
      "You are a QA auditor reviewing AI governance analysis coverage.",
      "TASK: Inspect under-covered source files and identify whether the first-pass control mapping may have missed materially relevant content.",
      "RULES:",
      "1. Use ONLY the provided source excerpts and in-scope control catalog.",
      "2. Flag a finding only if the source appears relevant to a control but was not clearly surfaced in first-pass findings.",
      "3. If the source looks administrative, duplicative, or genuinely irrelevant, do not flag it.",
      "4. Be conservative. Prefer manual spot-check recommendations over overstating misses.",
      'Return JSON only: { "summary": string, "findings": [{ "sourceId": string, "fileName": string, "concern": string, "candidateControlCodes": string[], "confidence": "low"|"medium"|"high", "rationale": string }] }',
    ].join("\n"),
    user: [
      "Assessed controls in first pass:",
      input.assessedControlCodes.length > 0 ? input.assessedControlCodes.join(", ") : "(none)",
      "",
      "In-scope controls:",
      controlBlock || "(none)",
      "",
      "Under-covered sources to review:",
      candidateBlocks,
    ].join("\n"),
    temperature: 0.1,
    maxTokens: 1_500,
  });

  if (!result.ok) {
    return {
      summary:
        "Second-pass AI review was unavailable. Manual spot-check is recommended for files that were not cited in findings.",
      findings: candidates.map((audit) => ({
        sourceId: audit.sourceId,
        fileName: audit.fileName,
        concern: "Source was under-covered in first-pass findings.",
        candidateControlCodes: audit.controlsReviewed,
        confidence: "low",
        rationale: "The automated second pass was unavailable, so this file should be manually spot-checked.",
      })),
    };
  }

  const findings: CaptureSecondPassFinding[] = (result.data.findings ?? [])
    .map((finding) => {
      const audit =
        candidates.find((item) => item.sourceId === finding.sourceId) ??
        candidates.find((item) => item.fileName === finding.fileName);
      if (!audit) return null;
      return {
        sourceId: audit.sourceId,
        fileName: audit.fileName,
        concern: finding.concern?.trim() || "Potentially missed control-relevant content.",
        candidateControlCodes: dedupe(finding.candidateControlCodes ?? []),
        confidence: finding.confidence ?? "low",
        rationale: finding.rationale?.trim() || "Manual QA review recommended.",
      };
    })
    .filter((finding): finding is CaptureSecondPassFinding => Boolean(finding));

  return {
    summary:
      result.data.summary?.trim() ||
      (findings.length > 0
        ? `Second pass flagged ${findings.length} under-covered source(s) for manual QA review.`
        : "Second pass did not identify obvious missed control signals in under-covered sources."),
    findings,
  };
}

export async function buildCaptureAnalysisAudit(input: {
  sources: CaptureSource[];
  facts: GroundedFact[];
  assessments: PersistedControlAssessment[];
  controlsInScope: InScopeControl[];
}): Promise<CaptureAnalysisAudit> {
  const uniqueControlsInScope = [
    ...new Map(input.controlsInScope.map((control) => [control.code, control])).values(),
  ];
  const factCountBySource = new Map<string, number>();
  const reviewedControlsBySource = new Map<string, Set<string>>();
  for (const fact of input.facts) {
    factCountBySource.set(fact.sourceId, (factCountBySource.get(fact.sourceId) ?? 0) + 1);
    const existing = reviewedControlsBySource.get(fact.sourceId) ?? new Set<string>();
    for (const code of fact.controlCodes ?? []) existing.add(code);
    reviewedControlsBySource.set(fact.sourceId, existing);
  }

  const citationCountBySource = new Map<string, number>();
  const citedControlsBySource = new Map<string, Set<string>>();
  for (const assessment of input.assessments) {
    for (const citation of assessment.citations ?? []) {
      if (!citation.sourceId) continue;
      citationCountBySource.set(
        citation.sourceId,
        (citationCountBySource.get(citation.sourceId) ?? 0) + 1
      );
      const existing = citedControlsBySource.get(citation.sourceId) ?? new Set<string>();
      existing.add(assessment.controlCode);
      citedControlsBySource.set(citation.sourceId, existing);
    }
  }

  const assessedControlCodes = dedupe(input.assessments.map((assessment) => assessment.controlCode));
  const controlsNotAssessed = uniqueControlsInScope
    .filter((control) => !assessedControlCodes.includes(control.code))
    .map((control) => control.code);

  const sourceAudits: CaptureSourceAudit[] = input.sources.map((source) => {
    const factCount = factCountBySource.get(source.id) ?? 0;
    const citationCount = citationCountBySource.get(source.id) ?? 0;
    const controlsReviewed = [...(reviewedControlsBySource.get(source.id) ?? new Set<string>())].sort();
    const controlsCited = [...(citedControlsBySource.get(source.id) ?? new Set<string>())].sort();
    const status =
      citationCount > 0
        ? "cited_in_findings"
        : factCount > 0
          ? "reviewed_not_cited"
          : "not_surfaced";

    const reviewNote =
      status === "cited_in_findings"
        ? "This file contributed directly to cited control findings."
        : status === "reviewed_not_cited"
          ? "This file produced extracted facts, but those facts did not end up in final cited findings."
          : "No first-pass facts or citations surfaced from this file; second-pass or manual QA review is recommended.";

    return {
      sourceId: source.id,
      fileName: source.fileName,
      kind: source.kind,
      charCount: source.text.length,
      factCount,
      citationCount,
      status,
      controlsReviewed,
      controlsCited,
      reviewNote,
      spotCheckRecommended: status !== "cited_in_findings",
    };
  });

  const secondPass = await runSecondPassCoverageReview({
    sources: input.sources,
    sourceAudits,
    controlsInScope: uniqueControlsInScope,
    assessedControlCodes,
  });

  const findingsBySourceId = new Set(secondPass.findings.map((finding) => finding.sourceId));
  const sourceAuditsWithFindings = sourceAudits.map((audit) =>
    findingsBySourceId.has(audit.sourceId)
      ? {
          ...audit,
          spotCheckRecommended: true,
          reviewNote: `${audit.reviewNote} Second-pass QA flagged this file for manual verification.`,
        }
      : audit
  );

  return {
    analyzedSourceCount: input.sources.length,
    citedSourceCount: sourceAuditsWithFindings.filter(
      (audit) => audit.status === "cited_in_findings"
    ).length,
    underReviewedSourceCount: sourceAuditsWithFindings.filter((audit) => audit.spotCheckRecommended)
      .length,
    controlsInScopeCount: uniqueControlsInScope.length,
    controlsAssessedCount: assessedControlCodes.length,
    controlsNotAssessed,
    secondPassSummary: secondPass.summary,
    sourceAudits: sourceAuditsWithFindings.sort((a, b) => {
      const statusRank = (status: CaptureSourceAudit["status"]) =>
        status === "not_surfaced" ? 0 : status === "reviewed_not_cited" ? 1 : 2;
      return statusRank(a.status) - statusRank(b.status) || a.fileName.localeCompare(b.fileName);
    }),
    secondPassFindings: secondPass.findings,
  };
}
