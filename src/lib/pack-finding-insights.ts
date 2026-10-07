import { findPackPillar } from "@/lib/pack-pillar-catalog";
import type { PillarQuestionAnswer } from "@/lib/pillar-questionnaire";

type PostureTone = "critical" | "developing" | "defined" | "leading";

/** What is at stake when this pillar is weak. */
const PILLAR_STAKES: Record<string, string> = {
  governance:
    "AI decisions stay informal and hard to defend without clear ownership and board visibility",
  compliance:
    "audits slow down, remediation costs rise, and regulatory exposure grows without documentation and traceability",
  "safety-reliability":
    "unreliable or unsafe outcomes are more likely to reach customers and production systems",
  oversight:
    "incidents are harder to detect, contain, and escalate before damage spreads",
  systemic:
    "downstream risk can scale across partners and products before anyone sees the signal",
  "supply-chain":
    "vendors and models can import risk you cannot see — or transfer — without disciplined diligence",
  transparency:
    "trust erodes with users, customers, and regulators when questions arrive mid-incident",
  fairness:
    "bias and rights impacts create legal, brand, and customer-harm exposure that compounds over time",
  "privacy-data":
    "privacy, retention, and lawful-use risk stay open across the model lifecycle",
  workforce:
    "teams cannot operate AI controls consistently as usage expands",
  "financial-resilience":
    "AI disruption can hit continuity, cost, and recovery timelines before finance and ops are ready",
  "human-capital":
    "teams cannot operate AI controls consistently as usage expands",
  "regulatory-financial":
    "regulatory exposure and financial impact stay open without clear ownership and controls",
  "operational-risk":
    "incidents are harder to detect, contain, and escalate before damage spreads",
  "ecosystem-risk":
    "partners and platforms can import risk you cannot see — or transfer — without disciplined diligence",
  "technology-risk":
    "unreliable, insecure, or poorly governed technology outcomes are more likely to reach production",
  "compliance-risk":
    "audits slow down, remediation costs rise, and compliance exposure grows without documentation and evidence",
};

/** What “strong” looks like in this pillar — client-facing. */
const PILLAR_STRENGTHS: Record<string, string> = {
  governance: "Ownership and oversight look solid enough to steer AI decisions with accountability",
  compliance: "Documentation and traceability look ready to support audit and quality conversations",
  "safety-reliability": "Safety and reliability practices look strong enough to reduce operational surprises",
  oversight: "Human oversight and monitoring look capable of catching issues before they escalate",
  systemic: "Downstream and systemic-risk awareness looks relatively mature",
  "supply-chain": "Vendor and model diligence looks established enough to reduce imported risk",
  transparency: "Disclosures and explainability look strong enough to support trust under scrutiny",
  fairness: "Bias and rights safeguards look relatively mature",
  "privacy-data": "Data stewardship for AI looks solid enough to support lawful, controlled use",
  workforce: "Skills and capacity look ready to operate AI controls as usage grows",
  "financial-resilience": "Continuity and financial resilience look prepared for AI-related disruption",
  "human-capital": "Skills and capacity look ready to operate AI controls as usage grows",
  "regulatory-financial": "Regulatory and financial risk controls look relatively mature",
  "operational-risk": "Operational controls look capable of catching issues before they escalate",
  "ecosystem-risk": "Ecosystem and partner diligence looks established enough to reduce imported risk",
  "technology-risk": "Technology risk practices look strong enough to reduce operational surprises",
  "compliance-risk": "Compliance documentation and evidence look ready to support audit conversations",
};

const PILLAR_OWNERS: Record<string, string> = {
  governance: "executive sponsor / company secretary",
  compliance: "compliance lead",
  "safety-reliability": "AI risk or engineering lead",
  oversight: "operations / risk owner",
  systemic: "product or model risk owner",
  "supply-chain": "procurement / third-party risk",
  transparency: "product or communications owner",
  fairness: "responsible AI / legal partner",
  "privacy-data": "privacy or data governance lead",
  workforce: "people / L&D partner",
  "financial-resilience": "business continuity / finance partner",
  "human-capital": "people / L&D partner",
  "regulatory-financial": "compliance / finance partner",
  "operational-risk": "operations / risk owner",
  "ecosystem-risk": "procurement / partner risk",
  "technology-risk": "AI risk or engineering lead",
  "compliance-risk": "compliance lead",
};

const POSTURE_HEADLINE: Record<PostureTone | "unknown", string> = {
  critical: "Early stage",
  developing: "Building",
  defined: "Established",
  leading: "Strong",
  unknown: "To confirm",
};

function pillarStake(pillarId: string): string {
  return (
    PILLAR_STAKES[pillarId] ??
    "responsible AI practice is harder to evidence and defend"
  );
}

function pillarStrength(pillarId: string): string {
  return (
    PILLAR_STRENGTHS[pillarId] ??
    "Core practices look relatively mature in this area"
  );
}

function pillarOwner(pillarId: string): string {
  return PILLAR_OWNERS[pillarId] ?? "named owner";
}

function titleCaseTopic(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) return "This practice";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function joinTopics(topics: string[], max = 2): string {
  const clean = topics.map(titleCaseTopic).filter(Boolean).slice(0, max);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  return `${clean[0]} and ${clean[1]}`;
}

export function topicFromFindingSummary(summary: string): string {
  return summary
    .replace(/^the status of\s+/i, "")
    .replace(/\s+still needs confirmation\.$/i, "")
    .replace(/\s+have not been established\.$/i, "")
    .replace(/\s+has not been established\.$/i, "")
    .replace(/\s+are underway but not yet complete\.$/i, "")
    .replace(/\s+is underway but not yet complete\.$/i, "")
    .replace(/\s+are in place\.$/i, "")
    .replace(/\s+is in place\.$/i, "")
    .replace(/ is not yet in place\.$/i, "")
    .trim();
}

export type PackFindingInsight = {
  insight: string;
  recommendation: string;
  severity: "critical" | "high" | "medium";
};

/**
 * Turns a questionnaire answer into a useful insight + next action.
 * Client-facing — no pack/framework jargon.
 */
export function buildPackFindingInsight(input: {
  pillarId: string;
  summary: string;
  answer: PillarQuestionAnswer;
  /** Optional noun phrase; when omitted, derived from the summary. */
  topic?: string;
}): PackFindingInsight {
  const pillar = findPackPillar(input.pillarId);
  const severity = pillar?.criticality ?? "medium";
  const topic = titleCaseTopic(
    (input.topic?.trim() || topicFromFindingSummary(input.summary)).trim()
  );
  const stake = pillarStake(input.pillarId);
  const owner = pillarOwner(input.pillarId);

  if (input.answer === "yes") {
    return {
      insight: `${topic} is in place today — a real strength in ${pillar?.label ?? "this area"}.`,
      recommendation: `Keep a clear evidence trail so ${topic.toLowerCase()} stays transferable beyond the people who run it today.`,
      severity,
    };
  }

  if (input.answer === "no") {
    return {
      insight: `${topic} is missing, so ${stake}.`,
      recommendation: `Assign a ${owner}, define what “done” looks like for ${topic.toLowerCase()}, and set a 90-day milestone with one piece of evidence you can show.`,
      severity,
    };
  }

  if (input.answer === "partial") {
    return {
      insight: `${topic} has started, but unfinished work still leaves residual risk in ${pillar?.label ?? "this area"}.`,
      recommendation: `Finish the remaining work on ${topic.toLowerCase()}, document what already works, and set a 30–60 day checkpoint.`,
      severity,
    };
  }

  return {
    insight: `${topic} could not be confirmed yet — leave it open until someone verifies the real status.`,
    recommendation: `Confirm with the ${owner}: yes, partial, or no — then collect supporting evidence and update the baseline.`,
    severity,
  };
}

export type PackKeyInsight = {
  title: string;
  body: string;
};

export type PackPillarStanding = {
  reading: string;
  /** One specific insight for this pillar — not a recycled posture template. */
  meaning: string;
  focus: string;
};

function postureToneFromScore(scorePct: number): PostureTone {
  if (scorePct >= 76) return "leading";
  if (scorePct >= 51) return "defined";
  if (scorePct >= 26) return "developing";
  return "critical";
}

/**
 * Pillar-specific standing line — unique to this pillar’s answers and topics.
 */
export function interpretPackPillarStanding(input: {
  pillarId: string;
  pillarLabel: string;
  alignmentPct: number | null;
  yesCount: number;
  partialCount: number;
  noCount: number;
  dontKnowCount: number;
  gapTopics?: string[];
  partialTopics?: string[];
  strengthTopics?: string[];
}): PackPillarStanding {
  const tone: PostureTone | "unknown" =
    input.alignmentPct == null ? "unknown" : postureToneFromScore(input.alignmentPct);
  const reading = POSTURE_HEADLINE[tone];
  const stake = pillarStake(input.pillarId);
  const strength = pillarStrength(input.pillarId);
  const gaps = joinTopics(input.gapTopics ?? []);
  const partials = joinTopics(input.partialTopics ?? []);
  const strengths = joinTopics(input.strengthTopics ?? []);

  let meaning: string;
  let focus: string;

  if (tone === "unknown") {
    meaning = `Not enough confirmed answers yet to rate ${input.pillarLabel} with confidence.`;
    focus = "Confirm open items first, then re-rate this pillar.";
  } else if (tone === "critical") {
    meaning = gaps
      ? `${gaps} ${input.gapTopics && input.gapTopics.length > 1 ? "are" : "is"} not in place — ${stake}.`
      : `${input.pillarLabel} is early: ${stake}.`;
    focus = gaps
      ? `Start with ${gaps.split(" and ")[0]} — name an owner and a 90-day outcome.`
      : "Name an owner and a 90-day outcome for the missing practices in this pillar.";
  } else if (tone === "developing") {
    if (gaps && partials) {
      meaning = `${gaps} still missing, while ${partials} ${input.partialTopics && input.partialTopics.length > 1 ? "are" : "is"} underway — ${stake}.`;
      focus = `Close ${gaps.split(" and ")[0]} first, then finish ${partials.split(" and ")[0]}.`;
    } else if (gaps) {
      meaning = `${gaps} ${input.gapTopics && input.gapTopics.length > 1 ? "are" : "is"} still missing — ${stake}.`;
      focus = `Prioritize ${gaps.split(" and ")[0]} with a named owner and clear evidence of done.`;
    } else if (partials) {
      meaning = `${partials} ${input.partialTopics && input.partialTopics.length > 1 ? "are" : "is"} underway but not finished — finishing here lifts this pillar faster than starting something new.`;
      focus = `Complete ${partials.split(" and ")[0]} and capture evidence before expanding scope.`;
    } else {
      meaning = `${input.pillarLabel} is building, but practice is uneven — ${stake}.`;
      focus = "Close the weakest answers in this pillar before adding new initiatives.";
    }
  } else if (tone === "defined") {
    if (gaps) {
      meaning = `Most of ${input.pillarLabel} is in place, but ${gaps} still hold it back.`;
      focus = `Finish ${gaps.split(" and ")[0]} to lock in an established posture.`;
    } else if (partials) {
      meaning = `${input.pillarLabel} is largely established — finish ${partials} to remove residual risk.`;
      focus = `Close out ${partials.split(" and ")[0]} and keep evidence ready for review.`;
    } else {
      meaning = strengths
        ? `${strengths} ${input.strengthTopics && input.strengthTopics.length > 1 ? "look" : "looks"} solid. ${strength}.`
        : `${strength}. Next step is consistency and evidence, not new invention.`;
      focus = "Keep evidence current and spot-check that practice still matches what you confirmed.";
    }
  } else {
    // leading
    meaning = strengths
      ? `${strengths} ${input.strengthTopics && input.strengthTopics.length > 1 ? "are" : "is"} confirmed. ${strength}.`
      : `${strength}.`;
    focus = "Protect what works — keep owners, cadence, and evidence intact as AI use grows.";
  }

  if (input.dontKnowCount > 0 && tone !== "unknown") {
    meaning += ` ${input.dontKnowCount} answer${input.dontKnowCount === 1 ? "" : "s"} still need confirmation.`;
  }

  return { reading, meaning, focus };
}

/**
 * Short titled insights grounded in this assessment’s answers.
 */
export function buildPackKeyInsights(input: {
  organizationName: string;
  scoreLabel: string;
  overallScorePct: number | null;
  gapCount: number;
  partialCount: number;
  followUpCount: number;
  leadingPillarLabels: string[];
  priorityPillarLabels: string[];
  topGapSummaries: string[];
}): PackKeyInsight[] {
  const org = input.organizationName.trim() || "Your organization";
  const insights: PackKeyInsight[] = [];

  if (input.overallScorePct == null) {
    insights.push({
      title: "Results are still incomplete",
      body: `${org} has open answers that need confirmation before this baseline can stand on its own.`,
    });
  } else if (input.overallScorePct >= 76) {
    insights.push({
      title: "Strong starting position",
      body: `${org} shows strong practice across the pillars assessed. Protect what works and keep evidence current as AI use expands.`,
    });
  } else if (input.overallScorePct >= 51) {
    insights.push({
      title: "Solid baseline — a few gaps matter most",
      body: `${org} has enough practice in place to run a program. Closing a short list of gaps will determine how durable that posture is.`,
    });
  } else if (input.overallScorePct >= 26) {
    insights.push({
      title: "Foundation still forming",
      body: `${org} is building practice, but missing controls still create exposure. Focus on a short list of gaps before scaling AI further.`,
    });
  } else {
    insights.push({
      title: "Early exposure across pillars",
      body: `${org} is early in the areas assessed. Treat the priority list as a 90-day plan with named owners — not an open backlog.`,
    });
  }

  if (input.topGapSummaries.length > 0) {
    const topics = input.topGapSummaries
      .slice(0, 2)
      .map((summary) => topicFromFindingSummary(summary))
      .filter(Boolean)
      .map(titleCaseTopic);
    if (topics.length === 1) {
      insights.push({
        title: "Biggest gap to close first",
        body: `${topics[0]} is the clearest missing practice. Closing it first improves visibility and reduces unmanaged risk.`,
      });
    } else if (topics.length > 1) {
      insights.push({
        title: "Biggest gaps to close first",
        body: `${topics[0]} and ${topics[1]} are the clearest missing practices. Closing these first beats spreading effort across every issue at once.`,
      });
    }
  } else if (input.partialCount > 0) {
    insights.push({
      title: "Finish what you started",
      body: `${input.partialCount} area${input.partialCount === 1 ? "" : "s"} ${input.partialCount === 1 ? "is" : "are"} already underway. Completing ${input.partialCount === 1 ? "it" : "them"} will raise posture faster than launching new work.`,
    });
  }

  if (input.priorityPillarLabels.length > 0 && input.gapCount > 0) {
    const focus = input.priorityPillarLabels.slice(0, 2);
    insights.push({
      title: "Where risk concentrates",
      body:
        focus.length === 1
          ? `${focus[0]} holds the most unfinished risk. Put ownership and evidence there before broadening the program.`
          : `${focus[0]} and ${focus[1]} hold the most unfinished risk. Put ownership and evidence there before broadening the program.`,
    });
  } else if (input.leadingPillarLabels.length > 0) {
    const leaders = input.leadingPillarLabels.slice(0, 2);
    insights.push({
      title: "Strengths worth protecting",
      body:
        leaders.length === 1
          ? `${leaders[0]} is a relative strength. Keep owners and evidence intact so progress elsewhere does not erode it.`
          : `${leaders[0]} and ${leaders[1]} are relative strengths. Keep owners and evidence intact so progress elsewhere does not erode them.`,
    });
  }

  if (input.followUpCount > 0) {
    insights.push({
      title: "Still to confirm",
      body: `${input.followUpCount} answer${input.followUpCount === 1 ? "" : "s"} still need verification. Until ${input.followUpCount === 1 ? "it is" : "they are"} closed, treat those items as open — not resolved.`,
    });
  }

  return insights.slice(0, 4);
}
