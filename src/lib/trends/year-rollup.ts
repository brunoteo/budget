import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, YearRollupRow } from "./types";

function aggregate(cycles: CycleSummary[]): Map<string, { displayName: string; total: number; count: number }> {
  const m = new Map<string, { displayName: string; total: number; count: number }>();
  for (const cycle of cycles) {
    for (const cat of cycle.perCategory) {
      const key = foldName(cat.name);
      const existing = m.get(key);
      if (existing) {
        existing.total += cat.spent;
        existing.count += 1;
        if (cycle.startDate >= cycles[cycles.length - 1]!.startDate) {
          existing.displayName = cat.name;
        }
      } else {
        m.set(key, { displayName: cat.name, total: cat.spent, count: 1 });
      }
    }
  }
  return m;
}

export function computeYearRollup(recent: CycleSummary[], prior: CycleSummary[]): YearRollupRow[] {
  const recentAgg = aggregate(recent);
  const priorAgg = aggregate(prior);

  const rows: YearRollupRow[] = [];
  for (const [key, r] of recentAgg) {
    const recentMean = r.count === 0 ? 0 : r.total / r.count;
    const p = priorAgg.get(key);
    const priorMean = p && p.count > 0 ? p.total / p.count : null;
    const deltaPercent =
      priorMean === null || priorMean === 0 ? null : (recentMean - priorMean) / priorMean;
    rows.push({
      key,
      displayName: r.displayName,
      totalSpent: r.total,
      averageSpent: recentMean,
      deltaPercent,
    });
  }

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
  return rows;
}
