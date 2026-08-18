import type { MaturityLevel } from "@prisma/client";
import { getFrameworkShortLabel } from "@/lib/framework-library";
import { MATURITY_LEVELS } from "@/lib/maturity-survey-constants";
import {
  getWorkshopAnswerOptions,
  maturityToWeightPct,
  type WorkshopAnswerOption,
} from "@/lib/guided-workshop-scoring";
import type { SurveyControlItem } from "@/lib/maturity-survey-types";

export type WorkshopControlAnswerOption = WorkshopAnswerOption & {
  /** Client-selectable statement — maps 1:1 to a weighted score. */
  statement: string;
};

export type GuidedWorkshopQuestion = {
  controlCode: string;
  controlTitle: string;
  /** Primary client-facing question — select one weighted statement. */
  prompt: string;
  /** Why this control matters (from canonical library). */
  requirementContext: string;
  frameworkLabels: string[];
  ownerRole: string | null;
  /** Facilitator-only talking point — not an open-ended answer field. */
  facilitationTip: string;
  answerOptions: WorkshopControlAnswerOption[];
};

const STATEMENT_TEMPLATES: Record<
  MaturityLevel,
  (capability: string) => string
> = {
  not_implemented: (capability) =>
    `We do not have ${capability} — no documented policy, process, or assigned owner.`,
  initial: (capability) =>
    `We discuss ${capability} informally or reactively, but nothing is documented or consistently applied.`,
  developing: (capability) =>
    `We have early or partial ${capability} in some teams or pilots — not yet enterprise-wide or standardised.`,
  defined: (capability) =>
    `We have documented ${capability} (policy/procedure), though execution and evidence still vary across teams.`,
  managed: (capability) =>
    `We operate ${capability} with named owners, a defined cadence, and periodic review — consistently across the organisation.`,
  optimized: (capability) =>
    `We measure, audit, and continuously improve ${capability} — leading practice that would withstand regulatory or board scrutiny.`,
};

/** Turn control title into a natural mid-sentence capability phrase (with article). */
export function controlCapabilityPhrase(title: string): string {
  let phrase = title.trim();
  phrase = phrase.replace(
    /^(Establish|Maintain|Implement|Define|Document|Monitor|Ensure|Conduct|Perform|Develop|Create|Review|Assess|Validate|Approve|Provide|Enable|Support|Track|Report|Communicate|Assign|Identify|Evaluate|Manage|Operate)\s+/i,
    ""
  );
  if (!phrase) phrase = title.trim();
  phrase = phrase.toLowerCase();
  if (/^[aeiou]/.test(phrase)) return `an ${phrase}`;
  return `a ${phrase}`;
}

function buildAnswerStatement(control: SurveyControlItem, level: MaturityLevel): string {
  const capability = controlCapabilityPhrase(control.title);
  return STATEMENT_TEMPLATES[level](capability);
}

export function buildGuidedWorkshopQuestion(
  control: SurveyControlItem,
  pillarLabel: string
): GuidedWorkshopQuestion {
  const frameworkLabels = control.frameworkCodes.map(getFrameworkShortLabel);
  const capability = controlCapabilityPhrase(control.title);
  const frameworkNote =
    frameworkLabels.length > 0
      ? ` Mapped to ${frameworkLabels.join(", ")}.`
      : "";

  const baseOptions = getWorkshopAnswerOptions();
  const answerOptions: WorkshopControlAnswerOption[] = MATURITY_LEVELS.map((level, index) => ({
    ...baseOptions[index]!,
    level,
    weightPct: maturityToWeightPct(level),
    statement: buildAnswerStatement(control, level),
  }));

  return {
    controlCode: control.code,
    controlTitle: control.title,
    prompt: `Which statement best describes your organisation's current capability for ${capability}?`,
    requirementContext: control.description.trim(),
    frameworkLabels,
    ownerRole: control.ownerRole?.trim() || null,
    facilitationTip: `Read each weighted option aloud in the ${pillarLabel} section. The client selects the single statement that best matches their current state — do not accept narrative answers; map discussion to the closest weighted option.${frameworkNote}`,
    answerOptions,
  };
}
