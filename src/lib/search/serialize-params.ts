import type { Filters } from "./types";

function shiftDays(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function serializeFilters(f: Filters, today: string): string {
  const defaultFrom = shiftDays(today, -30);
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.from !== defaultFrom) sp.set("from", f.from);
  if (f.to !== today) sp.set("to", f.to);
  if (f.min !== null) sp.set("min", String(f.min));
  if (f.max !== null) sp.set("max", String(f.max));
  if (f.categoryIds.length) sp.set("cat", f.categoryIds.join(","));
  if (f.offset > 0) sp.set("offset", String(f.offset));
  return sp.toString();
}
