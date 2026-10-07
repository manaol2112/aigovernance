import { describe, expect, it } from "vitest";
import {
  activeRatingMatrixColumns,
  buildRatingMatrixRows,
  coerceMatrixRating,
  filterRowsWithRatings,
} from "@/lib/ai-system-register-rating-matrix";
import type { AssessmentSuiteState } from "@/lib/ai-system-register-assessment-triggers";

function suiteWith(
  modules: AssessmentSuiteState["modules"]
): AssessmentSuiteState {
  return {
    version: 1,
    computedAt: new Date().toISOString(),
    triggered: [],
    modules,
  };
}

describe("ai-system-register-rating-matrix", () => {
  it("coerces known rating values", () => {
    expect(coerceMatrixRating("high")).toBe("high");
    expect(coerceMatrixRating("gpai")).toBe("gpai");
    expect(coerceMatrixRating("unknown")).toBeNull();
  });

  it("builds overall plus completed module rating cells", () => {
    const rows = buildRatingMatrixRows([
      {
        id: "s1",
        code: "AI-SYS-0001",
        name: "Support bot",
        useCaseType: "generative_ai_content",
        residualRiskTier: "limited",
        riskSource: "assessed",
        riskAssessmentStatus: "completed",
        assessmentSuite: suiteWith({
          privacy_dpia: {
            status: "completed",
            answers: {},
            riskRating: "high",
            riskRatingRationale: "Special category data remains in scope.",
          },
          fairness_bias: {
            status: "waived",
            answers: {},
            riskRating: "minimal",
            riskRatingRationale: "No people-affecting decisions in this release.",
            waivedReason: "Out of scope for v1",
          },
          security_threat: {
            status: "in_progress",
            answers: {},
          },
        }),
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].overall).toMatchObject({ rating: "limited", status: "formal" });
    expect(rows[0].ratedCount).toBe(3);
    expect(rows[0].cells.some((c) => c.assessmentType === "formal_risk")).toBe(false);

    const byType = Object.fromEntries(
      rows[0].cells.map((cell) => [cell.assessmentType, cell])
    );
    expect(byType.privacy_dpia).toMatchObject({ rating: "high", status: "completed" });
    expect(byType.fairness_bias).toMatchObject({ rating: "minimal", status: "waived" });
    expect(byType.security_threat).toMatchObject({ rating: null, status: "empty" });
  });

  it("filters to rows with ratings and active module columns only", () => {
    const rows = buildRatingMatrixRows([
      {
        id: "empty",
        code: "AI-SYS-0002",
        name: "Draft",
        useCaseType: "other",
        riskSource: "not_assessed",
        riskAssessmentStatus: "not_started",
        assessmentSuite: suiteWith({}),
      },
      {
        id: "rated",
        code: "AI-SYS-0003",
        name: "HR screener",
        useCaseType: "hr_recruitment",
        riskSource: "not_assessed",
        riskAssessmentStatus: "in_progress",
        assessmentSuite: suiteWith({
          fundamental_rights: {
            status: "completed",
            answers: {},
            riskRating: "prohibited",
            riskRatingRationale: "Automated hiring decisions without override.",
          },
        }),
      },
    ]);

    const withRatings = filterRowsWithRatings(rows);
    expect(withRatings).toHaveLength(1);
    expect(withRatings[0].systemId).toBe("rated");

    const cols = activeRatingMatrixColumns(withRatings);
    expect(cols.map((c) => c.id)).toEqual(["fundamental_rights"]);
  });
});
