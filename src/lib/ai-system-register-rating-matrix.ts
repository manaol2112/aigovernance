/**
 * Portfolio rating matrix: use cases × assessment modules.
 * Reads completed/waived module ratings (+ formal residual tier) for heat-map views.
 */

import {
  REGISTER_ASSESSMENT_TYPES,
  isModuleRiskRating,
  parseAssessmentSuite,
  type ModuleRiskRating,
  type RegisterAssessmentTypeId,
} from "@/lib/ai-system-register-assessment-triggers";
import { DELOITTE_BRAND } from "@/lib/deloitte-brand";

export type MatrixDisplayRating =
  | ModuleRiskRating
  | "gpai"
  | "general";

export type MatrixCellStatus =
  | "empty"
  | "completed"
  | "waived"
  | "stale"
  | "formal";

export type RatingMatrixCell = {
  assessmentType: RegisterAssessmentTypeId;
  shortTitle: string;
  rating: MatrixDisplayRating | null;
  status: MatrixCellStatus;
};

export type RatingMatrixColumn = {
  id: RegisterAssessmentTypeId;
  shortTitle: string;
  title: string;
};

export type RatingMatrixSystemInput = {
  id: string;
  code: string;
  name: string;
  useCaseType: string;
  assessmentSuite?: unknown;
  riskAssessmentStatus?: string | null;
  residualRiskTier?: string | null;
  riskTier?: string | null;
  riskSource?: string | null;
};

export type RatingMatrixRow = {
  systemId: string;
  code: string;
  name: string;
  useCaseType: string;
  /** Portfolio residual / formal overall tier for the use case. */
  overall: RatingMatrixCell;
  cells: RatingMatrixCell[];
  ratedCount: number;
};

/**
 * Orb palette aligned to Deloitte brand tokens (`DELOITTE_BRAND`).
 * Severity uses brand green → amber → red; GPAI uses digital teal; general uses slate.
 */
export const MATRIX_RATING_COLORS: Record<
  MatrixDisplayRating,
  { label: string; from: string; to: string; highlight: string; ring: string }
> = {
  minimal: {
    label: "Minimal",
    from: DELOITTE_BRAND.green2,
    to: DELOITTE_BRAND.green,
    highlight: DELOITTE_BRAND.greenSoft,
    ring: DELOITTE_BRAND.greenDark,
  },
  limited: {
    label: "Limited",
    from: "#F5B85A",
    to: DELOITTE_BRAND.amber,
    highlight: "#FCE8CC",
    ring: "#C47200",
  },
  high: {
    label: "High",
    from: "#F0A06A",
    to: "#D65A1A",
    highlight: "#FBE4D4",
    ring: "#A84612",
  },
  prohibited: {
    label: "Prohibited",
    from: "#E85A4F",
    to: DELOITTE_BRAND.red,
    highlight: "#F8D4D1",
    ring: "#A81F16",
  },
  gpai: {
    label: "GPAI",
    from: "#4A9DC4",
    to: DELOITTE_BRAND.teal,
    highlight: DELOITTE_BRAND.tealSoft,
    ring: DELOITTE_BRAND.tealHover,
  },
  general: {
    label: "General",
    from: "#8A8D91",
    to: DELOITTE_BRAND.slate,
    highlight: DELOITTE_BRAND.surfaceSoft,
    ring: DELOITTE_BRAND.charcoal,
  },
};

export function coerceMatrixRating(value: unknown): MatrixDisplayRating | null {
  if (isModuleRiskRating(value)) return value;
  if (value === "gpai" || value === "general") return value;
  return null;
}

export function getRatingMatrixColumns(): RatingMatrixColumn[] {
  return REGISTER_ASSESSMENT_TYPES.map((type) => ({
    id: type.id,
    shortTitle: type.shortTitle,
    title: type.title,
  }));
}

export function overallRatingCell(system: RatingMatrixSystemInput): RatingMatrixCell {
  const assessed =
    system.riskSource === "assessed" ||
    system.riskSource === "manual" ||
    system.riskAssessmentStatus === "completed";
  const rating = coerceMatrixRating(system.residualRiskTier ?? system.riskTier);
  if (assessed && rating) {
    return {
      assessmentType: "formal_risk",
      shortTitle: "Overall",
      rating,
      status:
        system.riskAssessmentStatus === "stale"
          ? "stale"
          : system.riskSource === "assessed" || system.riskAssessmentStatus === "completed"
            ? "formal"
            : "completed",
    };
  }
  return {
    assessmentType: "formal_risk",
    shortTitle: "Overall",
    rating: null,
    status: "empty",
  };
}

function cellForAssessment(
  assessmentType: RegisterAssessmentTypeId,
  shortTitle: string,
  system: RatingMatrixSystemInput
): RatingMatrixCell {
  if (assessmentType === "formal_risk") {
    return overallRatingCell(system);
  }

  const suite = parseAssessmentSuite(system.assessmentSuite);
  const module = suite.modules[assessmentType];
  if (!module) {
    return { assessmentType, shortTitle, rating: null, status: "empty" };
  }

  const rating = coerceMatrixRating(module.riskRating);
  if (module.status === "stale" && rating) {
    return { assessmentType, shortTitle, rating, status: "stale" };
  }
  if (module.status === "waived" && rating) {
    return { assessmentType, shortTitle, rating, status: "waived" };
  }
  if (module.status === "completed" && rating) {
    return { assessmentType, shortTitle, rating, status: "completed" };
  }

  return { assessmentType, shortTitle, rating: null, status: "empty" };
}

/** Build one matrix row per system (all assessment columns). */
export function buildRatingMatrixRows(
  systems: RatingMatrixSystemInput[]
): RatingMatrixRow[] {
  const columns = getRatingMatrixColumns().filter((col) => col.id !== "formal_risk");
  return systems.map((system) => {
    const overall = overallRatingCell(system);
    const cells = columns.map((col) =>
      cellForAssessment(col.id, col.shortTitle, system)
    );
    const ratedCount =
      cells.filter((cell) => cell.rating != null).length + (overall.rating ? 1 : 0);
    return {
      systemId: system.id,
      code: system.code,
      name: system.name,
      useCaseType: system.useCaseType,
      overall,
      cells,
      ratedCount,
    };
  });
}

/** Rows that have at least one completed/waived/formal rating. */
export function filterRowsWithRatings(rows: RatingMatrixRow[]): RatingMatrixRow[] {
  return rows.filter((row) => row.ratedCount > 0);
}

/** Module columns that have at least one rating (Overall is always shown separately). */
export function activeRatingMatrixColumns(
  rows: RatingMatrixRow[]
): RatingMatrixColumn[] {
  const columns = getRatingMatrixColumns().filter((col) => col.id !== "formal_risk");
  const active = new Set<RegisterAssessmentTypeId>();
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.rating) active.add(cell.assessmentType);
    }
  }
  if (active.size === 0) return columns;
  return columns.filter((col) => active.has(col.id));
}
