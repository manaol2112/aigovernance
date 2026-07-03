import { prisma } from "@/lib/db";
import { callOpenAIJson } from "@/lib/openai-client";
import { isControlDocumentationEvidence, isTranscriptEvidence } from "@/lib/transcript-evidence";
import type {
  DocumentationValidationItem,
  DocumentationValidationResult,
  DocumentationValidationStatus,
  ExplainabilityPayload,
} from "@/lib/governance-v2/types";
import {
  formatDocumentedInPlaceLines,
  formatDocumentationGapLines,
  mergeDocumentationIntoGapFindings,
  mergeDocumentationIntoInPlaceFindings,
} from "@/lib/governance-v2/documentation-findings-merge";

export type FrameworkObligation = {
  frameworkCode: string;
  clauseId: string;
  title: string;
  requirementText: string;
  coverage: string;
};

export type ExpectedDocumentation = {
  id: string;
  evidenceType: string;
  description: string;
  retentionPeriod: string | null;
  collectionMethod: string | null;
};

export type ControlProcedureInfo = {
  steps: string;
  responsibleRole: string;
  linkedPolicy: string | null;
};

export type UploadedControlFile = {
  id: string;
  fileName: string;
  uploadedAt: string;
  description: string | null;
  hasText: boolean;
  textPreview: string;
  isControlTagged: boolean;
};

export type ControlDocumentationPackage = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  ownerRole: string;
  frameworkObligations: FrameworkObligation[];
  expectedDocumentation: ExpectedDocumentation[];
  procedure: ControlProcedureInfo | null;
  uploadedFiles: UploadedControlFile[];
  workshopFindingsSummary: string;
  validation: DocumentationValidationResult | null;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function keywordOverlap(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = tokenize(b);
  if (ta.size === 0 || tb.length === 0) return 0;
  return tb.filter((w) => ta.has(w)).length;
}

function workshopClaimsTopic(workshopText: string, expected: ExpectedDocumentation): boolean {
  if (!workshopText.trim()) return false;
  const hay = `${expected.evidenceType} ${expected.description}`.toLowerCase();
  const workshop = workshopText.toLowerCase();
  const keywords = tokenize(hay).filter((w) => w.length > 4);
  const hits = keywords.filter((k) => workshop.includes(k)).length;
  return hits >= 2 || workshop.includes(expected.evidenceType.toLowerCase().slice(0, 12));
}

function matchUploadedFiles(
  expected: ExpectedDocumentation,
  files: UploadedControlFile[],
  controlCode: string
): UploadedControlFile[] {
  const matches: Array<{ file: UploadedControlFile; score: number }> = [];

  for (const file of files) {
    let score = 0;
    if (file.isControlTagged && file.description?.includes(controlCode)) score += 5;
    if (file.description?.toLowerCase().includes(expected.evidenceType.toLowerCase())) score += 4;
    score += keywordOverlap(`${expected.evidenceType} ${expected.description}`, file.fileName);
    score += keywordOverlap(`${expected.evidenceType} ${expected.description}`, file.textPreview);
    if (score >= 3) matches.push({ file, score });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .map((m) => m.file);
}

const DOC_VALIDATION_SYSTEM = [
  "You are an enterprise audit evidence validator for AI governance controls.",
  "",
  "TASK: Determine whether uploaded document text satisfies a specific expected evidence artifact for a control.",
  "",
  "RULES:",
  "1. Use ONLY the provided document excerpt and control context. Never assume content not in the excerpt.",
  "2. 'validated' — excerpt clearly demonstrates the expected artifact exists and meets the described requirement.",
  "3. 'partial' — excerpt relates to the control but is incomplete, draft, outdated, or missing required elements.",
  "4. 'not_validated' — excerpt does not substantiate this evidence type (wrong document).",
  "5. If no excerpt is provided, return status based on workshop claim only: 'claimed_only' if workshop discussed it, else 'missing'.",
  "6. Cite specific phrases from the excerpt when validating. If excerpt is empty, say workshop claim is unverified.",
  "",
  "Return valid JSON only.",
].join("\n");

type AiDocValidation = {
  status: DocumentationValidationStatus;
  validationNotes: string;
};

async function validateItemWithAI(options: {
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  frameworkObligations: FrameworkObligation[];
  expected: ExpectedDocumentation;
  workshopText: string;
  uploadedExcerpt: string;
  workshopClaimed: boolean;
}): Promise<AiDocValidation> {
  if (!options.uploadedExcerpt.trim()) {
    if (options.workshopClaimed) {
      return {
        status: "claimed_only",
        validationNotes:
          "Workshop discussion references practices in this area, but no supporting document was uploaded for independent verification.",
      };
    }
    return {
      status: "missing",
      validationNotes:
        "No workshop claim and no uploaded artifact were identified for this required documentation item.",
    };
  }

  const frameworkBlock = options.frameworkObligations
    .slice(0, 4)
    .map((o) => `${o.frameworkCode} ${o.clauseId}: ${o.title}`)
    .join("\n");

  const result = await callOpenAIJson<AiDocValidation>({
    system: DOC_VALIDATION_SYSTEM,
    user: [
      `Control: ${options.controlCode} — ${options.controlTitle}`,
      `Canonical requirement: ${options.controlDescription.slice(0, 500)}`,
      "",
      "Framework obligations:",
      frameworkBlock || "(none linked)",
      "",
      `Expected evidence artifact: ${options.expected.evidenceType}`,
      `Artifact description: ${options.expected.description}`,
      options.expected.collectionMethod
        ? `Expected collection method: ${options.expected.collectionMethod}`
        : "",
      "",
      `Workshop claimed related practice: ${options.workshopClaimed ? "yes" : "no"}`,
      options.workshopText.trim()
        ? `Workshop context excerpt: ${options.workshopText.slice(0, 800)}`
        : "",
      "",
      "--- UPLOADED DOCUMENT EXCERPT (only source for validation) ---",
      options.uploadedExcerpt.slice(0, 6_000),
      "--- END ---",
      "",
      'Return JSON: { "status": "validated"|"partial"|"not_validated", "validationNotes": "2-4 sentences" }',
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0.1,
    maxTokens: 800,
  });

  if (!result.ok) {
    return {
      status: options.workshopClaimed ? "claimed_only" : "partial",
      validationNotes: "Automated validation unavailable — manual review required for uploaded artifact.",
    };
  }

  const status = result.data.status;
  if (status === "missing" || status === "claimed_only" || status === "not_applicable") {
    return {
      status: options.workshopClaimed ? "claimed_only" : "partial",
      validationNotes: result.data.validationNotes || "Document requires manual review.",
    };
  }

  return {
    status,
    validationNotes: result.data.validationNotes || "Document reviewed against control requirements.",
  };
}

function overallStatusFromItems(
  items: DocumentationValidationItem[]
): DocumentationValidationResult["overallStatus"] {
  if (items.length === 0) return "gaps";
  const validated = items.filter((i) => i.status === "validated").length;
  const missing = items.filter((i) => i.status === "missing" || i.status === "claimed_only").length;
  if (validated === items.length) return "complete";
  if (validated > 0 && missing < items.length) return "partial";
  return "gaps";
}

export async function loadControlDocumentationPackage(
  assessmentId: string,
  controlCode: string
): Promise<ControlDocumentationPackage | null> {
  const control = await prisma.canonicalControl.findUnique({
    where: { code: controlCode },
    include: {
      evidences: { orderBy: { evidenceType: "asc" } },
      procedures: { take: 1, orderBy: { createdAt: "asc" } },
      requirementLinks: {
        include: { requirement: { include: { framework: true } } },
        orderBy: { requirement: { framework: { code: "asc" } } },
      },
    },
  });

  if (!control) return null;

  const evaluation = await prisma.controlEvaluation.findUnique({
    where: { assessmentId_controlId: { assessmentId, controlId: control.id } },
  });

  const allFiles = await prisma.assessmentEvidence.findMany({
    where: { assessmentId },
    orderBy: { uploadedAt: "desc" },
  });

  const uploadedFiles: UploadedControlFile[] = allFiles
    .filter(
      (f) =>
        !isTranscriptEvidence(f.description) &&
        (f.controlCodes.includes(control.code) || isControlDocumentationEvidence(f.description))
    )
    .map((f) => ({
      id: f.id,
      fileName: f.fileName,
      uploadedAt: f.uploadedAt.toISOString(),
      description: f.description,
      hasText: Boolean(f.extractedText?.trim()),
      textPreview: f.extractedText?.replace(/\s+/g, " ").trim().slice(0, 400) ?? "",
      isControlTagged: isControlDocumentationEvidence(f.description),
    }));

  const explainability = (evaluation?.explainability ?? null) as ExplainabilityPayload | null;

  const frameworkObligations: FrameworkObligation[] = control.requirementLinks.map((link) => ({
    frameworkCode: link.requirement.framework.code,
    clauseId: link.requirement.clauseId,
    title: link.requirement.title,
    requirementText: link.requirement.requirementText,
    coverage: link.coverage,
  }));

  const workshopFindingsSummary = [
    evaluation?.inPlaceFindings,
    evaluation?.gapFindings,
    evaluation?.workshopNotes,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4_000);

  return {
    controlId: control.id,
    controlCode: control.code,
    controlTitle: control.title,
    controlDescription: control.description,
    ownerRole: control.ownerRole,
    frameworkObligations,
    expectedDocumentation: control.evidences.map((e) => ({
      id: e.id,
      evidenceType: e.evidenceType,
      description: e.description,
      retentionPeriod: e.retentionPeriod,
      collectionMethod: e.collectionMethod,
    })),
    procedure: control.procedures[0]
      ? {
          steps: control.procedures[0].steps,
          responsibleRole: control.procedures[0].responsibleRole,
          linkedPolicy: control.procedures[0].linkedPolicy,
        }
      : null,
    uploadedFiles,
    workshopFindingsSummary,
    validation: explainability?.documentationValidation ?? null,
  };
}

export async function validateControlDocumentation(
  assessmentId: string,
  controlCode: string,
  options?: { useAi?: boolean }
): Promise<ControlDocumentationPackage | null> {
  const pkg = await loadControlDocumentationPackage(assessmentId, controlCode);
  if (!pkg) return null;

  const useAi = options?.useAi !== false && Boolean(process.env.OPENAI_API_KEY);
  const workshopText = pkg.workshopFindingsSummary;
  const items: DocumentationValidationItem[] = [];

  const expectedItems =
    pkg.expectedDocumentation.length > 0
      ? pkg.expectedDocumentation
      : [
          {
            id: "default",
            evidenceType: "Supporting documentation",
            description: `Documented evidence demonstrating implementation of ${pkg.controlTitle} (${pkg.controlCode}).`,
            retentionPeriod: null,
            collectionMethod: null,
          },
        ];

  for (const expected of expectedItems) {
    const matchedFiles = matchUploadedFiles(expected, pkg.uploadedFiles, pkg.controlCode);
    const workshopClaimed = workshopClaimsTopic(workshopText, expected);
    const uploadedExcerpt = matchedFiles
      .map((f) => f.textPreview)
      .filter(Boolean)
      .join("\n\n");

    const frameworkRefs = pkg.frameworkObligations.slice(0, 3).map(
      (o) => `${o.frameworkCode} ${o.clauseId}`
    );

    let status: DocumentationValidationStatus;
    let validationNotes: string;

    if (useAi) {
      const ai = await validateItemWithAI({
        controlCode: pkg.controlCode,
        controlTitle: pkg.controlTitle,
        controlDescription: pkg.controlDescription,
        frameworkObligations: pkg.frameworkObligations,
        expected,
        workshopText,
        uploadedExcerpt,
        workshopClaimed,
      });
      status = ai.status;
      validationNotes = ai.validationNotes;
    } else if (matchedFiles.length > 0 && uploadedExcerpt) {
      status = "partial";
      validationNotes = `Uploaded file(s) linked: ${matchedFiles.map((f) => f.fileName).join(", ")}. Enable AI validation for content review.`;
    } else if (workshopClaimed) {
      status = "claimed_only";
      validationNotes =
        "Workshop materials describe related practices, but no supporting document was uploaded for this artifact.";
    } else {
      status = "missing";
      validationNotes = "Required documentation artifact not evidenced in workshop materials or uploads.";
    }

    items.push({
      expectedEvidenceId: expected.id,
      evidenceType: expected.evidenceType,
      description: expected.description,
      status,
      workshopClaimed,
      uploadedFileIds: matchedFiles.map((f) => f.id),
      uploadedFileNames: matchedFiles.map((f) => f.fileName),
      validationNotes,
      frameworkRefs,
    });
  }

  const validatedCount = items.filter((i) => i.status === "validated").length;
  const coveragePct =
    items.length > 0 ? Math.round((validatedCount / items.length) * 100) : 0;

  const validation: DocumentationValidationResult = {
    validatedAt: new Date().toISOString(),
    overallStatus: overallStatusFromItems(items),
    coveragePct,
    items,
    summary:
      validatedCount === items.length
        ? "All required documentation artifacts are validated against uploaded evidence."
        : `${validatedCount} of ${items.length} required documentation artifact(s) validated; ${items.filter((i) => i.status === "claimed_only").length} workshop-only claim(s) need uploaded proof.`,
  };

  const evaluation = await prisma.controlEvaluation.findUnique({
    where: { assessmentId_controlId: { assessmentId, controlId: pkg.controlId } },
  });

  const existingExplainability = (evaluation?.explainability ?? {}) as ExplainabilityPayload;
  const mergedExplainability: ExplainabilityPayload = {
    whyClassification: existingExplainability.whyClassification ?? "",
    evidenceTriggers: existingExplainability.evidenceTriggers ?? [],
    frameworkRequirements:
      existingExplainability.frameworkRequirements?.length > 0
        ? existingExplainability.frameworkRequirements
        : pkg.frameworkObligations.map(
            (o) => `${o.frameworkCode} ${o.clauseId} — ${o.title}`
          ),
    whatWouldChangeOutcome: existingExplainability.whatWouldChangeOutcome ?? [],
    scoreBreakdown: existingExplainability.scoreBreakdown,
    documentationValidation: validation,
  };

  await prisma.controlEvaluation.upsert({
    where: { assessmentId_controlId: { assessmentId, controlId: pkg.controlId } },
    create: {
      assessmentId,
      controlId: pkg.controlId,
      explainability: mergedExplainability as object,
      gapFindings: mergeDocumentationIntoGapFindings(
        "",
        formatDocumentationGapLines(items)
      ),
      inPlaceFindings: mergeDocumentationIntoInPlaceFindings(
        "",
        formatDocumentedInPlaceLines(items)
      ),
      status: "ai_draft",
    },
    update: {
      explainability: mergedExplainability as object,
      gapFindings: mergeDocumentationIntoGapFindings(
        evaluation?.gapFindings ?? "",
        formatDocumentationGapLines(items)
      ),
      inPlaceFindings: mergeDocumentationIntoInPlaceFindings(
        evaluation?.inPlaceFindings ?? "",
        formatDocumentedInPlaceLines(items)
      ),
    },
  });

  return { ...pkg, validation };
}
