import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, CategorySeries, CategoryDataPoint } from "./types";

export function groupByCategory(cycles: CycleSummary[]): CategorySeries[] {
  if (cycles.length === 0) return [];

  type Bucket = { displayName: string; latestStart: string; presentByDate: Map<string, { spent: number; budget: number }> };
  const buckets = new Map<string, Bucket>();

  for (const cycle of cycles) {
    for (const cat of cycle.perCategory) {
      const key = foldName(cat.name);
      const existing = buckets.get(key);
      if (existing) {
        if (cycle.startDate >= existing.latestStart) {
          existing.displayName = cat.name;
          existing.latestStart = cycle.startDate;
        }
        existing.presentByDate.set(cycle.startDate, { spent: cat.spent, budget: cat.budget });
      } else {
        buckets.set(key, {
          displayName: cat.name,
          latestStart: cycle.startDate,
          presentByDate: new Map([[cycle.startDate, { spent: cat.spent, budget: cat.budget }]]),
        });
      }
    }
  }

  const orderedDates = cycles.map((c) => c.startDate);

  const series: CategorySeries[] = [];
  for (const [key, b] of buckets) {
    const points: CategoryDataPoint[] = orderedDates.map((d) => {
      const hit = b.presentByDate.get(d);
      return hit ? { startDate: d, ...hit } : { startDate: d, spent: 0, budget: 0 };
    });
    const presentValues = [...b.presentByDate.values()].map((v) => v.spent);
    const averageSpent = presentValues.length === 0
      ? 0
      : presentValues.reduce((s, v) => s + v, 0) / presentValues.length;
    series.push({ key, displayName: b.displayName, points, averageSpent });
  }

  series.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
  return series;
}
