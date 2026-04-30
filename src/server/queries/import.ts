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
