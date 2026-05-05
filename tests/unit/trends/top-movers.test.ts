import { describe, it, expect } from "vitest";
import { computeTopMovers } from "@/lib/trends/top-movers";
import type { CycleSummary } from "@/lib/trends/types";

const prev: CycleSummary = {
  startDate: "2026-01-01",
  totalSpent: 0,
  totalBudget: 0,
  perCategory: [
    { name: "Casa", spent: 200, budget: 250 },
    { name: "Carburante", spent: 100, budget: 100 },
    { name: "Regali", spent: 150, budget: 100 },
  ],
};
const last: CycleSummary = {
  startDate: "2026-02-01",
  totalSpent: 0,
  totalBudget: 0,
  perCategory: [
    { name: "Casa", spent: 420, budget: 250 },     // +220
    { name: "Carburante", spent: 185, budget: 100 }, // +85
    { name: "Regali", spent: 40, budget: 100 },     // -110
    { name: "Spesa", spent: 50, budget: 100 },      // +50 (new)
  ],
};

describe("computeTopMovers", () => {
  it("returns empty when fewer than 2 cycles", () => {
    expect(computeTopMovers([])).toEqual([]);
    expect(computeTopMovers([last])).toEqual([]);
  });

  it("ranks by absolute delta and keeps signs", () => {
    const movers = computeTopMovers([prev, last], 3);
    expect(movers).toHaveLength(3);
    expect(movers[0]!.displayName).toBe("Casa");
    expect(movers[0]!.delta).toBeCloseTo(220);
    expect(movers[1]!.displayName).toBe("Regali");
    expect(movers[1]!.delta).toBeCloseTo(-110);
    expect(movers[2]!.displayName).toBe("Carburante");
    expect(movers[2]!.delta).toBeCloseTo(85);
  });

  it("treats categories absent in one cycle as zero on that side", () => {
    const movers = computeTopMovers([prev, last], 5);
    const spesa = movers.find((m) => m.displayName === "Spesa");
    expect(spesa?.delta).toBeCloseTo(50);
  });

  it("honors the limit argument", () => {
    expect(computeTopMovers([prev, last], 1)).toHaveLength(1);
    expect(computeTopMovers([prev, last], 2)).toHaveLength(2);
  });

  it("uses only the last two cycles when more are provided", () => {
    const earlier: CycleSummary = {
      startDate: "2025-12-01",
      totalSpent: 0,
      totalBudget: 0,
      perCategory: [{ name: "Casa", spent: 9999, budget: 0 }],
    };
    const movers = computeTopMovers([earlier, prev, last], 3);
    expect(movers[0]!.displayName).toBe("Casa");
    expect(movers[0]!.delta).toBeCloseTo(220); // last vs prev, not last vs earlier
  });

  it("folds names case-insensitively for matching", () => {
    const a: CycleSummary = { startDate: "2026-01-01", totalSpent: 0, totalBudget: 0, perCategory: [{ name: "Casa", spent: 100, budget: 0 }] };
    const b: CycleSummary = { startDate: "2026-02-01", totalSpent: 0, totalBudget: 0, perCategory: [{ name: "casa", spent: 250, budget: 0 }] };
    expect(computeTopMovers([a, b])[0]!.delta).toBeCloseTo(150);
  });
});
