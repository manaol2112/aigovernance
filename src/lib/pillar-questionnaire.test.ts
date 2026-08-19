import { describe, expect, it } from "vitest";
import {
  buildPackSnapshots,
  computePackProgress,
  packAnswerFindingSummary,
  packPillarCoverage,
  resolvePackPillarId,
  isQuestionPackProduct,
  questionPackProductFromRoute,
} from "./pillar-questionnaire";
import { parseQuestionPackCsv, questionPackCsvTemplate } from "./question-pack-csv";
import { buildPackReport, buildPackRoadmap, derivePackExecutiveSummary, groupPackRoadmapByPhase, scoreBandLabel, scorePillarAnswers } from "./pillar-questionnaire-scoring";

describe("isQuestionPackProduct", () => {
  it("accepts product tags", () => {
    expect(isQuestionPackProduct("maturity_assessment")).toBe(true);
    expect(isQuestionPackProduct("guided_workshop")).toBe(true);
    expect(isQuestionPackProduct("assessment")).toBe(false);
  });
});

describe("questionPackProductFromRoute", () => {
  it("maps route product slugs", () => {
    expect(questionPackProductFromRoute("maturity")).toBe("maturity_assessment");
    expect(questionPackProductFromRoute("workshop")).toBe("guided_workshop");
  });
});

describe("packPillarCoverage", () => {
  it("requires an active question in every pillar before a pack can be the default", () => {
    const coverage = packPillarCoverage([
      { pillarId: "governance", prompt: "Board mandate?", active: true },
      { pillarId: "privacy-data", prompt: "Data inventory?", active: true },
    ]);
    expect(coverage.complete).toBe(false);
    expect(coverage.missingPillarIds).toContain("fairness");
    expect(coverage.questionCount).toBe(2);
  });

  it("ignores inactive and empty prompts", () => {
    const coverage = packPillarCoverage([
      { pillarId: "governance", prompt: "  ", active: true },
      { pillarId: "governance", prompt: "Hidden", active: false },
    ]);
    expect(coverage.questionCount).toBe(0);
    expect(coverage.complete).toBe(false);
  });
});

describe("parseQuestionPackCsv", () => {
  it("parses the template and maps pillar labels", () => {
    const parsed = parseQuestionPackCsv(questionPackCsvTemplate());
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[0]?.pillarId).toBe("governance");
  });

  it("rejects unknown pillars without dropping valid rows", () => {
    const parsed = parseQuestionPackCsv(
      `pillar_id,question\ngovernance,Board?\nnot-a-pillar,Bad row\n`
    );
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.errors[0]).toMatch(/unknown pillar/i);
  });

  it("resolves human pillar labels", () => {
    expect(resolvePackPillarId("Governance & Accountability")).toBe("governance");
  });
});

describe("pack scoring", () => {
  it("excludes don't know from the pillar percentage", () => {
    expect(scorePillarAnswers(["yes", "no", "dont_know"])).toBe(50);
    expect(scorePillarAnswers(["dont_know"])).toBeNull();
  });

  it("snapshots freeze prompt text independently of later pack edits", () => {
    const snapshots = buildPackSnapshots([
      { id: "q1", pillarId: "governance", prompt: "Original prompt", sortOrder: 0 },
    ]);
    expect(snapshots[0]?.prompt).toBe("Original prompt");
    expect(snapshots[0]?.sourceQuestionId).toBe("q1");
  });

  it("treats don't know as answered for progress but not as a gap", () => {
    const snapshots = [
      {
        id: "a",
        sourceQuestionId: "q1",
        pillarId: "governance",
        pillarLabel: "Governance",
        prompt: "Board?",
        helpText: null,
        sortOrder: 0,
      },
    ];
    const progress = computePackProgress(snapshots, [{ questionId: "a", answer: "dont_know" }]);
    expect(progress.allComplete).toBe(true);

    const report = buildPackReport({
      title: "Test",
      snapshots,
      answers: [{ questionId: "a", answer: "dont_know" }],
    });
    expect(report.gaps).toHaveLength(0);
    expect(report.followUps).toHaveLength(1);
    expect(report.overallScorePct).toBeNull();
  });
});

describe("derivePackExecutiveSummary", () => {
  it("labels score bands and builds narrative from gaps", () => {
    expect(scoreBandLabel(80).shortLabel).toBe("Strong");
    expect(scoreBandLabel(55).shortLabel).toBe("Established");
    expect(scoreBandLabel(30).shortLabel).toBe("Building");
    expect(scoreBandLabel(10).shortLabel).toBe("Early");

    const report = buildPackReport({
      title: "Acme baseline",
      organizationName: "Acme Corp",
      snapshots: [
        {
          id: "a",
          sourceQuestionId: "q1",
          pillarId: "governance",
          pillarLabel: "Governance & Accountability",
          prompt: "Board oversight?",
          helpText: null,
          sortOrder: 0,
        },
        {
          id: "b",
          sourceQuestionId: "q2",
          pillarId: "compliance",
          pillarLabel: "Compliance",
          prompt: "Documentation?",
          helpText: null,
          sortOrder: 1,
        },
      ],
      answers: [
        { questionId: "a", answer: "no" },
        { questionId: "b", answer: "yes" },
      ],
    });

    const summary = derivePackExecutiveSummary(report);
    expect(summary.pillarsAssessed).toBe(2);
    expect(summary.narrative).toContain("Acme Corp");
    expect(summary.narrative).toContain("priority improvement");
    expect(summary.narrative).not.toMatch(/%/);
    expect(report.gaps).toHaveLength(1);
    expect(report.gaps[0]?.summary).toMatch(/not yet in place/i);
    expect(report.gaps[0]?.prompt).toContain("Board");
  });
});

describe("packAnswerFindingSummary", () => {
  it("turns questions into answer-based finding statements", () => {
    expect(
      packAnswerFindingSummary(
        "Does the organization have a board mandate for AI governance?",
        "no"
      )
    ).toBe("Board mandate for AI governance is not yet in place.");

    expect(
      packAnswerFindingSummary(
        "Is there a documented data inventory for AI systems?",
        "partial"
      )
    ).toBe("Documented data inventory for AI systems is underway but not yet complete.");

    expect(packAnswerFindingSummary("Incident response playbook", "yes")).toBe(
      "Incident response playbook is in place."
    );

    expect(
      packAnswerFindingSummary(
        "Do you maintain a complete, centralize inventory of AI tools, models, agents, and use cases in use across the organization?",
        "yes"
      )
    ).toBe(
      "Complete, centralize inventory of AI tools, models, agents, and use cases in use across the organization is in place."
    );

    expect(
      packAnswerFindingSummary(
        "Does the board oversee AI risk with a documented mandate?",
        "no"
      )
    ).toBe("AI risk with a documented mandate is not yet in place.");

    expect(
      packAnswerFindingSummary(
        "Is personal data used by AI systems inventoried and classified?",
        "partial"
      )
    ).toBe("Personal data used by AI systems is underway but not yet complete.");

    expect(
      packAnswerFindingSummary(
        "Does the organization have a board mandate for AI governance?",
        "no",
        "Board mandate for AI governance"
      )
    ).toBe("Board mandate for AI governance is not yet in place.");
  });
});

describe("buildPackRoadmap", () => {
  it("phases gaps, partials, and follow-ups into a sequenced action plan", () => {
    const report = buildPackReport({
      title: "Roadmap test",
      organizationName: "Acme",
      snapshots: [
        {
          id: "a",
          sourceQuestionId: "q1",
          pillarId: "governance",
          pillarLabel: "Governance",
          prompt: "Board oversight?",
          helpText: null,
          sortOrder: 0,
        },
        {
          id: "b",
          sourceQuestionId: "q2",
          pillarId: "compliance",
          pillarLabel: "Compliance",
          prompt: "Documentation?",
          helpText: null,
          sortOrder: 1,
        },
        {
          id: "c",
          sourceQuestionId: "q3",
          pillarId: "privacy-data",
          pillarLabel: "Privacy",
          prompt: "Inventory?",
          helpText: null,
          sortOrder: 2,
        },
      ],
      answers: [
        { questionId: "a", answer: "no" },
        { questionId: "b", answer: "partial" },
        { questionId: "c", answer: "dont_know" },
      ],
    });

    const steps = buildPackRoadmap(report);
    const grouped = groupPackRoadmapByPhase(steps);

    expect(grouped.immediate).toHaveLength(1);
    expect(grouped.short_term).toHaveLength(1);
    expect(grouped.medium_term).toHaveLength(1);
    expect(steps[0]?.phase).toBe("immediate");
    expect(steps[1]?.phase).toBe("short_term");
    expect(steps[2]?.phase).toBe("medium_term");
    expect(steps[0]?.action).toMatch(/Board oversight/i);
    expect(steps[0]?.action).not.toMatch(/\?/);
  });
});
