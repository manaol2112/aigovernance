import type { DocumentationValidationItem } from "@/lib/governance-v2/types";

export function formatDocumentationGapLines(items: DocumentationValidationItem[]): string[] {
  const gaps: string[] = [];

  for (const item of items) {
    if (item.status === "validated" || item.status === "not_applicable") continue;

    if (item.status === "missing") {
      gaps.push(
        `Documentation gap — ${item.evidenceType}: Required artifact not uploaded. ${item.description}`
      );
      continue;
    }

    if (item.status === "claimed_only") {
      gaps.push(
        `Documentation gap — ${item.evidenceType}: Workshop discussion references this area, but no supporting document was uploaded for independent verification.`
      );
      continue;
    }

    if (item.status === "partial" || item.status === "not_validated") {
      gaps.push(
        `Documentation gap — ${item.evidenceType}: Uploaded material does not fully satisfy the requirement. ${item.validationNotes}`
      );
    }
  }

  return gaps;
}

export function formatDocumentedInPlaceLines(items: DocumentationValidationItem[]): string[] {
  return items
    .filter((i) => i.status === "validated")
    .map(
      (i) =>
        `Documented evidence — ${i.evidenceType}: ${i.validationNotes}${
          i.uploadedFileNames.length > 0 ? ` (Source: ${i.uploadedFileNames.join(", ")})` : ""
        }`
    );
}

const DOC_GAP_MARKER = "### Documentation & evidence gaps";

export function mergeDocumentationIntoGapFindings(
  existingGapFindings: string,
  docGapLines: string[]
): string {
  if (docGapLines.length === 0) return existingGapFindings;

  const withoutPriorDocSection = existingGapFindings.split(DOC_GAP_MARKER)[0].trim();
  const docBlock = [DOC_GAP_MARKER, ...docGapLines.map((line) => `- ${line}`)].join("\n");

  if (!withoutPriorDocSection) return docBlock;
  return `${withoutPriorDocSection}\n\n${docBlock}`;
}

export function mergeDocumentationIntoInPlaceFindings(
  existingInPlace: string,
  docInPlaceLines: string[]
): string {
  if (docInPlaceLines.length === 0) return existingInPlace;

  const marker = "### Substantiated by uploaded documentation";
  const withoutPrior = existingInPlace.split(marker)[0].trim();
  const docBlock = [marker, ...docInPlaceLines.map((line) => `- ${line}`)].join("\n");

  if (!withoutPrior) return docBlock;
  return `${withoutPrior}\n\n${docBlock}`;
}
