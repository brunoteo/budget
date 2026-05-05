#!/usr/bin/env tsx
/**
 * Local-development seed: creates user `test@test.com` / `password` and seeds
 * 14 cycles of varied data so dashboard forecast and `/trends` show all states.
 *
 * Run with: pnpm db:seed
 *
 * Idempotent: deletes the test user (cascading cycles/categories/expenses)
 * before recreating. Reads creds from .env.local — local Supabase only.
 */
import { createClient } from "@supabase/supabase-js";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("Did you run `pnpm db:start`?");
  process.exit(1);
}

if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  console.error(`Refusing to seed against ${URL} — script targets local Supabase only.`);
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const EMAIL = "test@test.com";
const PASSWORD = "password";
const DISPLAY_NAME = "Test";
const CYCLE_START_DAY = 1;
const SALARY = 2500;
const N_CYCLES = 14; // last 12 are recent window, first 2 feed prior window

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

async function deleteExistingUser(): Promise<void> {
  const { data } = await admin.auth.admin.listUsers();
  const existing = data.users.find((u) => u.email === EMAIL);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
    console.log(`✗ removed existing ${EMAIL}`);
  }
}

async function createUser(): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("user creation returned no user");
  await admin
    .from("profiles")
    .update({ display_name: DISPLAY_NAME, cycle_start_day: CYCLE_START_DAY, default_salary: SALARY })
    .eq("id", data.user.id);
  return data.user.id;
}

type CycleSpec = { start: string; end: string; isCurrent: boolean; year: number; month: number };

function buildCycleSpecs(): CycleSpec[] {
  // Walk back from today's cycle start (cycleStartDay=1 → first of current month).
  const today = new Date();
  const baseY = today.getUTCFullYear();
  const baseM = today.getUTCMonth() + 1; // 1-indexed
  const out: CycleSpec[] = [];
  for (let i = N_CYCLES - 1; i >= 0; i--) {
    let y = baseY;
    let m = baseM - i;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    out.push({
      start: `${y}-${pad(m)}-01`,
      end: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`,
      year: y,
      month: m,
      isCurrent: i === 0,
    });
  }
  return out;
}

type CatSpec = { name: string; expected: number; isFixed: boolean };

function categoriesFor(spec: CycleSpec, ageIndex: number): CatSpec[] {
  // ageIndex 0 = oldest, N_CYCLES - 1 = current.
  if (spec.isCurrent) {
    // Stress scenario: many lump-sum early-cycle expenses (mirrors real-world Wallet import).
    // Used to verify the forecast does NOT explode from per-category extrapolation.
    return [
      { name: "Casa", expected: 800, isFixed: true },
      { name: "Mutuo", expected: 530, isFixed: true },
      { name: "Assicurazione", expected: 212, isFixed: true },
      { name: "Leasing", expected: 487, isFixed: true },
      { name: "Abbonamento", expected: 118.75, isFixed: true },
      { name: "Spesa alimentare", expected: 50, isFixed: false },
      { name: "Carburante", expected: 20, isFixed: false },
      { name: "Trasporti", expected: 47.3, isFixed: false },
      { name: "Svago", expected: 70, isFixed: false },
      { name: "Salute", expected: 200, isFixed: false },
      { name: "Risparmi", expected: 1000, isFixed: false },
      { name: "Vacanze", expected: 372, isFixed: false },
      { name: "Regali", expected: 20, isFixed: false },
    ];
  }
  const cats: CatSpec[] = [
    { name: "Casa", expected: ageIndex < 6 ? 700 : ageIndex < 12 ? 800 : 850, isFixed: true },
    { name: "Spesa", expected: 400, isFixed: false },
    { name: "Carburante", expected: 100, isFixed: false },
    { name: "Bollette", expected: 120, isFixed: true },
  ];
  if (spec.month === 7 || spec.month === 8) cats.push({ name: "Vacanze", expected: 800, isFixed: false });
  if (spec.month === 12) cats.push({ name: "Regali", expected: 200, isFixed: false });
  return cats;
}

type ExpenseSeed = { amount: number; day: number; note?: string };

function expensesForPastCycle(cat: CatSpec, ageIndex: number): ExpenseSeed[] {
  // Cheap deterministic noise so cycles vary but reproducibly.
  const seed = (ageIndex + 1) * 7919;
  const noise = ((seed % 100) - 50) / 100; // -0.5 .. +0.5

  if (cat.isFixed) {
    return [{ amount: cat.expected, day: 1 }];
  }
  if (cat.name === "Spesa") {
    const total = cat.expected * (1 + noise * 0.3);
    return [
      { amount: round2(total * 0.28), day: 5, note: "Supermercato" },
      { amount: round2(total * 0.24), day: 12, note: "Mercato" },
      { amount: round2(total * 0.26), day: 19, note: "Supermercato" },
      { amount: round2(total * 0.22), day: 26 },
    ];
  }
  if (cat.name === "Carburante") {
    const total = cat.expected * (0.8 + noise * 0.4);
    return [
      { amount: round2(total / 2), day: 8, note: "Benzina" },
      { amount: round2(total / 2), day: 22, note: "Benzina" },
    ];
  }
  if (cat.name === "Vacanze") return [{ amount: round2(700 + noise * 200), day: 15, note: "Viaggio" }];
  if (cat.name === "Regali") {
    return [
      { amount: 90, day: 18, note: "Regalo" },
      { amount: 110, day: 22, note: "Regalo" },
    ];
  }
  return [];
}

function expensesForCurrentCycle(cat: CatSpec): ExpenseSeed[] {
  // Lump-sum early-cycle scenario: mirrors a Wallet bulk import on day 1-3 of cycle.
  // Pre-fix bug: per-category extrapolation projected this to ~€35k vs ~€4k budget.
  if (cat.isFixed) return [{ amount: cat.expected, day: 1 }];
  if (cat.name === "Spesa alimentare") return [];
  if (cat.name === "Carburante") return [{ amount: 83.83, day: 2, note: "Benzina" }];
  if (cat.name === "Trasporti") return [];
  if (cat.name === "Svago") return [{ amount: 1.37, day: 3, note: "Caffè" }];
  if (cat.name === "Salute") return [{ amount: 23.5, day: 1, note: "Farmacia" }];
  if (cat.name === "Risparmi") return [{ amount: 1000, day: 2, note: "Trasferimento" }];
  if (cat.name === "Vacanze") return [{ amount: 372, day: 2, note: "Hotel" }];
  if (cat.name === "Regali") return [];
  return [];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function seedCycle(userId: string, spec: CycleSpec, ageIndex: number): Promise<void> {
  const { data: cycle, error: cErr } = await admin
    .from("cycles")
    .insert({ user_id: userId, start_date: spec.start, end_date: spec.end, salary: SALARY })
    .select("*")
    .single();
  if (cErr || !cycle) throw cErr;

  const cats = categoriesFor(spec, ageIndex);
  const inserted: Array<{ id: string; cat: CatSpec }> = [];
  for (const cat of cats) {
    const { data, error } = await admin
      .from("categories")
      .insert({
        cycle_id: cycle.id,
        name: cat.name,
        expected_amount: cat.expected,
        is_fixed: cat.isFixed,
      })
      .select("id")
      .single();
    if (error || !data) throw error;
    inserted.push({ id: data.id, cat });
  }

  const eom = Number(spec.end.slice(8, 10));
  const rows: Array<{
    cycle_id: string;
    category_id: string;
    amount: number;
    occurred_on: string;
    note: string | null;
  }> = [];
  for (const { id, cat } of inserted) {
    const seeds = spec.isCurrent ? expensesForCurrentCycle(cat) : expensesForPastCycle(cat, ageIndex);
    for (const s of seeds) {
      const day = Math.min(s.day, eom);
      rows.push({
        cycle_id: cycle.id,
        category_id: id,
        amount: s.amount,
        occurred_on: `${spec.start.slice(0, 8)}${pad(day)}`,
        note: s.note ?? null,
      });
    }
  }
  if (rows.length > 0) {
    const { error } = await admin.from("expenses").insert(rows);
    if (error) throw error;
  }
  console.log(
    `✓ ${spec.start}${spec.isCurrent ? " (current)" : ""} — ${cats.length} cats, ${rows.length} expenses`,
  );
}

async function main(): Promise<void> {
  console.log(`Seeding ${URL}`);
  await deleteExistingUser();
  const userId = await createUser();
  console.log(`✓ created ${EMAIL} (${userId})`);
  const specs = buildCycleSpecs();
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    if (!spec) continue;
    await seedCycle(userId, spec, i);
  }
  console.log(`\n✅ Seeded ${N_CYCLES} cycles for ${EMAIL}.`);
  console.log(`   Login: ${EMAIL} / ${PASSWORD}`);
  console.log(`   Dashboard will show the forecast row on the current cycle.`);
  console.log(`   /trends will show all four sections.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
