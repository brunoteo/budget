import { describe, it, expect } from "vitest";
import { groupByCategory } from "@/lib/trends/group-by-category";
import type { CycleSummary } from "@/lib/trends/types";

const c1: CycleSummary = {
  startDate: "2026-01-01",
  totalSpent: 100,
  totalBudget: 100,
  perCategory: [{ name: "Casa", spent: 100, budget: 100 }],
};
const c2: CycleSummary = {
  startDate: "2026-02-01",
  totalSpent: 220,
  totalBudget: 200,
  perCategory: [
    { name: "casa", spent: 120, budget: 100 }, // case-insensitive
    { name: "Carburante", spent: 100, budget: 80 },
  ],
};
const c3: CycleSummary = {
  startDate: "2026-03-01",
  totalSpent: 230,
  totalBudget: 220,
  perCategory: [
    { name: "Spese casa", spent: 130, budget: 120 }, // renamed
    { name: "Carburánte", spent: 100, budget: 80 },  // accent
  ],
};

describe("groupByCategory", () => {
  it("returns empty array on empty input", () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it("folds case and accents into a stable key but keeps the latest display name", () => {
    const out = groupByCategory([c1, c2, c3]);
    const spese = out.find((s) => s.displayName === "Spese casa");
    expect(spese).toBeDefined();
    expect(spese!.displayName).toBe("Spese casa");
    const carb = out.find((s) => s.displayName === "Carburánte");
    expect(carb).toBeDefined();
    // Carburante & Carburánte fold the same; latest is c3's spelling
    expect(carb!.points).toHaveLength(3);
  });

  it("missing cycles for a category are filled with zero points aligned to input order", () => {
    const out = groupByCategory([c1, c2, c3]);
    const carb = out.find((s) => s.displayName === "Carburánte")!;
    expect(carb.points.map((p) => p.startDate)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(carb.points[0]).toEqual({ startDate: "2026-01-01", spent: 0, budget: 0 });
  });

  it("computes averageSpent across present cycles only", () => {
    const out = groupByCategory([c1, c2, c3]);
    const carb = out.find((s) => s.displayName === "Carburánte")!;
    // present in 2 of 3 cycles, both 100 → average 100
    expect(carb.averageSpent).toBeCloseTo(100);
  });

  it("returns series sorted alphabetically by display name", () => {
    const out = groupByCategory([c1, c2, c3]);
    const names = out.map((s) => s.displayName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "it"));
    expect(names).toEqual(sorted);
  });
});
