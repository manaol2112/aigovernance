import { describe, expect, it } from "vitest";
import {
  AI_GOVERNANCE_RISK_STEPS,
  buildRatingRationale,
  emptyFactorScores,
  parseFactorScores,
  scoreRiskAssessment,
  stepAnswerProgress,
  validateFinding,
} from "@/lib/ai-system-register-risk-assessment";

describe("AI governance risk assessment", () => {
  it("defines a lean 5-step residual rating flow", () => {
    expect(AI_GOVERNANCE_RISK_STEPS).toHaveLength(5);
    expect(AI_GOVERNANCE_RISK_STEPS.map((s) => s.id)).toEqual([
      "suite_linkage",
      "accountability",
      "residual_rating",
      "treatment",
      "findings",
    ]);
    expect(AI_GOVERNANCE_RISK_STEPS.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not re-ask domain checklist themes owned by suite modules", () => {
    const prompts = AI_GOVERNANCE_RISK_STEPS.flatMap((step) =>
      step.questions.map((q) => q.prompt.toLowerCase())
    ).join(" ");
    expect(prompts).not.toMatch(/bias testing/);
    expect(prompts).not.toMatch(/dpia/);
    expect(prompts).not.toMatch(/prompt injection/);
    expect(prompts).not.toMatch(/vendor due diligence/);
  });

  it("scores suite gaps and residual concerns into inherent tier", () => {
    const scores = emptyFactorScores();
    scores.answers = {
      suite_required_complete: { value: "no" },
      acct_business_owner: { value: "no" },
      res_people_impact: { value: 4 },
      res_ops_resilience: { value: 3 },
      res_controls_operating: { value: "partial" },
      treat_strategy_defined: { value: "no" },
    };

    const result = scoreRiskAssessment(scores, {
      decisionImpact: "automated_decision",
      autonomyLevel: "high",
    });

    expect(result.answeredScoredCount).toBeGreaterThan(0);
    expect(result.inherentScore).toBeGreaterThanOrEqual(50);
    expect(result.hardRulesFired).toContain("automated_high_autonomy");
    expect(result.hardRulesFired).toContain("suite_incomplete");
    expect(["high", "prohibited", "limited"]).toContain(result.inherentTier);
  });

  it("applies residual control discount without dropping more than one tier", () => {
    const scores = emptyFactorScores();
    scores.answers = {
      res_people_impact: { value: 3 },
      res_ops_resilience: { value: 3 },
      suite_required_complete: { value: "yes" },
      acct_business_owner: { value: "partial" },
      res_controls_operating: { value: "partial" },
    };
    scores.controlEffectivenessPct = 40;

    const result = scoreRiskAssessment(scores);
    expect(result.residualScore).toBeLessThan(result.inherentScore);
    expect(result.residualScore).toBeGreaterThan(0);
  });

  it("tracks step progress and validates findings", () => {
    const step = AI_GOVERNANCE_RISK_STEPS[0];
    const progress = stepAnswerProgress(step, {
      suite_required_complete: { value: "yes" },
    });
    expect(progress.answered).toBe(1);
    expect(progress.total).toBe(step.questions.length);
    expect(validateFinding({ title: "", severity: "high", stepId: "suite_linkage" })).toMatch(
      /title/i
    );
    expect(
      validateFinding({
        id: "f1",
        title: "Suite incomplete",
        severity: "high",
        stepId: "accountability",
        detail: "No owner",
      })
    ).toBeNull();
  });

  it("parses factor scores safely", () => {
    const parsed = parseFactorScores({
      frameworkVersion: 2,
      answers: { acct_business_owner: { value: "partial" } },
      findings: [
        { id: "1", stepId: "accountability", severity: "medium", title: "Gap", detail: "" },
      ],
    });
    expect(parsed.answers.acct_business_owner?.value).toBe("partial");
    expect(parsed.findings).toHaveLength(1);
    expect(parseFactorScores(null).findings).toEqual([]);
  });

  it("builds a final rating rationale for the use case", () => {
    const scores = emptyFactorScores();
    scores.answers = {
      acct_business_owner: { value: "no" },
      res_people_impact: { value: 3 },
    };
    const result = scoreRiskAssessment(scores);
    const rationale = buildRatingRationale(scores, result);
    expect(rationale).toMatch(/Recommended residual rating/i);
    expect(rationale).toMatch(/Key drivers/i);
    expect(rationale.toLowerCase()).toContain("use case");
  });

  it("labels the last step as applying the overall rating", () => {
    expect(AI_GOVERNANCE_RISK_STEPS.at(-1)?.title).toMatch(/overall rating/i);
  });
});
