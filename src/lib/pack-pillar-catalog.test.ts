import { describe, expect, it } from "vitest";
import {
  TMT_PILLARS,
  getPackPillarCatalog,
  resolvePackPillarIdForSet,
  resolvePackPillarSet,
} from "@/lib/pack-pillar-catalog";
import { packPillarCoverage } from "@/lib/pillar-questionnaire";
import { buildPackReport } from "@/lib/pillar-questionnaire-scoring";

describe("pack pillar catalog — TMT", () => {
  it("defines exactly six TMT pillars in the agreed order", () => {
    expect(TMT_PILLARS.map((pillar) => pillar.id)).toEqual([
      "human-capital",
      "regulatory-financial",
      "operational-risk",
      "ecosystem-risk",
      "technology-risk",
      "compliance-risk",
    ]);
    expect(getPackPillarCatalog("tmt_6")).toHaveLength(6);
    expect(getPackPillarCatalog("standard_11")).toHaveLength(11);
  });

  it("detects TMT from pack name even when stored set is standard", () => {
    expect(
      resolvePackPillarSet({ name: "TMT Pack", pillarSet: "standard_11" })
    ).toBe("tmt_6");
    expect(resolvePackPillarSet({ name: "Baseline Pack", pillarSet: "tmt_6" })).toBe(
      "tmt_6"
    );
    expect(resolvePackPillarSet({ name: "Baseline Pack" })).toBe("standard_11");
  });

  it("resolves TMT pillar labels for CSV import", () => {
    expect(resolvePackPillarIdForSet("Human Capital", "tmt_6")).toBe("human-capital");
    expect(resolvePackPillarIdForSet("Regulatory & Financial", "tmt_6")).toBe(
      "regulatory-financial"
    );
    expect(resolvePackPillarIdForSet("Regulatory & Financial Risk", "tmt_6")).toBe(
      "regulatory-financial"
    );
    expect(resolvePackPillarIdForSet("Technology", "tmt_6")).toBe("technology-risk");
    expect(resolvePackPillarIdForSet("not-a-pillar", "tmt_6")).toBeNull();
  });

  it("shows TMT pillar labels without a trailing Risk suffix", () => {
    expect(TMT_PILLARS.map((pillar) => pillar.label)).toEqual([
      "Human Capital",
      "Regulatory & Financial",
      "Operational",
      "Ecosystem",
      "Technology",
      "Compliance",
    ]);
  });

  it("maps standard 11 pillar ids onto TMT when importing a TMT pack", () => {
    expect(resolvePackPillarIdForSet("workforce", "tmt_6")).toBe("human-capital");
    expect(resolvePackPillarIdForSet("financial-resilience", "tmt_6")).toBe(
      "regulatory-financial"
    );
    expect(resolvePackPillarIdForSet("oversight", "tmt_6")).toBe("operational-risk");
    expect(resolvePackPillarIdForSet("supply-chain", "tmt_6")).toBe("ecosystem-risk");
    expect(resolvePackPillarIdForSet("safety-reliability", "tmt_6")).toBe("technology-risk");
    expect(resolvePackPillarIdForSet("governance", "tmt_6")).toBe("compliance-risk");
    expect(resolvePackPillarIdForSet("Workforce & Human Capital Risk", "tmt_6")).toBe(
      "human-capital"
    );
  });

  it("accepts short TMT pillar names used in CSVs", () => {
    expect(resolvePackPillarIdForSet("technology", "tmt_6")).toBe("technology-risk");
    expect(resolvePackPillarIdForSet("Technology", "tmt_6")).toBe("technology-risk");
    expect(resolvePackPillarIdForSet("technology_risk", "tmt_6")).toBe("technology-risk");
    expect(resolvePackPillarIdForSet("operational", "tmt_6")).toBe("operational-risk");
    expect(resolvePackPillarIdForSet("Operational Risk", "tmt_6")).toBe("operational-risk");
    expect(resolvePackPillarIdForSet("ecosystem", "tmt_6")).toBe("ecosystem-risk");
    expect(resolvePackPillarIdForSet("Ecosystem Risk", "tmt_6")).toBe("ecosystem-risk");
    expect(resolvePackPillarIdForSet("compliance", "tmt_6")).toBe("compliance-risk");
  });

  it("requires all six TMT pillars for complete coverage", () => {
    const incomplete = packPillarCoverage(
      [{ pillarId: "human-capital", prompt: "Skills ready?", active: true }],
      "tmt_6"
    );
    expect(incomplete.complete).toBe(false);
    expect(incomplete.pillarCount).toBe(6);
    expect(incomplete.missingPillarIds).toContain("technology-risk");

    const complete = packPillarCoverage(
      TMT_PILLARS.map((pillar) => ({
        pillarId: pillar.id,
        prompt: `${pillar.label}?`,
        active: true,
      })),
      "tmt_6"
    );
    expect(complete.complete).toBe(true);
    expect(complete.missingPillarIds).toEqual([]);
  });

  it("scores TMT pack reports across the six pillars only", () => {
    const snapshots = TMT_PILLARS.map((pillar, index) => ({
      id: `q${index}`,
      sourceQuestionId: null,
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      prompt: `${pillar.label}?`,
      helpText: null,
      sortOrder: index,
    }));
    const report = buildPackReport({
      title: "TMT baseline",
      packName: "TMT Pack",
      pillarSet: "tmt_6",
      snapshots,
      answers: snapshots.map((snapshot) => ({
        questionId: snapshot.id,
        answer: "yes" as const,
      })),
    });
    expect(report.pillarScores).toHaveLength(6);
    expect(report.pillarScores.map((score) => score.pillarId)).toEqual(
      TMT_PILLARS.map((pillar) => pillar.id)
    );
    expect(report.overallScorePct).toBe(100);
  });
});
