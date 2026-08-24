import { createHash } from "crypto";
import { callOpenAIJson } from "@/lib/openai-client";
import {
  packAnswerFindingSummary,
  type PackFinding,
  type PillarQuestionAnswer,
} from "@/lib/pillar-questionnaire";
import { buildPackFindingInsight } from "@/lib/pack-finding-insights";
import {
  buildPackReport,
  type PackReport,
} from "@/lib/pillar-questionnaire-scoring";

export type PackFindingDraftRequest = {
  id: string;
  prompt: string;
  helpText?: string | null;
  answer: PillarQuestionAnswer;
};

type AiFindingDraft = {
  id: string;
  summary: string;
  topic?: string;
};

type AiDraftResponse = {
  findings?: AiFindingDraft[];
};

const draftCache = new Map<string, { summary: string; topic: string }>();

const SYSTEM_PROMPT = `You write client-facing AI-governance maturity findings.

Return JSON only:
{ "findings": [ { "id": string, "summary": string, "topic": string } ] }

Rules for each finding:
1. "summary" is ONE polished sentence. Statement form only — never a question.
2. "topic" is a short noun phrase naming the practice (for reuse in insights), e.g. "traceability of AI decisions".
3. Never start summary with Do, Does, Did, Is, Are, Have, Has, Can, Could, Would, Should, What, How, When, Where, Which, or Who.
4. Never paste the raw survey question into the summary.
5. Never write broken grammar such as "An every…", "An AI decisions…", or dangling adjectives like "AI decisions traceable".
6. Match the answer meaning with natural professional English:
   - yes: confirm the practice is in place (prefer ending "is in place." / "are in place." when it fits).
   - no: state clearly it is missing (prefer "has not been established." / "have not been established." when it fits; awareness/disclosure items may use "are not clearly informed…" style).
   - partial: underway but incomplete.
   - dont_know: still needs confirmation.
7. Keep meaning faithful to the question. Do not invent unrelated controls.
8. Prefer practice phrasing: "Assessment of every AI use case before deployment has not been established." not "Is every AI use case assessed…".
9. Prefer singular practice nouns when describing a capability: "Human review before critical decisions is in place."`;

function cacheKey(item: PackFindingDraftRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        prompt: item.prompt.trim(),
        helpText: item.helpText?.trim() ?? "",
        answer: item.answer,
      })
    )
    .digest("hex");
}

/** Reject AI drafts that still look like questions or known grammar failures. */
export function isValidPackFindingAiSummary(
  summary: string,
  answer: PillarQuestionAnswer
): boolean {
  const text = summary.trim();
  if (text.length < 12 || text.length > 320) return false;
  if (!/[.!?]$/.test(text)) return false;
  if (/\?$/.test(text)) return false;
  if (
    /^(?:do|does|did|is|are|was|were|has|have|had|can|could|should|will|would|what|how|when|where|which|who)\b/i.test(
      text
    )
  ) {
    return false;
  }
  if (/\bAn every\b/i.test(text)) return false;
  if (/\bAn AI decisions\b/i.test(text)) return false;
  if (/\b(?:traceable|assessed|documented|reviewed|monitored)\s+(?:is|are|has|have)\b/i.test(text)) {
    return false;
  }
  if (/\bare made are\b/i.test(text)) return false;
  if (/^(?:Not yet in place|Confirmed in place|Underway|Still to confirm):/i.test(text)) {
    return false;
  }

  // Soft check: answer should be reflected somehow
  const lower = text.toLowerCase();
  if (answer === "no" && /\b(?:is in place|are in place)\.\s*$/i.test(text) && !/\bnot\b/i.test(lower)) {
    return false;
  }
  if (answer === "yes" && /\b(?:has not been established|have not been established|not clearly informed|not yet)\b/i.test(lower)) {
    return false;
  }

  return true;
}

function fallbackDraft(item: PackFindingDraftRequest): { summary: string; topic: string } {
  const summary = packAnswerFindingSummary(item.prompt, item.answer, item.helpText);
  const topic =
    summary
      .replace(/^the status of\s+/i, "")
      .replace(/\s+still needs confirmation\.$/i, "")
      .replace(/\s+have not been established\.$/i, "")
      .replace(/\s+has not been established\.$/i, "")
      .replace(/\s+are underway but not yet complete\.$/i, "")
      .replace(/\s+is underway but not yet complete\.$/i, "")
      .replace(/\s+are in place\.$/i, "")
      .replace(/\s+is in place\.$/i, "")
      .replace(/^users and customers are not clearly informed when\s+/i, "clear notice to users and customers when ")
      .replace(/^users and customers know when\s+/i, "clear notice to users and customers when ")
      .trim() || "this practice";
  return { summary, topic };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Draft finding summaries with OpenAI (batched). Falls back per-item to rule-based copy.
 * Results are cached in-memory for the process lifetime.
 */
export async function draftPackFindingSummariesWithAI(
  items: PackFindingDraftRequest[]
): Promise<Map<string, { summary: string; topic: string }>> {
  const results = new Map<string, { summary: string; topic: string }>();
  if (items.length === 0) return results;

  const pending: PackFindingDraftRequest[] = [];
  for (const item of items) {
    const key = cacheKey(item);
    const cached = draftCache.get(key);
    if (cached) {
      results.set(item.id, cached);
    } else {
      pending.push(item);
    }
  }

  if (pending.length === 0) return results;

  if (!process.env.OPENAI_API_KEY) {
    for (const item of pending) {
      const draft = fallbackDraft(item);
      results.set(item.id, draft);
      draftCache.set(cacheKey(item), draft);
    }
    return results;
  }

  for (const batch of chunk(pending, 24)) {
    const user = JSON.stringify(
      {
        findings: batch.map((item) => ({
          id: item.id,
          answer: item.answer,
          question: item.prompt,
          helpText: item.helpText?.trim() || null,
        })),
      },
      null,
      2
    );

    const ai = await callOpenAIJson<AiDraftResponse>({
      system: SYSTEM_PROMPT,
      user: `Draft professional finding statements for each item.\n\n${user}`,
      temperature: 0,
      maxTokens: 4_000,
    });

    const byId = new Map<string, AiFindingDraft>();
    if (ai.ok && Array.isArray(ai.data.findings)) {
      for (const row of ai.data.findings) {
        if (row?.id && typeof row.summary === "string") {
          byId.set(row.id, row);
        }
      }
    }

    for (const item of batch) {
      const row = byId.get(item.id);
      const summary = row?.summary?.trim() ?? "";
      const topic = row?.topic?.trim() ?? "";
      const draft =
        summary && isValidPackFindingAiSummary(summary, item.answer)
          ? {
              summary,
              topic: topic || fallbackDraft(item).topic,
            }
          : fallbackDraft(item);

      results.set(item.id, draft);
      draftCache.set(cacheKey(item), draft);
    }
  }

  return results;
}

function findingDraftId(bucket: string, index: number, finding: PackFinding): string {
  return createHash("sha1")
    .update(`${bucket}|${index}|${finding.pillarId}|${finding.prompt}`)
    .digest("hex")
    .slice(0, 16);
}

function applyDraftsToFindings(
  findings: PackFinding[],
  answer: PillarQuestionAnswer,
  bucket: string,
  drafts: Map<string, { summary: string; topic: string }>
): PackFinding[] {
  return findings.map((finding, index) => {
    const id = findingDraftId(bucket, index, finding);
    const draft = drafts.get(id);
    const summary = draft?.summary ?? finding.summary;
    const enriched = buildPackFindingInsight({
      pillarId: finding.pillarId,
      summary,
      answer,
      topic: draft?.topic,
    });
    return {
      ...finding,
      summary,
      insight: enriched.insight,
      recommendation: enriched.recommendation,
      severity: enriched.severity,
    };
  });
}

/** Replace rule-based finding wording with AI drafts when available. */
export async function enrichPackReportFindingsWithAI(report: PackReport): Promise<PackReport> {
  const requests: PackFindingDraftRequest[] = [
    ...report.gaps.map((finding, index) => ({
      id: findingDraftId("gap", index, finding),
      prompt: finding.prompt,
      answer: "no" as const,
    })),
    ...report.partials.map((finding, index) => ({
      id: findingDraftId("partial", index, finding),
      prompt: finding.prompt,
      answer: "partial" as const,
    })),
    ...report.strengths.map((finding, index) => ({
      id: findingDraftId("strength", index, finding),
      prompt: finding.prompt,
      answer: "yes" as const,
    })),
    ...report.followUps.map((finding, index) => ({
      id: findingDraftId("follow", index, finding),
      prompt: finding.prompt,
      answer: "dont_know" as const,
    })),
  ];

  if (requests.length === 0) return report;

  const drafts = await draftPackFindingSummariesWithAI(requests);

  return {
    ...report,
    gaps: applyDraftsToFindings(report.gaps, "no", "gap", drafts),
    partials: applyDraftsToFindings(report.partials, "partial", "partial", drafts),
    strengths: applyDraftsToFindings(report.strengths, "yes", "strength", drafts),
    followUps: applyDraftsToFindings(report.followUps, "dont_know", "follow", drafts),
  };
}

/** Sync build + async AI wording pass. */
export async function buildPackReportWithAiDrafts(
  input: Parameters<typeof buildPackReport>[0]
): Promise<PackReport> {
  return enrichPackReportFindingsWithAI(buildPackReport(input));
}
