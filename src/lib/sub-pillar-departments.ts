import { RISK_SUB_PILLARS } from "@/lib/risk-sub-pillars";
import {
  WORKSHOP_DEPARTMENTS,
  getDepartmentByLabel,
  type WorkshopDepartmentDef,
} from "@/lib/workshop-departments-catalog";

export type SubPillarDepartmentRelevance = "primary" | "secondary";

/** Explicit sub-pillar → department ownership for facilitator runbooks. */
export const SUB_PILLAR_DEPARTMENT_MAP: Record<
  string,
  { primary: string[]; secondary: string[] }
> = {
  "gov-scope-context": {
    primary: ["ai-governance-office", "executive-board"],
    secondary: ["business-operations", "enterprise-risk"],
  },
  "gov-policy-leadership": {
    primary: ["executive-board", "ai-governance-office"],
    secondary: ["legal-regulatory", "enterprise-risk"],
  },
  "gov-roles-accountability": {
    primary: ["ai-governance-office", "hr-workforce"],
    secondary: ["executive-board", "business-operations"],
  },
  "gov-risk-oversight": {
    primary: ["enterprise-risk", "ai-governance-office"],
    secondary: ["executive-board", "responsible-ai"],
  },
  "fair-impact-assessment": {
    primary: ["responsible-ai", "legal-regulatory"],
    secondary: ["hr-workforce", "product-management"],
  },
  "fair-bias-mitigation": {
    primary: ["responsible-ai", "data-science-ml"],
    secondary: ["product-management", "quality-validation"],
  },
  "data-governance-quality": {
    primary: ["privacy-data", "data-science-ml"],
    secondary: ["engineering-rd", "mlops-platform"],
  },
  "data-privacy-protection": {
    primary: ["privacy-data", "legal-regulatory"],
    secondary: ["data-science-ml", "product-management"],
  },
  "safe-lifecycle-vv": {
    primary: ["quality-validation", "data-science-ml"],
    secondary: ["engineering-rd", "responsible-ai"],
  },
  "safe-deployment-ops": {
    primary: ["mlops-platform", "it-operations"],
    secondary: ["engineering-rd", "quality-validation"],
  },
  "sec-ai-threats": {
    primary: ["information-security", "data-science-ml"],
    secondary: ["mlops-platform", "engineering-rd"],
  },
  "sec-controls-access": {
    primary: ["information-security", "it-operations"],
    secondary: ["engineering-rd", "mlops-platform"],
  },
  "trans-user-disclosure": {
    primary: ["product-management", "legal-regulatory"],
    secondary: ["responsible-ai", "business-operations"],
  },
  "trans-explainability": {
    primary: ["data-science-ml", "responsible-ai"],
    secondary: ["product-management", "legal-regulatory"],
  },
  "over-human-loop": {
    primary: ["responsible-ai", "product-management"],
    secondary: ["hr-workforce", "business-operations"],
  },
  "over-monitoring-incident": {
    primary: ["mlops-platform", "it-operations"],
    secondary: ["ai-governance-office", "information-security"],
  },
  "comp-documentation-records": {
    primary: ["ai-governance-office", "quality-validation"],
    secondary: ["legal-regulatory", "internal-audit"],
  },
  "comp-conformity-audit": {
    primary: ["internal-audit", "legal-regulatory"],
    secondary: ["ai-governance-office", "enterprise-risk"],
  },
  "supply-vendor": {
    primary: ["procurement-vendor", "legal-regulatory"],
    secondary: ["information-security", "ai-governance-office"],
  },
  "sys-gpai-systemic": {
    primary: ["ai-governance-office", "legal-regulatory"],
    secondary: ["data-science-ml", "enterprise-risk"],
  },
};

function themeOverlapScore(subPillarId: string, department: WorkshopDepartmentDef): number {
  const sub = RISK_SUB_PILLARS.find((s) => s.id === subPillarId);
  if (!sub) return 0;

  let score = 0;
  const deptThemes = department.workshopThemes.map((t) => t.toLowerCase());
  const subText = `${sub.label} ${sub.description} ${sub.themes.join(" ")}`.toLowerCase();

  for (const theme of deptThemes) {
    if (subText.includes(theme)) score += 1;
  }
  for (const theme of sub.themes) {
    if (deptThemes.some((d) => d.includes(theme) || theme.includes(d))) score += 1;
  }
  return score;
}

export function resolveSubPillarDepartmentRelevance(
  subPillarId: string,
  departmentId: string
): SubPillarDepartmentRelevance | null {
  const mapping = SUB_PILLAR_DEPARTMENT_MAP[subPillarId];
  if (mapping?.primary.includes(departmentId)) return "primary";
  if (mapping?.secondary.includes(departmentId)) return "secondary";

  const department = WORKSHOP_DEPARTMENTS.find((d) => d.id === departmentId);
  if (!department) return null;

  const score = themeOverlapScore(subPillarId, department);
  if (score >= 3) return "primary";
  if (score >= 1) return "secondary";
  return null;
}

export function resolveDepartmentByLabel(label: string): WorkshopDepartmentDef | undefined {
  return getDepartmentByLabel(label);
}
