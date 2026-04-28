import { describe, it, expect } from "vitest";
import { computeKpis } from "@/lib/kpi/compute";

const cycle = { start: "2026-03-27", end: "2026-04-26" };

describe("computeKpis", () => {
  it("empty cycle returns zeroed totals", () => {
    const k = computeKpis({ cycle, today: "2026-03-27", categories: [], expenses: [], salary: 0, extraIncome: [] });
    expect(k.totalBudget).toBe(0);
    expect(k.totalSpent).toBe(0);
    expect(k.totalRemaining).toBe(0);
    expect(k.percentConsumed).toBe(0);
    expect(k.percentOfSalarySpent).toBe(0);
    expect(k.cycleProgress).toBe(0);
    expect(k.paceDelta).toBe(0);
  });

  it("computes totals from sample data", () => {
    const k = computeKpis({
      cycle,
      today: "2026-04-05",
      categories: [
        { id: "a", name: "Spese casa", expectedAmount: 800 },
        { id: "b", name: "Carburante", expectedAmount: 20 },
      ],
      expenses: [
        { categoryId: "b", amount: 83.83 },
      ],
      salary: 4639.82,
      extraIncome: [],
    });
    expect(k.totalBudget).toBeCloseTo(820);
    expect(k.totalSpent).toBeCloseTo(83.83);
    expect(k.totalRemaining).toBeCloseTo(736.17);
    expect(k.percentConsumed).toBeCloseTo(0.10223, 4);
    expect(k.percentOfSalarySpent).toBeCloseTo(0.01807, 4);
    expect(k.byCategory.find(c => c.id === "b")!.actual).toBeCloseTo(83.83);
    expect(k.byCategory.find(c => c.id === "b")!.overBudget).toBe(true);
  });

  it("computes pace correctly: 1/3 through cycle, 1/4 of budget spent", () => {
    // 31-day cycle (Mar 27 to Apr 26 inclusive). Today Apr 6 → elapsed=10, progress=10/30=1/3
    const k = computeKpis({
      cycle,
      today: "2026-04-06",
      categories: [{ id: "a", name: "x", expectedAmount: 400 }],
      expenses: [{ categoryId: "a", amount: 100 }],
      salary: 0,
      extraIncome: [],
    });
    expect(k.cycleProgress).toBeCloseTo(1 / 3, 3);
    expect(k.percentConsumed).toBeCloseTo(0.25, 3);
    expect(k.paceDelta).toBeCloseTo(0.25 - 1 / 3, 3);
  });

  it("clamps cycleProgress to [0,1]", () => {
    const before = computeKpis({ cycle, today: "2026-03-26", categories: [], expenses: [], salary: 0, extraIncome: [] });
    expect(before.cycleProgress).toBe(0);
    const after = computeKpis({ cycle, today: "2026-05-01", categories: [], expenses: [], salary: 0, extraIncome: [] });
    expect(after.cycleProgress).toBe(1);
  });

  it("includes extra income in % total income", () => {
    const k = computeKpis({
      cycle,
      today: "2026-04-01",
      categories: [{ id: "a", name: "x", expectedAmount: 100 }],
      expenses: [{ categoryId: "a", amount: 50 }],
      salary: 1000,
      extraIncome: [{ label: "tredicesima", amount: 1000 }],
    });
    expect(k.percentOfSalarySpent).toBeCloseTo(0.05);
    expect(k.percentOfTotalIncomeSpent).toBeCloseTo(0.025);
  });

  it("returns 0 for percent-of-salary when salary is 0", () => {
    const k = computeKpis({
      cycle,
      today: "2026-04-01",
      categories: [{ id: "a", name: "x", expectedAmount: 100 }],
      expenses: [{ categoryId: "a", amount: 50 }],
      salary: 0,
      extraIncome: [],
    });
    expect(k.percentOfSalarySpent).toBe(0);
  });
});
