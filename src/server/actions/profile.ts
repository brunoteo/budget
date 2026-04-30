"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

const ProfileSchema = z.object({
  displayName: z.string().min(1).max(60),
  cycleStartDay: z.coerce.number().int().min(1).max(31),
  defaultSalary: z.string().optional().transform((v) => (v === undefined || v === "" ? null : Number(v))),
});

type ProfileFields = "displayName" | "cycleStartDay" | "defaultSalary";

export async function updateProfileAction(
  _prev: ActionResult<ProfileFields>,
  formData: FormData,
): Promise<ActionResult<ProfileFields>> {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<ProfileFields>(parsed.error);
  try {
    const supabase = await getServerSupabase();
    const { data: profile } = await supabase.from("profiles").select("id").single();
    if (!profile) return { ok: false, fieldErrors: {}, formError: copy.errors.profileNotFound };
    const { error } = await supabase.from("profiles").update({
      display_name: parsed.data.displayName,
      cycle_start_day: parsed.data.cycleStartDay,
      default_salary: parsed.data.defaultSalary,
    }).eq("id", profile.id);
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  revalidatePath("/settings");
  redirect("/settings?toast=settingsSaved");
}
