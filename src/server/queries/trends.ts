import "server-only";
import { getServerSupabase } from "@/lib/db/server";
import type { CycleSummary } from "@/lib/trends/types";

export type TrendsData = {
  recent: CycleSummary[];
  prior: CycleSummary[];
};

export async function getTrendsData(limit = 12): Promise<TrendsData> {
  const supabase = await getServerSupabase();
  const { data: allCycles } = await supabase
    .from("cycles")
    .select("id, start_date, salary")
    .order("start_date", { ascending: false })
    .limit(limit * 2);

  if (!allCycles || allCycles.length === 0) return { recent: [], prior: [] };

  const cycleIds = allCycles.map((c) => c.id);

  const { data: cats } = await supabase
    .from("categories")
    .select("id, cycle_id, name, expected_amount")
    .in("cycle_id", cycleIds);

  const { data: exps } = await supabase
    .from("expenses")
    .select("cycle_id, category_id, amount")
    .in("cycle_id", cycleIds);

  const spentByCategory = new Map<string, number>();
  for (const e of exps ?? []) {
    const cur = spentByCategory.get(e.category_id) ?? 0;
    spentByCategory.set(e.category_id, cur + Number(e.amount));
  }

  const catsByCycle = new Map<string, Array<{ name: string; spent: number; budget: number }>>();
  for (const c of cats ?? []) {
    const list = catsByCycle.get(c.cycle_id) ?? [];
    list.push({
      name: c.name,
      spent: spentByCategory.get(c.id) ?? 0,
      budget: Number(c.expected_amount),
    });
    catsByCycle.set(c.cycle_id, list);
  }

  const summaries: CycleSummary[] = allCycles.map((cycle) => {
    const perCategory = catsByCycle.get(cycle.id) ?? [];
    const totalSpent = perCategory.reduce((s, c) => s + c.spent, 0);
    const totalBudget = perCategory.reduce((s, c) => s + c.budget, 0);
    const salary = cycle.salary === null ? null : Number(cycle.salary);
    return { startDate: cycle.start_date, totalSpent, totalBudget, perCategory, salary };
  });

  // allCycles is desc; recent (last `limit`) → ascending order in the array.
  const recent = summaries.slice(0, limit).reverse();
  const prior = summaries.slice(limit, limit * 2).reverse();
  return { recent, prior };
}
