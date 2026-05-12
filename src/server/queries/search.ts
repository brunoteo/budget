import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/db/server";
import type { Filters, SearchResult, SearchRow } from "@/lib/search/types";
import { SEARCH_LIMIT } from "@/lib/search/types";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type Row = {
  id: string;
  amount: number | string;
  occurred_on: string;
  note: string | null;
  category_id: string;
  cycle_id: string;
  cycles: { start_date: string; end_date: string };
  categories: { name: string };
};

function mapRow(r: Row): SearchRow {
  return {
    id: r.id,
    amount: Number(r.amount),
    occurredOn: r.occurred_on,
    note: r.note,
    categoryId: r.category_id,
    categoryName: r.categories.name,
    cycleId: r.cycle_id,
    cycleStartDate: r.cycles.start_date,
    cycleEndDate: r.cycles.end_date,
  };
}

export async function getSearchResultsWithClient(
  supabase: SupabaseClient,
  f: Filters,
): Promise<SearchResult> {
  const select =
    "id, amount, occurred_on, note, category_id, cycle_id, " +
    "cycles!inner(start_date, end_date), categories!inner(name)";

  let q = supabase
    .from("expenses")
    .select(select, { count: "exact" })
    .gte("occurred_on", f.from)
    .lte("occurred_on", f.to);

  if (f.min != null) q = q.gte("amount", f.min);
  if (f.max != null) q = q.lte("amount", f.max);
  if (f.categoryIds.length) q = q.in("category_id", f.categoryIds);
  if (f.q) {
    const pat = `%${escapeIlike(f.q)}%`;
    q = q.ilike("note", pat);
  }

  const { data, count, error } = await q
    .order("occurred_on", { ascending: false })
    .range(f.offset, f.offset + SEARCH_LIMIT - 1);

  if (error) throw error;

  // PostgREST aggregates are disabled in Supabase (PGRST123). Fetch all
  // matching amounts and sum in JS. Personal-finance scale keeps this small.
  let sumQ = supabase
    .from("expenses")
    .select("amount")
    .gte("occurred_on", f.from)
    .lte("occurred_on", f.to);
  if (f.min != null) sumQ = sumQ.gte("amount", f.min);
  if (f.max != null) sumQ = sumQ.lte("amount", f.max);
  if (f.categoryIds.length) sumQ = sumQ.in("category_id", f.categoryIds);
  if (f.q) {
    const pat = `%${escapeIlike(f.q)}%`;
    sumQ = sumQ.ilike("note", pat);
  }
  const { data: sumRows, error: sumErr } = await sumQ;
  if (sumErr) throw sumErr;
  const totalAmount = (sumRows ?? []).reduce(
    (acc: number, r: { amount: number | string }) => acc + Number(r.amount),
    0,
  );

  return {
    rows: (data as unknown as Row[] | null)?.map(mapRow) ?? [],
    totalCount: count ?? 0,
    totalAmount,
  };
}

export async function getSearchResults(f: Filters): Promise<SearchResult> {
  const supabase = await getServerSupabase();
  return getSearchResultsWithClient(supabase, f);
}
