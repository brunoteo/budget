"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { computeCycleForDate } from "@/lib/cycle/compute";
import { revalidatePath } from "next/cache";

const ExpenseSchema = z.object({
  amount: z.coerce.number().nonnegative(),
  categoryId: z.string().uuid(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

async function ensureCycleForDate(occurredOn: string) {
  const supabase = await getServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("id, cycle_start_day, default_salary").single();
  if (!profile) throw new Error("No profile");
  const range = computeCycleForDate(occurredOn, profile.cycle_start_day);
  const { data: existing } = await supabase
    .from("cycles")
    .select("id")
    .eq("user_id", profile.id)
    .eq("start_date", range.start)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("cycles")
    .insert({ user_id: profile.id, start_date: range.start, end_date: range.end, salary: profile.default_salary })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("cycle insert failed");
  return created.id;
}

export async function createExpenseAction(formData: FormData) {
  const parsed = ExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const cycleId = await ensureCycleForDate(parsed.data.occurredOn);
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").insert({
    cycle_id: cycleId,
    category_id: parsed.data.categoryId,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    note: parsed.data.note ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteExpenseAction(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}
