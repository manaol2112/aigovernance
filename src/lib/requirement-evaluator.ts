import { prisma } from "@/lib/db";
import { getPillarNotesForRequirement } from "@/lib/pillar-workshop";

export type EvaluationResult = {
  alignedFindings: string;
  gapFindings: string;
  recommendations: string;
  complianceStatus: "aligned" | "partial" | "gap" | "not_assessed";
  linkedControlCodes: string[];
};

const POSITIVE_SIGNALS = [
  "policy", "documented", "approved", "implemented", "trained", "audit",
  "monitoring", "tested", "validated", "governance", "oversight", "procedure",
  "logged", "reviewed", "certified", "compliant", "established", "maintained",
];

const GAP_SIGNALS = [
  "none", "not implemented", "no policy", "missing", "gap", "lack",
  "informal", "ad hoc", "undocumented", "unknown", "n/a", "not yet",
  "planned", "in progress", "partial",
];

export async function evaluateRequirementGrounded(
  requirementId: string,
  clientNotes: string | null,
  facilitatorNotes: string | null,
  evidenceCount: number
): Promise<EvaluationResult> {
  const requirement = await prisma.frameworkRequirement.findUnique({
    where: { id: requirementId },
    include: {
      framework: true,
      controlLinks: { include: { control: true } },
    },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  const combinedNotes = `${clientNotes ?? ""} ${facilitatorNotes ?? ""}`.toLowerCase().trim();
  const controlCodes = requirement.controlLinks.map((l) => l.control.code);
  const controls = requirement.controlLinks.map((l) => ({
    code: l.control.code,
    title: l.control.title,
    description: l.control.description,
  }));

  if (!combinedNotes && evidenceCount === 0) {
    return {
      alignedFindings: "No client notes or evidence provided for this requirement.",
      gapFindings: `Gap identified against ${requirement.framework.code} ${requirement.clauseId}: "${requirement.title}". No documentation of controls or practices was provided during the workshop.`,
      recommendations: buildRecommendations(requirement.clauseId, requirement.framework.code, controls, "full_gap"),
      complianceStatus: "not_assessed",
      linkedControlCodes: controlCodes,
    };
  }

  const positiveHits = POSITIVE_SIGNALS.filter((s) => combinedNotes.includes(s));
  const gapHits = GAP_SIGNALS.filter((s) => combinedNotes.includes(s));
  const hasEvidence = evidenceCount > 0;

  let complianceStatus: EvaluationResult["complianceStatus"];
  if (positiveHits.length >= 3 && hasEvidence && gapHits.length === 0) {
    complianceStatus = "aligned";
  } else if (positiveHits.length >= 1 || hasEvidence) {
    complianceStatus = "partial";
  } else if (gapHits.length > 0) {
    complianceStatus = "gap";
  } else {
    complianceStatus = "partial";
  }

  const alignedFindings = buildAlignedFindings(
    requirement.framework.code,
    requirement.clauseId,
    requirement.title,
    combinedNotes,
    positiveHits,
    hasEvidence,
    evidenceCount
  );

  const gapFindings = buildGapFindings(
    requirement.framework.code,
    requirement.clauseId,
    requirement.requirementText,
    complianceStatus,
    gapHits,
    hasEvidence
  );

  const recommendations = buildRecommendations(
    requirement.clauseId,
    requirement.framework.code,
    controls,
    complianceStatus === "aligned" ? "maintain" : complianceStatus === "partial" ? "partial" : "full_gap"
  );

  return {
    alignedFindings,
    gapFindings,
    recommendations,
    complianceStatus,
    linkedControlCodes: controlCodes,
  };
}

function buildAlignedFindings(
  frameworkCode: string,
  clauseId: string,
  title: string,
  notes: string,
  positiveHits: string[],
  hasEvidence: boolean,
  evidenceCount: number
): string {
  const parts: string[] = [];
  parts.push(`Requirement ${frameworkCode} ${clauseId} (${title}):`);

  if (positiveHits.length > 0) {
    parts.push(`Workshop notes indicate practices related to: ${positiveHits.join(", ")}.`);
  }

  if (hasEvidence) {
    parts.push(`${evidenceCount} supporting document(s) uploaded by the client.`);
  }

  if (notes.length > 20) {
    parts.push(`Client/facilitator input recorded for review.`);
  }

  return parts.join(" ");
}

function buildGapFindings(
  frameworkCode: string,
  clauseId: string,
  requirementText: string,
  status: EvaluationResult["complianceStatus"],
  gapHits: string[],
  hasEvidence: boolean
): string {
  if (status === "aligned") {
    return `No material gaps identified for ${frameworkCode} ${clauseId} based on provided information. Human reviewer should confirm alignment.`;
  }

  const excerpt = requirementText.slice(0, 200);
  const parts: string[] = [
    `Gap or partial compliance against ${frameworkCode} ${clauseId}.`,
    `Requirement states: "${excerpt}${requirementText.length > 200 ? "..." : ""}"`,
  ];

  if (gapHits.length > 0) {
    parts.push(`Notes indicate: ${gapHits.join(", ")}.`);
  }

  if (!hasEvidence) {
    parts.push("No supporting evidence documents were uploaded.");
  }

  parts.push("Requires human reviewer confirmation before finalizing.");
  return parts.join(" ");
}

function buildRecommendations(
  clauseId: string,
  frameworkCode: string,
  controls: Array<{ code: string; title: string; description: string }>,
  severity: "maintain" | "partial" | "full_gap"
): string {
  if (severity === "maintain") {
    return `Continue maintaining documented controls for ${frameworkCode} ${clauseId}. Schedule periodic review per linked canonical control procedures.`;
  }

  if (controls.length === 0) {
    return `Implement governance practices addressing ${frameworkCode} ${clauseId}. Document policies, assign ownership, and collect evidence for audit trail.`;
  }

  return controls
    .map(
      (c, i) =>
        `${i + 1}. Implement ${c.code} (${c.title}): ${c.description.slice(0, 150)}${c.description.length > 150 ? "..." : ""}`
    )
    .join("\n");
}

export async function runAssessmentEvaluation(assessmentId: string): Promise<number> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      useCases: {
        include: {
          scopedRequirements: { where: { included: true }, include: { requirement: true } },
          workshopResponses: { include: { evidenceFiles: true } },
        },
      },
    },
  });

  if (!assessment) throw new Error("Assessment not found");

  let count = 0;

  for (const useCase of assessment.useCases) {
    for (const scoped of useCase.scopedRequirements) {
      const workshop = useCase.workshopResponses.find(
        (w) => w.requirementId === scoped.requirementId
      );
      const pillarNotes = await getPillarNotesForRequirement(useCase.id, scoped.requirementId);

      const clientNotes = workshop?.clientNotes ?? pillarNotes.clientNotes;
      const facilitatorNotes = workshop?.facilitatorNotes ?? pillarNotes.facilitatorNotes;
      const evidenceCount = (workshop?.evidenceFiles.length ?? 0) + pillarNotes.evidenceCount;

      const result = await evaluateRequirementGrounded(
        scoped.requirementId,
        clientNotes,
        facilitatorNotes,
        evidenceCount
      );

      const req = scoped.requirement;

      await prisma.requirementEvaluation.upsert({
        where: {
          assessmentId_useCaseId_requirementId: {
            assessmentId,
            useCaseId: useCase.id,
            requirementId: scoped.requirementId,
          },
        },
        create: {
          assessmentId,
          useCaseId: useCase.id,
          requirementId: scoped.requirementId,
          workshopResponseId: workshop?.id,
          alignedFindings: result.alignedFindings,
          gapFindings: result.gapFindings,
          recommendations: result.recommendations,
          citedClauseId: req.clauseId,
          citedRequirementText: req.requirementText,
          linkedControlCodes: result.linkedControlCodes,
          complianceStatus: result.complianceStatus,
          status: "ai_draft",
          aiGenerated: false,
        },
        update: {
          alignedFindings: result.alignedFindings,
          gapFindings: result.gapFindings,
          recommendations: result.recommendations,
          linkedControlCodes: result.linkedControlCodes,
          complianceStatus: result.complianceStatus,
          status: "ai_draft",
          workshopResponseId: workshop?.id,
        },
      });

      if (result.complianceStatus === "gap" || result.complianceStatus === "partial" || result.complianceStatus === "not_assessed") {
        const existing = await prisma.gapFinding.findFirst({
          where: { assessmentId, requirementId: scoped.requirementId },
        });
        const gapData = {
          severity: (result.complianceStatus === "gap" || result.complianceStatus === "not_assessed" ? "high" : "medium") as "high" | "medium",
          title: `Gap: ${req.clauseId} (${useCase.name})`,
          description: result.gapFindings,
          remediation: result.recommendations,
        };
        if (existing) {
          await prisma.gapFinding.update({ where: { id: existing.id }, data: gapData });
        } else {
          await prisma.gapFinding.create({
            data: { assessmentId, requirementId: scoped.requirementId, ...gapData },
          });
        }
      }

      count++;
    }
  }

  return count;
}
