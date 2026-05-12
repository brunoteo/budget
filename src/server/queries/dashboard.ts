import "server-only";
import { getServerSupabase } from "@/lib/db/server";
import { computeCycleForDate, nextCycle } from "@/lib/cycle/compute";
import type { CycleRange } from "@/lib/cycle/compute";
import { computeKpis, type Kpi } from "@/lib/kpi/compute";
import { sortCategoriesByName } from "@/lib/category/sort";

export type DashboardData = {
  profile: { id: string; displayName: string; cycleStartDay: number; defaultSalary: number | null };
  cycle: { id: string; range: CycleRange; salary: number | null; extraIncome: { label: string; amount: number }[] };
  categories: { id: string; name: string; expectedAmount: number; sortOrder: number }[];
  expenses: { id: string; categoryId: string; amount: number; occurredOn: string; note: string | null }[];
  kpi: Kpi;
};

export async function getDashboardForToday(today: string, cycleStartOverride?: string): Promise<DashboardData | null> {
  const supabase = await getServerSupabase();
  const { data: profile, error: pErr } = await supabase.from("profiles").select("*").single();
  if (pErr || !profile) return null;

  const range: CycleRange = cycleStartOverride
    ? rangeForStart(cycleStartOverride, profile.cycle_start_day)
    : computeCycleForDate(today, profile.cycle_start_day);

  const { data: existingCycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", profile.id)
    .eq("start_date", range.start)
    .maybeSingle();

  let cycleRow = existingCycle;
  if (!cycleRow) {
    const { data: created, error } = await supabase
      .from("cycles")
      .insert({ user_id: profile.id, start_date: range.start, end_date: range.end, salary: profile.default_salary })
      .select("*")
      .single();
    if (error || !created) return null;
    cycleRow = created;
  }

  const { data: cats } = await supabase.from("categories").select("*").eq("cycle_id", cycleRow.id).order("sort_order");
  const { data: exps } = await supabase.from("expenses").select("*").eq("cycle_id", cycleRow.id).order("occurred_on", { ascending: false });

  const categories = sortCategoriesByName(
    (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      expectedAmount: Number(c.expected_amount),
      sortOrder: c.sort_order,
    })),
  );
  const expenses = (exps ?? []).map((e) => ({
    id: e.id,
    categoryId: e.category_id,
    amount: Number(e.amount),
    occurredOn: e.occurred_on,
    note: e.note,
  }));
  const extraIncome = ((cycleRow.extra_income as unknown as { label: string; amount: number }[]) ?? []).map((x) => ({
    label: x.label,
    amount: Number(x.amount),
  }));
  const salary = cycleRow.salary === null ? null : Number(cycleRow.salary);

  const kpi = computeKpis({
    cycle: range,
    today,
    categories: categories.map((c) => ({ id: c.id, name: c.name, expectedAmount: c.expectedAmount })),
    expenses: expenses.map((e) => ({ categoryId: e.categoryId, amount: e.amount })),
    salary: salary ?? 0,
    extraIncome,
  });

  return {
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      cycleStartDay: profile.cycle_start_day,
      defaultSalary: profile.default_salary === null ? null : Number(profile.default_salary),
    },
    cycle: { id: cycleRow.id, range, salary, extraIncome },
    categories,
    expenses,
    kpi,
  };
}

function rangeForStart(startISO: string, startDay: number): CycleRange {
  const next = nextCycle({ start: startISO, end: "" }, startDay);
  const t = new Date(`${next.start}T12:00:00Z`).getTime() - 86_400_000;
  const d = new Date(t);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { start: startISO, end: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` };
}
