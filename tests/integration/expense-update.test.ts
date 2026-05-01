import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALICE = "alice-update@test.local";
const BOB = "bob-update@test.local";

describe("expense update via RLS", () => {
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceCycleId: string;
  let aliceCategoryId: string;
  let aliceExpenseId: string;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceClient = a.client;
    await admin().from("profiles").update({ cycle_start_day: 27, default_salary: 4000 }).eq("id", a.id);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: a.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    aliceCycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: aliceCycleId, name: "Carburante", expected_amount: 20 })
      .select("*").single();
    aliceCategoryId = cat!.id;
    const { data: exp } = await aliceClient
      .from("expenses")
      .insert({ cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 50, occurred_on: "2026-04-28", note: "old" })
      .select("*").single();
    aliceExpenseId = exp!.id;

    const b = await createTestUser(BOB);
    bobClient = b.client;
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("owner can update amount and note", async () => {
    const { error } = await aliceClient
      .from("expenses")
      .update({ amount: 75.5, note: "new" })
      .eq("id", aliceExpenseId);
    expect(error).toBeNull();
    const { data } = await aliceClient.from("expenses").select("*").eq("id", aliceExpenseId).single();
    expect(Number(data!.amount)).toBeCloseTo(75.5);
    expect(data!.note).toBe("new");
  });

  it("non-owner cannot update via RLS (silent zero rows)", async () => {
    const { error } = await bobClient
      .from("expenses")
      .update({ amount: 9999 })
      .eq("id", aliceExpenseId);
    // RLS blocks the update silently — no error, but the row is unchanged.
    expect(error).toBeNull();
    const { data } = await admin().from("expenses").select("amount").eq("id", aliceExpenseId).single();
    expect(Number(data!.amount)).not.toBeCloseTo(9999);
  });
});
