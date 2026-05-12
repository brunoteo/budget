import type { CycleGroup, SearchRow } from "./types";

export function groupByCycle(rows: SearchRow[]): CycleGroup[] {
  const order: string[] = [];
  const map = new Map<string, CycleGroup>();
  for (const r of rows) {
    let g = map.get(r.cycleId);
    if (!g) {
      g = {
        cycleId: r.cycleId,
        cycleStartDate: r.cycleStartDate,
        cycleEndDate: r.cycleEndDate,
        total: 0,
        rows: [],
      };
      map.set(r.cycleId, g);
      order.push(r.cycleId);
    }
    g.rows.push(r);
    g.total += r.amount;
  }
  return order.map((id) => map.get(id)!);
}
