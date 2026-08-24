import { describe, expect, it } from "vitest";
import { computeSurveyListProgress } from "./maturity-survey-list-progress";
import type { SurveyPillarGroup } from "./maturity-survey-types";

const catalog: SurveyPillarGroup[] = [
  {
    pillarId: "governance",
    pillarLabel: "Governance",
    pillarDescription: "",
    criticality: "critical",
    frameworkCodes: ["nist"],
    controls: [
      { id: "g1", code: "G1", title: "Baseline", description: "", controlType: "policy", ownerRole: "CISO", frameworkCodes: ["nist"] },
      { id: "g2", code: "G2", title: "Follow-up", description: "", controlType: "policy", ownerRole: "CISO", frameworkCodes: ["nist"] },
      { id: "g3", code: "G3", title: "Follow-up 2", description: "", controlType: "policy", ownerRole: "CISO", frameworkCodes: ["nist"] },
    ],
  },
  {
    pillarId: "data",
    pillarLabel: "Data",
    pillarDescription: "",
    criticality: "high",
    frameworkCodes: ["nist"],
    controls: [
      { id: "d1", code: "D1", title: "Data baseline", description: "", controlType: "policy", ownerRole: "CISO", frameworkCodes: ["nist"] },
      { id: "d2", code: "D2", title: "Data follow-up", description: "", controlType: "policy", ownerRole: "CISO", frameworkCodes: ["nist"] },
    ],
  },
];

describe("computeSurveyListProgress", () => {
  it("uses pack counts for pack catalogs", () => {
    expect(
      computeSurveyListProgress({
        questionCatalogSource: "pack",
        surveyMode: "quick",
        focusPillarIds: [],
        packQuestionCount: 12,
        packResponseCount: 4,
        frameworkResponseCount: 99,
        frameworkCatalog: catalog,
        seededControlIds: [],
      })
    ).toEqual({ responseCount: 4, totalQuestions: 12 });
  });

  it("counts the full framework catalog for a quick scan", () => {
    expect(
      computeSurveyListProgress({
        questionCatalogSource: "framework",
        surveyMode: "quick",
        focusPillarIds: [],
        packQuestionCount: 0,
        packResponseCount: 0,
        frameworkResponseCount: 2,
        frameworkCatalog: catalog,
        seededControlIds: [],
      })
    ).toEqual({ responseCount: 2, totalQuestions: 5 });
  });

  it("scopes deep-dive totals to focus pillars and excludes seeded baselines", () => {
    expect(
      computeSurveyListProgress({
        questionCatalogSource: "framework",
        surveyMode: "deep_dive",
        focusPillarIds: ["governance"],
        packQuestionCount: 0,
        packResponseCount: 0,
        frameworkResponseCount: 2, // 1 seeded baseline + 1 follow-up answered
        frameworkCatalog: catalog,
        seededControlIds: ["g1"],
      })
    ).toEqual({ responseCount: 1, totalQuestions: 2 });
  });
});
