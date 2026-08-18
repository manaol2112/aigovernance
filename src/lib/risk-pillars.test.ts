import { describe, expect, it } from "vitest";
import {
  LEGACY_PILLAR_ID_ALIASES,
  RISK_PILLARS,
  resolvePillarId,
} from "@/lib/risk-pillars";
import { PILLAR_CRITICAL_QUESTIONS } from "@/lib/maturity-survey-quick-questions";
import { PILLAR_EXPECTED_DOCUMENTATION } from "@/lib/maturity-pillar-documentation";
import { RISK_SUB_PILLARS } from "@/lib/risk-sub-pillars";

describe("RISK_PILLARS baseline taxonomy", () => {
  it("defines exactly 11 pillars in the agreed order", () => {
    expect(RISK_PILLARS).toHaveLength(11);
    expect(RISK_PILLARS.map((p) => p.id)).toEqual([
      "governance",
      "compliance",
      "safety-reliability",
      "oversight",
      "systemic",
      "supply-chain",
      "transparency",
      "fairness",
      "privacy-data",
      "workforce",
      "financial-resilience",
    ]);
  });

  it("has unique pillar ids and non-empty categories", () => {
    const ids = RISK_PILLARS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pillar of RISK_PILLARS) {
      expect(pillar.categories.length).toBeGreaterThan(0);
      expect(pillar.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("maps every pillar to a critical question and documentation checklist", () => {
    for (const pillar of RISK_PILLARS) {
      expect(PILLAR_CRITICAL_QUESTIONS[pillar.id]?.prompt).toBeTruthy();
      expect(PILLAR_EXPECTED_DOCUMENTATION[pillar.id]?.length).toBeGreaterThan(0);
    }
  });

  it("assigns at least one sub-pillar per top-level pillar", () => {
    for (const pillar of RISK_PILLARS) {
      const subs = RISK_SUB_PILLARS.filter((s) => s.pillarId === pillar.id);
      expect(subs.length).toBeGreaterThan(0);
    }
  });
});

describe("resolvePillarId", () => {
  it("remaps retired security pillar to safety-reliability", () => {
    expect(LEGACY_PILLAR_ID_ALIASES.security).toBe("safety-reliability");
    expect(resolvePillarId("security")).toBe("safety-reliability");
  });

  it("returns current ids unchanged", () => {
    expect(resolvePillarId("workforce")).toBe("workforce");
    expect(resolvePillarId("financial-resilience")).toBe("financial-resilience");
  });
});
