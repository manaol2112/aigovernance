import type { ControlWorkplanEvidence, ControlWorkplanRequirement } from "@/lib/control-workplan";

export type AssessmentProcedureStep = {
  stepNumber: number;
  phase: "planning" | "requirement_test" | "conclusion";
  action: string;
  frameworkBasis: string | null;
  evidenceToObtain: string[];
  workpaperNote: string | null;
};

export type RequirementAssessmentWorkProgram = {
  requirementId: string;
  frameworkCode: string;
  clauseId: string;
  title: string;
  requirementText: string;
  coverage: string;
  sourceDocument: string;
  sourcePage: string | null;
  objective: string;
  obligationElements: string[];
  steps: AssessmentProcedureStep[];
  evidenceExpectations: string[];
  conclusionCriteria: string[];
};

export type ControlAssessmentTestProgram = {
  assessmentObjective: string;
  scopeStatement: string;
  preparatorySteps: AssessmentProcedureStep[];
  requirementPrograms: RequirementAssessmentWorkProgram[];
  concludingSteps: AssessmentProcedureStep[];
  totalSteps: number;
};

type BuildInput = {
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  ownerRole: string;
  frequency: string;
  requirements: Array<
    ControlWorkplanRequirement & {
      sourceDocument: string;
      sourcePage: string | null;
    }
  >;
  evidence: ControlWorkplanEvidence[];
};

function extractObligationElements(requirementText: string): string[] {
  const normalized = requirementText.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const segments = normalized
    .split(/(?<=[.;])\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => /\b(shall|must)\b/i.test(segment));

  if (segments.length > 0) {
    return segments;
  }

  return [normalized];
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

function selectEvidenceForRequirement(
  evidence: ControlWorkplanEvidence[],
  requirement: ControlWorkplanRequirement
): ControlWorkplanEvidence[] {
  const matched = evidence.filter((item) => evidenceMatchesRequirement(item, requirement));
  if (matched.length > 0) return matched;
  return evidence.filter((item) => item.critical).slice(0, 2);
}

function frameworkRef(requirement: ControlWorkplanRequirement): string {
  return `${requirement.frameworkCode} ${requirement.clauseId}`;
}

function shorten(text: string, max = 180): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function buildRequirementProgram(
  requirement: BuildInput["requirements"][number],
  evidence: ControlWorkplanEvidence[],
  startStep: number,
  ownerRole: string
): { program: RequirementAssessmentWorkProgram; nextStep: number } {
  const obligationElements = extractObligationElements(requirement.requirementText);
  const mappedEvidence = selectEvidenceForRequirement(evidence, requirement);
  const evidenceLabels = mappedEvidence.map((item) => item.evidenceType);
  const ref = frameworkRef(requirement);

  const steps: AssessmentProcedureStep[] = [];
  let stepNumber = startStep;

  steps.push({
    stepNumber: stepNumber++,
    phase: "requirement_test",
    action: `Read ${ref} — "${requirement.title}" — and confirm the exact obligation language below is reflected in your testing scope.`,
    frameworkBasis: requirement.requirementText,
    evidenceToObtain: [],
    workpaperNote: "Record the framework clause tested in the workpaper trace.",
  });

  if (evidenceLabels.length > 0) {
    steps.push({
      stepNumber: stepNumber++,
      phase: "requirement_test",
      action: `Obtain and inspect the following evidence artifacts expected to support ${ref}: ${evidenceLabels.join("; ")}. Verify each artifact is current, approved where required, and covers the assessment period.`,
      frameworkBasis: `Mapped evidence for ${ref}`,
      evidenceToObtain: evidenceLabels,
      workpaperNote: "If an expected artifact is missing, stale, or unapproved, document a gap — workshop discussion alone is not sufficient.",
    });
  } else {
    steps.push({
      stepNumber: stepNumber++,
      phase: "requirement_test",
      action: `Request documentary evidence from ${ownerRole} that demonstrates implementation of ${ref}. Do not rely on workshop representations without corroborating records.`,
      frameworkBasis: requirement.requirementText,
      evidenceToObtain: ["Supporting documentation for the requirement"],
      workpaperNote: "Absence of documentary evidence should be recorded as a gap.",
    });
  }

  for (const [index, element] of obligationElements.entries()) {
    steps.push({
      stepNumber: stepNumber++,
      phase: "requirement_test",
      action: `Test obligation ${index + 1} for ${ref}: "${shorten(element, 220)}" Inspect policies, procedures, system configurations, or records to determine whether this specific requirement element is designed and operating.`,
      frameworkBasis: element,
      evidenceToObtain: evidenceLabels,
      workpaperNote: "Document pass/fail for this obligation element with a cited source excerpt.",
    });
  }

  steps.push({
    stepNumber: stepNumber++,
    phase: "requirement_test",
    action: `Conduct targeted inquiry with ${ownerRole} to corroborate documentary evidence for ${ref}. Challenge any claims that are not supported by records obtained above.`,
    frameworkBasis: requirement.requirementText,
    evidenceToObtain: evidenceLabels,
    workpaperNote: "Capture inquiry responses only when supported by or contradicted by evidence.",
  });

  steps.push({
    stepNumber: stepNumber++,
    phase: "requirement_test",
    action: `Conclude on ${ref} (${requirement.coverage} crosswalk coverage): state whether the requirement is in place, partially met, or a gap. Tie the conclusion to specific evidence reviewed.`,
    frameworkBasis: requirement.requirementText,
    evidenceToObtain: evidenceLabels,
    workpaperNote: "Feed the conclusion into In Place, Gaps, and Recommendations in the assessment workpaper.",
  });

  const conclusionCriteria = [
    `All "${obligationElements.length}" obligation element(s) from ${ref} are supported by current documentary evidence.`,
    `Control owner (${ownerRole}) representations are corroborated by records, not accepted on assertion alone.`,
    `Any missing, outdated, or unapproved artifact for ${ref} is documented as a gap with remediation recommendation.`,
  ];

  return {
    program: {
      requirementId: requirement.id,
      frameworkCode: requirement.frameworkCode,
      clauseId: requirement.clauseId,
      title: requirement.title,
      requirementText: requirement.requirementText,
      coverage: requirement.coverage,
      sourceDocument: requirement.sourceDocument,
      sourcePage: requirement.sourcePage,
      objective: `Evaluate whether the organization meets ${ref} — ${requirement.title}.`,
      obligationElements,
      steps,
      evidenceExpectations: mappedEvidence.map(
        (item) =>
          `${item.evidenceType}: ${item.description}${
            item.collectionMethod ? ` (source: ${item.collectionMethod})` : ""
          }`
      ),
      conclusionCriteria,
    },
    nextStep: stepNumber,
  };
}

export function buildFrameworkGroundedAssessmentProgram(input: BuildInput): ControlAssessmentTestProgram {
  const preparatorySteps: AssessmentProcedureStep[] = [
    {
      stepNumber: 1,
      phase: "planning",
      action: `Confirm ${input.controlCode} — ${input.controlTitle} is in assessment scope and identify the in-scope population (systems, processes, policies, or vendors) subject to this control.`,
      frameworkBasis: input.controlDescription,
      evidenceToObtain: ["Assessment scope memo", "In-scope AI system / process inventory"],
      workpaperNote: "Scope drives the population for walkthroughs and evidence requests.",
    },
    {
      stepNumber: 2,
      phase: "planning",
      action: `Review linked framework requirements (${input.requirements.length}) and the control owner's stated responsibility (${input.ownerRole}). Map each requirement to expected evidence before testing begins.`,
      frameworkBasis: input.requirements.map((req) => frameworkRef(req)).join(", "),
      evidenceToObtain: input.evidence.map((item) => item.evidenceType),
      workpaperNote: "Use the framework crosswalk as the authoritative test basis — do not test beyond or short of linked clauses.",
    },
    {
      stepNumber: 3,
      phase: "planning",
      action: "Review workshop notes, facilitator notes, and any uploaded repository files for representations about this control. Treat workshop statements as hypotheses to be validated, not as audit evidence.",
      frameworkBasis: null,
      evidenceToObtain: ["Workshop transcript", "Facilitator notes", "Uploaded repository files"],
      workpaperNote: "Workshop coverage gaps should be flagged as not assessed until evidence is obtained.",
    },
    {
      stepNumber: 4,
      phase: "planning",
      action: `Perform a walkthrough with ${input.ownerRole} to understand how the control is designed to operate at least once per ${input.frequency} cycle. Document the process path from trigger event to evidence retention.`,
      frameworkBasis: input.controlDescription,
      evidenceToObtain: ["Process narrative", "RACI or role assignment"],
      workpaperNote: "Walkthrough understanding informs which requirement elements need deeper inspection.",
    },
  ];

  const requirementPrograms: RequirementAssessmentWorkProgram[] = [];
  let stepNumber = preparatorySteps.length + 1;

  for (const requirement of input.requirements) {
    const { program, nextStep } = buildRequirementProgram(
      requirement,
      input.evidence,
      stepNumber,
      input.ownerRole
    );
    requirementPrograms.push(program);
    stepNumber = nextStep;
  }

  const concludingSteps: AssessmentProcedureStep[] = [
    {
      stepNumber: stepNumber++,
      phase: "conclusion",
      action: "Reconcile workshop representations, documentary evidence, and inquiry responses. Resolve contradictions before finalizing the control conclusion.",
      frameworkBasis: null,
      evidenceToObtain: [],
      workpaperNote: "Unsupported workshop claims should move from In Place to Gaps.",
    },
    {
      stepNumber: stepNumber++,
      phase: "conclusion",
      action: "Document in-place practices with citations to specific evidence excerpts. Each in-place statement must trace to a reviewed source.",
      frameworkBasis: null,
      evidenceToObtain: [],
      workpaperNote: "Use citation markers in the assessment workpaper.",
    },
    {
      stepNumber: stepNumber++,
      phase: "conclusion",
      action: "Document gaps for each failed requirement element or missing artifact. State what is missing, why it matters against the framework obligation, and the remediation path.",
      frameworkBasis: null,
      evidenceToObtain: [],
      workpaperNote: "Missing documentation is a gap even if the topic was discussed in workshop.",
    },
    {
      stepNumber: stepNumber++,
      phase: "conclusion",
      action: "Record the compliance conclusion (in place / partial / gap / not assessed) and reviewer sign-off readiness for this control workpaper.",
      frameworkBasis: null,
      evidenceToObtain: [],
      workpaperNote: "Do not approve the control if open review notes or unresolved evidence gaps remain.",
    },
  ];

  const totalSteps =
    preparatorySteps.length +
    requirementPrograms.reduce((total, program) => total + program.steps.length, 0) +
    concludingSteps.length;

  return {
    assessmentObjective: `Determine whether ${input.controlCode} — ${input.controlTitle} is designed and operating effectively against ${input.requirements.length} linked framework requirement(s).`,
    scopeStatement: `Test the control across the in-scope AI governance population at the ${input.frequency} frequency, using framework clauses as the authoritative assessment basis.`,
    preparatorySteps,
    requirementPrograms,
    concludingSteps,
    totalSteps,
  };
}
