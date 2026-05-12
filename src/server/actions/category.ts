"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

const CycleSlugSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function readCycleSlug(formData: FormData): string | undefined {
  const raw = formData.get("cycleSlug");
  if (typeof raw !== "string") return undefined;
  const parsed = CycleSlugSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function categoriesRedirect(toast: string, cycleSlug?: string): string {
  return cycleSlug
    ? `/categories?cycle=${cycleSlug}&toast=${toast}`
    : `/categories?toast=${toast}`;
}

const CreateSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(1).max(80),
  expectedAmount: z.coerce.number().nonnegative(),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().uuid() });

type CategoryFields = "cycleId" | "name" | "expectedAmount";

export async function createCategoryAction(
  _prev: ActionResult<CategoryFields>,
  formData: FormData,
): Promise<ActionResult<CategoryFields>> {
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<CategoryFields>(parsed.error);
  const cycleSlug = readCycleSlug(formData);
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("categories").insert({
      cycle_id: parsed.data.cycleId,
      name: parsed.data.name,
      expected_amount: parsed.data.expectedAmount,
    });
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect(categoriesRedirect("categorySaved", cycleSlug));
}

export async function updateCategoryAction(
  _prev: ActionResult<CategoryFields | "id">,
  formData: FormData,
): Promise<ActionResult<CategoryFields | "id">> {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<CategoryFields | "id">(parsed.error);
  const cycleSlug = readCycleSlug(formData);
  const { id, ...rest } = parsed.data;
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("categories").update({
      ...(rest.name !== undefined && { name: rest.name }),
      ...(rest.expectedAmount !== undefined && { expected_amount: rest.expectedAmount }),
    }).eq("id", id);
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect(categoriesRedirect("categorySaved", cycleSlug));
}

export async function deleteCategoryAction(id: string, formData?: FormData) {
  const cycleSlug = formData ? readCycleSlug(formData) : undefined;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: copy.errors.categoryHasExpenses };
  revalidatePath("/");
  redirect(categoriesRedirect("categoryDeleted", cycleSlug));
}

const CarrySchema = z.object({ targetCycleId: z.string().uuid() });

export async function carryForwardCategoriesAction(formData: FormData) {
  const parsed = CarrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: copy.errors.invalidInput };
  const supabase = await getServerSupabase();

  const { data: target } = await supabase.from("cycles").select("user_id, start_date").eq("id", parsed.data.targetCycleId).single();
  if (!target) return { error: copy.errors.cycleNotFound };

  const { data: previous } = await supabase
    .from("cycles")
    .select("id")
    .eq("user_id", target.user_id)
    .lt("start_date", target.start_date)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!previous) return { error: copy.errors.noPreviousCycle };

  const { data: prevCats } = await supabase
    .from("categories")
    .select("name, expected_amount, sort_order")
    .eq("cycle_id", previous.id)
    .order("sort_order");
  if (!prevCats || prevCats.length === 0) return { error: copy.errors.previousCycleEmpty };

  const rows = prevCats.map((c) => ({ ...c, cycle_id: parsed.data.targetCycleId }));
  const { error } = await supabase.from("categories").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  const cycleSlug = readCycleSlug(formData);
  if (cycleSlug) redirect(`/categories?cycle=${cycleSlug}`);
  return { ok: true, count: rows.length };
}
