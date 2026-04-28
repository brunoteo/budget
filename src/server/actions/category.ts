"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";

const CreateSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(1).max(80),
  expectedAmount: z.coerce.number().nonnegative(),
  isFixed: z.coerce.boolean().optional().default(false),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().uuid() });

export async function createCategoryAction(formData: FormData) {
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").insert({
    cycle_id: parsed.data.cycleId,
    name: parsed.data.name,
    expected_amount: parsed.data.expectedAmount,
    is_fixed: parsed.data.isFixed ?? false,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}

export async function updateCategoryAction(formData: FormData) {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const { id, ...rest } = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").update({
    ...(rest.name !== undefined && { name: rest.name }),
    ...(rest.expectedAmount !== undefined && { expected_amount: rest.expectedAmount }),
    ...(rest.isFixed !== undefined && { is_fixed: rest.isFixed }),
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategoryAction(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Impossibile eliminare: la categoria ha spese." };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}
