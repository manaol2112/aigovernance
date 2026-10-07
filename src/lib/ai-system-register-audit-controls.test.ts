import { describe, expect, it } from "vitest";
import {
  assertFormalCompleteAllowed,
  assertLifecycleTransitionAllowed,
  assertManualRiskAllowed,
  assertModuleCompleteRatingRationale,
  assertWaiverAllowed,
  extractTreatmentPlanFromScores,
  getRequiredSuiteReadiness,
  invalidateRatedModules,
} from "@/lib/ai-system-register-audit-controls";
import type { AssessmentSuiteState } from "@/lib/ai-system-register-assessment-triggers";
import { emptyFactorScores } from "@/lib/ai-system-register-risk-assessment";

function suite(partial?: Partial<AssessmentSuiteState["modules"]>): AssessmentSuiteState {
  return {
    version: 1,
    computedAt: new Date().toISOString(),
    triggered: [
      {
        assessmentType: "privacy_dpia",
        title: "Privacy / DPIA assessment",
        shortTitle: "Privacy / DPIA",
        description: "",
        frameworkAnchors: [],
        priority: "required",
        reasons: ["Personal data"],
        triggerIds: ["personal_or_sensitive_data"],
      },
      {
        assessmentType: "formal_risk",
        title: "Formal AI Risk Assessment",
        shortTitle: "Final risk rating",
        description: "",
        frameworkAnchors: [],
        priority: "required",
        reasons: ["Baseline"],
        triggerIds: ["baseline_register"],
      },
    ],
    modules: {
      privacy_dpia: {
        status: "completed",
        answers: { lawful_basis_documented: "yes" },
        riskRating: "limited",
        riskRatingRationale: "DPIA evidence reviewed with residual limited risk.",
      },
      ...partial,
    },
  };
}

describe("audit controls", () => {
  it("blocks formal complete when required modules are open", () => {
    const open = suite({
      privacy_dpia: { status: "in_progress", answers: {}, riskRating: null },
    });
    expect(assertFormalCompleteAllowed(open, "in_progress")).toMatch(/required/i);
    expect(getRequiredSuiteReadiness(open, "in_progress").ready).toBe(false);
  });

  it("allows formal complete when required modules are rated", () => {
    expect(assertFormalCompleteAllowed(suite(), "in_progress")).toBeNull();
  });

  it("blocks pilot/production without assessed formal rating and acceptance", () => {
    expect(
      assertLifecycleTransitionAllowed({
        status: "production",
        deploymentStage: "prod",
        riskSource: "manual",
        riskAssessmentStatus: "not_started",
        riskTier: "high",
        riskAcceptanceStatus: "pending",
        assessmentSuite: suite(),
      })
    ).toMatch(/formal risk assessment/i);

    expect(
      assertLifecycleTransitionAllowed({
        status: "production",
        deploymentStage: "prod",
        riskSource: "assessed",
        riskAssessmentStatus: "completed",
        riskTier: "high",
        riskAcceptanceStatus: "pending",
        assessmentSuite: suite(),
      })
    ).toMatch(/acceptance/i);

    expect(
      assertLifecycleTransitionAllowed({
        status: "production",
        deploymentStage: "prod",
        riskSource: "assessed",
        riskAssessmentStatus: "completed",
        riskTier: "high",
        riskAcceptanceStatus: "accepted",
        assessmentSuite: suite(),
      })
    ).toBeNull();
  });

  it("blocks manual risk for production-like systems", () => {
    expect(
      assertManualRiskAllowed({
        currentStatus: "production",
        currentDeploymentStage: "prod",
      })
    ).toMatch(/manual/i);
    expect(
      assertManualRiskAllowed({
        currentStatus: "discovery",
        currentDeploymentStage: "idea",
        nextStatus: "pilot",
      })
    ).toMatch(/manual/i);
    expect(
      assertManualRiskAllowed({
        currentStatus: "discovery",
        currentDeploymentStage: "idea",
      })
    ).toBeNull();
  });

  it("tightens waivers for required / non-waivable modules", () => {
    expect(
      assertWaiverAllowed({
        assessmentType: "privacy_dpia",
        priority: "required",
        riskRatingRationale: "short",
        actorRole: "admin",
      })
    ).toMatch(/20 characters/i);

    expect(
      assertWaiverAllowed({
        assessmentType: "privacy_dpia",
        priority: "required",
        riskRatingRationale: "Enough characters for a waiver rationale.",
        actorRole: "contributor",
      })
    ).toMatch(/risk owner or admin/i);

    expect(
      assertWaiverAllowed({
        assessmentType: "privacy_dpia",
        priority: "required",
        riskRatingRationale: "Enough characters for a waiver rationale.",
        actorRole: "admin",
        specialCategoryData: true,
      })
    ).toMatch(/cannot be waived/i);
  });

  it("requires complete rating rationale and persists treatment notes", () => {
    expect(assertModuleCompleteRatingRationale("too short")).toMatch(/20 characters/i);
    expect(
      assertModuleCompleteRatingRationale("Detailed rationale for the module residual rating.")
    ).toBeNull();

    const scores = emptyFactorScores();
    scores.answers.treat_notes = { value: "Mitigate DPIA gaps by Q3." };
    expect(extractTreatmentPlanFromScores(scores)).toBe("Mitigate DPIA gaps by Q3.");
  });

  it("invalidates completed modules on material change", () => {
    const next = invalidateRatedModules(suite());
    expect(next.modules.privacy_dpia?.status).toBe("stale");
    expect(getRequiredSuiteReadiness(next, "stale").ready).toBe(false);
  });
});
