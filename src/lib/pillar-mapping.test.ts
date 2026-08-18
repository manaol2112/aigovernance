import { describe, expect, it } from "vitest";
import { assignRequirementToPillar } from "@/lib/pillar-mapping";

function req(input: {
  title: string;
  theme?: string | null;
  clauseId?: string;
  framework?: string;
}) {
  return {
    id: "r1",
    clauseId: input.clauseId ?? "1.1",
    title: input.title,
    theme: input.theme ?? null,
    requirementType: "requirement",
    framework: { code: input.framework ?? "NIST-AI-RMF" },
  };
}

describe("assignRequirementToPillar", () => {
  it("routes workforce requirements to the workforce pillar", () => {
    const pillar = assignRequirementToPillar(
      req({ title: "AI workforce competency and training program" })
    );
    expect(pillar.id).toBe("workforce");
  });

  it("routes financial resilience requirements to financial-resilience", () => {
    const pillar = assignRequirementToPillar(
      req({ title: "Business continuity and operational resilience for AI systems" })
    );
    expect(pillar.id).toBe("financial-resilience");
  });

  it("routes security keywords to safety-reliability (not a retired security pillar)", () => {
    const pillar = assignRequirementToPillar(
      req({ title: "Adversarial security testing for machine learning models" })
    );
    expect(pillar.id).toBe("safety-reliability");
  });

  it("routes ecosystem supply chain terms to supply-chain", () => {
    const pillar = assignRequirementToPillar(
      req({ title: "Third-party ecosystem partner risk assessment" })
    );
    expect(pillar.id).toBe("supply-chain");
  });
});
