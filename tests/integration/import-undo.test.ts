import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const ALICE = "alice-undo@test.local";
const BOB = "bob-undo@test.local";

describe("undo by import_id (RLS-scoped delete)", () => {
  let aliceId: string;
  let aliceCycleId: string;
  let aliceCategoryId: string;
  let aliceClient: import("@supabase/supabase-js").SupabaseClient;
  let bobClient: import("@supabase/supabase-js").SupabaseClient;
  const aliceImportId = crypto.randomUUID();
  const bobImportId = crypto.randomUUID();

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceId = a.id;
    aliceClient = a.client;
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: aliceId, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    aliceCycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: aliceCycleId, name: "Carburante", expected_amount: 100 })
      .select("*").single();
    aliceCategoryId = cat!.id;
    await admin().from("expenses").insert([
      { cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 10, occurred_on: "2026-04-28", fingerprint: "a1", import_id: aliceImportId },
      { cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 20, occurred_on: "2026-04-29", fingerprint: "a2", import_id: aliceImportId },
    ]);
    const b = await createTestUser(BOB);
    bobClient = b.client;
    const { data: bc } = await admin()
      .from("cycles")
      .insert({ user_id: b.id, start_date: "2026-04-01", end_date: "2026-04-30", salary: 3000 })
      .select("*").single();
    const { data: bcat } = await admin()
      .from("categories")
      .insert({ cycle_id: bc!.id, name: "Spesa", expected_amount: 200 })
      .select("*").single();
    await admin().from("expenses").insert({
      cycle_id: bc!.id, category_id: bcat!.id, amount: 5, occurred_on: "2026-04-15", fingerprint: "b1", import_id: bobImportId,
    });
  });

  afterAll(async () => { await deleteTestUsers([ALICE, BOB]); });

  it("alice can delete her own batch via import_id", async () => {
    const { error, count } = await aliceClient
      .from("expenses")
      .delete({ count: "exact" })
      .eq("import_id", aliceImportId);
    expect(error).toBeNull();
    expect(count).toBe(2);
  });

  it("bob's expense is untouched after alice's undo", async () => {
    const { data } = await admin().from("expenses").select("import_id").eq("import_id", bobImportId);
    expect(data).toHaveLength(1);
  });

  it("bob cannot delete alice's batch (RLS)", async () => {
    const { count } = await bobClient
      .from("expenses")
      .delete({ count: "exact" })
      .eq("import_id", aliceImportId);
    expect(count).toBe(0);
  });
});
