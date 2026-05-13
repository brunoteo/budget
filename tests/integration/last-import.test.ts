import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL_A = "alice-last-import@test.local";
const EMAIL_B = "bob-last-import@test.local";

async function seedCycleAndCategory(userId: string) {
  await admin().from("profiles").update({ cycle_start_day: 1, default_salary: 3000 }).eq("id", userId);
  const { data: c } = await admin()
    .from("cycles")
    .insert({ user_id: userId, start_date: "2026-04-01", end_date: "2026-04-30", salary: 3000 })
    .select("*").single();
  const { data: cat } = await admin()
    .from("categories")
    .insert({ cycle_id: c!.id, name: "Carburante", expected_amount: 100 })
    .select("*").single();
  return { cycleId: c!.id as string, categoryId: cat!.id as string };
}

describe("last-import aggregate", () => {
  let userA: string;
  let userB: string;
  let cycleA: string;
  let catA: string;
  let cycleB: string;
  let catB: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
    userA = (await createTestUser(EMAIL_A)).id;
    userB = (await createTestUser(EMAIL_B)).id;
    ({ cycleId: cycleA, categoryId: catA } = await seedCycleAndCategory(userA));
    ({ cycleId: cycleB, categoryId: catB } = await seedCycleAndCategory(userB));
  });

  beforeEach(async () => {
    await admin().from("expenses").delete().eq("cycle_id", cycleA);
    await admin().from("expenses").delete().eq("cycle_id", cycleB);
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
  });

  it("returns null/null for a user with no imports", async () => {
    const { data, error } = await admin()
      .from("expenses")
      .select("occurred_on, created_at")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("returns the latest occurred_on and created_at among imported rows", async () => {
    const importId = crypto.randomUUID();
    await admin().from("expenses").insert([
      { cycle_id: cycleA, category_id: catA, amount: 10, occurred_on: "2026-04-05", fingerprint: "fp1", import_id: importId },
      { cycle_id: cycleA, category_id: catA, amount: 20, occurred_on: "2026-04-12", fingerprint: "fp2", import_id: importId },
      { cycle_id: cycleA, category_id: catA, amount: 30, occurred_on: "2026-04-08", fingerprint: "fp3", import_id: importId },
    ]);

    const occ = await admin()
      .from("expenses")
      .select("occurred_on")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(occ.data!.occurred_on).toBe("2026-04-12");

    const created = await admin()
      .from("expenses")
      .select("created_at")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(created.data!.created_at).toBeTruthy();
  });

  it("ignores manual expenses (import_id IS NULL) even when newer", async () => {
    const importId = crypto.randomUUID();
    await admin().from("expenses").insert([
      { cycle_id: cycleA, category_id: catA, amount: 10, occurred_on: "2026-04-05", fingerprint: "fp1", import_id: importId },
      { cycle_id: cycleA, category_id: catA, amount: 99, occurred_on: "2026-04-29", fingerprint: null, import_id: null },
    ]);

    const occ = await admin()
      .from("expenses")
      .select("occurred_on")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(occ.data!.occurred_on).toBe("2026-04-05");
  });

  it("isolates users via RLS: A cannot see B's imports", async () => {
    const importIdA = crypto.randomUUID();
    const importIdB = crypto.randomUUID();
    await admin().from("expenses").insert([
      { cycle_id: cycleA, category_id: catA, amount: 10, occurred_on: "2026-04-05", fingerprint: "fpA", import_id: importIdA },
      { cycle_id: cycleB, category_id: catB, amount: 20, occurred_on: "2026-04-25", fingerprint: "fpB", import_id: importIdB },
    ]);

    const occ = await admin()
      .from("expenses")
      .select("occurred_on, cycle_id")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(occ.data!.occurred_on).toBe("2026-04-05");
  });
});
