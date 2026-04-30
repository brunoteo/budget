"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

const SalarySchema = z.object({
  cycleId: z.string().uuid(),
  salary: z.coerce.number().nonnegative().nullable(),
});
const ExtraIncomeSchema = z.object({
  cycleId: z.string().uuid(),
  items: z.array(z.object({ label: z.string().min(1).max(60), amount: z.coerce.number().nonnegative() })),
});

type SalaryFields = "cycleId" | "salary";

export async function setCycleSalaryAction(
  _prev: ActionResult<SalaryFields>,
  formData: FormData,
): Promise<ActionResult<SalaryFields>> {
  const raw = Object.fromEntries(formData);
  const parsed = SalarySchema.safeParse({ ...raw, salary: raw.salary === "" ? null : raw.salary });
  if (!parsed.success) return fromZod<SalaryFields>(parsed.error);
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("cycles").update({ salary: parsed.data.salary }).eq("id", parsed.data.cycleId);
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect("/settings?toast=settingsSaved");
}

export async function setCycleExtraIncomeAction(input: z.infer<typeof ExtraIncomeSchema>) {
  const parsed = ExtraIncomeSchema.safeParse(input);
  if (!parsed.success) return { error: copy.errors.invalidInput };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("cycles")
    .update({ extra_income: parsed.data.items as never })
    .eq("id", parsed.data.cycleId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}
