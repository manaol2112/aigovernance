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
import {
  buildPackReport,
  buildPackRoadmap,
  derivePackExecutiveSummary,
  describePackPillarBriefing,
  groupPackRoadmapByPhase,
  rankPackFindings,
  scoreBandLabel,
  scorePillarAnswers,
  splitPackFindingsPreview,
} from "./pillar-questionnaire-scoring";
import type { PackFinding } from "./pillar-questionnaire";

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

  it("maps standard pillar ids when importing into a TMT pack", () => {
    const parsed = parseQuestionPackCsv(
      `pillar_id,question
workforce,Skills ready?
oversight,Override paths?
governance,Board mandate?
not-a-pillar,Skip me
`,
      "tmt_6"
    );
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.questions.map((question) => question.pillarId)).toEqual([
      "human-capital",
      "operational-risk",
      "compliance-risk",
    ]);
  });

  it("imports short TMT names for technology/operational/ecosystem", () => {
    const parsed = parseQuestionPackCsv(
      `pillar_id,question
technology,Model risk owned?
operational,Incident paths defined?
ecosystem,Vendors assessed?
Technology Risk,Platform controls?
`,
      "tmt_6"
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions.map((question) => question.pillarId)).toEqual([
      "technology-risk",
      "operational-risk",
      "ecosystem-risk",
      "technology-risk",
    ]);
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

  it("briefs a 0% pillar for stakeholders without score arithmetic", () => {
    const briefing = describePackPillarBriefing({
      pillarId: "governance",
      pillarLabel: "Governance & Accountability",
      alignmentPct: 0,
      yesCount: 0,
      partialCount: 0,
      noCount: 2,
      dontKnowCount: 1,
      scoredCount: 2,
      weight: 3,
      weightSharePct: 30,
      contributionPct: 0,
    });
    expect(briefing.readingTitle).toBe("Why this matters now");
    expect(briefing.reading).toMatch(/Governance/);
    expect(briefing.reading).toMatch(/foundation|basics|early/i);
    expect(briefing.reading).not.toMatch(/÷|×|=|100|50 pts|Yes \+|scored as/i);
    expect(briefing.ratingTitle).toMatch(/Early/i);
    expect(briefing.ratingTeaser).toMatch(/Early|not in place/i);
    expect(briefing.ratingReason).toMatch(/is rated/);
    expect(briefing.ratingReason).toMatch(/not in place/i);
    expect(briefing.weightReason).toMatch(/overall|weight|points|contributes/i);
    expect(briefing.nextLevelLabel).toBe("Building");
    expect(briefing.nextLevelGuidance).toMatch(/decision forum|risk committee|policy/i);
    expect(briefing.nextLevelGuidance.length).toBeGreaterThan(40);
  });

  it("gives pillar-specific path copy when moving toward Established", () => {
    const briefing = describePackPillarBriefing({
      pillarId: "privacy-data",
      pillarLabel: "Privacy & Data Governance",
      alignmentPct: 40,
      yesCount: 1,
      partialCount: 1,
      noCount: 1,
      dontKnowCount: 0,
      scoredCount: 3,
    });
    expect(briefing.nextLevelLabel).toBe("Established");
    expect(briefing.nextLevelGuidance).toMatch(/data quality|provenance|privacy/i);
    expect(briefing.reading).not.toMatch(/÷|×|=|equation/i);
    expect(briefing.ratingReason).toMatch(/is rated/);
    expect(briefing.ratingReason).toMatch(/Building/i);
    expect(briefing.ratingTeaser).toMatch(/Building|uneven/i);
  });

  it("ranks findings by severity then question and pillar weight", () => {
    const items: PackFinding[] = [
      {
        pillarId: "transparency",
        pillarLabel: "Transparency",
        prompt: "P1",
        summary: "Medium low weight",
        insight: "",
        recommendation: "",
        severity: "medium",
        weight: 2,
        pillarWeight: 1,
      },
      {
        pillarId: "governance",
        pillarLabel: "Governance",
        prompt: "P2",
        summary: "Critical high weight",
        insight: "",
        recommendation: "",
        severity: "critical",
        weight: 8,
        pillarWeight: 3,
      },
      {
        pillarId: "governance",
        pillarLabel: "Governance",
        prompt: "P3",
        summary: "Critical low weight",
        insight: "",
        recommendation: "",
        severity: "critical",
        weight: 3,
        pillarWeight: 3,
      },
      {
        pillarId: "privacy-data",
        pillarLabel: "Privacy",
        prompt: "P4",
        summary: "High weight",
        insight: "",
        recommendation: "",
        severity: "high",
        weight: 9,
        pillarWeight: 2,
      },
    ];
    const ranked = rankPackFindings(items);
    expect(ranked.map((item) => item.prompt)).toEqual(["P2", "P3", "P4", "P1"]);

    const { preview, remaining } = splitPackFindingsPreview(items, 2);
    expect(preview.map((item) => item.prompt)).toEqual(["P2", "P3"]);
    expect(remaining.map((item) => item.prompt)).toEqual(["P4", "P1"]);
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
    expect(summary.keyInsights.length).toBeGreaterThan(0);
    expect(summary.keyInsights.map((item) => item.body).join(" ")).toContain("Acme Corp");
    expect(summary.keyInsights.every((item) => item.title && item.body)).toBe(true);
    expect(report.gaps).toHaveLength(1);
    expect(report.gaps[0]?.summary).toMatch(/has not been established|not yet in place/i);
    expect(report.gaps[0]?.insight).toMatch(/missing/i);
    expect(report.gaps[0]?.recommendation).toMatch(/90-day/i);
    expect(report.gaps[0]?.prompt).toContain("Board");
  });
});

describe("packAnswerFindingSummary", () => {
  it("turns questions into professionally drafted finding statements", () => {
    expect(
      packAnswerFindingSummary(
        "Does the organization have a board mandate for AI governance?",
        "no"
      )
    ).toBe("A board mandate for AI governance has not been established.");

    expect(
      packAnswerFindingSummary(
        "Is there a documented data inventory for AI systems?",
        "partial"
      )
    ).toBe("A documented data inventory for AI systems is underway but not yet complete.");

    expect(packAnswerFindingSummary("Incident response playbook", "yes")).toBe(
      "An incident response playbook is in place."
    );

    expect(
      packAnswerFindingSummary(
        "Do you maintain a complete, centralize inventory of AI tools, models, agents, and use cases in use across the organization?",
        "yes"
      )
    ).toBe(
      "A complete and centralized inventory of AI tools, models, agents, and use cases is in place."
    );

    expect(
      packAnswerFindingSummary(
        "Does the board oversee AI risk with a documented mandate?",
        "no"
      )
    ).toBe("Documented board oversight of AI risk has not been established.");

    expect(
      packAnswerFindingSummary(
        "Is personal data used by AI systems inventoried and classified?",
        "partial"
      )
    ).toBe(
      "Inventory and classification of personal data used by AI systems is underway but not yet complete."
    );

    expect(
      packAnswerFindingSummary(
        "Does the organization have a board mandate for AI governance?",
        "no",
        "Board mandate for AI governance"
      )
    ).toBe("A board mandate for AI governance has not been established.");

    expect(
      packAnswerFindingSummary(
        "Are AI transparency disclosures documented for user-facing systems?",
        "dont_know"
      )
    ).toBe(
      "The status of documentation of AI transparency disclosures for user-facing systems still needs confirmation."
    );
  });

  it("drafts explainability and user-awareness prompts as full sentences", () => {
    expect(
      packAnswerFindingSummary(
        "Can you explain, in plain language, how your AI systems arrive at their outputs or recommendations?",
        "no"
      )
    ).toBe(
      "Plain-language explanations of how your AI systems arrive at their outputs or recommendations have not been established."
    );

    expect(
      packAnswerFindingSummary(
        "Do you explain, in plain language, how your AI systems arrive at their outputs or recommendations?",
        "partial"
      )
    ).toBe(
      "Plain-language explanations of how your AI systems arrive at their outputs or recommendations are underway but not yet complete."
    );

    expect(
      packAnswerFindingSummary(
        "Do users or customers know when they're interacting with AI rather than a human?",
        "no"
      )
    ).toBe(
      "Users and customers are not clearly informed when they are interacting with AI rather than a human."
    );

    expect(
      packAnswerFindingSummary(
        "Do users or customers know when they're interacting with AI rather than a human?",
        "yes"
      )
    ).toBe("Users and customers know when they are interacting with AI rather than a human.");
  });

  it("converts action-style questions into practice statements, never echoing the question", () => {
    expect(
      packAnswerFindingSummary(
        "Do you test AI systems for bias or disparate impact before deployment.",
        "no"
      )
    ).toBe(
      "Testing of AI systems for bias or disparate impact before deployment has not been established."
    );

    expect(
      packAnswerFindingSummary(
        "Have you identified which AI use cases could affect protected classes or individual rights - e.g., hiring, lending, healthcare.",
        "no"
      )
    ).toBe(
      "Identification of AI use cases that could affect protected classes or individual rights (e.g., hiring, lending, healthcare) has not been established."
    );

    expect(
      packAnswerFindingSummary(
        "Do you monitor model performance after deployment?",
        "partial"
      )
    ).toBe("Monitoring of model performance after deployment is underway but not yet complete.");

    expect(
      packAnswerFindingSummary("Do you provide clear AI use notices to customers?", "yes")
    ).toBe("Clear AI use notices to customers are in place.");

    const samples = [
      "Do you test AI systems for bias or disparate impact before deployment?",
      "Have you identified which AI use cases could affect protected classes?",
      "Can you demonstrate human oversight for high-risk decisions?",
      "Do teams review training data for representative coverage?",
      "Have you documented escalation paths for AI incidents?",
    ];

    for (const prompt of samples) {
      const summary = packAnswerFindingSummary(prompt, "no");
      expect(summary).not.toMatch(
        /^(?:Not yet in place|Confirmed in place|Underway|Still to confirm):/i
      );
      expect(summary).not.toMatch(/^(?:Do|Does|Did|Have|Has|Can|Could|Is|Are|Would|Should)\b/);
      expect(summary).toMatch(
        /(?:has not been established|have not been established|is in place|are in place)\.$/
      );
    }
  });

  it("converts Is/Are property questions into proper practice statements", () => {
    expect(
      packAnswerFindingSummary(
        "Is every AI use case assessed before deployment?",
        "no"
      )
    ).toBe(
      "Assessment of every AI use case before deployment has not been established."
    );

    expect(packAnswerFindingSummary("Are AI decisions traceable?", "yes")).toBe(
      "Traceability of AI decisions is in place."
    );

    expect(
      packAnswerFindingSummary(
        "Are human reviews in place before critical decisions are made?",
        "yes"
      )
    ).toBe("Human review before critical decisions is in place.");

    expect(
      packAnswerFindingSummary(
        "Do you have human reviews before critical decisions are made?",
        "yes"
      )
    ).toBe("Human review before critical decisions is in place.");

    // Never produce article or dangling-adjective trash
    for (const prompt of [
      "Is every AI use case assessed before deployment?",
      "Are AI decisions traceable?",
      "Are human reviews before critical decisions made?",
    ]) {
      const summary = packAnswerFindingSummary(prompt, "no");
      expect(summary).not.toMatch(/\bAn every\b/i);
      expect(summary).not.toMatch(/\btraceable\b/i);
      expect(summary).not.toMatch(/\bare made are\b/i);
      expect(summary).not.toMatch(/^(?:Is|Are|Do|Have)\b/);
    }
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
    expect(steps[0]?.action).toMatch(/90-day/i);
    expect(steps[0]?.insight).toMatch(/missing|ownership|board/i);
    expect(steps[0]?.action).not.toMatch(/\?/);
  });
});
