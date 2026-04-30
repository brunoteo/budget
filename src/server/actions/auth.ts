"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/db/server";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

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

type SignupFields = "email" | "password" | "displayName" | "cycleStartDay";
type LoginFields = "email" | "password";

export async function signupAction(
  _prev: ActionResult<SignupFields>,
  formData: FormData,
): Promise<ActionResult<SignupFields>> {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") {
    return { ok: false, fieldErrors: {}, formError: copy.auth.signupDisabled };
  }
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<SignupFields>(parsed.error);

  const { email, password, displayName, cycleStartDay } = parsed.data;
  const supabase = await getServerSupabase();
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error || !data.user) {
      return { ok: false, fieldErrors: {}, formError: error?.message ?? copy.toast.unexpectedError };
    }
    await supabase
      .from("profiles")
      .update({ display_name: displayName, cycle_start_day: cycleStartDay })
      .eq("id", data.user.id);
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  redirect("/");
}

export async function loginAction(
  _prev: ActionResult<LoginFields>,
  formData: FormData,
): Promise<ActionResult<LoginFields>> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<LoginFields>(parsed.error);

  const supabase = await getServerSupabase();
  try {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { ok: false, fieldErrors: {}, formError: copy.auth.loginFailed };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  redirect("/");
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
