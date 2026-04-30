"use server";
import { z } from "zod";
import { computeCycleForDate } from "@/lib/cycle/compute";
import { getServerSupabase } from "@/lib/db/server";
import { fingerprint } from "@/lib/import/fingerprint";

const WalletRowSchema = z.object({
  category: z.string().min(1),
  amount: z.number(),
  type: z.enum(["Spese", "Entrate"]),
  note: z.string().nullable(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transfer: z.boolean(),
  payee: z.string().nullable(),
  account: z.string().nullable(),
});

const PreparePayloadSchema = z.array(WalletRowSchema);

export type PreparedRow = {
  occurredOn: string;
  amount: number;        // absolute value, positive cents
  note: string | null;
  walletCategory: string;
  cycleId: string | null;
  cycleRange: { startDate: string; endDate: string };
  resolved: { kind: "mapping"; appCategoryName: string } | { kind: "unmapped" };
  isDuplicate: boolean;
};

export type PrepareCycle = { id: string | null; startDate: string; endDate: string };

export type Prepared = {
  rows: PreparedRow[];
  cycles: PrepareCycle[];
  categoriesByCycle: Record<string, { id: string; name: string }[]>; // keyed by cycle.startDate (so onboarding null-id rows can still group)
  counts: { kept: number; duplicates: number };
};

export type PrepareError = { error: string };

export async function prepareImportAction(rawRows: unknown): Promise<Prepared | PrepareError> {
  const parsed = PreparePayloadSchema.safeParse(rawRows);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await getServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, cycle_start_day")
    .single();
  if (!profile) return { error: "Profilo mancante." };

  // 1. compute target cycle range per row
  const rangesByStart = new Map<string, { startDate: string; endDate: string }>();
  const rowsWithRange = parsed.data.map((r) => {
    const range = computeCycleForDate(r.occurredOn, profile.cycle_start_day);
    rangesByStart.set(range.start, { startDate: range.start, endDate: range.end });
    return { row: r, range };
  });

  // 2. fetch existing cycles whose start_date matches any row's range
  const startDates = Array.from(rangesByStart.keys());
  const { data: existingCycles } = await supabase
    .from("cycles")
    .select("id, start_date, end_date")
    .in("start_date", startDates);
  const cycleByStart = new Map<string, { id: string; startDate: string; endDate: string }>();
  for (const c of existingCycles ?? []) {
    cycleByStart.set(c.start_date, { id: c.id, startDate: c.start_date, endDate: c.end_date });
  }

  // 3. fetch categories for those cycles
  const cycleIds = Array.from(cycleByStart.values()).map((c) => c.id);
  const { data: cats } =
    cycleIds.length > 0
      ? await supabase.from("categories").select("id, name, cycle_id").in("cycle_id", cycleIds)
      : { data: [] as { id: string; name: string; cycle_id: string }[] };
  const categoriesByCycleId = new Map<string, { id: string; name: string }[]>();
  for (const c of cats ?? []) {
    const arr = categoriesByCycleId.get(c.cycle_id) ?? [];
    arr.push({ id: c.id, name: c.name });
    categoriesByCycleId.set(c.cycle_id, arr);
  }

  // 4. fetch mappings (RLS-scoped to user)
  const { data: mappings } = await supabase
    .from("import_mappings")
    .select("wallet_category, app_category_name");
  const mappingByWallet = new Map<string, string>();
  for (const m of mappings ?? []) mappingByWallet.set(m.wallet_category, m.app_category_name);

  // 5. compute fingerprints + dedup against existing expenses in the touched cycles
  const fps = await Promise.all(
    rowsWithRange.map((r) =>
      fingerprint({ occurredOn: r.row.occurredOn, amount: r.row.amount, note: r.row.note }),
    ),
  );
  const fpSet = new Set<string>();
  if (cycleIds.length > 0) {
    const { data: existingFps } = await supabase
      .from("expenses")
      .select("fingerprint")
      .in("cycle_id", cycleIds)
      .in("fingerprint", fps);
    for (const e of existingFps ?? []) if (e.fingerprint) fpSet.add(e.fingerprint);
  }
  // within-batch: flag the second-and-later occurrences
  const seen = new Set<string>();
  const isDup = fps.map((fp) => {
    if (fpSet.has(fp)) return true;
    if (seen.has(fp)) return true;
    seen.add(fp);
    return false;
  });

  // 6. build rows
  const preparedRows: PreparedRow[] = rowsWithRange.map(({ row, range }, i) => {
    const cycle = cycleByStart.get(range.start);
    const mapped = mappingByWallet.get(row.category);
    const resolved: PreparedRow["resolved"] = mapped
      ? { kind: "mapping", appCategoryName: mapped }
      : { kind: "unmapped" };
    return {
      occurredOn: row.occurredOn,
      amount: Math.abs(row.amount),
      note: row.note,
      walletCategory: row.category,
      cycleId: cycle?.id ?? null,
      cycleRange: { startDate: range.start, endDate: range.end },
      resolved,
      isDuplicate: isDup[i] ?? false,
    };
  });

  // 7. assemble categoriesByCycle keyed by cycle.startDate (stable across null-id onboarding rows)
  const categoriesByCycle: Record<string, { id: string; name: string }[]> = {};
  for (const cycle of cycleByStart.values()) {
    categoriesByCycle[cycle.startDate] = categoriesByCycleId.get(cycle.id) ?? [];
  }

  return {
    rows: preparedRows,
    cycles: Array.from(rangesByStart.values()).map((r) => {
      const c = cycleByStart.get(r.startDate);
      return { id: c?.id ?? null, startDate: r.startDate, endDate: r.endDate };
    }),
    categoriesByCycle,
    counts: { kept: preparedRows.length, duplicates: preparedRows.filter((r) => r.isDuplicate).length },
  };
}
