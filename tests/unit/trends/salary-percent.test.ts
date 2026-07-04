import { describe, it, expect } from "vitest";
import { computeSalaryPercentSeries } from "@/lib/trends/salary-percent";
import type { CycleSummary } from "@/lib/trends/types";

const base: Omit<CycleSummary, "salary"> = {
  startDate: "2026-01-01",
  totalSpent: 100,
  totalBudget: 200,
  perCategory: [],
};

describe("computeSalaryPercentSeries", () => {
  it("returns empty array on empty input", () => {
    expect(computeSalaryPercentSeries([])).toEqual([]);
  });

  it("computes spent/salary ratio when salary is set", () => {
    const cycles: CycleSummary[] = [{ ...base, salary: 2000 }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: 0.05 },
    ]);
  });

  it("returns null percent when salary is null", () => {
    const cycles: CycleSummary[] = [{ ...base, salary: null }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: null },
    ]);
  });

  it("returns null percent when salary is undefined (field absent)", () => {
    const cycles: CycleSummary[] = [{ ...base }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: null },
    ]);
  });

  it("returns null percent when salary is zero", () => {
    const cycles: CycleSummary[] = [{ ...base, salary: 0 }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: null },
    ]);
  });

  it("preserves cycle order across multiple entries, mixing gaps and values", () => {
    const cycles: CycleSummary[] = [
      { ...base, startDate: "2026-01-01", totalSpent: 100, salary: 1000 },
      { ...base, startDate: "2026-02-01", totalSpent: 300, salary: null },
      { ...base, startDate: "2026-03-01", totalSpent: 400, salary: 800 },
    ];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: 0.1 },
      { startDate: "2026-02-01", percent: null },
      { startDate: "2026-03-01", percent: 0.5 },
    ]);
  });
});
