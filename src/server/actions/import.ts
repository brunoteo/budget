"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { computeCycleForDate } from "@/lib/cycle/compute";
import { ensureCycleForDate } from "@/lib/db/ensure-cycle";
import { getServerSupabase } from "@/lib/db/server";
import { fingerprint } from "@/lib/import/fingerprint";
import { foldName } from "@/lib/import/normalize";

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

const CommitRowSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative(),
  note: z.string().nullable(),
  walletCategory: z.string().min(1),
  appCategoryName: z.string().min(1),
});

const CommitPayloadSchema = z.object({
  rows: z.array(CommitRowSchema).min(1),
  pendingMappings: z.array(z.object({ walletCategory: z.string().min(1), appCategoryName: z.string().min(1) })),
});

export type CommitResult = { importId: string; count: number } | { error: string };

export async function commitImportAction(rawPayload: unknown): Promise<CommitResult> {
  const parsed = CommitPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await getServerSupabase();
  const importId = crypto.randomUUID();

  // 1. resolve cycleId for every row (lazy-creates onboarding cycles)
  const cycleByDate = new Map<string, string>();
  for (const row of parsed.data.rows) {
    if (!cycleByDate.has(row.occurredOn)) {
      try {
        cycleByDate.set(row.occurredOn, await ensureCycleForDate(row.occurredOn));
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Errore ciclo." };
      }
    }
  }

  // 2. fetch all categories for the resolved cycles (one query)
  const cycleIds = Array.from(new Set(cycleByDate.values()));
  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id, name, cycle_id")
    .in("cycle_id", cycleIds);
  if (catErr) return { error: catErr.message };
  const categoryIdByCycleAndFolded = new Map<string, string>(); // key: `${cycleId}|${foldName(name)}`
  for (const c of cats ?? []) {
    categoryIdByCycleAndFolded.set(`${c.cycle_id}|${foldName(c.name)}`, c.id);
  }

  // 3. resolve categoryId per row, abort on first miss
  type InsertRow = {
    cycle_id: string;
    category_id: string;
    amount: number;
    occurred_on: string;
    note: string | null;
    fingerprint: string;
    import_id: string;
  };
  const inserts: InsertRow[] = [];
  for (const row of parsed.data.rows) {
    const cycleId = cycleByDate.get(row.occurredOn)!;
    const key = `${cycleId}|${foldName(row.appCategoryName)}`;
    const categoryId = categoryIdByCycleAndFolded.get(key);
    if (!categoryId) {
      // find the cycle range for the error message
      const { data: cycleRow } = await supabase
        .from("cycles")
        .select("start_date, end_date")
        .eq("id", cycleId)
        .single();
      const cycleLabel = cycleRow ? `${cycleRow.start_date} – ${cycleRow.end_date}` : cycleId;
      return { error: `Categoria "${row.appCategoryName}" non esiste nel ciclo ${cycleLabel}.` };
    }
    const fp = await fingerprint({
      occurredOn: row.occurredOn, amount: row.amount, note: row.note,
    });
    inserts.push({
      cycle_id: cycleId,
      category_id: categoryId,
      amount: row.amount,
      occurred_on: row.occurredOn,
      note: row.note,
      fingerprint: fp,
      import_id: importId,
    });
  }

  // 4. bulk insert
  const { error: insErr } = await supabase.from("expenses").insert(inserts);
  if (insErr) return { error: insErr.message };

  // 5. upsert pending mappings (resolve user_id from session)
  if (parsed.data.pendingMappings.length > 0) {
    const { data: profile } = await supabase.from("profiles").select("id").single();
    if (!profile) return { error: "Profilo mancante." };
    const upsertRows = parsed.data.pendingMappings.map((m) => ({
      user_id: profile.id,
      wallet_category: m.walletCategory,
      app_category_name: m.appCategoryName,
      updated_at: new Date().toISOString(),
    }));
    const { error: mapErr } = await supabase
      .from("import_mappings")
      .upsert(upsertRows, { onConflict: "user_id,wallet_category" });
    if (mapErr) return { error: mapErr.message };
  }

  revalidatePath("/");
  return { importId, count: inserts.length };
}
