import { describe, expect, it } from "vitest";
import {
  buildControlRecommendations,
  detectAssessmentGaps,
  mergeKeyControlCodes,
  recommendControlsForGaps,
  type ControlCatalogItem,
} from "@/lib/ai-system-register-control-recommendations";
import { emptyFactorScores } from "@/lib/ai-system-register-risk-assessment";

const CATALOG: ControlCatalogItem[] = [
  {
    code: "CTRL-ACCT-001",
    title: "AI Accountability and Redress",
    ownerRole: "AI Governance Lead",
    riskCategories: ["governance", "accountability"],
  },
  {
    code: "CTRL-BIAS-001",
    title: "Bias Testing and Fairness Monitoring",
    ownerRole: "Model Risk",
    riskCategories: ["fairness"],
  },
  {
    code: "CTRL-PRIV-001",
    title: "AI Data Privacy Controls",
    ownerRole: "DPO",
    riskCategories: ["privacy", "data"],
  },
  {
    code: "CTRL-SAFE-001",
    title: "AI Safety and Reliability Controls",
    ownerRole: "Model Risk",
    riskCategories: ["safety", "security"],
  },
  {
    code: "CTRL-HITL-001",
    title: "Human Oversight Controls",
    ownerRole: "Operations",
    riskCategories: ["operational"],
  },
];

describe("AI system register control recommendations", () => {
  it("detects gaps from adverse answers and elevated residual scores", () => {
    const gaps = detectAssessmentGaps({
      acct_business_owner: { value: "no" },
      res_people_impact: { value: 3 },
      suite_required_complete: { value: "yes" },
      res_controls_operating: { value: "partial" },
    });

    expect(gaps.map((g) => g.questionId).sort()).toEqual(
      ["acct_business_owner", "res_controls_operating", "res_people_impact"].sort()
    );
    expect(gaps.find((g) => g.questionId === "res_people_impact")?.pillarId).toBe("fairness");
    expect(gaps.find((g) => g.questionId === "acct_business_owner")?.severity).toBe(
      "significant"
    );
  });

  it("recommends framework controls for unaddressed pillars", () => {
    const gaps = detectAssessmentGaps({
      acct_business_owner: { value: "no" },
      res_people_impact: { value: 4 },
      res_ops_resilience: { value: 3 },
      acct_escalation_path: { value: "no" },
    });

    const recommendations = recommendControlsForGaps(gaps, CATALOG);
    const codes = recommendations.map((r) => r.controlCode);

    expect(codes).toContain("CTRL-ACCT-001");
    expect(codes).toContain("CTRL-BIAS-001");
    expect(codes).toContain("CTRL-SAFE-001");
    expect(codes).toContain("CTRL-HITL-001");
  });

  it("excludes already selected key controls", () => {
    const scores = emptyFactorScores();
    scores.answers = {
      res_people_impact: { value: 3 },
    };
    const { recommendations } = buildControlRecommendations(scores, CATALOG, [
      "CTRL-BIAS-001",
    ]);
    expect(recommendations.map((r) => r.controlCode)).not.toContain("CTRL-BIAS-001");
  });

  it("merges key control codes uniquely", () => {
    expect(mergeKeyControlCodes(["CTRL-A", "CTRL-B"], ["CTRL-B", "CTRL-C"])).toEqual([
      "CTRL-A",
      "CTRL-B",
      "CTRL-C",
    ]);
  });
});
