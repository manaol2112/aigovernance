/** Client-safe pillar questionnaire types — no Prisma. */

import { RISK_PILLARS } from "@/lib/risk-pillars";

export const QUESTION_PACK_PRODUCTS = ["maturity_assessment", "guided_workshop"] as const;
export type QuestionPackProduct = (typeof QUESTION_PACK_PRODUCTS)[number];

export const QUESTION_PACK_PRODUCT_META: Record<
  QuestionPackProduct,
  { label: string; shortLabel: string }
> = {
  maturity_assessment: {
    label: "Maturity assessment",
    shortLabel: "Assessment",
  },
  guided_workshop: {
    label: "Guided workshop",
    shortLabel: "Workshop",
  },
};

export function isQuestionPackProduct(value: unknown): value is QuestionPackProduct {
  return typeof value === "string" && (QUESTION_PACK_PRODUCTS as readonly string[]).includes(value);
}

export function questionPackProductFromRoute(
  product: "maturity" | "workshop"
): QuestionPackProduct {
  return product === "workshop" ? "guided_workshop" : "maturity_assessment";
}

export const PILLAR_QUESTION_ANSWERS = ["yes", "no", "partial", "dont_know"] as const;
export type PillarQuestionAnswer = (typeof PILLAR_QUESTION_ANSWERS)[number];

export const PILLAR_QUESTION_ANSWER_META: Record<
  PillarQuestionAnswer,
  { label: string; shortLabel: string; score: number | null; tone: "yes" | "partial" | "no" | "unknown" }
> = {
  yes: { label: "Yes", shortLabel: "Yes", score: 100, tone: "yes" },
  partial: { label: "Partial", shortLabel: "Partial", score: 50, tone: "partial" },
  no: { label: "No", shortLabel: "No", score: 0, tone: "no" },
  dont_know: { label: "Don't know", shortLabel: "Don't know", score: null, tone: "unknown" },
};

export function isPillarQuestionAnswer(value: unknown): value is PillarQuestionAnswer {
  return typeof value === "string" && (PILLAR_QUESTION_ANSWERS as readonly string[]).includes(value);
}

/** Strip survey phrasing so findings read as statements, not questions. */
export function packPromptToTopic(prompt: string): string {
  let text = prompt.trim().replace(/\?+$/, "").trim();
  if (!text) return "";

  const rules: Array<(input: string) => string | null> = [
    (input) => {
      const match = input.match(
        /^does the board (?:currently |regularly )?(?:have|maintain|oversee|review|approve|establish) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^does (?:the |your )?(?:organization|company|org(?:anization)?) (?:currently )?(?:have|maintain|perform|conduct|use|implement|document|track|review|establish|define|operate|apply|enforce) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^is (?:an? |the )?(.+?) (?:in place|documented|defined|established|implemented|maintained|reviewed|approved|inventoried(?: and classified)?|classified(?: and inventoried)?|tracked|monitored)(?: today| currently)?$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^are (?:an? |the )?(.+?) (?:in place|documented|defined|established|implemented|maintained|reviewed|approved|inventoried(?: and classified)?|classified(?: and inventoried)?|tracked|monitored)(?: today| currently)?$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(/^is there (?:an? |the )?(.+)$/i);
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(/^are there (?:an? |the )?(.+)$/i);
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^has (?:the |your )?(?:organization|company) (?:already )?(?:established|implemented|documented|defined|adopted|created) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^have (?:you|they|teams|leadership|the organization) (?:already )?(?:established|implemented|documented|defined|adopted|created) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^do (?:you|they|teams|leadership|the organization) (?:currently )?(?:have|maintain|perform|conduct|use|implement|document|track|review) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^can (?:you|the organization|leadership) (?:demonstrate|show|confirm|verify) (?:that )?(?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^does (?:the |your )?(.+?) (?:have|maintain|oversee|perform|conduct|use|implement|document|track|review|establish|define|operate|apply|enforce) (?:an? |the )?(.+)$/i
      );
      return match?.[2] ?? null;
    },
    (input) => {
      const match = input.match(/^what (?:is|are) (?:the |your )?(?:organization'?s?|company'?s?) (.+)$/i);
      return match?.[1] ?? null;
    },
  ];

  for (const rule of rules) {
    const result = rule(text);
    if (result?.trim()) {
      text = result.trim();
      break;
    }
  }

  if (/^(?:does|do|is|are|has|have|can|could|should|will|would|what|how|when|where|which|who)\b/i.test(text)) {
    text = text
      .replace(
        /^(?:does|do|is|are|has|have|can|could|should|will|would) (?:the |your |an? )?/i,
        ""
      )
      .trim();
  }

  text = text.replace(/\s+in place$/i, "").trim();
  if (text.length > 0) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }
  return text;
}

/** Prefer admin help text when it is already a statement; otherwise derive from the prompt. */
export function resolveFindingTopic(prompt: string, helpText?: string | null): string {
  const help = helpText?.trim();
  if (
    help &&
    !/\?\s*$/.test(help) &&
    !/^(?:does|do|is|are|has|have|can|could|should|will|would|what|how|when|where|which|who)\b/i.test(
      help
    )
  ) {
    const cleaned = help.replace(/\.+$/, "").trim();
    if (cleaned) {
      return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    }
  }
  return packPromptToTopic(prompt);
}

/** Client-facing finding line derived from the answer, not the raw question. */
export function packAnswerFindingSummary(
  prompt: string,
  answer: PillarQuestionAnswer,
  helpText?: string | null
): string {
  const topic = resolveFindingTopic(prompt, helpText);
  const subject = topic
    ? topic.charAt(0).toUpperCase() + topic.slice(1)
    : prompt.trim().replace(/\?+$/, "");

  switch (answer) {
    case "yes":
      return `${subject} is in place.`;
    case "no":
      return `${subject} is not yet in place.`;
    case "partial":
      return `${subject} is underway but not yet complete.`;
    case "dont_know":
      return `${subject} still needs confirmation.`;
  }
}

export type PackFinding = {
  pillarLabel: string;
  prompt: string;
  summary: string;
};

export function isQuestionCatalogPack(source: string | null | undefined): boolean {
  return source === "pack";
}

export type PackQuestionInput = {
  id?: string;
  pillarId: string;
  prompt: string;
  helpText?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export type PackSnapshot = {
  id: string;
  sourceQuestionId: string | null;
  pillarId: string;
  pillarLabel: string;
  prompt: string;
  helpText: string | null;
  sortOrder: number;
};

export type PackAnswerRecord = {
  questionId: string;
  answer: PillarQuestionAnswer;
  notes?: string | null;
};

const PILLAR_BY_ID = new Map(RISK_PILLARS.map((pillar) => [pillar.id, pillar]));
const PILLAR_BY_LABEL = new Map(
  RISK_PILLARS.map((pillar) => [pillar.label.trim().toLowerCase(), pillar])
);

export function isRiskPillarId(pillarId: string): boolean {
  return PILLAR_BY_ID.has(pillarId);
}

export function resolvePackPillarId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (PILLAR_BY_ID.has(trimmed)) return trimmed;
  return PILLAR_BY_LABEL.get(trimmed.toLowerCase())?.id ?? null;
}

export function packPillarLabel(pillarId: string): string {
  return PILLAR_BY_ID.get(pillarId)?.label ?? pillarId;
}

export function packCriticality(pillarId: string): "critical" | "high" | "medium" {
  return PILLAR_BY_ID.get(pillarId)?.criticality ?? "medium";
}

export function activePackQuestions(questions: PackQuestionInput[]): PackQuestionInput[] {
  return questions.filter((question) => question.active !== false && question.prompt.trim().length > 0);
}

export function packPillarCoverage(questions: PackQuestionInput[]): {
  coveredPillarIds: string[];
  missingPillarIds: string[];
  complete: boolean;
  questionCount: number;
} {
  const active = activePackQuestions(questions);
  const covered = new Set(active.map((question) => question.pillarId).filter(isRiskPillarId));
  const missingPillarIds = RISK_PILLARS.map((pillar) => pillar.id).filter((id) => !covered.has(id));
  return {
    coveredPillarIds: RISK_PILLARS.map((pillar) => pillar.id).filter((id) => covered.has(id)),
    missingPillarIds,
    complete: missingPillarIds.length === 0 && active.length > 0,
    questionCount: active.length,
  };
}

export function sortPackQuestions(questions: PackQuestionInput[]): PackQuestionInput[] {
  const pillarIndex = new Map(RISK_PILLARS.map((pillar, index) => [pillar.id, index]));
  return [...questions].sort((a, b) => {
    const pillarDelta = (pillarIndex.get(a.pillarId) ?? 99) - (pillarIndex.get(b.pillarId) ?? 99);
    if (pillarDelta !== 0) return pillarDelta;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function buildPackSnapshots(
  questions: PackQuestionInput[]
): Omit<PackSnapshot, "id">[] {
  return sortPackQuestions(activePackQuestions(questions)).map((question, index) => ({
    sourceQuestionId: question.id ?? null,
    pillarId: question.pillarId,
    pillarLabel: packPillarLabel(question.pillarId),
    prompt: question.prompt.trim(),
    helpText: question.helpText?.trim() || null,
    sortOrder: index,
  }));
}

export function hydratePackSnapshots(
  rows: Array<{
    id: string;
    sourceQuestionId?: string | null;
    pillarId: string;
    prompt: string;
    helpText?: string | null;
    sortOrder: number;
  }>
): PackSnapshot[] {
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      sourceQuestionId: row.sourceQuestionId ?? null,
      pillarId: row.pillarId,
      pillarLabel: packPillarLabel(row.pillarId),
      prompt: row.prompt,
      helpText: row.helpText ?? null,
      sortOrder: row.sortOrder,
    }));
}

export function computePackProgress(
  snapshots: Pick<PackSnapshot, "id">[],
  answers: PackAnswerRecord[]
): {
  total: number;
  answered: number;
  remaining: number;
  progressPct: number;
  allComplete: boolean;
} {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const answered = snapshots.filter((snapshot) => answeredIds.has(snapshot.id)).length;
  const total = snapshots.length;
  return {
    total,
    answered,
    remaining: Math.max(0, total - answered),
    progressPct: total > 0 ? Math.round((answered / total) * 100) : 0,
    allComplete: total > 0 && answered === total,
  };
}
