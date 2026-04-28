"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";

const ProfileSchema = z.object({
  displayName: z.string().min(1).max(60),
  cycleStartDay: z.coerce.number().int().min(1).max(31),
  defaultSalary: z.string().optional().transform((v) => (v === undefined || v === "" ? null : Number(v))),
});

export async function updateProfileAction(formData: FormData) {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("id").single();
  if (!profile) return { error: "Profilo non trovato." };
  const { error } = await supabase.from("profiles").update({
    display_name: parsed.data.displayName,
    cycle_start_day: parsed.data.cycleStartDay,
    default_salary: parsed.data.defaultSalary,
  }).eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
