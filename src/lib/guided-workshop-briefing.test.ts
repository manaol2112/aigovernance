import { describe, expect, it } from "vitest";
import { buildGuidedWorkshopBriefing } from "@/lib/guided-workshop-briefing";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";

const sampleCatalog: SurveyPillarGroup[] = [
  {
    pillarId: "governance",
    pillarLabel: "Governance & Accountability",
    pillarDescription: "Board oversight and accountability.",
    criticality: "critical",
    frameworkCodes: ["ISO-42001"],
    controls: [
      {
        id: "c1",
        code: "GOV-001",
        title: "Establish AI Risk Register",
        description: "Risk register",
        controlType: "preventive",
        ownerRole: "CRO",
        frameworkCodes: ["ISO-42001"],
      },
      {
        id: "c2",
        code: "GOV-002",
        title: "Define AI Policy",
        description: "Policy",
        controlType: "preventive",
        ownerRole: "Legal",
        frameworkCodes: ["ISO-42001"],
      },
    ],
  },
  {
    pillarId: "compliance",
    pillarLabel: "Compliance & Documentation",
    pillarDescription: "Documentation and traceability.",
    criticality: "high",
    frameworkCodes: ["EU-AIA"],
    controls: [
      {
        id: "c3",
        code: "CMP-001",
        title: "Technical Documentation",
        description: "Docs",
        controlType: "detective",
        ownerRole: "Engineering",
        frameworkCodes: ["EU-AIA"],
      },
    ],
  },
];

describe("guided-workshop-briefing", () => {
  it("builds pillar preview with control counts", () => {
    const briefing = buildGuidedWorkshopBriefing({
      catalog: sampleCatalog,
      organizationName: "Contoso Ltd",
      facilitatorName: "Alex Morgan",
      frameworkCodes: ["ISO-42001", "EU-AIA"],
    });

    expect(briefing.pillarCount).toBe(2);
    expect(briefing.totalQuestions).toBe(3);
    expect(briefing.pillars[0]?.controlCount).toBe(2);
    expect(briefing.pillars[0]?.criticalQuestion.length).toBeGreaterThan(10);
    expect(briefing.frameworkLabels).toContain("ISO 42001");
  });
});
