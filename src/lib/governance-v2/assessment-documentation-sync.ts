import { prisma } from "@/lib/db";
import { validateControlDocumentation } from "@/lib/governance-v2/control-documentation";
import {
  formatDocumentedInPlaceLines,
  formatDocumentationGapLines,
  mergeDocumentationIntoGapFindings,
  mergeDocumentationIntoInPlaceFindings,
} from "@/lib/governance-v2/documentation-findings-merge";

export async function syncDocumentationValidationForAssessment(
  assessmentId: string,
  options?: { controlCodes?: string[]; useAi?: boolean; limit?: number }
): Promise<{ validated: number; errors: string[] }> {
  const evaluations = await prisma.controlEvaluation.findMany({
    where: { assessmentId },
    include: { control: { select: { code: true } } },
    orderBy: { control: { code: "asc" } },
  });

  const codeFilter = options?.controlCodes?.length
    ? new Set(options.controlCodes.map((c) => c.toUpperCase()))
    : null;

  const targets = evaluations.filter((ev) => {
    if (codeFilter && !codeFilter.has(ev.control.code.toUpperCase())) return false;
    const hasContent =
      Boolean(ev.inPlaceFindings?.trim()) ||
      Boolean(ev.gapFindings?.trim()) ||
      Boolean(ev.workshopNotes?.trim());
    return hasContent;
  });

  const slice = options?.limit ? targets.slice(0, options.limit) : targets;
  let validated = 0;
  const errors: string[] = [];

  for (const ev of slice) {
    try {
      await validateControlDocumentation(assessmentId, ev.control.code, {
        useAi: options?.useAi,
      });
      validated++;
    } catch (error) {
      errors.push(
        `${ev.control.code}: ${error instanceof Error ? error.message : "validation failed"}`
      );
    }
  }

  return { validated, errors };
}

// Re-export merge helpers for consumers that only need formatting utilities.
export {
  formatDocumentedInPlaceLines,
  formatDocumentationGapLines,
  mergeDocumentationIntoGapFindings,
  mergeDocumentationIntoInPlaceFindings,
} from "@/lib/governance-v2/documentation-findings-merge";
