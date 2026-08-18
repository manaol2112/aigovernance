import { describe, expect, it } from "vitest";
import {
  applySurveyModeToCatalog,
  countPillarFollowUpQuestions,
  ensurePillarRepresentativeCoverage,
  filterCatalogExcludingControls,
  filterSurveyControlsByFrameworks,
  sumFollowUpQuestionsAcrossPillars,
  type SurveyPillarGroup,
} from "@/lib/maturity-survey-types";

function control(id: string, frameworks: string[] = ["NIST-AI-RMF"]) {
  return {
    id,
    code: `CTRL-${id}`,
    title: `Control ${id}`,
    description: "Test control",
    controlType: "directive",
    ownerRole: "Owner",
    frameworkCodes: frameworks,
  };
}

describe("ensurePillarRepresentativeCoverage", () => {
  it("guarantees every pillar at least one control when pool is sufficient", () => {
    const catalog: SurveyPillarGroup[] = [
      {
        pillarId: "governance",
        pillarLabel: "Governance",
        pillarDescription: "Gov",
        criticality: "critical",
        frameworkCodes: ["NIST-AI-RMF"],
        controls: [control("g1"), control("shared", ["NIST-AI-RMF", "ISO-42001"])],
      },
      {
        pillarId: "compliance",
        pillarLabel: "Compliance",
        pillarDescription: "Comp",
        criticality: "high",
        frameworkCodes: ["EU-AIA"],
        controls: [control("c1", ["EU-AIA"])],
      },
    ];

    const covered = ensurePillarRepresentativeCoverage(catalog);
    expect(covered.every((group) => group.controls.length > 0)).toBe(true);

    const assignedIds = new Set(
      covered.flatMap((group) => group.controls.map((item) => item.id))
    );
    expect(assignedIds.size).toBe(
      covered.reduce((sum, group) => sum + group.controls.length, 0)
    );
  });
});

describe("filterCatalogExcludingControls", () => {
  it("removes baseline controls from each pillar group", () => {
    const catalog: SurveyPillarGroup[] = [
      {
        pillarId: "governance",
        pillarLabel: "Governance",
        pillarDescription: "Gov",
        criticality: "critical",
        frameworkCodes: ["NIST-AI-RMF"],
        controls: [control("baseline"), control("follow-up")],
      },
    ];

    const filtered = filterCatalogExcludingControls(catalog, new Set(["baseline"]));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.controls.map((item) => item.id)).toEqual(["follow-up"]);
  });
});

describe("applySurveyModeToCatalog", () => {
  const catalog: SurveyPillarGroup[] = [
    {
      pillarId: "governance",
      pillarLabel: "Governance",
      pillarDescription: "Gov",
      criticality: "critical",
      frameworkCodes: ["NIST-AI-RMF"],
      controls: [control("g1"), control("g2")],
    },
    {
      pillarId: "compliance",
      pillarLabel: "Compliance",
      pillarDescription: "Comp",
      criticality: "high",
      frameworkCodes: ["EU-AIA"],
      controls: [control("c1", ["EU-AIA"])],
    },
  ];

  it("returns one flagship control per pillar for quick scan", () => {
    const quick = applySurveyModeToCatalog(catalog, "quick");
    expect(quick).toHaveLength(2);
    expect(quick.every((group) => group.controls.length === 1)).toBe(true);
  });

  it("retains all deduped controls for deep dive", () => {
    const deep = applySurveyModeToCatalog(catalog, "deep_dive");
    const totalControls = deep.reduce((sum, group) => sum + group.controls.length, 0);
    expect(totalControls).toBeGreaterThan(2);
  });
});

describe("filterSurveyControlsByFrameworks", () => {
  it("returns all controls when no frameworks are selected", () => {
    const controls = [control("a", ["NIST-AI-RMF"]), control("b", ["EU-AIA"])];
    expect(filterSurveyControlsByFrameworks(controls, [])).toHaveLength(2);
  });

  it("keeps controls matching any selected framework", () => {
    const controls = [control("a", ["NIST-AI-RMF"]), control("b", ["EU-AIA"]), control("c", ["ISO-42001"])];
    const filtered = filterSurveyControlsByFrameworks(controls, ["NIST-AI-RMF", "EU-AIA"]);
    expect(filtered.map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("countPillarFollowUpQuestions", () => {
  const quickCatalog: SurveyPillarGroup[] = [
    {
      pillarId: "governance",
      pillarLabel: "Governance",
      pillarDescription: "Gov",
      criticality: "critical",
      frameworkCodes: ["NIST-AI-RMF"],
      controls: [control("baseline-gov")],
    },
    {
      pillarId: "workforce",
      pillarLabel: "Workforce",
      pillarDescription: "Work",
      criticality: "medium",
      frameworkCodes: ["NIST-AI-RMF"],
      controls: [control("baseline-work")],
    },
  ];

  const deepCatalog: SurveyPillarGroup[] = [
    {
      pillarId: "governance",
      pillarLabel: "Governance",
      pillarDescription: "Gov",
      criticality: "critical",
      frameworkCodes: ["NIST-AI-RMF", "EU-AIA"],
      controls: [
        control("baseline-gov", ["NIST-AI-RMF"]),
        control("gov-follow-1", ["NIST-AI-RMF"]),
        control("gov-follow-2", ["EU-AIA"]),
      ],
    },
    {
      pillarId: "workforce",
      pillarLabel: "Workforce",
      pillarDescription: "Work",
      criticality: "medium",
      frameworkCodes: ["NIST-AI-RMF"],
      controls: [control("baseline-work", ["NIST-AI-RMF"])],
    },
  ];

  it("counts follow-ups excluding the baseline control answered in quick scan", () => {
    const result = countPillarFollowUpQuestions({
      quickCatalog,
      deepCatalog,
      pillarId: "governance",
      frameworkCodes: ["NIST-AI-RMF", "EU-AIA"],
      baselineControlId: "baseline-gov",
    });

    expect(result.libraryControlCount).toBe(3);
    expect(result.followUpCount).toBe(2);
    expect(result.hasBaseline).toBe(true);
  });

  it("returns zero follow-ups when only the baseline control maps to selected frameworks", () => {
    const result = countPillarFollowUpQuestions({
      quickCatalog,
      deepCatalog,
      pillarId: "workforce",
      frameworkCodes: ["NIST-AI-RMF"],
      baselineControlId: "baseline-work",
    });

    expect(result.libraryControlCount).toBe(1);
    expect(result.followUpCount).toBe(0);
  });

  it("scopes follow-ups to selected frameworks only", () => {
    const result = countPillarFollowUpQuestions({
      quickCatalog,
      deepCatalog,
      pillarId: "governance",
      frameworkCodes: ["NIST-AI-RMF"],
      baselineControlId: "baseline-gov",
    });

    expect(result.libraryControlCount).toBe(2);
    expect(result.followUpCount).toBe(1);
  });

  it("sums follow-ups across pillars using per-pillar baseline responses", () => {
    const baselineControlIdByPillar = new Map([
      ["governance", "baseline-gov"],
      ["workforce", "baseline-work"],
    ]);

    const total = sumFollowUpQuestionsAcrossPillars({
      quickCatalog,
      deepCatalog,
      pillarIds: ["governance", "workforce"],
      frameworkCodes: ["NIST-AI-RMF", "EU-AIA"],
      baselineControlIdByPillar,
    });

    expect(total).toBe(2);
  });
});
