import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, TopMover } from "./types";

export function computeTopMovers(cycles: CycleSummary[], limit = 3): TopMover[] {
  if (cycles.length < 2) return [];
  const prev = cycles[cycles.length - 2]!;
  const last = cycles[cycles.length - 1]!;

  const merged = new Map<string, { displayName: string; prev: number; last: number }>();

  for (const c of prev.perCategory) {
    const key = foldName(c.name);
    merged.set(key, { displayName: c.name, prev: c.spent, last: 0 });
  }
  for (const c of last.perCategory) {
    const key = foldName(c.name);
    const existing = merged.get(key);
    if (existing) {
      existing.last = c.spent;
      existing.displayName = c.name; // prefer latest spelling
    } else {
      merged.set(key, { displayName: c.name, prev: 0, last: c.spent });
    }
  }

  const movers: TopMover[] = [];
  for (const [key, v] of merged) {
    movers.push({ key, displayName: v.displayName, delta: v.last - v.prev });
  }
  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return movers.slice(0, limit);
}
