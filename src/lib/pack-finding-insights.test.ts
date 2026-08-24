import { describe, expect, it } from "vitest";
import {
  buildPackFindingInsight,
  buildPackKeyInsights,
  interpretPackPillarStanding,
} from "./pack-finding-insights";

describe("buildPackFindingInsight", () => {
  it("explains why a gap matters and names a concrete next move", () => {
    const insight = buildPackFindingInsight({
      pillarId: "governance",
      summary: "Board mandate for AI governance is not yet in place.",
      answer: "no",
    });
    expect(insight.insight).toMatch(/missing/i);
    expect(insight.insight).toMatch(/ownership|board/i);
    expect(insight.recommendation).toMatch(/90-day/i);
    expect(insight.severity).toBe("critical");
  });

  it("frames partials as unfinished delivery with a checkpoint", () => {
    const insight = buildPackFindingInsight({
      pillarId: "privacy-data",
      summary: "Personal data inventory is underway but not yet complete.",
      answer: "partial",
    });
    expect(insight.insight).toMatch(/started|residual risk/i);
    expect(insight.recommendation).toMatch(/30–60 days|checkpoint/i);
  });
});

describe("buildPackKeyInsights", () => {
  it("builds titled takeaways without percentage scores or meta briefing language", () => {
    const insights = buildPackKeyInsights({
      organizationName: "Northwind",
      scoreLabel: "Building foundation",
      overallScorePct: 40,
      gapCount: 3,
      partialCount: 1,
      followUpCount: 2,
      leadingPillarLabels: [],
      priorityPillarLabels: ["Governance & Accountability", "Privacy & Data"],
      topGapSummaries: [
        "Board mandate for AI governance is not yet in place.",
        "AI inventory is not yet in place.",
      ],
    });

    const text = insights.map((item) => `${item.title} ${item.body}`).join(" ");
    expect(insights.length).toBeGreaterThan(1);
    expect(text).toContain("Northwind");
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/briefing for leadership|client debrief/i);
    expect(text).toMatch(/Board mandate|AI inventory/i);
  });
});

describe("interpretPackPillarStanding", () => {
  it("names the actual gap topics instead of repeating generic posture copy", () => {
    const standing = interpretPackPillarStanding({
      pillarId: "governance",
      pillarLabel: "Governance & Accountability",
      alignmentPct: 10,
      yesCount: 0,
      partialCount: 0,
      noCount: 2,
      dontKnowCount: 0,
      gapTopics: ["board mandate for AI governance", "AI risk ownership"],
    });
    expect(standing.reading).toBe("Early stage");
    expect(standing.meaning).toMatch(/Board mandate/i);
    expect(standing.meaning).not.toMatch(/Few practices are confirmed/i);
    expect(standing.focus).toMatch(/Board mandate|owner|90-day/i);
  });

  it("makes strong pillars about protecting what works", () => {
    const standing = interpretPackPillarStanding({
      pillarId: "transparency",
      pillarLabel: "Transparency",
      alignmentPct: 90,
      yesCount: 3,
      partialCount: 0,
      noCount: 0,
      dontKnowCount: 0,
      strengthTopics: ["user-facing AI disclosures"],
    });
    expect(standing.reading).toBe("Strong");
    expect(standing.meaning).toMatch(/disclosures|trust|strong/i);
    expect(standing.meaning).not.toMatch(/Few practices are confirmed/i);
    expect(standing.focus).toMatch(/Protect|evidence/i);
  });

  it("differs by pillar even with the same answer mix", () => {
    const governance = interpretPackPillarStanding({
      pillarId: "governance",
      pillarLabel: "Governance",
      alignmentPct: 15,
      yesCount: 0,
      partialCount: 0,
      noCount: 2,
      dontKnowCount: 0,
    });
    const privacy = interpretPackPillarStanding({
      pillarId: "privacy-data",
      pillarLabel: "Privacy",
      alignmentPct: 15,
      yesCount: 0,
      partialCount: 0,
      noCount: 2,
      dontKnowCount: 0,
    });
    expect(governance.meaning).not.toBe(privacy.meaning);
    expect(governance.meaning).toMatch(/ownership|board/i);
    expect(privacy.meaning).toMatch(/privacy|lawful-use|lifecycle/i);
  });
});
