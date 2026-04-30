"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(60),
  cycleStartDay: z.coerce.number().int().min(1).max(31),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signupAction(formData: FormData) {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") {
    return { error: copy.auth.signupDisabled };
  }
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const { email, password, displayName, cycleStartDay } = parsed.data;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error || !data.user) return { error: error?.message ?? "Errore" };
  await supabase
    .from("profiles")
    .update({ display_name: displayName, cycle_start_day: cycleStartDay })
    .eq("id", data.user.id);
  redirect("/");
}

export async function loginAction(formData: FormData) {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/");
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
