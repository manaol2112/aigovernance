import { describe, expect, it } from "vitest";
import type { MaturityLevel } from "@prisma/client";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import {
  computeSurveyProgress,
  resolveNavigationStepIndex,
  validateSurveyReadyToSubmit,
} from "@/lib/maturity-survey-progress";
import { assertWizardStepsStayStable } from "@/lib/maturity-survey-wizard-state";

const mockCatalog: SurveyPillarGroup[] = [
  {
    pillarId: "governance",
    pillarLabel: "Governance",
    pillarDescription: "Gov",
    criticality: "critical",
    frameworkCodes: ["NIST-AI-RMF"],
    controls: [
      {
        id: "c1",
        code: "CTRL-GOV-001",
        title: "Governance Policy",
        description: "Policy",
        controlType: "directive",
        ownerRole: "CAIO",
        frameworkCodes: ["NIST-AI-RMF"],
      },
      {
        id: "c2",
        code: "CTRL-GOV-002",
        title: "Risk Appetite",
        description: "Appetite",
        controlType: "directive",
        ownerRole: "CRO",
        frameworkCodes: ["NIST-AI-RMF"],
      },
    ],
  },
  {
    pillarId: "compliance",
    pillarLabel: "Compliance",
    pillarDescription: "Comp",
    criticality: "high",
    frameworkCodes: ["EU-AIA"],
    controls: [
      {
        id: "c3",
        code: "CTRL-DOC-001",
        title: "Documentation",
        description: "Docs",
        controlType: "directive",
        ownerRole: "Compliance",
        frameworkCodes: ["EU-AIA"],
      },
    ],
  },
];

const governanceAnswer = {
  controlId: "c1",
  pillarId: "governance",
  maturity: "defined" as MaturityLevel,
};

describe("computeSurveyProgress", () => {
  it("treats carried-forward baseline controls as complete in deep dive navigation", () => {
    const progress = computeSurveyProgress(mockCatalog, [], {
      carriedForwardControlIds: new Set(["c1"]),
    });

    expect(progress.answeredStepCount).toBe(1);
    expect(progress.navigationSteps).toHaveLength(2);
    expect(progress.navigationSteps.every((step) => step.control.id !== "c1")).toBe(true);
    expect(() =>
      assertWizardStepsStayStable(
        computeSurveyProgress(mockCatalog, []),
        progress
      )
    ).not.toThrow();
  });

  it("reports all complete when every step is answered", () => {
    const progress = computeSurveyProgress(mockCatalog, [
      governanceAnswer,
      { controlId: "c2", pillarId: "governance", maturity: "developing" },
      { controlId: "c3", pillarId: "compliance", maturity: "initial" },
    ]);

    expect(progress.allComplete).toBe(true);
    expect(progress.navigationSteps).toHaveLength(0);
    expect(progress.progressPct).toBe(100);
  });
});

describe("deep dive wizard stability", () => {
  it("keeps step indices stable as follow-up questions are answered", () => {
    const catalog: SurveyPillarGroup[] = [
      {
        pillarId: "governance",
        pillarLabel: "Governance",
        pillarDescription: "Gov",
        criticality: "critical",
        frameworkCodes: ["NIST-AI-RMF"],
        controls: [
          {
            id: "c2",
            code: "CTRL-GOV-002",
            title: "Follow-up 1",
            description: "Follow-up",
            controlType: "directive",
            ownerRole: "CAIO",
            frameworkCodes: ["NIST-AI-RMF"],
          },
          {
            id: "c4",
            code: "CTRL-GOV-004",
            title: "Follow-up 2",
            description: "Follow-up",
            controlType: "directive",
            ownerRole: "CAIO",
            frameworkCodes: ["NIST-AI-RMF"],
          },
        ],
      },
    ];

    const before = computeSurveyProgress(catalog, []);
    expect(before.steps).toHaveLength(2);
    expect(before.navigationSteps).toHaveLength(2);

    const after = computeSurveyProgress(catalog, [
      { controlId: "c2", pillarId: "governance", maturity: "defined" },
    ]);
    expect(after.steps).toHaveLength(2);
    expect(after.navigationSteps).toHaveLength(1);
    expect(after.steps[1]?.control.id).toBe("c4");
  });
});

describe("resolveNavigationStepIndex", () => {
  it("lands on first unanswered step when saved index points to a completed step", () => {
    const { steps, navigationSteps } = computeSurveyProgress(mockCatalog, [governanceAnswer]);
    const index = resolveNavigationStepIndex(steps, navigationSteps, 0);

    expect(navigationSteps[0]?.control.id).toBe("c2");
    expect(index).toBe(0);
  });
});

describe("validateSurveyReadyToSubmit", () => {
  it("passes when controlId matches even if pillarId is legacy", () => {
    const result = validateSurveyReadyToSubmit(mockCatalog, [
      { controlId: "c1", pillarId: "security", maturity: "defined" },
      { controlId: "c2", pillarId: "governance", maturity: "developing" },
      { controlId: "c3", pillarId: "compliance", maturity: "initial" },
    ]);

    expect(result).toEqual({ ok: true });
  });

  it("fails when required controls are missing", () => {
    const result = validateSurveyReadyToSubmit(mockCatalog, [governanceAnswer]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingLabels.length).toBeGreaterThan(0);
    }
  });
});
