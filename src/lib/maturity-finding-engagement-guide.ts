import type { MaturityLevel } from "@prisma/client";
import { MATURITY_LABELS } from "@/lib/maturity-survey-constants";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";

import type { FindingEngagementGuide } from "@/lib/maturity-survey-analysis";

export type { FindingEngagementGuide };
export type FindingEngagementAction = FindingEngagementGuide["actions"][number];

/** One-line pillar context — used once per guide, not repeated across steps. */
const PILLAR_CONTEXT: Record<string, string> = {
  governance: "AI accountability, board oversight, and policy scope",
  fairness: "bias testing, fundamental rights, and impact mitigation",
  "privacy-data": "data stewardship, lawful use, and lifecycle quality for AI",
  "safety-reliability": "safety cases, validation, and operational limits",
  security: "AI-specific threat modeling, access controls, and hardening",
  transparency: "disclosures, explainability, and user-facing transparency",
  oversight: "human-in-the-loop design, monitoring, and incident response",
  compliance: "technical documentation, traceability, and quality management",
  "supply-chain": "vendor due diligence, contracts, and model provenance",
  systemic: "GPAI obligations, downstream use, and systemic-risk controls",
};

type GapTrack = "build" | "formalize" | "strengthen";

function gapTrack(maturity: MaturityLevel): GapTrack {
  if (maturity === "not_implemented" || maturity === "initial") return "build";
  if (maturity === "developing") return "formalize";
  return "strengthen";
}

function frameworkShortLabel(codes: string[]): string | null {
  if (codes.length === 0) return null;
  const short = Object.fromEntries(FRAMEWORK_COLUMNS.map((f) => [f.code, f.short]));
  return codes.map((c) => short[c] ?? c).join(", ");
}

/** Pull a concise objective from the control library description. */
function controlObjective(description: string, controlTitle: string): string {
  const sentence = description
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find((part) => part.length > 20);

  if (!sentence) return controlTitle.toLowerCase();
  if (sentence.length <= 110) return sentence.charAt(0).toLowerCase() + sentence.slice(1);
  return sentence.slice(0, 107).trim().toLowerCase() + "…";
}

function buildIntro(input: {
  controlTitle: string;
  maturityLabel: string;
  track: GapTrack;
  pillarLabel: string;
}): string {
  if (input.track === "build") {
    return `At ${input.maturityLabel} maturity, ${input.controlTitle} needs a clear starting point. We help your team agree what “good” looks like in ${input.pillarLabel} and sequence the first moves — without another round of self-assessment.`;
  }
  if (input.track === "formalize") {
    return `${input.controlTitle} shows emerging practice at ${input.maturityLabel} maturity. We help you turn ad hoc effort into a repeatable capability your ${input.pillarLabel} stakeholders can rely on.`;
  }
  return `${input.controlTitle} is largely in place; the focus is sustaining and evidencing it at ${input.maturityLabel} maturity so leadership and regulators see consistent performance.`;
}

function buildActions(input: {
  controlTitle: string;
  controlCode: string;
  controlDescription: string;
  ownerRole: string;
  pillarId: string;
  pillarLabel: string;
  track: GapTrack;
  frameworkLabel: string | null;
}): FindingEngagementAction[] {
  const objective = controlObjective(input.controlDescription, input.controlTitle);
  const pillarContext = PILLAR_CONTEXT[input.pillarId] ?? input.pillarLabel.toLowerCase();
  const frameworkNote = input.frameworkLabel
    ? ` We map outcomes to ${input.frameworkLabel} expectations for ${input.controlCode}.`
    : "";

  if (input.track === "build") {
    return [
      {
        title: "Align on scope and ownership",
        description: `Facilitate a working session with ${input.ownerRole} and the teams who touch this control. Agree what is in scope today, what is missing, and who owns the next decision on ${input.controlTitle}.`,
      },
      {
        title: "Define the target operating approach",
        description: `Co-design the minimum viable capability so your organization can ${objective}. Focus areas typically include ${pillarContext}.${frameworkNote}`,
      },
      {
        title: "Launch with named milestones",
        description: `Agree a practical 90-day plan — owners, success criteria, and check-ins — so ${input.controlTitle} moves from intent to something your leadership team can track.`,
      },
    ];
  }

  if (input.track === "formalize") {
    return [
      {
        title: "Validate current practice",
        description: `Review how teams actually operate against what is documented for ${input.controlTitle}. Surface where practice diverges from policy and where ${input.ownerRole} needs clearer mandate.`,
      },
      {
        title: "Standardize and embed",
        description: `Document, train, and roll out consistent ways of working so ${objective} is not limited to one team or project. Align handoffs across ${pillarContext}.${frameworkNote}`,
      },
      {
        title: "Make progress visible",
        description: `Define simple metrics and a review cadence so executives can see ${input.controlTitle} improving — and know when it reaches managed maturity.`,
      },
    ];
  }

  return [
    {
      title: "Confirm control effectiveness",
      description: `Test whether ${input.controlTitle} still meets its purpose in production — sampling evidence, talking to ${input.ownerRole}, and noting where drift or new AI use cases create exposure.`,
    },
    {
      title: "Close assurance gaps",
      description: `Strengthen documentation, monitoring, or third-line review so ${objective} stands up to audit and regulatory scrutiny.${frameworkNote}`,
    },
    {
      title: "Keep it in the governance rhythm",
      description: `Fold ${input.controlTitle} into your regular AI governance cadence — annual refresh, trigger-based review, and clear escalation when performance slips.`,
    },
  ];
}

export function buildFindingEngagementGuide(input: {
  pillarId: string;
  pillarLabel: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  maturity: MaturityLevel;
  compliance: "aligned" | "partial" | "gap";
  ownerRole: string;
  frameworkCodes: string[];
}): FindingEngagementGuide | null {
  if (input.compliance === "aligned") return null;

  const track = gapTrack(input.maturity);
  const maturityLabel = MATURITY_LABELS[input.maturity];
  const frameworkLabel = frameworkShortLabel(input.frameworkCodes);

  return {
    headline: "Recommended next steps",
    intro: buildIntro({
      controlTitle: input.controlTitle,
      maturityLabel,
      track,
      pillarLabel: input.pillarLabel,
    }),
    actions: buildActions({
      controlTitle: input.controlTitle,
      controlCode: input.controlCode,
      controlDescription: input.controlDescription,
      ownerRole: input.ownerRole,
      pillarId: input.pillarId,
      pillarLabel: input.pillarLabel,
      track,
      frameworkLabel,
    }),
  };
}
