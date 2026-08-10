import type { MaturityLevel } from "@prisma/client";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";

/** Safe to import from client components — no Prisma or server dependencies. */

export const DEFAULT_SURVEY_FRAMEWORKS = FRAMEWORK_COLUMNS.map((f) => f.code);

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  not_implemented: "Not Implemented",
  initial: "Initial",
  developing: "Developing",
  defined: "Defined",
  managed: "Managed",
  optimized: "Optimized",
};

export const MATURITY_LEVELS: MaturityLevel[] = [
  "not_implemented",
  "initial",
  "developing",
  "defined",
  "managed",
  "optimized",
];

export const MATURITY_SCORE: Record<MaturityLevel, number> = {
  not_implemented: 0,
  initial: 1,
  developing: 2,
  defined: 3,
  managed: 4,
  optimized: 5,
};

export const MATURITY_LEVEL_GUIDANCE: Record<
  MaturityLevel,
  {
    label: string;
    headline: string;
    description: string;
    /** One-line executive hint for baseline scan — what good looks like at this level. */
    goodLooksLike: string;
    signals: string[];
    color: string;
    step: number;
  }
> = {
  not_implemented: {
    step: 1,
    label: "Not implemented",
    headline: "Nothing is in place yet",
    description: "No formal capability, policy, or process exists for this area.",
    goodLooksLike: "No formal program yet — start by naming an executive owner.",
    signals: [
      "No documented policy, process, or tooling",
      "No clear owner or accountability",
    ],
    color: "#94a3b8",
  },
  initial: {
    step: 2,
    label: "Initial",
    headline: "Informal or reactive only",
    description: "Awareness exists, but work is ad hoc and inconsistent.",
    goodLooksLike: "Awareness exists, but practices are ad hoc and person-dependent.",
    signals: [
      "Actions happen when issues arise, not by design",
      "Depends on individuals rather than the organization",
    ],
    color: "#f87171",
  },
  developing: {
    step: 3,
    label: "Developing",
    headline: "Early efforts, not yet consistent",
    description: "Emerging practices with partial documentation in some teams.",
    goodLooksLike: "Pilots or drafts in some teams — not yet enterprise-wide.",
    signals: [
      "Pilots, drafts, or team-level practices exist",
      "Not applied reliably across the organization",
    ],
    color: "#fb923c",
  },
  defined: {
    step: 4,
    label: "Defined",
    headline: "Documented but uneven in practice",
    description: "Processes are written and communicated, but not fully measured.",
    goodLooksLike: "Policies are documented; execution and measurement still vary.",
    signals: [
      "Policies and procedures are documented",
      "Execution varies; limited metrics or assurance",
    ],
    color: "#facc15",
  },
  managed: {
    step: 5,
    label: "Managed",
    headline: "Consistent and accountable",
    description: "Routinely executed with ownership, metrics, and periodic review.",
    goodLooksLike: "Consistent execution with owners, metrics, and periodic review.",
    signals: [
      "Defined owners and operating rhythm",
      "KPIs, audits, or reviews happen on schedule",
    ],
    color: "#34d399",
  },
  optimized: {
    step: 6,
    label: "Optimized",
    headline: "Leading practice, continuously improving",
    description: "Benchmark-leading capability with automation and proactive improvement.",
    goodLooksLike: "Benchmark-leading practice with automation and continuous improvement.",
    signals: [
      "Automated controls and benchmarked performance",
      "Lessons learned feed back into design",
    ],
    color: "#6366f1",
  },
};

/** Plain-language intro shown above the rating scale in surveys. */
export const MATURITY_RATING_INSTRUCTIONS = {
  title: "How to choose your answer",
  summary:
    "Rate your organization as it is today — not where you plan to be. Pick the level whose description best matches reality for this specific question.",
  honestyNote:
    "There are no wrong answers. An honest baseline makes the maturity report and roadmap more useful.",
};
