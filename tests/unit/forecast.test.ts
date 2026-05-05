import { describe, it, expect } from "vitest";
import { computeForecast } from "@/lib/forecast/compute";

const cycle = { start: "2026-04-27", end: "2026-05-26" }; // 30 days inclusive

describe("computeForecast", () => {
  it("empty cycle: forecast equals total budget, hasData false", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "a", expectedAmount: 500, isFixed: false },
        { id: "b", expectedAmount: 850, isFixed: true },
      ],
      expenses: [],
    });
    expect(f.totalBudget).toBeCloseTo(1350);
    expect(f.total).toBeCloseTo(1350);
    expect(f.deltaVsBudget).toBeCloseTo(0);
    expect(f.hasData).toBe(false);
    expect(f.anchorDate).toBeNull();
  });

  it("fixed category projects at expected_amount regardless of actual spend", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "rent", expectedAmount: 850, isFixed: true },
      ],
      expenses: [
        { categoryId: "rent", amount: 850, occurredOn: "2026-04-30" },
      ],
    });
    expect(f.perCategory).toEqual([{ id: "rent", projected: 850 }]);
    expect(f.total).toBeCloseTo(850);
    expect(f.deltaVsBudget).toBeCloseTo(0);
    expect(f.hasData).toBe(true);
    expect(f.anchorDate).toBe("2026-04-30");
  });

  it("variable category paces from latest occurred_on, not today", () => {
    // 30-day cycle starting 2026-04-27. Latest expense on day 10 (2026-05-06).
    // Spent 100 by day 10 → projection = 100 × (30 / 10) = 300.
    const f = computeForecast({
      cycle,
      categories: [
        { id: "groceries", expectedAmount: 250, isFixed: false },
      ],
      expenses: [
        { categoryId: "groceries", amount: 60, occurredOn: "2026-05-01" },
        { categoryId: "groceries", amount: 40, occurredOn: "2026-05-06" },
      ],
    });
    expect(f.perCategory[0]!.projected).toBeCloseTo(300);
    expect(f.total).toBeCloseTo(300);
    expect(f.deltaVsBudget).toBeCloseTo(50);
    expect(f.hasData).toBe(true);
    expect(f.anchorDate).toBe("2026-05-06");
  });

  it("variable category with no expenses falls back to expected_amount", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "carb", expectedAmount: 100, isFixed: false },
        { id: "groceries", expectedAmount: 250, isFixed: false },
      ],
      expenses: [
        { categoryId: "carb", amount: 50, occurredOn: "2026-04-30" },
      ],
    });
    // carb: paced from day 4 of 30 → 50 × (30/4) = 375. groceries: fallback 250. total 625.
    expect(f.perCategory.find((c) => c.id === "carb")!.projected).toBeCloseTo(375);
    expect(f.perCategory.find((c) => c.id === "groceries")!.projected).toBeCloseTo(250);
    expect(f.total).toBeCloseTo(625);
    expect(f.totalBudget).toBeCloseTo(350);
    expect(f.deltaVsBudget).toBeCloseTo(275);
  });

  it("mixed fixed + variable cycle", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "rent", expectedAmount: 850, isFixed: true },
        { id: "groceries", expectedAmount: 250, isFixed: false },
      ],
      expenses: [
        { categoryId: "rent", amount: 850, occurredOn: "2026-05-01" },
        { categoryId: "groceries", amount: 100, occurredOn: "2026-05-11" },
      ],
    });
    // rent: fixed, projects 850. groceries: day 15 of 30, 100 × 2 = 200. total 1050.
    expect(f.perCategory.find((c) => c.id === "rent")!.projected).toBeCloseTo(850);
    expect(f.perCategory.find((c) => c.id === "groceries")!.projected).toBeCloseTo(200);
    expect(f.total).toBeCloseTo(1050);
    expect(f.deltaVsBudget).toBeCloseTo(-50);
    expect(f.anchorDate).toBe("2026-05-11");
  });

  it("anchor day clamped to cycle length when expense date exceeds cycle.end", () => {
    const f = computeForecast({
      cycle,
      categories: [{ id: "x", expectedAmount: 100, isFixed: false }],
      expenses: [{ categoryId: "x", amount: 100, occurredOn: "2026-06-15" }],
    });
    // anchor_elapsed clamped to 30 → projection = 100.
    expect(f.perCategory[0]!.projected).toBeCloseTo(100);
  });
});
