import { getAssessmentWorkshopGuide } from "@/lib/pillar-workshop-guide";
import {
  resolveDepartmentByLabel,
  resolveSubPillarDepartmentRelevance,
  type SubPillarDepartmentRelevance,
} from "@/lib/sub-pillar-departments";
import type { SubPillarWorkshopBlock } from "@/lib/sub-pillar-workshop-questions";

export type DepartmentWorkshopSection = {
  relevance: SubPillarDepartmentRelevance;
  block: SubPillarWorkshopBlock;
};

export type DepartmentWorkshopGuide = {
  departmentId: string;
  departmentLabel: string;
  departmentDescription: string;
  sections: DepartmentWorkshopSection[];
  primarySectionCount: number;
  secondarySectionCount: number;
  totalQuestions: number;
  totalRequirements: number;
  pillarLabels: string[];
  coverageComplete: boolean;
};

const RELEVANCE_ORDER: Record<SubPillarDepartmentRelevance, number> = {
  primary: 0,
  secondary: 1,
};

/** Cross-pillar workshop runbook tailored to a facilitator department. */
export async function getDepartmentWorkshopGuide(
  assessmentId: string,
  departmentLabel: string,
  scopeDepartment?: string | null
): Promise<DepartmentWorkshopGuide | null> {
  const department = resolveDepartmentByLabel(departmentLabel);
  if (!department) return null;

  const pillarGuides = await getAssessmentWorkshopGuide(assessmentId, scopeDepartment);
  const sections: DepartmentWorkshopSection[] = [];

  for (const pillarGuide of pillarGuides) {
    for (const block of pillarGuide.subPillars) {
      if (block.requirementsTotal === 0) continue;

      const relevance = resolveSubPillarDepartmentRelevance(block.subPillarId, department.id);
      if (!relevance) continue;

      sections.push({ relevance, block });
    }
  }

  sections.sort((a, b) => {
    const rel = RELEVANCE_ORDER[a.relevance] - RELEVANCE_ORDER[b.relevance];
    if (rel !== 0) return rel;
    if (a.block.pillarLabel !== b.block.pillarLabel) {
      return a.block.pillarLabel.localeCompare(b.block.pillarLabel);
    }
    return a.block.subPillarLabel.localeCompare(b.block.subPillarLabel);
  });

  const primarySectionCount = sections.filter((s) => s.relevance === "primary").length;
  const secondarySectionCount = sections.filter((s) => s.relevance === "secondary").length;
  const pillarLabels = [...new Set(sections.map((s) => s.block.pillarLabel))].sort();

  return {
    departmentId: department.id,
    departmentLabel: department.label,
    departmentDescription: department.description,
    sections,
    primarySectionCount,
    secondarySectionCount,
    totalQuestions: sections.reduce((n, s) => n + s.block.questionCount, 0),
    totalRequirements: sections.reduce((n, s) => n + s.block.requirementsTotal, 0),
    pillarLabels,
    coverageComplete: sections.every((s) => s.block.allRequirementsCovered),
  };
}
