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

function stripTrailingQuestion(prompt: string): string {
  return prompt.trim().replace(/\?+$/, "").replace(/\.+$/, "").trim();
}

/** True when extraction left a sentence fragment instead of a noun phrase. */
export function topicLooksLikeClause(topic: string): boolean {
  const t = topic.trim();
  if (!t) return false;
  if (
    /^(?:you|we|they|i|users|customers|people|teams|staff|employees)\b/i.test(t)
  ) {
    return true;
  }
  // Bare finite verbs left after stripping “do/can you”
  if (
    /^(?:explain|know|inform|tell|ensure|understand|describe|disclose|communicate|test|identify|review|monitor|assess|evaluate|provide|conduct|perform)\b/i.test(
      t
    )
  ) {
    return true;
  }
  // Raw survey questions must never become finding subjects
  if (
    /^(?:do|does|did|is|are|was|were|has|have|had|can|could|should|will|would|what|how|when|where|which|who)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

/** Practice phrases (gerunds / process nouns) take singular agreement and no article. */
function isPracticeTopic(topic: string): boolean {
  const first = topic.split(/\s+/)[0] ?? "";
  if (/ing$/i.test(first)) return true;
  if (/(?:tion|sion|ment|ance|ence|ility|iness)$/i.test(first)) return true;
  return /^(?:review|use|oversight|inventory|documentation|notice|training|assurance|management|governance|control|monitoring|traceability|explainability)\b/i.test(
    topic
  );
}

/**
 * Map survey action verbs → practice noun phrases.
 * Empty string means the remainder is already the practice (e.g. “provide clear notices”).
 */
const VERB_TO_PRACTICE: Record<string, string> = {
  test: "testing of",
  tested: "testing of",
  identify: "identification of",
  identified: "identification of",
  review: "review of",
  reviewed: "review of",
  monitor: "monitoring of",
  monitored: "monitoring of",
  document: "documentation of",
  documented: "documentation of",
  assess: "assessment of",
  assessed: "assessment of",
  evaluate: "evaluation of",
  evaluated: "evaluation of",
  train: "training for",
  trained: "training for",
  define: "definition of",
  defined: "definition of",
  establish: "establishment of",
  established: "establishment of",
  implement: "implementation of",
  implemented: "implementation of",
  maintain: "maintenance of",
  maintained: "maintenance of",
  track: "tracking of",
  tracked: "tracking of",
  measure: "measurement of",
  measured: "measurement of",
  audit: "auditing of",
  audited: "auditing of",
  validate: "validation of",
  validated: "validation of",
  verify: "verification of",
  verified: "verification of",
  disclose: "disclosure of",
  disclosed: "disclosure of",
  notify: "notification to",
  notified: "notification to",
  inform: "informing of",
  informed: "informing of",
  provide: "",
  provided: "",
  ensure: "assurance that",
  ensured: "assurance that",
  require: "requirements for",
  required: "requirements for",
  conduct: "",
  conducted: "",
  perform: "",
  performed: "",
  use: "use of",
  used: "use of",
  apply: "application of",
  applied: "application of",
  enforce: "enforcement of",
  enforced: "enforcement of",
  approve: "approval of",
  approved: "approval of",
  assign: "assignment of",
  assigned: "assignment of",
  designate: "designation of",
  designated: "designation of",
  map: "mapping of",
  mapped: "mapping of",
  classify: "classification of",
  classified: "classification of",
  inventory: "inventory of",
  inventoried: "inventory of",
  log: "logging of",
  logged: "logging of",
  record: "recording of",
  recorded: "recording of",
  retain: "retention of",
  retained: "retention of",
  encrypt: "encryption of",
  encrypted: "encryption of",
  restrict: "restriction of",
  restricted: "restriction of",
  mitigate: "mitigation of",
  mitigated: "mitigation of",
  remediate: "remediation of",
  remediated: "remediation of",
  escalate: "escalation of",
  escalated: "escalation of",
  communicate: "communication of",
  communicated: "communication of",
  publish: "publication of",
  published: "publication of",
  share: "sharing of",
  shared: "sharing of",
  collect: "collection of",
  collected: "collection of",
  process: "processing of",
  processed: "processing of",
  govern: "governance of",
  governed: "governance of",
  oversee: "oversight of",
  overseen: "oversight of",
  manage: "management of",
  managed: "management of",
  control: "controls for",
  controlled: "controls for",
  protect: "protection of",
  protected: "protection of",
  secure: "security for",
  secured: "security for",
  detect: "detection of",
  detected: "detection of",
  prevent: "prevention of",
  prevented: "prevention of",
  respond: "response to",
  responded: "response to",
  investigate: "investigation of",
  investigated: "investigation of",
  report: "reporting of",
  reported: "reporting of",
  update: "updating of",
  updated: "updating of",
  explain: "plain-language explanation of",
  explained: "plain-language explanation of",
  confirm: "confirmation of",
  confirmed: "confirmation of",
  demonstrate: "demonstration of",
  demonstrated: "demonstration of",
  show: "evidence of",
  showed: "evidence of",
  shown: "evidence of",
};

function toGerund(verb: string): string {
  const v = verb.toLowerCase();
  if (v.endsWith("ing")) return v;
  if (v.endsWith("ie")) return `${v.slice(0, -2)}ying`;
  if (v.endsWith("ye")) return `${v}ing`;
  if (v.endsWith("e") && !v.endsWith("ee") && !v.endsWith("oe") && !v.endsWith("ye")) {
    return `${v.slice(0, -1)}ing`;
  }
  if (/[aeiou][^aeiou]w$/i.test(v)) return `${v}ing`;
  if (/[^aeiou][aeiou][^aeiou]$/i.test(v) && v.length >= 3) {
    return `${v}${v.slice(-1)}ing`;
  }
  return `${v}ing`;
}

function practiceFromVerbAndRest(verb: string, rest: string): string {
  const cleanedRest = rest
    .trim()
    .replace(/^(?:an?|the)\s+/i, "")
    .replace(/\s+/g, " ")
    // "which X could…" → "X that could…"
    .replace(/^which\s+/i, "")
    .replace(/^([^,]+?)\s+(could|can|may|might|will|would)\s+/i, "$1 that $2 ")
    .replace(/\s+[-–—]\s+((?:e\.g\.|eg\.|for example).+)$/i, " ($1)")
    .trim();
  if (!cleanedRest) return "";

  const key = verb.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(VERB_TO_PRACTICE, key)) {
    const mapped = VERB_TO_PRACTICE[key]!;
    if (!mapped) return cleanedRest;
    return `${mapped} ${cleanedRest}`.replace(/\s+/g, " ").trim();
  }

  return `${toGerund(key)} of ${cleanedRest}`.replace(/\s+/g, " ").trim();
}

/** Adjectives that describe a quality of the subject (Are X traceable?). */
const ADJECTIVE_TO_QUALITY: Record<string, string> = {
  traceable: "traceability of",
  explainable: "explainability of",
  interpretable: "interpretability of",
  accountable: "accountability for",
  transparent: "transparency of",
  auditable: "auditability of",
  reproducible: "reproducibility of",
  reliable: "reliability of",
  secure: "security of",
  private: "privacy of",
  fair: "fairness of",
  robust: "robustness of",
  available: "availability of",
  accessible: "accessibility of",
  compliant: "compliance of",
  governed: "governance of",
  monitored: "monitoring of",
  documented: "documentation of",
  defined: "definition of",
  established: "establishment of",
  implemented: "implementation of",
  maintained: "maintenance of",
  reviewed: "review of",
  approved: "approval of",
  tracked: "tracking of",
  audited: "auditing of",
  validated: "validation of",
  verified: "verification of",
  encrypted: "encryption of",
  classified: "classification of",
  inventoried: "inventory of",
  assessed: "assessment of",
  evaluated: "evaluation of",
  tested: "testing of",
  protected: "protection of",
  restricted: "restriction of",
  logged: "logging of",
  recorded: "recording of",
  retained: "retention of",
};

/**
 * Clean practice phrases so findings read as capabilities, not question scraps.
 * e.g. "human reviews before critical decisions are made" → "human review before critical decisions"
 */
function normalizePracticePhrase(topic: string): string {
  let text = topic.trim().replace(/\s+/g, " ");
  if (!text) return "";

  text = text
    .replace(/\s+(?:are|is|was|were)\s+made$/i, "")
    .replace(/\b(decisions?)\s+made\b/gi, "$1")
    .replace(/\s+in place$/i, "")
    .replace(/\bin use across the organi[sz]ation$/i, "")
    .trim();

  // "human reviews" as a practice → singular
  text = text.replace(
    /\b((?:human|manual|independent|peer|expert|management|board)\s+)reviews\b/gi,
    "$1review"
  );

  // Dangling participle/adjective left after a bad strip: "AI decisions traceable"
  const dangling = text.match(
    /^(.+?)\s+(traceable|explainable|interpretable|accountable|transparent|auditable|reproducible|reliable|documented|assessed|reviewed|monitored|encrypted|classified|approved|defined|established|implemented|maintained|tracked|audited|validated|verified|secured|protected|tested|inventoried|evaluated)$/i
  );
  if (dangling?.[1] && dangling[2]) {
    const quality = ADJECTIVE_TO_QUALITY[dangling[2].toLowerCase()];
    if (quality) {
      text = `${quality} ${dangling[1].trim()}`.replace(/\s+/g, " ").trim();
    }
  }

  return text;
}

const ACTOR =
  "(?:you|they|we|teams|leadership|staff|employees|the\\s+(?:organization|organisation|company|board|team)|your\\s+(?:organization|organisation|company|team))";

/**
 * Convert action-style survey prompts into practice noun phrases.
 * e.g. "Do you test AI systems for bias…?" → "testing of AI systems for bias…"
 */
function practiceTopicFromActionPrompt(prompt: string): string | null {
  const text = stripTrailingQuestion(prompt);
  if (!text) return null;

  let match = text.match(
    new RegExp(`^(?:have|has)\\s+${ACTOR}\\s+([a-z]+ed|[a-z]+en|[a-z]+)\\s+(.+)$`, "i")
  );
  if (match?.[1] && match[2]) {
    return practiceFromVerbAndRest(match[1], match[2]);
  }

  match = text.match(
    new RegExp(
      `^(?:do|does|can|could|would|should)\\s+${ACTOR}\\s+([a-z]+)\\s+(.+)$`,
      "i"
    )
  );
  if (match?.[1] && match[2]) {
    if (/^(?:have|has)$/i.test(match[1])) return null;
    return practiceFromVerbAndRest(match[1], match[2]);
  }

  match = text.match(
    new RegExp(`^(?:is|are)\\s+${ACTOR}\\s+able\\s+to\\s+([a-z]+)\\s+(.+)$`, "i")
  );
  if (match?.[1] && match[2]) {
    return practiceFromVerbAndRest(match[1], match[2]);
  }

  return null;
}

/**
 * Convert Is/Are property questions into practice phrases.
 * e.g. "Are AI decisions traceable?" → "traceability of AI decisions"
 * e.g. "Is every AI use case assessed before deployment?" → "assessment of every AI use case before deployment"
 */
function practiceTopicFromPropertyPrompt(prompt: string): string | null {
  const text = stripTrailingQuestion(prompt);
  if (!text) return null;

  // "Are human reviews in place before critical decisions are made?"
  let match = text.match(
    /^(?:is|are)\s+(.+?)\s+in place\s+(before|when|after|during|for)\s+(.+)$/i
  );
  if (match?.[1] && match[2] && match[3]) {
    const subject = normalizePracticePhrase(match[1]);
    const rest = normalizePracticePhrase(match[3]);
    return normalizePracticePhrase(`${subject} ${match[2]} ${rest}`);
  }

  match = text.match(/^is\s+(.+?)\s+inventoried and classified(?:\s+today|\s+currently)?$/i);
  if (match?.[1]) {
    return `inventory and classification of ${match[1].trim()}`;
  }

  const qualities = Object.keys(ADJECTIVE_TO_QUALITY).join("|");
  match = text.match(new RegExp(`^(?:is|are)\\s+(.+?)\\s+(${qualities})(?:\\s+(.+))?$`, "i"));
  if (match?.[1] && match[2]) {
    const subject = match[1].trim().replace(/^(?:an?|the)\s+/i, "");
    const quality = ADJECTIVE_TO_QUALITY[match[2].toLowerCase()];
    if (!quality) return null;
    if (/^there\b/i.test(subject)) return null;
    const tail = match[3]?.trim() ?? "";
    return normalizePracticePhrase(
      `${quality} ${subject}${tail ? ` ${tail}` : ""}`.replace(/\s+/g, " ").trim()
    );
  }

  // "Are human reviews before critical decisions are made?"
  match = text.match(/^(?:is|are)\s+(.+?)\s+(before|when|after|during)\s+(.+)$/i);
  if (match?.[1] && match[2] && match[3]) {
    const subject = normalizePracticePhrase(match[1]);
    if (/\b(?:traceable|documented|assessed)$/i.test(subject)) return null;
    const rest = normalizePracticePhrase(match[3]);
    return normalizePracticePhrase(`${subject} ${match[2]} ${rest}`);
  }

  return null;
}

/** Strip survey phrasing so findings read as statements, not questions. */
export function packPromptToTopic(prompt: string): string {
  let text = stripTrailingQuestion(prompt);
  if (!text) return "";

  const rules: Array<(input: string) => string | null> = [
    (input) => {
      const match = input.match(
        /^(?:can|do|could|would)\s+you\s+explain(?:,?\s*in plain language,?)?\s+how\s+(.+)$/i
      );
      return match?.[1]
        ? `plain-language explanations of how ${match[1].trim()}`
        : null;
    },
    (input) => {
      const match = input.match(
        /^do\s+(?:users(?:\s+or\s+customers)?|customers(?:\s+or\s+users)?|people)\s+know\s+when\s+(.+)$/i
      );
      return match?.[1]
        ? `clear notice to users and customers when ${match[1].trim()}`
        : null;
    },
    (input) => {
      const match = input.match(
        /^does the board (?:currently |regularly )?oversee (.+?)(?: with (?:an? |the )?documented mandate)?$/i
      );
      if (!match?.[1]) return null;
      const focus = match[1].trim();
      return input.toLowerCase().includes("documented mandate")
        ? `documented board oversight of ${focus}`
        : `board oversight of ${focus}`;
    },
    (input) => {
      const match = input.match(
        /^does the board (?:currently |regularly )?(?:have|maintain|oversee|review|approve|establish) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    // Is/Are property questions before generic noun extraction
    (input) => practiceTopicFromPropertyPrompt(input),
    (input) => {
      const match = input.match(
        /^does (?:the |your )?(?:organization|organisation|company|org(?:anization)?) (?:currently )?(?:have|maintain|perform|conduct|use|implement|document|track|review|establish|define|operate|apply|enforce) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(/^is (?:an? |the )?(.+?) (?:in place)(?: today| currently)?$/i);
      return match?.[1] ? normalizePracticePhrase(match[1]) : null;
    },
    (input) => {
      const match = input.match(/^are (?:an? |the )?(.+?) (?:in place)(?: today| currently)?$/i);
      return match?.[1] ? normalizePracticePhrase(match[1]) : null;
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
        /^has (?:the |your )?(?:organization|organisation|company) (?:already )?(?:established|implemented|documented|defined|adopted|created) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^have (?:you|they|teams|leadership|the organization|the organisation) (?:already )?(?:established|implemented|documented|defined|adopted|created) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => {
      const match = input.match(
        /^do (?:you|they|teams|leadership|the organization|the organisation) (?:currently )?(?:have|maintain) (?:an? |the )?(.+)$/i
      );
      return match?.[1] ? normalizePracticePhrase(match[1]) : null;
    },
    (input) => {
      const match = input.match(
        /^can (?:you|the organization|the organisation|leadership) (?:demonstrate|show|confirm|verify) (?:that )?(?:an? |the )?(.+)$/i
      );
      return match?.[1] ?? null;
    },
    (input) => practiceTopicFromActionPrompt(input),
    (input) => {
      const match = input.match(
        /^does (?:the |your )?(.+?) (?:have|maintain|oversee|perform|conduct|use|implement|document|track|review|establish|define|operate|apply|enforce) (?:an? |the )?(.+)$/i
      );
      return match?.[2] ?? null;
    },
    (input) => {
      const match = input.match(
        /^what (?:is|are) (?:the |your )?(?:organization'?s?|organisation'?s?|company'?s?) (.+)$/i
      );
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
    // Convert — never strip auxiliaries into ungrammatical fragments
    const converted =
      practiceTopicFromPropertyPrompt(text) || practiceTopicFromActionPrompt(text);
    if (converted) {
      text = converted;
    } else {
      return "";
    }
  }

  text = normalizePracticePhrase(text);

  if (topicLooksLikeClause(text)) {
    return "";
  }

  // Reject dangling adjective/participle scraps
  if (
    /\b(?:traceable|explainable|documented|assessed|reviewed|monitored|tested|classified|inventoried)$/i.test(
      text
    ) &&
    !/^(?:traceability|explainability|documentation|assessment|review|monitoring|testing|classification|inventory)\b/i.test(
      text
    )
  ) {
    return "";
  }

  text = text.replace(/\s+[-–—]\s+e\.g\./gi, ", e.g.");
  text = polishFindingTopic(text);
  return text;
}

/** Light grammar cleanup for topics extracted from imperfect survey prompts. */
export function polishFindingTopic(topic: string): string {
  let text = topic.trim();
  if (!text) return "";

  text = text
    .replace(/\bcentralize\b/gi, "centralized")
    .replace(/\bdocumente\b/gi, "documented")
    .replace(/\binventorie\b/gi, "inventory")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "")
    .trim();

  // Prefer "complete and centralized" over "complete, centralized"
  text = text.replace(/\bcomplete,\s+centralized\b/gi, "complete and centralized");

  if (text.length > 0 && !/^[A-Z]{2,}/.test(text)) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }
  return text;
}

const MASS_NOUN_PATTERN =
  /\b(?:oversight|documentation|transparency|accountability|governance|compliance|monitoring|traceability|explainability|coverage|assurance|resilience|security|privacy|notice|explanations?|assessment|identification|testing|review)\b/i;

const PLURAL_PATTERN =
  /\b(?:practices|controls|policies|procedures|roles|responsibilities|disclosures|notices|inventories|systems|models|tools|agents|use cases|records|logs|reviews|assessments|explanations|requirements|paths)\b/i;

function topicLooksPlural(topic: string): boolean {
  if (isPracticeTopic(topic)) return false;
  // Use the grammatical head (before of/for/in/…) so "inventory of AI systems" stays singular.
  const head =
    topic.split(/\b(?:for|of|in|across|used by|with|within|by|to|when|so)\b/i)[0]?.trim() ??
    topic;
  // Lists like "tools, models, and agents"
  if (/,/.test(head)) return true;
  return PLURAL_PATTERN.test(head);
}

function withIndefiniteArticle(topic: string): string {
  if (/^(?:a|an|the)\b/i.test(topic)) return topic;
  if (topicLooksLikeClause(topic) || isPracticeTopic(topic)) return topic;
  // Determiners that must never take a/an: "an every…" is always wrong
  if (/^(?:every|each|all|any|no|some|most|few|several|both|many|much)\b/i.test(topic)) {
    return topic;
  }
  const head =
    topic.split(/\b(?:for|of|in|across|used by|with|within|by|to|when|so|before|after|during)\b/i)[0]?.trim() ??
    topic;
  if (topicLooksPlural(topic) || MASS_NOUN_PATTERN.test(head)) return topic;

  const headTail = head.split(/\s+/).pop() ?? "";
  const countableTail =
    /^(?:inventory|playbook|mandate|policy|procedure|framework|register|catalog|programme|program|committee|charter|plan|standard|control|process|assessment|review)$/i.test(
      headTail
    );

  // Noun compounds ("inventory and classification") omit the article.
  if (/\band\b/i.test(head) && !countableTail) return topic;

  // Never "an users" / "an AI decisions"
  if (/^(?:users|user|AI)\b/i.test(topic)) {
    return topic;
  }

  const article = /^[aeiou]/i.test(topic) ? "an" : "a";
  return `${article} ${topic}`;
}

function sentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Full finding sentences for prompts that are not “does org have X?” noun questions.
 * Returns null when the generic noun-phrase template should be used instead.
 */
export function draftFindingFromPrompt(
  prompt: string,
  answer: PillarQuestionAnswer
): string | null {
  const text = stripTrailingQuestion(prompt);
  if (!text) return null;

  const explainHow = text.match(
    /^(?:can|do|could|would)\s+you\s+explain(?:,?\s*in plain language,?)?\s+how\s+(.+)$/i
  );
  if (explainHow?.[1]) {
    const focus = explainHow[1].trim().replace(/\s+/g, " ");
    switch (answer) {
      case "yes":
        return `Plain-language explanations of how ${focus} are available.`;
      case "no":
        return `Plain-language explanations of how ${focus} have not been established.`;
      case "partial":
        return `Plain-language explanations of how ${focus} are underway but not yet complete.`;
      case "dont_know":
        return `Whether plain-language explanations of how ${focus} exist still needs confirmation.`;
    }
  }

  const usersKnowWhen = text.match(
    /^do\s+(?:users(?:\s+or\s+customers)?|customers(?:\s+or\s+users)?|people)\s+know\s+when\s+(.+)$/i
  );
  if (usersKnowWhen?.[1]) {
    const when = usersKnowWhen[1]
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\bthey(?:'re| are)\b/gi, "they are");
    switch (answer) {
      case "yes":
        return `Users and customers know when ${when}.`;
      case "no":
        return `Users and customers are not clearly informed when ${when}.`;
      case "partial":
        return `Users and customers are only partly informed when ${when}.`;
      case "dont_know":
        return `Whether users and customers know when ${when} still needs confirmation.`;
    }
  }

  return null;
}

/** Prefer admin help text when it is already a statement; otherwise derive from the prompt. */
export function resolveFindingTopic(prompt: string, helpText?: string | null): string {
  const help = helpText?.trim();
  if (
    help &&
    !/\?\s*$/.test(help) &&
    !/^(?:does|do|is|are|has|have|can|could|should|will|would|what|how|when|where|which|who)\b/i.test(
      help
    ) &&
    !topicLooksLikeClause(help)
  ) {
    const cleaned = polishFindingTopic(help.replace(/\.+$/, "").trim());
    if (cleaned) return cleaned;
  }
  return packPromptToTopic(prompt);
}

/**
 * Client-facing finding line — professionally drafted from the answer,
 * not a raw question glued onto a template.
 */
export function packAnswerFindingSummary(
  prompt: string,
  answer: PillarQuestionAnswer,
  helpText?: string | null
): string {
  const drafted = draftFindingFromPrompt(prompt, answer);
  if (drafted) return drafted;

  const topic = resolveFindingTopic(prompt, helpText);
  // Absolute last resort: still convert action prompts; never echo the question.
  const base =
    topic && !topicLooksLikeClause(topic)
      ? topic
      : practiceTopicFromActionPrompt(prompt) ||
        polishFindingTopic(
          stripTrailingQuestion(prompt)
            .replace(
              /^(?:do|does|did|is|are|was|were|has|have|had|can|could|should|will|would)\s+(?:you|they|we|teams|leadership|the\s+(?:organization|organisation|company|board)|your\s+(?:organization|organisation|company|team))\s+/i,
              ""
            )
            .trim()
        ) ||
        "this practice";

  const safeTopic = topicLooksLikeClause(base) ? "this practice" : base;
  const subject = withIndefiniteArticle(safeTopic);
  const Subject = sentenceCase(subject);
  const plural = topicLooksPlural(safeTopic);

  switch (answer) {
    case "yes":
      return plural ? `${Subject} are in place.` : `${Subject} is in place.`;
    case "no":
      return plural
        ? `${Subject} have not been established.`
        : `${Subject} has not been established.`;
    case "partial":
      return plural
        ? `${Subject} are underway but not yet complete.`
        : `${Subject} is underway but not yet complete.`;
    case "dont_know":
      return `The status of ${subject} still needs confirmation.`;
  }
}

export type PackFinding = {
  pillarId: string;
  pillarLabel: string;
  prompt: string;
  summary: string;
  /** Why this finding matters for leadership. */
  insight: string;
  /** Concrete next action. */
  recommendation: string;
  severity: "critical" | "high" | "medium";
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
