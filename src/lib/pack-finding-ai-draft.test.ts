import { describe, expect, it } from "vitest";
import { isValidPackFindingAiSummary } from "./pack-finding-ai-draft";

describe("isValidPackFindingAiSummary", () => {
  it("accepts polished practice statements", () => {
    expect(
      isValidPackFindingAiSummary(
        "Assessment of every AI use case before deployment has not been established.",
        "no"
      )
    ).toBe(true);
    expect(
      isValidPackFindingAiSummary("Traceability of AI decisions is in place.", "yes")
    ).toBe(true);
    expect(
      isValidPackFindingAiSummary(
        "Human review before critical decisions is in place.",
        "yes"
      )
    ).toBe(true);
  });

  it("rejects question form and known grammar failures", () => {
    expect(
      isValidPackFindingAiSummary(
        "Is every AI use case assessed before deployment?",
        "no"
      )
    ).toBe(false);
    expect(
      isValidPackFindingAiSummary(
        "An every AI use case assessed before deployment has not been established.",
        "no"
      )
    ).toBe(false);
    expect(
      isValidPackFindingAiSummary("An AI decisions traceable is in place.", "yes")
    ).toBe(false);
    expect(
      isValidPackFindingAiSummary(
        "Not yet in place: Do you test AI systems for bias.",
        "no"
      )
    ).toBe(false);
    expect(
      isValidPackFindingAiSummary(
        "AI decisions traceable is in place.",
        "yes"
      )
    ).toBe(false);
  });

  it("rejects summaries that contradict the answer", () => {
    expect(
      isValidPackFindingAiSummary("Traceability of AI decisions is in place.", "no")
    ).toBe(false);
    expect(
      isValidPackFindingAiSummary(
        "Traceability of AI decisions has not been established.",
        "yes"
      )
    ).toBe(false);
  });
});
