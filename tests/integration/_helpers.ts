import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function admin(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

export async function createTestUser(
  email: string,
  password = "TestPassword!1",
): Promise<{ id: string; client: SupabaseClient }> {
  const a = admin();
  const { data, error } = await a.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user!.id;
  await a
    .from("profiles")
    .update({
      display_name: email.split("@")[0] ?? "user",
      cycle_start_day: 1,
    })
    .eq("id", id);
  const userClient = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;
  return { id, client: userClient };
}

export async function deleteTestUsers(emails: string[]) {
  const a = admin();
  for (const email of emails) {
    const { data } = await a.auth.admin.listUsers();
    const u = data.users.find((x) => x.email === email);
    if (u) await a.auth.admin.deleteUser(u.id);
  }
}
