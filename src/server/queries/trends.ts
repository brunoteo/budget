import "server-only";
import { getServerSupabase } from "@/lib/db/server";

export type TrendCycle = { start_date: string; total_spent: number; total_budget: number };

export async function getTrendCycles(limit = 6): Promise<TrendCycle[]> {
  const supabase = await getServerSupabase();
  const { data: cycles } = await supabase.from("cycles").select("id, start_date").order("start_date", { ascending: false }).limit(limit);
  if (!cycles) return [];
  const out: TrendCycle[] = [];
  for (const cycle of cycles) {
    const { data: cats } = await supabase.from("categories").select("expected_amount").eq("cycle_id", cycle.id);
    const { data: exps } = await supabase.from("expenses").select("amount").eq("cycle_id", cycle.id);
    const total_budget = (cats ?? []).reduce((s, x) => s + Number(x.expected_amount), 0);
    const total_spent = (exps ?? []).reduce((s, x) => s + Number(x.amount), 0);
    out.push({ start_date: cycle.start_date, total_spent, total_budget });
  }
  return out.reverse();
}
