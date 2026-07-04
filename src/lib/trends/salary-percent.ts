import type { CycleSummary, SalaryPercentPoint } from "./types";

export function computeSalaryPercentSeries(cycles: CycleSummary[]): SalaryPercentPoint[] {
  return cycles.map((c) => ({
    startDate: c.startDate,
    percent: c.salary && c.salary > 0 ? c.totalSpent / c.salary : null,
  }));
}
