import type { CycleRange } from "@/lib/cycle/compute";

export type ForecastCategory = {
  id: string;
  expectedAmount: number;
  isFixed: boolean;
};

export type ForecastExpense = {
  categoryId: string;
  amount: number;
  occurredOn: string;
};

export type ForecastInput = {
  cycle: CycleRange;
  categories: ForecastCategory[];
  expenses: ForecastExpense[];
};

export type CategoryForecast = { id: string; projected: number };

export type Forecast = {
  perCategory: CategoryForecast[];
  total: number;
  totalBudget: number;
  deltaVsBudget: number;
  hasData: boolean;
  anchorDate: string | null;
};

function isoToUtc(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetweenInclusive(startISO: string, endISO: string): number {
  return Math.round((isoToUtc(endISO) - isoToUtc(startISO)) / 86_400_000) + 1;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeForecast(input: ForecastInput): Forecast {
  const totalBudget = input.categories.reduce((s, c) => s + c.expectedAmount, 0);
  const cycleLength = daysBetweenInclusive(input.cycle.start, input.cycle.end);

  const expensesByCategory = new Map<string, ForecastExpense[]>();
  for (const e of input.expenses) {
    const list = expensesByCategory.get(e.categoryId) ?? [];
    list.push(e);
    expensesByCategory.set(e.categoryId, list);
  }

  const allLatest = input.expenses
    .map((e) => e.occurredOn)
    .sort()
    .at(-1) ?? null;

  const perCategory: CategoryForecast[] = input.categories.map((c) => {
    if (c.isFixed) return { id: c.id, projected: c.expectedAmount };
    const exps = expensesByCategory.get(c.id) ?? [];
    if (exps.length === 0) return { id: c.id, projected: c.expectedAmount };
    const actual = exps.reduce((s, e) => s + e.amount, 0);
    const latest = exps.map((e) => e.occurredOn).sort().at(-1)!;
    const elapsed = clamp(
      Math.round((isoToUtc(latest) - isoToUtc(input.cycle.start)) / 86_400_000) + 1,
      1,
      cycleLength,
    );
    return { id: c.id, projected: actual * (cycleLength / elapsed) };
  });

  const total = perCategory.reduce((s, p) => s + p.projected, 0);
  return {
    perCategory,
    total,
    totalBudget,
    deltaVsBudget: total - totalBudget,
    hasData: input.expenses.length > 0,
    anchorDate: allLatest,
  };
}
