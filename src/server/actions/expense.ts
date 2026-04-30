"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { ensureCycleForDate } from "@/lib/db/ensure-cycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

const ExpenseSchema = z.object({
  amount: z.coerce.number().nonnegative(),
  categoryId: z.string().uuid(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

type ExpenseFields = "amount" | "categoryId" | "occurredOn" | "note";

export async function createExpenseAction(
  _prev: ActionResult<ExpenseFields>,
  formData: FormData,
): Promise<ActionResult<ExpenseFields>> {
  const parsed = ExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<ExpenseFields>(parsed.error);
  try {
    const cycleId = await ensureCycleForDate(parsed.data.occurredOn);
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("expenses").insert({
      cycle_id: cycleId,
      category_id: parsed.data.categoryId,
      amount: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      note: parsed.data.note ?? null,
    });
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect("/?toast=expenseAdded");
}

export async function deleteExpenseAction(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}
