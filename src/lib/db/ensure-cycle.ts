import "server-only";
import { computeCycleForDate } from "@/lib/cycle/compute";
import { getServerSupabase } from "@/lib/db/server";

/** Lazy-creates the cycle covering `occurredOn` for the current user, returning its id. */
export async function ensureCycleForDate(occurredOn: string): Promise<string> {
  const supabase = await getServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, cycle_start_day, default_salary")
    .single();
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
    .insert({
      user_id: profile.id,
      start_date: range.start,
      end_date: range.end,
      salary: profile.default_salary,
    })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("cycle insert failed");
  return created.id;
}
