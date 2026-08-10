import type { MaturityDocumentStatus } from "@prisma/client";
import { RISK_PILLARS } from "@/lib/risk-pillars";
import {
  PILLAR_EXPECTED_DOCUMENTATION,
  type PillarDocumentationItem,
} from "@/lib/maturity-pillar-documentation";

export type DocumentationChecklistGroup = {
  pillarId: string;
  pillarLabel: string;
  items: PillarDocumentationItem[];
};

export type DocumentResponseLike = {
  documentId: string;
  pillarId: string;
  status: MaturityDocumentStatus;
};

export function buildDocumentationChecklistGroups(
  pillarIds: string[]
): DocumentationChecklistGroup[] {
  const uniqueIds = [...new Set(pillarIds.filter(Boolean))];

  return uniqueIds
    .map((pillarId) => {
      const pillar = RISK_PILLARS.find((item) => item.id === pillarId);
      const items = PILLAR_EXPECTED_DOCUMENTATION[pillarId] ?? [];
      if (items.length === 0) return null;
      return {
        pillarId,
        pillarLabel: pillar?.label ?? pillarId,
        items: [...items].sort((a, b) => a.priority - b.priority),
      };
    })
    .filter((group): group is DocumentationChecklistGroup => group != null);
}

export function countDocumentationChecklistItems(groups: DocumentationChecklistGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}

export function isDocumentationChecklistComplete(
  groups: DocumentationChecklistGroup[],
  responses: DocumentResponseLike[]
): boolean {
  const total = countDocumentationChecklistItems(groups);
  if (total === 0) return true;
  const answered = new Set(responses.map((response) => response.documentId));
  return groups.every((group) => group.items.every((item) => answered.has(item.id)));
}

export function summarizeDocumentResponses(responses: DocumentResponseLike[]) {
  return {
    documented: responses.filter((r) => r.status === "documented").length,
    draft: responses.filter((r) => r.status === "draft").length,
    notEstablished: responses.filter((r) => r.status === "not_established").length,
    notApplicable: responses.filter((r) => r.status === "not_applicable").length,
    missingDocumentation: responses.filter(
      (r) => r.status === "not_established" || r.status === "draft"
    ).length,
  };
}
