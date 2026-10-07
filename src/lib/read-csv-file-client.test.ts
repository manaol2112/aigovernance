import { describe, expect, it } from "vitest";
import { looksLikeCsvFile } from "@/lib/read-csv-file-client";

describe("looksLikeCsvFile", () => {
  it("accepts csv names and common mime types", () => {
    expect(looksLikeCsvFile(new File([""], "pack.csv", { type: "" }))).toBe(true);
    expect(looksLikeCsvFile(new File([""], "pack.CSV", { type: "text/csv" }))).toBe(true);
    expect(looksLikeCsvFile(new File([""], "pack.txt", { type: "text/plain" }))).toBe(true);
    expect(looksLikeCsvFile(new File([""], "pack.xlsx", { type: "" }))).toBe(false);
  });
});
