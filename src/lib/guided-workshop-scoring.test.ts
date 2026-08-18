import { describe, expect, it } from "vitest";
import {
  getWorkshopAnswerOptions,
  maturityToWeightPct,
  weightPctToMaturityBand,
  averageWeightPct,
} from "@/lib/guided-workshop-scoring";

describe("guided-workshop-scoring", () => {
  it("maps maturity levels to weight percentages", () => {
    expect(maturityToWeightPct("not_implemented")).toBe(0);
    expect(maturityToWeightPct("optimized")).toBe(100);
    expect(maturityToWeightPct("defined")).toBe(60);
  });

  it("returns six weighted answer options with client explanations", () => {
    const options = getWorkshopAnswerOptions();
    expect(options).toHaveLength(6);
    expect(options[0]?.weightPct).toBe(0);
    expect(options[5]?.weightPct).toBe(100);
    expect(options.every((o) => o.clientExplanation.length > 10)).toBe(true);
    expect(options.every((o) => o.scoringNote.includes("%"))).toBe(true);
  });

  it("classifies weight bands for client scorecards", () => {
    expect(weightPctToMaturityBand(80)).toBe("strong");
    expect(weightPctToMaturityBand(50)).toBe("developing");
    expect(weightPctToMaturityBand(20)).toBe("critical");
  });

  it("averages weight percentages", () => {
    expect(averageWeightPct([0, 100])).toBe(50);
    expect(averageWeightPct([])).toBe(0);
  });
});
