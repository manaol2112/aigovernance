import { prisma } from "@/lib/db";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import {
  WORKSHOP_DEPARTMENTS,
  getDepartmentsForFrameworks,
  mapOwnerRoleToDepartmentId,
  type WorkshopDepartmentDef,
  type WorkshopDepartmentOption,
} from "@/lib/workshop-departments-catalog";

export type { WorkshopDepartmentDef, WorkshopDepartmentOption };
export {
  WORKSHOP_DEPARTMENTS,
  getDepartmentsForFrameworks,
  getDepartmentByLabel,
  mapOwnerRoleToDepartmentId,
  mergeDepartmentOptions,
} from "@/lib/workshop-departments-catalog";

/** Suggested workshop departments for an assessment based on scoped frameworks and control owner roles. */
export async function getSuggestedDepartmentsForAssessment(
  assessmentId: string
): Promise<WorkshopDepartmentOption[]> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { scope: true },
  });

  const frameworkCodes = assessment?.scope?.frameworkCodes ?? [];
  const base = getDepartmentsForFrameworks(frameworkCodes);
  const byId = new Map(base.map((d) => [d.id, { ...d, fromScopedControls: false }]));

  try {
    const scopedControls = await getScopedControlsForAssessment(assessmentId);
    for (const control of scopedControls) {
      const deptId = mapOwnerRoleToDepartmentId(control.ownerRole);
      if (!deptId) continue;
      const def = WORKSHOP_DEPARTMENTS.find((d) => d.id === deptId);
      if (!def) continue;
      byId.set(deptId, { ...def, fromScopedControls: true });
    }
  } catch (error) {
    console.error("[getSuggestedDepartmentsForAssessment] scoped controls", error);
  }

  return [...byId.values()].sort((a, b) => {
    if (a.fromScopedControls !== b.fromScopedControls) {
      return a.fromScopedControls ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}
