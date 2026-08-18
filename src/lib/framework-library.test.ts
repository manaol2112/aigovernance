import { describe, expect, it } from "vitest";
import { sortFrameworkCodes } from "@/lib/framework-library";

describe("sortFrameworkCodes", () => {
  it("uses the canonical FRAMEWORK_COLUMNS order regardless of input order", () => {
    expect(sortFrameworkCodes(["EU-AIA", "NIST-AI-RMF", "ISO-42001"])).toEqual([
      "NIST-AI-RMF",
      "ISO-42001",
      "EU-AIA",
    ]);
    expect(sortFrameworkCodes(["ISO-42001", "EU-AIA", "NIST-AI-RMF"])).toEqual([
      "NIST-AI-RMF",
      "ISO-42001",
      "EU-AIA",
    ]);
  });

  it("dedupes codes", () => {
    expect(sortFrameworkCodes(["ISO-42001", "ISO-42001", "NIST-AI-RMF"])).toEqual([
      "NIST-AI-RMF",
      "ISO-42001",
    ]);
  });
});
