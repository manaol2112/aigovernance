import { describe, expect, it } from "vitest";
import {
  formatAiSystemCode,
  validateAiSystemCreate,
  validateOrganizationName,
} from "@/lib/ai-system-register";

describe("ai system register helpers", () => {
  it("formats sequential system codes", () => {
    expect(formatAiSystemCode(1)).toBe("AI-SYS-0001");
    expect(formatAiSystemCode(42)).toBe("AI-SYS-0042");
  });

  it("requires organization name", () => {
    expect(validateOrganizationName("")).toMatch(/required/i);
    expect(validateOrganizationName("A")).toMatch(/at least 2/i);
    expect(validateOrganizationName("Acme Corp")).toBeNull();
  });

  it("requires critical intake fields and rationale for manual risk tier", () => {
    expect(
      validateAiSystemCreate({
        organizationId: "org1",
        name: "Chatbot",
        description: "Customer support bot",
        useCaseType: "generative_ai_content",
        riskSource: "manual",
        riskTier: "limited",
        manualRiskRationale: "",
      })
    ).toMatch(/purpose/i);

    expect(
      validateAiSystemCreate({
        organizationId: "org1",
        name: "Chatbot",
        description: "Customer support bot",
        intendedPurpose: "Answer customer FAQs",
        businessOwner: "Jane Doe",
        technicalOwner: "AI Platform",
        aiCapabilities: ["genai"],
        useCaseType: "generative_ai_content",
        riskSource: "manual",
        riskTier: "limited",
        manualRiskRationale: "Transparency obligations only; no automated decisions.",
      })
    ).toBeNull();
  });
});
