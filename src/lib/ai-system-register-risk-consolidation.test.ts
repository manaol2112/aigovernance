import { describe, expect, it } from "vitest";
import {
  applySuiteSuggestionsToFactorScores,
  consolidateSuiteForFormalRisk,
} from "@/lib/ai-system-register-risk-consolidation";
import { emptyFactorScores } from "@/lib/ai-system-register-risk-assessment";
import type { AssessmentSuiteState } from "@/lib/ai-system-register-assessment-triggers";

function suiteFixture(): AssessmentSuiteState {
  return {
    version: 1,
    computedAt: new Date().toISOString(),
    triggered: [
      {
        assessmentType: "privacy_dpia",
        title: "Privacy / DPIA assessment",
        shortTitle: "Privacy / DPIA",
        description: "Privacy",
        frameworkAnchors: ["GDPR"],
        priority: "required",
        reasons: ["Personal data"],
        triggerIds: ["personal_or_sensitive_data"],
      },
      {
        assessmentType: "security_threat",
        title: "AI Security / Threat assessment",
        shortTitle: "AI security",
        description: "Security",
        frameworkAnchors: ["NIST"],
        priority: "required",
        reasons: ["Exposure"],
        triggerIds: ["cybersecurity_exposure"],
      },
      {
        assessmentType: "formal_risk",
        title: "Formal AI Risk Assessment",
        shortTitle: "Final risk rating",
        description: "Final",
        frameworkAnchors: ["NIST"],
        priority: "required",
        reasons: ["Baseline"],
        triggerIds: ["baseline_register"],
      },
    ],
    modules: {
      privacy_dpia: {
        status: "completed",
        answers: {
          lawful_basis_documented: "yes",
          dpia_completed: "no",
          retention_minimisation: "partial",
          data_subject_rights: "yes",
          transfer_safeguards: "na",
        },
        notes: "DPIA outstanding",
        riskRating: "limited",
        riskRatingRationale: "DPIA still outstanding",
      },
      security_threat: {
        status: "completed",
        answers: {
          threat_model: "partial",
          input_output_controls: "yes",
          secrets_isolation: "yes",
          monitoring_response: "no",
        },
        riskRating: "high",
        riskRatingRationale: "Monitoring gap",
      },
    },
  };
}

describe("suite → formal risk consolidation", () => {
  it("consolidates assigned module ratings into inherent/residual suggestions and treatments", () => {
    const result = consolidateSuiteForFormalRisk(suiteFixture(), "not_started", {
      personalDataInvolved: true,
    });

    expect(result.requiredTotal).toBe(2);
    expect(result.requiredDone).toBe(2);
    expect(result.readyForFormal).toBe(true);
    expect(result.moduleFindings).toHaveLength(2);
    expect(result.moduleFindings.find((m) => m.assessmentType === "privacy_dpia")?.riskRating).toBe(
      "limited"
    );
    expect(result.peopleConcern).toBeGreaterThanOrEqual(1);
    expect(result.opsConcern).toBe(3); // high security rating
    expect(result.treatmentRequirements.some((t) => t.strategy === "mitigate")).toBe(true);
    expect(result.suggestedAnswers.res_people_impact?.value).toEqual(expect.any(Number));
    expect(result.suggestedAnswers.res_cross_cutting_gaps?.value).toMatch(/privacy/i);
    expect(result.overallInherentScore).toBeGreaterThan(0);
    expect(result.overallResidualScore).toBeLessThanOrEqual(result.overallInherentScore);
  });

  it("does not treat completed modules without ratings as done", () => {
    const suite = suiteFixture();
    suite.modules.privacy_dpia = {
      ...suite.modules.privacy_dpia!,
      riskRating: null,
    };
    const result = consolidateSuiteForFormalRisk(suite, "not_started");
    expect(result.requiredDone).toBe(1);
    expect(result.readyForFormal).toBe(false);
  });

  it("flags incomplete required modules and prefers completing them first", () => {
    const suite = suiteFixture();
    suite.modules.security_threat = { status: "not_started", answers: {} };
    const result = consolidateSuiteForFormalRisk(suite, "not_started");
    expect(result.readyForFormal).toBe(false);
    expect(result.requiredOpen).toBe(1);
    expect(result.hardRulesFired).toContain("suite_incomplete");
    expect(
      result.treatmentRequirements.some((t) => t.strategy === "complete_assessment")
    ).toBe(true);
  });

  it("seeds empty formal answers without overwriting user edits", () => {
    const consolidation = consolidateSuiteForFormalRisk(suiteFixture(), "not_started");
    const current = emptyFactorScores();
    current.answers.res_people_impact = { value: 1 };
    const merged = applySuiteSuggestionsToFactorScores(current, consolidation, {
      overwriteEmptyOnly: true,
      forceControlStrength: true,
    });
    expect(merged.answers.res_people_impact?.value).toBe(1);
    expect(merged.answers.suite_required_complete?.value).toBe("yes");
    expect(merged.controlEffectivenessPct).toBe(consolidation.controlStrengthPct);
  });
});
