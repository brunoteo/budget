import "server-only";
import { getServerSupabase } from "@/lib/db/server";

export type ExpenseForEdit = {
  expense: {
    id: string;
    amount: number;
    categoryId: string;
    occurredOn: string;
    note: string | null;
    cycleId: string;
  };
  categories: { id: string; name: string; isFixed: boolean }[];
};

export async function getExpenseForEdit(id: string): Promise<ExpenseForEdit | null> {
  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("expenses")
    .select("id, amount, category_id, occurred_on, note, cycle_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, is_fixed")
    .eq("cycle_id", row.cycle_id)
    .order("sort_order");
  return {
    expense: {
      id: row.id,
      amount: Number(row.amount),
      categoryId: row.category_id,
      occurredOn: row.occurred_on,
      note: row.note,
      cycleId: row.cycle_id,
    },
    categories: (cats ?? []).map((c) => ({ id: c.id, name: c.name, isFixed: c.is_fixed })),
  };
}
