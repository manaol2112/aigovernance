import { describe, expect, it } from "vitest";
import { isExtensionNoise } from "@/lib/suppress-extension-noise";

describe("isExtensionNoise", () => {
  it("detects Prisma Access digest crashes", () => {
    expect(
      isExtensionNoise(
        new TypeError("Cannot read properties of undefined (reading 'digest')")
      )
    ).toBe(true);
    expect(
      isExtensionNoise("Cannot read properties of undefined (reading 'digest')\n at <computed>")
    ).toBe(true);
    expect(isExtensionNoise("boom", "chrome-extension://abc/injected.js")).toBe(true);
  });

  it("ignores real app errors", () => {
    expect(isExtensionNoise(new Error("Import failed"))).toBe(false);
    expect(isExtensionNoise("Cannot read properties of undefined (reading 'map')")).toBe(false);
  });
});
