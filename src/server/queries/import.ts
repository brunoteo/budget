import "server-only";
import { getServerSupabase } from "@/lib/db/server";

export type Mapping = { walletCategory: string; appCategoryName: string };
export type CategoryRow = { id: string; name: string; cycleId: string };

export async function getMappings(): Promise<Mapping[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("import_mappings")
    .select("wallet_category, app_category_name")
    .order("wallet_category", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    walletCategory: r.wallet_category,
    appCategoryName: r.app_category_name,
  }));
}

export async function getCategoriesForCycles(cycleIds: string[]): Promise<CategoryRow[]> {
  if (cycleIds.length === 0) return [];
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, cycle_id")
    .in("cycle_id", cycleIds)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, cycleId: r.cycle_id }));
}

export type LastImport = {
  lastOccurredOn: string | null; // ISO YYYY-MM-DD
  lastUploadedAt: string | null; // ISO timestamp
};

export async function getLastImport(): Promise<LastImport> {
  const supabase = await getServerSupabase();

  const occQ = await supabase
    .from("expenses")
    .select("occurred_on")
    .not("import_id", "is", null)
    .order("occurred_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (occQ.error) throw occQ.error;

  const createdQ = await supabase
    .from("expenses")
    .select("created_at")
    .not("import_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (createdQ.error) throw createdQ.error;

  return {
    lastOccurredOn: occQ.data?.occurred_on ?? null,
    lastUploadedAt: createdQ.data?.created_at ?? null,
  };
}
