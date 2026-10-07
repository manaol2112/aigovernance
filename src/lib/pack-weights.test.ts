import { describe, expect, it } from "vitest";
import {
  buildPackReport,
  computePackOverallScorePct,
  describePackPillarRating,
} from "@/lib/pillar-questionnaire-scoring";
import {
  clampPackWeight,
  scoreWeightedAnswers,
  weightSharePct,
} from "@/lib/pack-weights";

describe("pack weights", () => {
  it("clamps weights to 1–10", () => {
    expect(clampPackWeight(0)).toBe(1);
    expect(clampPackWeight(11)).toBe(10);
    expect(clampPackWeight(3.6)).toBe(4);
  });

  it("scores questions with unequal weights inside a pillar", () => {
    expect(
      scoreWeightedAnswers([
        { score: 100, weight: 3 },
        { score: 0, weight: 1 },
      ])
    ).toBe(75);
    expect(
      scoreWeightedAnswers([
        { score: 100, weight: 1 },
        { score: 0, weight: 1 },
      ])
    ).toBe(50);
  });

  it("weights pillars in the overall pack score and exposes methodology", () => {
    const report = buildPackReport({
      title: "Weighted TMT",
      packName: "TMT Pack",
      pillarSet: "tmt_6",
      snapshots: [
        {
          id: "a",
          sourceQuestionId: null,
          pillarId: "technology-risk",
          pillarLabel: "Technology",
          prompt: "Tech controls?",
          helpText: null,
          weight: 1,
          pillarWeight: 3,
          sortOrder: 0,
        },
        {
          id: "b",
          sourceQuestionId: null,
          pillarId: "ecosystem-risk",
          pillarLabel: "Ecosystem",
          prompt: "Vendors?",
          helpText: null,
          weight: 1,
          pillarWeight: 1,
          sortOrder: 1,
        },
      ],
      answers: [
        { questionId: "a", answer: "yes" },
        { questionId: "b", answer: "no" },
      ],
    });

    // (100*3 + 0*1) / 4 = 75
    expect(report.overallScorePct).toBe(75);
    expect(computePackOverallScorePct(report.pillarScores)).toBe(report.overallScorePct);
    expect(report.weighting?.usesCustomWeights).toBe(true);
    expect(report.weighting?.pillars).toHaveLength(2);
    expect(weightSharePct(3, 4)).toBe(75);
    const tech = report.pillarScores.find((pillar) => pillar.pillarId === "technology-risk");
    expect(tech?.weight).toBe(3);
    expect(tech?.contributionPct).toBe(75);
    expect(report.weighting?.pillars[0]?.explanation.ratingReason).toMatch(/rated/i);
    expect(report.weighting?.overallResultNote).toMatch(/75%/);
  });

  it("explains pillar ratings in professional language with weight contribution", () => {
    const explanation = describePackPillarRating({
      pillarLabel: "Technology",
      alignmentPct: 75,
      yesCount: 2,
      partialCount: 1,
      noCount: 0,
      dontKnowCount: 0,
      scoredCount: 3,
      weight: 3,
      weightSharePct: 40,
      contributionPct: 30,
      usesUnequalQuestionWeights: true,
    });
    expect(explanation.ratingTitle).toMatch(/Established|Strong/i);
    expect(explanation.ratingReason).toMatch(/Technology is rated/);
    expect(explanation.ratingReason).toMatch(/in place/i);
    expect(explanation.teaser).toMatch(/Established|Strong|operating|in place/i);
    expect(explanation.questionWeightReason).toMatch(/weight|equal|%/i);
    expect(explanation.weightReason).toMatch(/overall|weight|points|contributes/i);
    expect(explanation.questionWeightReason).not.toMatch(/hurt|helps it/i);
  });
});
