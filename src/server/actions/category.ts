"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

const CreateSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(1).max(80),
  expectedAmount: z.coerce.number().nonnegative(),
  isFixed: z.coerce.boolean().optional().default(false),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().uuid() });

type CategoryFields = "cycleId" | "name" | "expectedAmount" | "isFixed";

export async function createCategoryAction(
  _prev: ActionResult<CategoryFields>,
  formData: FormData,
): Promise<ActionResult<CategoryFields>> {
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<CategoryFields>(parsed.error);
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("categories").insert({
      cycle_id: parsed.data.cycleId,
      name: parsed.data.name,
      expected_amount: parsed.data.expectedAmount,
      is_fixed: parsed.data.isFixed ?? false,
    });
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect("/categories?toast=categorySaved");
}

export async function updateCategoryAction(
  _prev: ActionResult<CategoryFields | "id">,
  formData: FormData,
): Promise<ActionResult<CategoryFields | "id">> {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<CategoryFields | "id">(parsed.error);
  const { id, ...rest } = parsed.data;
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("categories").update({
      ...(rest.name !== undefined && { name: rest.name }),
      ...(rest.expectedAmount !== undefined && { expected_amount: rest.expectedAmount }),
      ...(rest.isFixed !== undefined && { is_fixed: rest.isFixed }),
    }).eq("id", id);
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect("/categories?toast=categorySaved");
}

export async function deleteCategoryAction(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Impossibile eliminare: la categoria ha spese." };
  revalidatePath("/");
  redirect("/categories?toast=categoryDeleted");
}

const CarrySchema = z.object({ targetCycleId: z.string().uuid() });

export async function carryForwardCategoriesAction(formData: FormData) {
  const parsed = CarrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();

  const { data: target } = await supabase.from("cycles").select("user_id, start_date").eq("id", parsed.data.targetCycleId).single();
  if (!target) return { error: "Ciclo non trovato." };

  const { data: previous } = await supabase
    .from("cycles")
    .select("id")
    .eq("user_id", target.user_id)
    .lt("start_date", target.start_date)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!previous) return { error: "Nessun ciclo precedente." };

  const { data: prevCats } = await supabase
    .from("categories")
    .select("name, expected_amount, is_fixed, sort_order")
    .eq("cycle_id", previous.id)
    .order("sort_order");
  if (!prevCats || prevCats.length === 0) return { error: "Il ciclo precedente non ha categorie." };

  const rows = prevCats.map((c) => ({ ...c, cycle_id: parsed.data.targetCycleId }));
  const { error } = await supabase.from("categories").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true, count: rows.length };
}
