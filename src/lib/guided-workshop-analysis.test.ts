import { describe, expect, it } from "vitest";
import type { PillarMaturityRecord } from "@/lib/control-review-reports";
import type { SurveyGapItem } from "@/lib/maturity-survey-analysis";
import type { RoadmapStep } from "@/lib/control-review-reports";
import {
  buildExecutiveImplication,
  buildFactualStrengths,
  buildFactualVerdictHeadline,
  selectLeadershipAsks,
  selectLeadershipPriorities,
} from "@/lib/guided-workshop-analysis";
import { weightPctToMaturityBand } from "@/lib/guided-workshop-scoring";

function pillar(
  overrides: Partial<PillarMaturityRecord> & Pick<PillarMaturityRecord, "pillarId">
): PillarMaturityRecord & { band: ReturnType<typeof weightPctToMaturityBand> } {
  const base: PillarMaturityRecord = {
    pillarId: overrides.pillarId,
    pillarLabel: overrides.pillarLabel ?? overrides.pillarId,
    pillarDescription: "desc",
    criticality: "high",
    totalControls: 5,
    reviewedControls: 1,
    alignedCount: 0,
    partialCount: 0,
    gapCount: 1,
    reviewProgressPct: 20,
    alignmentPct: 20,
    maturityLevel: "initial",
    maturityLabel: "Initial",
    ...overrides,
  };
  return { ...base, band: weightPctToMaturityBand(base.alignmentPct) };
}

describe("buildFactualStrengths", () => {
  it("returns empty when no controls are at Managed or Optimized", () => {
    expect(
      buildFactualStrengths([pillar({ pillarId: "governance", alignedCount: 0, gapCount: 1 })])
    ).toEqual([]);
  });

  it("lists pillars with Managed or Optimized rated controls", () => {
    const strengths = buildFactualStrengths([
      pillar({
        pillarId: "governance",
        pillarLabel: "Governance",
        alignedCount: 2,
        reviewedControls: 3,
        gapCount: 1,
        maturityLabel: "Managed",
        alignmentPct: 80,
      }),
    ]);
    expect(strengths[0]).toContain("Governance");
    expect(strengths[0]).toContain("2 of 3");
    expect(strengths[0]).toContain("Managed or Optimized");
  });
});

describe("buildFactualVerdictHeadline", () => {
  it("names the weakest pillar when critical gaps exist", () => {
    expect(
      buildFactualVerdictHeadline({
        overallMaturity: "initial",
        criticalGapCount: 2,
        gapCount: 3,
        weakestPillar: { pillarLabel: "Governance", gapCount: 2 },
      })
    ).toBe("Governance needs executive ownership this quarter");
  });

  it("uses the published maturity headline when gaps exist without a critical concentration", () => {
    expect(
      buildFactualVerdictHeadline({
        overallMaturity: "defined",
        criticalGapCount: 0,
        gapCount: 2,
      })
    ).toBe("Documented but uneven in practice");
  });
});

describe("buildExecutiveImplication", () => {
  it("explains the maturity band and names the weakest rated pillar", () => {
    const text = buildExecutiveImplication({
      org: "Acme",
      overallMaturity: "defined",
      weakestPillar: {
        pillarLabel: "Governance",
        gapCount: 2,
        maturityLabel: "Initial",
      },
      gapCount: 3,
      immediateAskCount: 2,
    });
    expect(text).toContain("Acme is at Defined maturity");
    expect(text).toContain("Processes are written and communicated");
    expect(text).toContain("Governance");
    expect(text).toContain("2 rated controls sit at Initial or Not Implemented");
    expect(text).toContain("2 actions below are the 90-day asks");
  });
});

describe("selectLeadershipPriorities", () => {
  it("keeps the first three gaps as named leadership items", () => {
    const gaps = [
      { controlCode: "C1", controlTitle: "Board oversight", pillarLabel: "Governance", maturityLabel: "Initial", severity: "critical", summary: "Establish board oversight." },
      { controlCode: "C2", controlTitle: "Risk register", pillarLabel: "Risk", maturityLabel: "Developing", severity: "high", summary: "Formalize the risk register." },
      { controlCode: "C3", controlTitle: "Model inventory", pillarLabel: "Inventory", maturityLabel: "Defined", severity: "medium", summary: "Strengthen the inventory." },
      { controlCode: "C4", controlTitle: "Extra", pillarLabel: "Other", maturityLabel: "Defined", severity: "medium", summary: "Skip." },
    ] as SurveyGapItem[];

    const selected = selectLeadershipPriorities(gaps);
    expect(selected).toHaveLength(3);
    expect(selected.map((item) => item.controlTitle)).toEqual([
      "Board oversight",
      "Risk register",
      "Model inventory",
    ]);
  });
});

describe("selectLeadershipAsks", () => {
  it("prefers immediate roadmap items for the 90-day brief", () => {
    const roadmap = [
      {
        priority: 1,
        phase: "short_term",
        phaseLabel: "3–6 months",
        pillarLabel: "Later",
        controlCode: "L1",
        controlTitle: "Later item",
        complianceStatus: "partial",
        action: "Later",
        ownerHint: "CISO",
      },
      {
        priority: 2,
        phase: "immediate",
        phaseLabel: "0–90 days",
        pillarLabel: "Governance",
        controlCode: "G1",
        controlTitle: "Name an owner",
        complianceStatus: "gap",
        action: "Assign executive ownership.",
        ownerHint: "Chief Risk Officer",
      },
    ] as RoadmapStep[];

    const asks = selectLeadershipAsks(roadmap);
    expect(asks).toHaveLength(1);
    expect(asks[0]?.controlTitle).toBe("Name an owner");
    expect(asks[0]?.ownerHint).toBe("Chief Risk Officer");
    expect(asks[0]?.phase).toBe("immediate");
  });
});
