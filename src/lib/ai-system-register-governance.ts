import type { AiRegisterOrgRole, RiskTier } from "@prisma/client";

/** Material fields — changing these invalidates a completed risk assessment. */
export const RISK_MATERIAL_FIELDS = [
  "name",
  "description",
  "intendedPurpose",
  "useCaseType",
  "status",
  "deploymentStage",
  "actorRole",
  "euAnnexIiiRelevance",
  "euArticle50Triggers",
  "decisionImpact",
  "autonomyLevel",
  "humanInTheLoop",
  "personalDataInvolved",
  "specialCategoryData",
  "dataCategories",
  "friaStatus",
  "dpiaStatus",
  "vendor",
  "modelProvider",
  "modelNameVersion",
  "buildType",
  "aiCapabilities",
  "customerFacing",
  "employeeFacing",
  "externalFacing",
  "criticalBusinessProcess",
  "businessCriticality",
  "failureImpact",
  "regulatoryJurisdictions",
  "prohibitedUseNotes",
  "developerProvider",
] as const;

export type RiskMaterialField = (typeof RISK_MATERIAL_FIELDS)[number];

const ELEVATED_TIERS = new Set<RiskTier>(["prohibited", "high", "gpai"]);
const ACCEPTANCE_REQUIRED_TIERS = new Set<RiskTier>([
  "prohibited",
  "high",
  "gpai",
  "limited",
]);

/** Review cadence in days by residual / declared risk tier. */
export function reviewCadenceDays(tier: RiskTier | null | undefined): number | null {
  if (!tier) return null;
  switch (tier) {
    case "prohibited":
      return 30;
    case "high":
    case "gpai":
      return 90;
    case "limited":
      return 180;
    case "minimal":
    case "general":
      return 365;
    default:
      return 365;
  }
}

export function computeNextReviewAt(
  tier: RiskTier | null | undefined,
  from: Date = new Date()
): Date | null {
  const days = reviewCadenceDays(tier);
  if (days == null) return null;
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isReviewOverdue(
  nextReviewAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!nextReviewAt) return false;
  const due = typeof nextReviewAt === "string" ? new Date(nextReviewAt) : nextReviewAt;
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function isReviewDueSoon(
  nextReviewAt: Date | string | null | undefined,
  withinDays = 14,
  now: Date = new Date()
): boolean {
  if (!nextReviewAt || isReviewOverdue(nextReviewAt, now)) return false;
  const due = typeof nextReviewAt === "string" ? new Date(nextReviewAt) : nextReviewAt;
  if (Number.isNaN(due.getTime())) return false;
  const windowMs = withinDays * 24 * 60 * 60 * 1000;
  return due.getTime() - now.getTime() <= windowMs;
}

export function requiresRiskAcceptance(tier: RiskTier | null | undefined): boolean {
  if (!tier) return false;
  return ACCEPTANCE_REQUIRED_TIERS.has(tier);
}

export function requiresSecondReviewer(tier: RiskTier | null | undefined): boolean {
  if (!tier) return false;
  return ELEVATED_TIERS.has(tier);
}

export function initialAcceptanceStatus(
  tier: RiskTier | null | undefined
): "not_required" | "pending" {
  return requiresRiskAcceptance(tier) ? "pending" : "not_required";
}

export type FieldChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return JSON.stringify([...value].map(String).sort());
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function diffMaterialChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[] = RISK_MATERIAL_FIELDS
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const oldValue = serializeValue(before[field]);
    const newValue = serializeValue(after[field]);
    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
    }
  }
  return changes;
}

export function materialChangesStaleAssessment(changes: FieldChange[]): boolean {
  return changes.some((change) =>
    (RISK_MATERIAL_FIELDS as readonly string[]).includes(change.field)
  );
}

export type RegisterPermission =
  | "read"
  | "write_system"
  | "run_assessment"
  | "manage_evidence"
  | "accept_risk"
  | "manage_members";

const ROLE_PERMISSIONS: Record<AiRegisterOrgRole, RegisterPermission[]> = {
  viewer: ["read"],
  contributor: ["read", "write_system", "run_assessment", "manage_evidence"],
  risk_owner: [
    "read",
    "write_system",
    "run_assessment",
    "manage_evidence",
    "accept_risk",
  ],
  admin: [
    "read",
    "write_system",
    "run_assessment",
    "manage_evidence",
    "accept_risk",
    "manage_members",
  ],
};

export function roleHasPermission(
  role: AiRegisterOrgRole | null | undefined,
  permission: RegisterPermission
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function validateRiskAcceptance(input: {
  tier: RiskTier | null | undefined;
  accepterEmail: string;
  accepterName: string;
  note: string;
  secondReviewerEmail?: string | null;
  secondReviewerName?: string | null;
}): string | null {
  if (!requiresRiskAcceptance(input.tier)) {
    return "Risk acceptance is not required for this tier.";
  }
  if (!input.accepterEmail.trim() || !input.accepterName.trim()) {
    return "Accepter identity is required.";
  }
  if (!input.note.trim()) {
    return "Acceptance rationale is required.";
  }
  if (requiresSecondReviewer(input.tier)) {
    if (!input.secondReviewerEmail?.trim() || !input.secondReviewerName?.trim()) {
      return "Elevated risk requires a second reviewer.";
    }
    if (
      input.secondReviewerEmail.trim().toLowerCase() ===
      input.accepterEmail.trim().toLowerCase()
    ) {
      return "Second reviewer must be different from the risk accepter.";
    }
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
