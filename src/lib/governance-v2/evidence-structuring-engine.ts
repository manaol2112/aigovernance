import type { GovernanceEvidenceSource } from "@prisma/client";
import { callOpenAIJson } from "@/lib/openai-client";
import { prisma } from "@/lib/db";
import type { StructuredSignals } from "@/lib/governance-v2/types";
import { syncGovernanceEvidenceFromCaptureAnalysis } from "@/lib/governance-v2/capture-evidence-sync";

type ExtractionResult = {
  evidence: Array<{
    rawText: string;
    source: "workshop" | "document" | "system" | "reviewer";
    confidenceScore: number;
    linkedAiSystemName?: string | null;
    structuredSignals: StructuredSignals;
  }>;
  detectedSystems: Array<{
    name: string;
    modelType?: string;
    businessFunction?: string;
    vendor?: string;
    deploymentStage?: string;
    autonomyLevel?: string;
    dataTypes?: string[];
    confidenceScore?: number;
  }>;
};

const SYSTEM_PROMPT = `You are an AI governance evidence structuring engine.
Extract structured governance signals from workshop transcripts and notes.
Return JSON: { "evidence": [...], "detectedSystems": [...] }
Each evidence item needs rawText (short excerpt), source, confidenceScore 0-1, structuredSignals with:
aiUsageDetected, humanOversight, dataSensitivity, decisionType, governancePractices[], riskIndicators[], controlEvidence[], mentionedSystems[]
Be conservative with confidence. Only extract what is explicitly stated or strongly implied.`;

export async function structureEvidenceFromText(
  assessmentId: string,
  input: {
    text: string;
    source?: GovernanceEvidenceSource;
    sourceEvidenceId?: string;
  }
) {
  const aiSystems = await prisma.aISystem.findMany({
    where: { assessmentId },
    select: { id: true, name: true },
  });

  const result = await callOpenAIJson<ExtractionResult>({
    system: SYSTEM_PROMPT,
    user: `Known AI systems: ${aiSystems.map((s) => s.name).join(", ") || "none yet"}

Transcript / notes:
"""
${input.text.slice(0, 120_000)}
"""

Extract evidence objects and any newly mentioned AI systems.`,
    maxTokens: 8000,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  const { evidence, detectedSystems } = result.data;
  const systemNameToId = new Map(aiSystems.map((s) => [s.name.toLowerCase(), s.id]));

  for (const sys of detectedSystems ?? []) {
    if (!sys.name?.trim()) continue;
    const key = sys.name.toLowerCase();
    if (systemNameToId.has(key)) continue;
    const created = await prisma.aISystem.create({
      data: {
        assessmentId,
        name: sys.name.trim(),
        businessFunction: sys.businessFunction,
        modelType: (sys.modelType as "llm" | "ml" | "agent" | "rule_based") ?? "llm",
        vendor: sys.vendor,
        deploymentStage: (sys.deploymentStage as "idea" | "dev" | "prod") ?? "prod",
        autonomyLevel: (sys.autonomyLevel as "low" | "medium" | "high") ?? "medium",
        dataTypes: sys.dataTypes ?? [],
        detectedByAi: true,
        confidenceScore: sys.confidenceScore ?? 0.6,
      },
    });
    systemNameToId.set(key, created.id);
  }

  const createdEvidence = [];
  for (const item of evidence ?? []) {
    const linkedName = item.linkedAiSystemName ?? item.structuredSignals?.mentionedSystems?.[0];
    const linkedAiSystemId = linkedName
      ? systemNameToId.get(linkedName.toLowerCase())
      : undefined;

    const row = await prisma.governanceEvidence.create({
      data: {
        assessmentId,
        source: (item.source as GovernanceEvidenceSource) ?? input.source ?? "workshop",
        rawText: item.rawText,
        structuredSignals: item.structuredSignals ?? {},
        confidenceScore: item.confidenceScore ?? 0.5,
        linkedAiSystemId,
        sourceEvidenceId: input.sourceEvidenceId,
      },
    });
    createdEvidence.push(row);
  }

  return { createdEvidence, detectedSystems: detectedSystems ?? [], model: result.model };
}

export async function structureEvidenceFromRepository(assessmentId: string) {
  return syncGovernanceEvidenceFromCaptureAnalysis(assessmentId);
}

export async function listGovernanceEvidence(assessmentId: string) {
  return prisma.governanceEvidence.findMany({
    where: { assessmentId },
    orderBy: { capturedAt: "desc" },
    include: {
      aiSystem: { select: { id: true, name: true } },
      sourceFile: { select: { id: true, fileName: true } },
    },
  });
}
