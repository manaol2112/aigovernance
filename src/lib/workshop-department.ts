import { prisma } from "@/lib/db";

/** Sentinel value for enterprise-wide (all departments) workshop mode. */
export const ALL_DEPARTMENTS = "__all__";

export const UNASSIGNED_DEPARTMENT = "Unassigned";

export type DepartmentNotesEntry = {
  workshopNotes?: string;
  facilitatorNotes?: string;
};

export type DepartmentNotesStore = Record<string, DepartmentNotesEntry>;

export function normalizeDepartmentName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function displayDepartment(value: string | null | undefined): string {
  return normalizeDepartmentName(value) ?? UNASSIGNED_DEPARTMENT;
}

/** Prisma `useCase` filter for a selected workshop department. */
export function buildUseCaseWhereForDepartment(
  assessmentId: string,
  department: string | null | undefined
): { assessmentId: string; department?: string | null; OR?: Array<{ department: null } | { department: string }> } {
  const base = { assessmentId };

  if (!department || department === ALL_DEPARTMENTS) {
    return base;
  }

  if (department === UNASSIGNED_DEPARTMENT) {
    return {
      ...base,
      OR: [{ department: null }, { department: "" }],
    };
  }

  return { ...base, department };
}

export function parseDepartmentNotes(raw: unknown): DepartmentNotesStore {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as DepartmentNotesStore;
}

export function getNotesForDepartment(
  store: DepartmentNotesStore,
  department: string
): DepartmentNotesEntry {
  return store[department] ?? {};
}

/** Distinct departments from use cases on an assessment (includes Unassigned). */
export async function getDepartmentsForAssessment(assessmentId: string): Promise<string[]> {
  const useCases = await prisma.useCase.findMany({
    where: { assessmentId },
    select: { department: true },
  });

  const set = new Set<string>();
  for (const uc of useCases) {
    set.add(displayDepartment(uc.department));
  }

  return [...set].sort((a, b) => {
    if (a === UNASSIGNED_DEPARTMENT) return 1;
    if (b === UNASSIGNED_DEPARTMENT) return -1;
    return a.localeCompare(b);
  });
}
