import { describe, expect, it } from "vitest";
import type { MaturityLevel } from "@prisma/client";
import type { SurveyPillarGroup } from "@/lib/maturity-survey-types";
import {
  assertWizardStepsStayStable,
  buildWizardProgress,
  countWizardFollowUpQuestions,
  isDeepDiveQuestionsComplete,
  prepareWizardCatalog,
  resolveInitialWizardStepIndex,
} from "@/lib/maturity-survey-wizard-state";

function control(id: string) {
  return {
    id,
    code: `CTRL-${id}`,
    title: `Control ${id}`,
    description: "Test control",
    controlType: "directive",
    ownerRole: "Owner",
    frameworkCodes: ["NIST-AI-RMF"],
  };
}

const catalog: SurveyPillarGroup[] = [
  {
    pillarId: "governance",
    pillarLabel: "Governance",
    pillarDescription: "Gov",
    criticality: "critical",
    frameworkCodes: ["NIST-AI-RMF"],
    controls: [control("baseline"), control("follow-1"), control("follow-2")],
  },
];

describe("countWizardFollowUpQuestions", () => {
  it("returns zero when only baseline controls remain", () => {
    expect(countWizardFollowUpQuestions(catalog, ["baseline"])).toBe(2);
    const baselineOnly: SurveyPillarGroup[] = [
      {
        ...catalog[0]!,
        controls: [control("baseline")],
      },
    ];
    expect(countWizardFollowUpQuestions(baselineOnly, ["baseline"])).toBe(0);
  });
});

describe("prepareWizardCatalog", () => {
  it("removes seeded baseline controls for deep dive only", () => {
    const prepared = prepareWizardCatalog(catalog, "deep_dive", ["baseline"]);
    expect(prepared[0]?.controls.map((item) => item.id)).toEqual(["follow-1", "follow-2"]);
  });

  it("leaves quick scan catalog unchanged", () => {
    const prepared = prepareWizardCatalog(catalog, "quick", ["baseline"]);
    expect(prepared).toEqual(catalog);
  });
});

describe("wizard step stability (regression)", () => {
  const followUpCatalog = prepareWizardCatalog(catalog, "deep_dive", ["baseline"]);

  it("keeps steps stable while navigationSteps shrinks on each answer", () => {
    const empty = buildWizardProgress(followUpCatalog, []);
    expect(empty.steps).toHaveLength(2);
    expect(empty.navigationSteps).toHaveLength(2);

    const afterFirst = buildWizardProgress(followUpCatalog, [
      { controlId: "follow-1", pillarId: "governance", maturity: "defined" as MaturityLevel },
    ]);

    expect(() => assertWizardStepsStayStable(empty, afterFirst)).not.toThrow();
    expect(afterFirst.navigationSteps).toHaveLength(1);
    expect(afterFirst.navigationSteps[0]?.control.id).toBe("follow-2");

    const afterSecond = buildWizardProgress(followUpCatalog, [
      { controlId: "follow-1", pillarId: "governance", maturity: "defined" as MaturityLevel },
      { controlId: "follow-2", pillarId: "governance", maturity: "developing" as MaturityLevel },
    ]);

    expect(() => assertWizardStepsStayStable(empty, afterSecond)).not.toThrow();
    expect(afterSecond.navigationSteps).toHaveLength(0);
    expect(afterSecond.allComplete).toBe(true);
  });

  it("does not change the visible step when answering without clicking Next", () => {
    const progress = buildWizardProgress(followUpCatalog, []);
    const indexBefore = resolveInitialWizardStepIndex(
      progress.steps,
      progress.navigationSteps,
      0
    );
    expect(progress.steps[indexBefore]?.control.id).toBe("follow-1");

    const afterAnswer = buildWizardProgress(followUpCatalog, [
      { controlId: "follow-1", pillarId: "governance", maturity: "defined" as MaturityLevel },
    ]);
    // Same index still points at follow-1 until user clicks Next
    expect(afterAnswer.steps[indexBefore]?.control.id).toBe("follow-1");
  });
});

describe("resolveInitialWizardStepIndex", () => {
  it("resumes on first unanswered step when saved index points at a completed step", () => {
    const progress = buildWizardProgress(catalog, [
      { controlId: "baseline", pillarId: "governance", maturity: "defined" as MaturityLevel },
    ]);
    const index = resolveInitialWizardStepIndex(
      progress.steps,
      progress.navigationSteps,
      0
    );
    expect(progress.steps[index]?.control.id).toBe("follow-1");
  });
});

describe("isDeepDiveQuestionsComplete", () => {
  it("treats baseline-only deep dive as question-complete", () => {
    const baselineOnlyCatalog = prepareWizardCatalog(
      [{ ...catalog[0]!, controls: [control("baseline")] }],
      "deep_dive",
      ["baseline"]
    );
    const emptyFollowUps = buildWizardProgress(baselineOnlyCatalog, []);
    expect(emptyFollowUps.totalSteps).toBe(0);
    expect(isDeepDiveQuestionsComplete("deep_dive", emptyFollowUps, 1)).toBe(true);
  });

  it("requires all follow-ups answered before complete", () => {
    const partial = buildWizardProgress(
      prepareWizardCatalog(catalog, "deep_dive", ["baseline"]),
      [{ controlId: "follow-1", pillarId: "governance", maturity: "defined" as MaturityLevel }]
    );
    expect(isDeepDiveQuestionsComplete("deep_dive", partial, 1)).toBe(false);
  });
});
