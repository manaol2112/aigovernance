import { describe, expect, it } from "vitest";
import { contrastRatio, meetsWcagAaText, meetsWcagAaUi } from "./contrast";

describe("WCAG contrast helpers", () => {
  it("computes black-on-white as 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("light theme muted text meets AA on white", () => {
    expect(meetsWcagAaText("#475569", "#ffffff")).toBe(true); // theme-text-muted
    expect(meetsWcagAaText("#64748b", "#ffffff")).toBe(true); // remapped slate-400
  });

  it("dark theme muted text meets AA on card surface", () => {
    expect(meetsWcagAaText("#cbd5e1", "#1e293b")).toBe(true);
  });

  it("brand indigo text meets AA on white", () => {
    expect(meetsWcagAaText("#4338ca", "#ffffff")).toBe(true);
  });

  it("badge success/warning/danger meet AA", () => {
    expect(meetsWcagAaText("#022c22", "#a7f3d0")).toBe(true); // emerald-950 on emerald-200-ish
    expect(meetsWcagAaText("#451a03", "#fde68a")).toBe(true);
    expect(meetsWcagAaText("#450a0a", "#fecaca")).toBe(true);
  });

  it("UI border contrast meets 3:1 against white", () => {
    expect(meetsWcagAaUi("#64748b", "#ffffff")).toBe(true);
  });

  it("Deloitte brand fill uses black text for AA", () => {
    expect(meetsWcagAaText("#000000", "#86bc25")).toBe(true);
    expect(meetsWcagAaText("#3f5c12", "#ffffff")).toBe(true);
  });
});
