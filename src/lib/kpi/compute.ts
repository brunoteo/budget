import type { CycleRange } from "@/lib/cycle/compute";

export type KpiCategory = { id: string; name: string; expectedAmount: number };
export type KpiExpense = { categoryId: string; amount: number };
export type ExtraIncome = { label: string; amount: number };

export type KpiInput = {
  cycle: CycleRange;
  today: string;
  categories: KpiCategory[];
  expenses: KpiExpense[];
  salary: number;
  extraIncome: ExtraIncome[];
};

export type CategoryKpi = {
  id: string;
  name: string;
  expected: number;
  actual: number;
  delta: number;
  percentOfBudget: number;
  overBudget: boolean;
};

export type Kpi = {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentConsumed: number;
  percentOfSalarySpent: number;
  percentOfTotalIncomeSpent: number;
  cycleProgress: number;
  paceDelta: number;
  byCategory: CategoryKpi[];
};

function isoToUtc(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetweenInclusive(startISO: string, endISO: string): number {
  return Math.round((isoToUtc(endISO) - isoToUtc(startISO)) / 86400000) + 1;
}

function daysFromStart(startISO: string, todayISO: string): number {
  return Math.round((isoToUtc(todayISO) - isoToUtc(startISO)) / 86400000);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computeKpis(input: KpiInput): Kpi {
  const totalBudget = input.categories.reduce((s, c) => s + c.expectedAmount, 0);
  const totalSpent = input.expenses.reduce((s, e) => s + e.amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const percentConsumed = totalBudget === 0 ? 0 : totalSpent / totalBudget;

  const cycleLength = daysBetweenInclusive(input.cycle.start, input.cycle.end);
  const elapsed = daysFromStart(input.cycle.start, input.today);
  const cycleProgress = elapsed < 0 || cycleLength <= 1 ? 0 : clamp01(elapsed / (cycleLength - 1));

  const paceDelta = percentConsumed - cycleProgress;

  const totalIncome = input.salary + input.extraIncome.reduce((s, e) => s + e.amount, 0);
  const percentOfSalarySpent = input.salary === 0 ? 0 : totalSpent / input.salary;
  const percentOfTotalIncomeSpent = totalIncome === 0 ? 0 : totalSpent / totalIncome;

  const byCategory: CategoryKpi[] = input.categories.map((c) => {
    const actual = input.expenses
      .filter((e) => e.categoryId === c.id)
      .reduce((s, e) => s + e.amount, 0);
    const delta = c.expectedAmount - actual;
    const overBudget = c.expectedAmount > 0 ? actual > c.expectedAmount : actual > 0;
    return {
      id: c.id,
      name: c.name,
      expected: c.expectedAmount,
      actual,
      delta,
      percentOfBudget: totalBudget === 0 ? 0 : c.expectedAmount / totalBudget,
      overBudget,
    };
  });

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    percentConsumed,
    percentOfSalarySpent,
    percentOfTotalIncomeSpent,
    cycleProgress,
    paceDelta,
    byCategory,
  };
}
