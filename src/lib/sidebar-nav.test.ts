import { describe, expect, it } from "vitest";
import { isSidebarNavActive } from "./sidebar-nav";

describe("isSidebarNavActive", () => {
  it("highlights Dashboard only on the home route", () => {
    expect(isSidebarNavActive("/", "/")).toBe(true);
    expect(isSidebarNavActive("/assessments", "/")).toBe(false);
    expect(isSidebarNavActive("/frameworks", "/")).toBe(false);
  });

  it("highlights Assessments on assessment routes only", () => {
    expect(isSidebarNavActive("/assessments", "/assessments")).toBe(true);
    expect(isSidebarNavActive("/assessments/abc/workflow", "/assessments")).toBe(true);
    expect(isSidebarNavActive("/maturity-assessment", "/assessments")).toBe(false);
    expect(isSidebarNavActive("/guided-workshop", "/assessments")).toBe(false);
    expect(isSidebarNavActive("/", "/assessments")).toBe(false);
  });

  it("uses path-segment boundaries so similar prefixes do not collide", () => {
    expect(isSidebarNavActive("/controls/GOV-1", "/controls")).toBe(true);
    expect(isSidebarNavActive("/control-room", "/controls")).toBe(false);
    expect(isSidebarNavActive("/admin/question-packs", "/admin")).toBe(true);
  });
});
