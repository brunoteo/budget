import { describe, it, expect } from "vitest";
import { computeForecast } from "@/lib/forecast/compute";

const cycle = { start: "2026-04-27", end: "2026-05-26" }; // 30 days inclusive

describe("computeForecast", () => {
  it("empty cycle: forecast equals total budget, hasData false", () => {
    const f = computeForecast({
      cycle,
      today: "2026-05-06",
      categories: [
        { id: "a", expectedAmount: 500 },
        { id: "b", expectedAmount: 850 },
      ],
      expenses: [],
    });
    expect(f.totalBudget).toBeCloseTo(1350);
    expect(f.total).toBeCloseTo(1350);
    expect(f.deltaVsBudget).toBeCloseTo(0);
    expect(f.hasData).toBe(false);
    expect(f.anchorDate).toBeNull();
  });

  it("variable category paces from cycle elapsed (today), capped at expected × 1.5", () => {
    // 30-day cycle starting 2026-04-27. Today = 2026-05-06 → day 10.
    // Spent 100 by day 10 → naive = 100 × 30/10 = 300. Cap = max(100, 250 × 1.5) = 375.
    // clamp(300, 100, 375) = 300.
    const f = computeForecast({
      cycle,
      today: "2026-05-06",
      categories: [
        { id: "groceries", expectedAmount: 250 },
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

  it("lump-sum early in cycle does NOT explode forecast (cap applied)", () => {
    // Today = day 9 of 30. €1000 spent on day 2 — naive would be 1000 × 30/9 ≈ 3333.
    // Cap = max(1000, 1000 × 1.5) = 1500. Forecast capped at 1500, not 3333.
    const f = computeForecast({
      cycle,
      today: "2026-05-05",
      categories: [{ id: "savings", expectedAmount: 1000 }],
      expenses: [{ categoryId: "savings", amount: 1000, occurredOn: "2026-04-28" }],
    });
    expect(f.perCategory[0]!.projected).toBeCloseTo(1500);
  });

  it("projection floored at actual: never less than already spent", () => {
    // Today = day 30 (cycle end). €100 spent on day 1. naive = 100 × 30/30 = 100.
    // floor = actual = 100. cap = max(100, 50 × 1.5) = 100. Result 100.
    const f = computeForecast({
      cycle,
      today: "2026-05-26",
      categories: [{ id: "x", expectedAmount: 50 }],
      expenses: [{ categoryId: "x", amount: 100, occurredOn: "2026-04-27" }],
    });
    expect(f.perCategory[0]!.projected).toBeCloseTo(100);
  });

  it("category with no expenses falls back to expected_amount", () => {
    const f = computeForecast({
      cycle,
      today: "2026-04-30",
      categories: [
        { id: "carb", expectedAmount: 100 },
        { id: "groceries", expectedAmount: 250 },
      ],
      expenses: [
        { categoryId: "carb", amount: 50, occurredOn: "2026-04-30" },
      ],
    });
    // carb: today day 4, naive 50 × 30/4 = 375. cap = max(50, 100 × 1.5) = 150. clamp → 150.
    // groceries: fallback 250. total 400.
    expect(f.perCategory.find((c) => c.id === "carb")!.projected).toBeCloseTo(150);
    expect(f.perCategory.find((c) => c.id === "groceries")!.projected).toBeCloseTo(250);
    expect(f.total).toBeCloseTo(400);
    expect(f.totalBudget).toBeCloseTo(350);
    expect(f.deltaVsBudget).toBeCloseTo(50);
  });

  it("today clamped to cycle length when today exceeds cycle.end", () => {
    const f = computeForecast({
      cycle,
      today: "2026-06-15",
      categories: [{ id: "x", expectedAmount: 100 }],
      expenses: [{ categoryId: "x", amount: 100, occurredOn: "2026-06-15" }],
    });
    // elapsed clamped to 30 → naive 100. floor 100. cap max(100, 150)=150. → 100.
    expect(f.perCategory[0]!.projected).toBeCloseTo(100);
  });
});
