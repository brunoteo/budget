export type CategoryAtCycle = {
  name: string;
  spent: number;
  budget: number;
};

export type CycleSummary = {
  startDate: string;
  totalSpent: number;
  totalBudget: number;
  perCategory: CategoryAtCycle[];
  salary?: number | null; // absent/null = no salary data for this cycle (renders as a chart gap)
};

export type CategoryDataPoint = {
  startDate: string;
  spent: number;
  budget: number;
};

export type CategorySeries = {
  key: string;          // foldName(displayName) — stable across rename variants
  displayName: string;  // latest spelling
  points: CategoryDataPoint[];  // aligned to input cycle order; missing cycles → spent=0, budget=0
  averageSpent: number; // mean over present points only
};

export type TopMover = {
  key: string;
  displayName: string;
  delta: number; // signed €: positive = increased spend
};

export type YearRollupRow = {
  key: string;
  displayName: string;
  totalSpent: number;
  averageSpent: number;
  deltaPercent: number | null; // null when prior window has no data for this category
};

export type SalaryPercentPoint = {
  startDate: string;
  percent: number | null; // null when the cycle has no salary set — renders as a chart gap
};
