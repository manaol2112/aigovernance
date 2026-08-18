import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "@/lib/utils";

describe("formatDate", () => {
  it("formats using UTC so SSR and browser timezones match", () => {
    const iso = "2026-08-18T05:58:00.000Z";
    expect(formatDate(iso)).toBe("Aug 18, 2026");
  });
});

describe("formatDateTime", () => {
  it("formats date and time using UTC", () => {
    const iso = "2026-08-18T05:58:00.000Z";
    expect(formatDateTime(iso)).toMatch(/Aug 18, 2026/);
    expect(formatDateTime(iso)).toMatch(/5:58/);
  });
});
