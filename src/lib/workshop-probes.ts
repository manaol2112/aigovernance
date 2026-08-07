import type { WorkshopQuestionPhase } from "@/lib/workshop-question-bank";

/** Universal follow-up probes by facilitation phase — use when answers are vague or lack evidence. */
export const PHASE_PROBES: Record<Exclude<WorkshopQuestionPhase, "requirement">, string[]> = {
  context: [
    "What changed in the last 12 months that would affect your answer?",
    "Which external party (regulator, customer, board) would most likely challenge this?",
    "Can you show a document or record that captures this today?",
  ],
  design: [
    "Who approved this, when, and where is that approval recorded?",
    "What explicitly happens when someone wants to do something outside this standard?",
    "How does this differ for high-risk AI versus routine analytics?",
  ],
  implementation: [
    "Walk me through the last time this happened — who did what, step by step?",
    "What system, tool, or gate enforces this (not just policy on paper)?",
    "If I spoke to a team member tomorrow, would they describe the same process?",
  ],
  effectiveness: [
    "What evidence or metric shows this is working, not just documented?",
    "Give a recent example — when did this catch an issue or drive a decision?",
    "When was this last independently reviewed or tested?",
  ],
  gaps: [
    "What is the remediation plan, owner, and target date?",
    "What risk are you accepting in the meantime, and who signed off?",
    "Has this gap appeared before — why hasn't it been closed yet?",
  ],
  application: [
    "Pick the highest-risk in-scope use case — how does this apply differently there?",
    "Are there exceptions, waivers, or grandfathered systems? Who approved them?",
    "Who is the named owner for each use case in this assessment?",
  ],
};

export function resolveProbes(
  phase: WorkshopQuestionPhase,
  customProbes?: string[]
): string[] {
  if (customProbes && customProbes.length > 0) return customProbes;
  if (phase === "requirement") return PHASE_PROBES.effectiveness;
  return PHASE_PROBES[phase];
}
