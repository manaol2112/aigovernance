import type { RiskSubPillarDef } from "@/lib/risk-sub-pillars";
import { finalizeFacilitationQuestionCoverage } from "@/lib/core-question-coverage";
import type { RequirementRef } from "@/lib/requirement-workshop-questions";
import {
  genericQuestionTemplates,
  SUB_PILLAR_QUESTION_BANK,
  WORKSHOP_PHASE_META,
  type WorkshopQuestionPhase,
} from "@/lib/workshop-question-bank";
import { resolveProbes } from "@/lib/workshop-probes";
import {
  buildEvidenceProbe,
  countSupportingEvidence,
  pickCriticalEvidence,
  type CriticalEvidenceProbe,
} from "@/lib/critical-evidence";

export type { CriticalEvidenceProbe } from "@/lib/critical-evidence";

export type { RequirementRef } from "@/lib/requirement-workshop-questions";

export type ExpectedEvidenceItem = {
  id: string;
  evidenceType: string;
  description: string;
  collectionMethod: string | null;
  retentionPeriod: string | null;
  /** Controls this evidence type is linked to (for question matching). */
  sourceControlIds?: string[];
};

/** Deduplicated, grouped evidence for facilitator display. */
export type ExpectedEvidenceGroup = {
  evidenceType: string;
  description: string;
  collectionMethod: string | null;
  itemCount: number;
  /** Additional distinct descriptions beyond the primary one. */
  alternateDescriptions: string[];
};

export function summarizeExpectedEvidence(items: ExpectedEvidenceItem[]): ExpectedEvidenceGroup[] {
  const groups = new Map<
    string,
    { evidenceType: string; descriptions: Map<string, number>; collectionMethods: Set<string> }
  >();

  for (const item of items) {
    const key = item.evidenceType.trim().toLowerCase();
    const entry = groups.get(key) ?? {
      evidenceType: item.evidenceType.trim(),
      descriptions: new Map<string, number>(),
      collectionMethods: new Set<string>(),
    };
    entry.descriptions.set(item.description.trim(), (entry.descriptions.get(item.description.trim()) ?? 0) + 1);
    if (item.collectionMethod) entry.collectionMethods.add(item.collectionMethod);
    groups.set(key, entry);
  }

  return [...groups.values()]
    .map((g) => {
      const sortedDescs = [...g.descriptions.entries()].sort((a, b) => b[1] - a[1]);
      const [primaryDesc] = sortedDescs[0] ?? ["", 0];
      const alternateDescriptions = sortedDescs.slice(1, 4).map(([d]) => d);
      const extraCount = sortedDescs.length - 1 - alternateDescriptions.length;
      return {
        evidenceType: g.evidenceType,
        description: primaryDesc,
        collectionMethod: [...g.collectionMethods][0] ?? null,
        itemCount: [...g.descriptions.values()].reduce((n, c) => n + c, 0),
        alternateDescriptions:
          extraCount > 0
            ? [...alternateDescriptions, `+${extraCount} more description${extraCount !== 1 ? "s" : ""}`]
            : alternateDescriptions,
      };
    })
    .sort((a, b) => a.evidenceType.localeCompare(b.evidenceType));
}

export type { WorkshopQuestionPhase } from "@/lib/workshop-question-bank";
export { WORKSHOP_PHASE_META } from "@/lib/workshop-question-bank";

export type ConsolidatedWorkshopQuestion = {
  id: string;
  phase: WorkshopQuestionPhase;
  phaseLabel: string;
  phaseOrder: number;
  prompt: string;
  intent: string;
  /** Follow-up probes for shallow answers — optional, collapsed in UI. */
  probes: string[];
  coversRequirements: Array<{
    id: string;
    frameworkCode: string;
    clauseId: string;
    title: string;
  }>;
};

export type SubPillarWorkshopBlock = {
  subPillarId: string;
  subPillarLabel: string;
  subPillarDescription: string;
  pillarId: string;
  pillarLabel: string;
  questions: ConsolidatedWorkshopQuestion[];
  questionCount: number;
  requirementsCovered: number;
  requirementsTotal: number;
  allRequirementsCovered: boolean;
  supplementCount: number;
  /** Must-have evidence probes for this topic — shown in a dedicated section, not under questions. */
  criticalEvidenceProbes: CriticalEvidenceProbe[];
  criticalEvidenceCount: number;
  supportingEvidenceTypeCount: number;
  evidenceSummary: ExpectedEvidenceGroup[];
  evidenceTotalCount: number;
  requirementCoverage: RequirementRef[];
  controlCodes: string[];
};

function uniqueControls(reqs: RequirementRef[], controlCodeMap: Map<string, string>): string[] {
  const codes = new Set<string>();
  for (const r of reqs) {
    const c = controlCodeMap.get(r.id);
    if (c) {
      for (const code of c.split(", ")) codes.add(code);
    }
  }
  return [...codes].sort();
}

export function buildSubPillarWorkshopBlock(
  sub: RiskSubPillarDef,
  pillarLabel: string,
  reqs: RequirementRef[],
  controlCodeByReqId: Map<string, string>,
  expectedEvidence: ExpectedEvidenceItem[]
): SubPillarWorkshopBlock {
  const controlCodes = uniqueControls(reqs, controlCodeByReqId);
  const templates =
    SUB_PILLAR_QUESTION_BANK[sub.id] ?? genericQuestionTemplates(sub.label);

  const coreQuestions: ConsolidatedWorkshopQuestion[] = templates.map((t, i) => ({
    id: `${sub.id}-q${i + 1}`,
    phase: t.phase,
    phaseLabel: WORKSHOP_PHASE_META[t.phase].label,
    phaseOrder: WORKSHOP_PHASE_META[t.phase].order,
    intent: t.intent,
    prompt: t.prompt,
    probes: resolveProbes(t.phase, t.probes),
    coversRequirements: [],
  }));

  const { questions, allRequirementsCovered, supplementCount } =
    finalizeFacilitationQuestionCoverage(sub, coreQuestions, reqs);

  const criticalItems = pickCriticalEvidence(expectedEvidence);
  const criticalEvidenceProbes = criticalItems.map((item) => buildEvidenceProbe(item));

  const evidenceSummary = summarizeExpectedEvidence(expectedEvidence);

  return {
    subPillarId: sub.id,
    subPillarLabel: sub.label,
    subPillarDescription: sub.description,
    pillarId: sub.pillarId,
    pillarLabel,
    questions,
    questionCount: questions.length,
    requirementsCovered: reqs.length,
    requirementsTotal: reqs.length,
    allRequirementsCovered,
    supplementCount,
    criticalEvidenceProbes,
    criticalEvidenceCount: criticalEvidenceProbes.length,
    supportingEvidenceTypeCount: countSupportingEvidence(expectedEvidence, criticalItems),
    evidenceSummary,
    evidenceTotalCount: expectedEvidence.length,
    requirementCoverage: reqs,
    controlCodes,
  };
}
