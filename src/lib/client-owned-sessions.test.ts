import { describe, expect, it } from "vitest";
import { filterByClientOwnedIds } from "./client-owned-sessions";

describe("filterByClientOwnedIds", () => {
  it("returns nothing when the browser has no remembered sessions", () => {
    expect(
      filterByClientOwnedIds(
        [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
        ],
        []
      )
    ).toEqual([]);
  });

  it("keeps only sessions owned by this browser", () => {
    expect(
      filterByClientOwnedIds(
        [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
          { id: "c", title: "C" },
        ],
        ["c", "a"]
      )
    ).toEqual([
      { id: "a", title: "A" },
      { id: "c", title: "C" },
    ]);
  });
});
