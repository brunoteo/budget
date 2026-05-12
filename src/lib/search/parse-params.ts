import { z } from "zod";
import type { Filters } from "./types";
import { SEARCH_LIMIT } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shiftDays(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

const NumOrNull = z
  .preprocess((v) => {
    if (v === null || v === "" || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, z.number().nullable());

export function parseFilters(sp: URLSearchParams, today: string): Filters {
  const defaultFrom = shiftDays(today, -30);
  const q = (sp.get("q") ?? "").slice(0, 100);

  let from = sp.get("from") ?? "";
  let to = sp.get("to") ?? "";
  if (!DATE_RE.test(from)) from = defaultFrom;
  if (!DATE_RE.test(to)) to = today;
  if (from > to) [from, to] = [to, from];

  const min = NumOrNull.parse(sp.get("min"));
  const max = NumOrNull.parse(sp.get("max"));

  const catRaw = sp.get("cat") ?? "";
  const categoryIds = catRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 50);

  const offsetRaw = Number(sp.get("offset") ?? "0");
  const offset =
    Number.isFinite(offsetRaw) && offsetRaw >= 0
      ? Math.floor(offsetRaw / SEARCH_LIMIT) * SEARCH_LIMIT
      : 0;

  return { q, from, to, min, max, categoryIds, offset };
}
