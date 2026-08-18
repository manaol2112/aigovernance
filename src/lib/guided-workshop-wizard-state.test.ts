import { describe, expect, it } from "vitest";
import {
  buildWorkshopPillarSummaries,
  buildWorkshopResumeSummary,
  getAdjacentStepIndexInPillar,
  resolveInitialWorkshopPhase,
  resolveInitialWorkshopStepIndex,
  resolvePillarEntryStepIndex,
} from "@/lib/guided-workshop-wizard-state";
import { computeSurveyProgress } from "@/lib/maturity-survey-progress";
import { buildSurveySteps } from "@/lib/maturity-survey-types";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";

const catalog: SurveyPillarGroup[] = [
  {
    pillarId: "p1",
    pillarLabel: "Governance",
    pillarDescription: "Test pillar one",
    criticality: "medium",
    frameworkCodes: [],
    controls: [
      {
        id: "c1",
        code: "C1",
        title: "Control 1",
        description: "Test",
        ownerRole: "Owner",
        controlType: "directive",
        frameworkCodes: [],
      },
      {
        id: "c2",
        code: "C2",
        title: "Control 2",
        description: "Test",
        ownerRole: "Owner",
        controlType: "directive",
        frameworkCodes: [],
      },
    ],
  },
  {
    pillarId: "p2",
    pillarLabel: "Risk",
    pillarDescription: "Test pillar two",
    criticality: "high",
    frameworkCodes: [],
    controls: [
      {
        id: "c3",
        code: "C3",
        title: "Control 3",
        description: "Test",
        ownerRole: "Owner",
        controlType: "directive",
        frameworkCodes: [],
      },
    ],
  },
];

describe("guided-workshop-wizard-state", () => {
  const progress = computeSurveyProgress(catalog, []);
  const steps = buildSurveySteps(catalog);

  it("starts on briefing when no responses exist", () => {
    expect(resolveInitialWorkshopPhase([], progress)).toBe("briefing");
  });

  it("opens review when every control is answered", () => {
    const responses = [
      { controlId: "c1", pillarId: "p1", maturity: "defined" as const },
      { controlId: "c2", pillarId: "p1", maturity: "defined" as const },
      { controlId: "c3", pillarId: "p2", maturity: "defined" as const },
    ];
    const full = computeSurveyProgress(catalog, responses);
    expect(resolveInitialWorkshopPhase(responses, full)).toBe("review");
  });

  it("resumes on the first unanswered step when saved index is stale", () => {
    const responses = [
      { controlId: "c1", pillarId: "p1", maturity: "defined" as const },
      { controlId: "c2", pillarId: "p1", maturity: "defined" as const },
    ];
    expect(resolveInitialWorkshopStepIndex(catalog, responses, 0)).toBe(2);
  });

  it("summarises resume progress for the list and banner", () => {
    const responses = [{ controlId: "c1", pillarId: "p1", maturity: "initial" as const }];
    const summary = buildWorkshopResumeSummary(catalog, responses);
    expect(summary.answeredStepCount).toBe(1);
    expect(summary.totalSteps).toBe(3);
    expect(summary.phase).toBe("questions");
    expect(summary.progressPct).toBeGreaterThan(0);
  });

  it("builds per-pillar progress summaries", () => {
    const responses = [{ controlId: "c1", pillarId: "p1", maturity: "initial" as const }];
    const summaries = buildWorkshopPillarSummaries(catalog, steps, responses);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.answeredCount).toBe(1);
    expect(summaries[0]?.controlCount).toBe(2);
    expect(summaries[1]?.answeredCount).toBe(0);
  });

  it("enters a pillar on the first unanswered control", () => {
    const responses = [{ controlId: "c1", pillarId: "p1", maturity: "initial" as const }];
    expect(resolvePillarEntryStepIndex(steps, "p1", [])).toBe(0);
    expect(resolvePillarEntryStepIndex(steps, "p1", responses)).toBe(1);
    expect(resolvePillarEntryStepIndex(steps, "p2", responses)).toBe(2);
  });

  it("navigates next and previous within the same pillar only", () => {
    expect(getAdjacentStepIndexInPillar(steps, 0, "next")).toBe(1);
    expect(getAdjacentStepIndexInPillar(steps, 1, "next")).toBeNull();
    expect(getAdjacentStepIndexInPillar(steps, 2, "prev")).toBeNull();
    expect(getAdjacentStepIndexInPillar(steps, 2, "prev")).toBeNull();
    expect(getAdjacentStepIndexInPillar(steps, 1, "prev")).toBe(0);
  });
});
