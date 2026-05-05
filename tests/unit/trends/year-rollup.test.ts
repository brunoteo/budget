import { describe, it, expect } from "vitest";
import { computeYearRollup } from "@/lib/trends/year-rollup";
import type { CycleSummary } from "@/lib/trends/types";

const recentCycle = (start: string, casa: number, carb: number): CycleSummary => ({
  startDate: start,
  totalSpent: casa + carb,
  totalBudget: 0,
  perCategory: [
    { name: "Casa", spent: casa, budget: 0 },
    { name: "Carburante", spent: carb, budget: 0 },
  ],
});

describe("computeYearRollup", () => {
  it("returns one row per category in the recent window, alphabetical", () => {
    const rows = computeYearRollup([recentCycle("2026-01-01", 100, 50)], []);
    expect(rows.map((r) => r.displayName)).toEqual(["Carburante", "Casa"]);
  });

  it("sums totals and averages over the recent window only", () => {
    const recent = [recentCycle("2026-01-01", 100, 50), recentCycle("2026-02-01", 200, 50)];
    const rows = computeYearRollup(recent, []);
    const casa = rows.find((r) => r.displayName === "Casa")!;
    expect(casa.totalSpent).toBeCloseTo(300);
    expect(casa.averageSpent).toBeCloseTo(150);
  });

  it("computes deltaPercent against prior window mean", () => {
    const prior = [recentCycle("2025-11-01", 100, 50), recentCycle("2025-12-01", 100, 50)];
    const recent = [recentCycle("2026-01-01", 110, 60), recentCycle("2026-02-01", 110, 60)];
    const rows = computeYearRollup(recent, prior);
    const casa = rows.find((r) => r.displayName === "Casa")!;
    expect(casa.deltaPercent).toBeCloseTo(0.10, 3); // 10% increase
  });

  it("returns null deltaPercent when prior window is empty", () => {
    const rows = computeYearRollup([recentCycle("2026-01-01", 100, 50)], []);
    expect(rows.every((r) => r.deltaPercent === null)).toBe(true);
  });

  it("returns null deltaPercent when prior mean for a category is zero", () => {
    const prior: CycleSummary[] = [{
      startDate: "2025-12-01",
      totalSpent: 0,
      totalBudget: 0,
      perCategory: [{ name: "Casa", spent: 0, budget: 0 }],
    }];
    const recent = [recentCycle("2026-01-01", 100, 50)];
    const rows = computeYearRollup(recent, prior);
    const casa = rows.find((r) => r.displayName === "Casa")!;
    expect(casa.deltaPercent).toBeNull();
  });

  it("returns deltaPercent = 0 (not null) for matched categories with zero change", () => {
    const prior = [recentCycle("2025-12-01", 100, 50)];
    const recent = [recentCycle("2026-01-01", 100, 50)];
    const rows = computeYearRollup(recent, prior);
    expect(rows.find((r) => r.displayName === "Casa")!.deltaPercent).toBeCloseTo(0);
  });

  it("does not include categories that exist only in the prior window", () => {
    const prior: CycleSummary[] = [{
      startDate: "2025-12-01",
      totalSpent: 0,
      totalBudget: 0,
      perCategory: [{ name: "Vacanze", spent: 800, budget: 0 }],
    }];
    const recent = [recentCycle("2026-01-01", 100, 50)];
    const rows = computeYearRollup(recent, prior);
    expect(rows.find((r) => r.displayName === "Vacanze")).toBeUndefined();
  });
});
