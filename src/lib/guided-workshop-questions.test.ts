import { describe, expect, it } from "vitest";
import {
  buildGuidedWorkshopQuestion,
  controlCapabilityPhrase,
} from "@/lib/guided-workshop-questions";
import type { SurveyControlItem } from "@/lib/maturity-survey-types";

const sampleControl: SurveyControlItem = {
  id: "ctrl-1",
  code: "GOV-001",
  title: "Establish AI Risk Register",
  description:
    "Maintain a living register of AI risks linked to systems, use cases, and owners for board and audit review.",
  controlType: "preventive",
  ownerRole: "Chief Risk Officer",
  frameworkCodes: ["ISO-42001", "NIST-AI-RMF"],
};

describe("guided-workshop-questions", () => {
  it("derives a natural capability phrase from control titles", () => {
    expect(controlCapabilityPhrase("Establish AI Risk Register")).toBe("an ai risk register");
    expect(controlCapabilityPhrase("Monitor Model Performance")).toBe("a model performance");
  });

  it("builds a weighted multiple-choice question with six statements", () => {
    const q = buildGuidedWorkshopQuestion(sampleControl, "Governance & Accountability");
    expect(q.prompt).toContain("an ai risk register");
    expect(q.prompt).toMatch(/Which statement best describes/);
    expect(q.answerOptions).toHaveLength(6);
    expect(q.answerOptions[0]?.weightPct).toBe(0);
    expect(q.answerOptions[5]?.weightPct).toBe(100);
    expect(q.answerOptions.every((o) => o.statement.length > 20)).toBe(true);
    expect(q.answerOptions[0]?.statement).toMatch(/do not have/i);
    expect(q.frameworkLabels).toEqual(["ISO 42001", "NIST"]);
  });

  it("does not use open-ended facilitation prompts", () => {
    const q = buildGuidedWorkshopQuestion(sampleControl, "Governance");
    expect(q.facilitationTip).toMatch(/selects the single statement/i);
    expect(q.facilitationTip).not.toMatch(/describe current state/i);
  });
});
