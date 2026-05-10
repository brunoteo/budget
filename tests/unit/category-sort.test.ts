import { describe, it, expect } from "vitest";
import { sortCategoriesByName } from "@/lib/category/sort";

describe("sortCategoriesByName", () => {
  it("sorts alphabetically", () => {
    const input = [
      { id: "1", name: "Spesa" },
      { id: "2", name: "Auto" },
      { id: "3", name: "Casa" },
    ];
    expect(sortCategoriesByName(input).map((c) => c.name)).toEqual(["Auto", "Casa", "Spesa"]);
  });

  it("is case-insensitive", () => {
    const input = [
      { id: "1", name: "spesa" },
      { id: "2", name: "Auto" },
      { id: "3", name: "casa" },
    ];
    expect(sortCategoriesByName(input).map((c) => c.name)).toEqual(["Auto", "casa", "spesa"]);
  });

  it("handles Italian accented characters", () => {
    const input = [
      { id: "1", name: "Università" },
      { id: "2", name: "Ufficio" },
      { id: "3", name: "Auto" },
    ];
    expect(sortCategoriesByName(input).map((c) => c.name)).toEqual(["Auto", "Ufficio", "Università"]);
  });

  it("does not mutate input", () => {
    const input = [
      { id: "1", name: "Spesa" },
      { id: "2", name: "Auto" },
    ];
    const snapshot = input.map((c) => c.name);
    sortCategoriesByName(input);
    expect(input.map((c) => c.name)).toEqual(snapshot);
  });

  it("returns empty array unchanged", () => {
    expect(sortCategoriesByName([])).toEqual([]);
  });
});
