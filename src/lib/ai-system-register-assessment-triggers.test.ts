import { describe, expect, it } from "vitest";
import {
  determineRequiredAssessments,
  findNextTriggeredAssessment,
  syncAssessmentSuite,
  type AssessmentSuiteState,
} from "@/lib/ai-system-register-assessment-triggers";

describe("assessment triggers", () => {
  it("requires privacy/DPIA when personal data is processed", () => {
    const suite = determineRequiredAssessments({
      personalDataInvolved: true,
      decisionImpact: "advisory",
      autonomyLevel: "low",
      buildType: "internal",
      businessCriticality: "low",
    });
    expect(suite.some((item) => item.assessmentType === "privacy_dpia")).toBe(true);
    expect(suite.find((item) => item.assessmentType === "privacy_dpia")?.priority).toBe(
      "required"
    );
  });

  it("requires fairness and fundamental rights for people decisions", () => {
    const suite = determineRequiredAssessments({
      decisionImpact: "automated_decision",
      customerFacing: true,
      autonomyLevel: "medium",
      buildType: "internal",
    });
    const ids = suite.map((item) => item.assessmentType);
    expect(ids).toContain("fairness_bias");
    expect(ids).toContain("fundamental_rights");
    expect(ids).toContain("formal_risk");
  });

  it("requires third-party/model and agent assessments for external agentic systems", () => {
    const suite = determineRequiredAssessments({
      buildType: "vendor",
      modelProvider: "OpenAI",
      modelType: "llm",
      aiCapabilities: ["agentic", "genai"],
      autonomyLevel: "high",
      externalFacing: true,
      decisionImpact: "advisory",
    });
    const ids = suite.map((item) => item.assessmentType);
    expect(ids).toContain("third_party_model");
    expect(ids).toContain("agent_autonomy");
    expect(ids).toContain("security_threat");
  });

  it("requires legal/regulatory when jurisdictions or Annex III apply", () => {
    const suite = determineRequiredAssessments({
      regulatoryJurisdictions: ["eu_ai_act", "gdpr"],
      euAnnexIiiRelevance: "potential",
      decisionImpact: "advisory",
      autonomyLevel: "low",
      buildType: "internal",
    });
    expect(suite.some((item) => item.assessmentType === "legal_regulatory")).toBe(true);
  });

  it("requires safety for high-consequence failure notes", () => {
    const suite = determineRequiredAssessments({
      failureImpact: "Incorrect eligibility decisions could deny people housing at scale.",
      businessCriticality: "mission_critical",
      decisionImpact: "advisory",
      autonomyLevel: "low",
      buildType: "internal",
    });
    expect(suite.some((item) => item.assessmentType === "safety")).toBe(true);
    expect(suite.find((item) => item.assessmentType === "formal_risk")?.priority).toBe(
      "required"
    );
  });

  it("preserves module progress when re-syncing suite", () => {
    const previous = syncAssessmentSuite(
      { personalDataInvolved: true, decisionImpact: "advisory", autonomyLevel: "low" },
      null
    );
    previous.modules.privacy_dpia = {
      status: "in_progress",
      answers: { lawful_basis_documented: "yes" },
      notes: "Started",
    };
    const next = syncAssessmentSuite(
      {
        personalDataInvolved: true,
        specialCategoryData: true,
        decisionImpact: "advisory",
        autonomyLevel: "low",
      },
      previous
    );
    expect(next.modules.privacy_dpia?.answers.lawful_basis_documented).toBe("yes");
    expect(next.triggered.some((item) => item.assessmentType === "privacy_dpia")).toBe(true);
  });

  it("suggests the next incomplete required assessment after completing one", () => {
    const triggered = determineRequiredAssessments({
      personalDataInvolved: true,
      decisionImpact: "automated_decision",
      customerFacing: true,
      autonomyLevel: "medium",
      buildType: "internal",
    });
    const suite: AssessmentSuiteState = {
      version: 1,
      computedAt: new Date().toISOString(),
      triggered,
      modules: {
        privacy_dpia: { status: "completed", answers: {} },
      },
    };
    const next = findNextTriggeredAssessment(suite, "not_started", "privacy_dpia");
    expect(next).not.toBeNull();
    expect(next?.assessmentType).not.toBe("privacy_dpia");
    expect(next?.priority).toBe("required");
  });
});
