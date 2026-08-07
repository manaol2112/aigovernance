import { buildFrameworkGroundedAssessmentProgram } from "@/lib/control-assessment-procedure";
import type { ControlWorkplan, ControlWorkplanEvidence, ControlWorkplanRequirement } from "@/lib/control-workplan";
import type { SubPillarWorkshopBlock } from "@/lib/sub-pillar-workshop-questions";

export type WorkplanFrameworkOption = {
  code: string;
  label: string;
  requirementCount: number;
};

export type FilteredControlWorkplanView = ControlWorkplan & {
  selectedFrameworks: string[];
  availableFrameworks: WorkplanFrameworkOption[];
  isFiltered: boolean;
};

const FRAMEWORK_LABELS: Record<string, string> = {
  "ISO-42001": "ISO 42001",
  "NIST-AI-RMF": "NIST AI RMF",
  "EU-AIA": "EU AI Act",
  "OECD-AI": "OECD AI",
  "COSO-ERM": "COSO ERM",
};

export function getFrameworkLabel(code: string): string {
  return FRAMEWORK_LABELS[code] ?? code.replace(/-/g, " ");
}

export function getWorkplanFrameworkOptions(workplan: ControlWorkplan): WorkplanFrameworkOption[] {
  const counts = new Map<string, number>();
  for (const requirement of workplan.frameworkRequirements) {
    counts.set(requirement.frameworkCode, (counts.get(requirement.frameworkCode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([code, requirementCount]) => ({
      code,
      label: getFrameworkLabel(code),
      requirementCount,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function evidenceMatchesRequirement(
  evidence: ControlWorkplanEvidence,
  requirement: ControlWorkplanRequirement
): boolean {
  const haystack = `${requirement.title} ${requirement.theme ?? ""} ${requirement.requirementText} ${requirement.clauseId}`.toLowerCase();
  const needle = `${evidence.evidenceType} ${evidence.description}`.toLowerCase();

  const keywords = [
    ...requirement.title.toLowerCase().split(/\W+/),
    ...(requirement.theme?.toLowerCase().split(/\W+/) ?? []),
    ...requirement.clauseId.toLowerCase().split(/\W+/),
  ].filter((word) => word.length > 3);

  if (keywords.some((word) => needle.includes(word))) return true;

  const evidenceWords = needle.split(/\W+/).filter((word) => word.length > 4);
  return evidenceWords.some((word) => haystack.includes(word));
}

function filterWorkshopBlocks(
  blocks: SubPillarWorkshopBlock[],
  selectedFrameworks: Set<string>
): SubPillarWorkshopBlock[] {
  return blocks
    .map((block) => {
      const requirementCoverage = block.requirementCoverage.filter((req) =>
        selectedFrameworks.has(req.frameworkCode)
      );
      if (requirementCoverage.length === 0) return null;

      const questions = block.questions.filter(
        (question) =>
          question.coversRequirements.length === 0 ||
          question.coversRequirements.some((req) => selectedFrameworks.has(req.frameworkCode))
      );

      if (questions.length === 0) return null;

      return {
        ...block,
        questions,
        questionCount: questions.length,
        requirementCoverage,
        requirementsCovered: requirementCoverage.length,
        requirementsTotal: requirementCoverage.length,
        supplementCount: Math.min(block.supplementCount, questions.length),
      };
    })
    .filter((block): block is SubPillarWorkshopBlock => block !== null);
}

export function filterWorkplanByFrameworks(
  workplan: ControlWorkplan,
  selectedFrameworks: string[]
): FilteredControlWorkplanView {
  const availableFrameworks = getWorkplanFrameworkOptions(workplan);
  const allFrameworkCodes = availableFrameworks.map((option) => option.code);
  const normalizedSelection = selectedFrameworks.filter((code) => allFrameworkCodes.includes(code));
  const activeFrameworks =
    normalizedSelection.length > 0 ? normalizedSelection : allFrameworkCodes;
  const selectedSet = new Set(activeFrameworks);
  const isFiltered =
    activeFrameworks.length < allFrameworkCodes.length && allFrameworkCodes.length > 0;

  const frameworkRequirements = workplan.frameworkRequirements.filter((requirement) =>
    selectedSet.has(requirement.frameworkCode)
  );

  const evidenceRequired = workplan.evidenceRequired.filter((evidence) =>
    frameworkRequirements.some((requirement) => evidenceMatchesRequirement(evidence, requirement))
  );

  const visibleEvidence =
    evidenceRequired.length > 0 ? evidenceRequired : workplan.evidenceRequired;

  const workshopBlocks = filterWorkshopBlocks(workplan.workshopBlocks, selectedSet);

  const assessmentTestProgram = buildFrameworkGroundedAssessmentProgram({
    controlCode: workplan.control.code,
    controlTitle: workplan.control.title,
    controlDescription: workplan.control.description,
    ownerRole: workplan.control.ownerRole,
    frequency: workplan.control.frequency,
    requirements: frameworkRequirements,
    evidence: visibleEvidence,
  });

  const questionCount = workshopBlocks.reduce((total, block) => total + block.questionCount, 0);
  const coverageComplete =
    workshopBlocks.length > 0 && workshopBlocks.every((block) => block.allRequirementsCovered);

  const criticalEvidenceProbes = workplan.criticalEvidenceProbes.filter((probe) =>
    visibleEvidence.some(
      (evidence) => evidence.evidenceType.toLowerCase() === probe.evidenceType.toLowerCase()
    )
  );

  return {
    ...workplan,
    frameworkRequirements,
    assessmentTestProgram,
    evidenceRequired: visibleEvidence,
    criticalEvidenceProbes,
    workshopBlocks,
    selectedFrameworks: activeFrameworks,
    availableFrameworks,
    isFiltered,
    stats: {
      requirementCount: frameworkRequirements.length,
      assessmentStepCount: assessmentTestProgram.totalSteps,
      evidenceCount: visibleEvidence.length,
      criticalEvidenceCount: criticalEvidenceProbes.length,
      questionCount,
      workshopTopicCount: workshopBlocks.length,
      coverageComplete,
    },
  };
}

export function parseFrameworkFilterParam(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeFrameworkFilterParam(frameworks: string[]): string {
  return frameworks.join(",");
}
