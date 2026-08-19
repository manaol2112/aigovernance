import { describe, expect, it } from "vitest";
import {
  isHashOnlyUrlChange,
  isMaturityOrWorkshopPath,
  shouldShowMaturityRoutePending,
} from "./brand-navigation";

describe("isMaturityOrWorkshopPath", () => {
  it("matches assessment and workshop routes", () => {
    expect(isMaturityOrWorkshopPath("/maturity-assessment/new")).toBe(true);
    expect(isMaturityOrWorkshopPath("/guided-workshop/abc/results")).toBe(true);
    expect(isMaturityOrWorkshopPath("/")).toBe(false);
    expect(isMaturityOrWorkshopPath("/assessments")).toBe(false);
  });
});

describe("report section navigation", () => {
  it("treats profile/gaps hash jumps as hash-only, not a route change", () => {
    const page = "http://local.test/maturity-assessment/abc/results";
    expect(isHashOnlyUrlChange(page, `${page}#gaps`)).toBe(true);
    expect(shouldShowMaturityRoutePending(page, `${page}#gaps`)).toBe(false);
    expect(shouldShowMaturityRoutePending(`${page}#profile`, `${page}#gaps`)).toBe(false);
  });

  it("still shows pending when leaving the report for another page", () => {
    expect(
      shouldShowMaturityRoutePending(
        "http://local.test/maturity-assessment/abc/results#gaps",
        "http://local.test/maturity-assessment"
      )
    ).toBe(true);
  });
});
