import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALICE = "alice-del@test.local";
const BOB = "bob-del@test.local";

describe("expense delete via RLS", () => {
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceCycleId: string;
  let aliceCategoryId: string;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceClient = a.client;
    await admin().from("profiles").update({ cycle_start_day: 27 }).eq("id", a.id);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: a.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    aliceCycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: aliceCycleId, name: "Spesa", expected_amount: 100 })
      .select("*").single();
    aliceCategoryId = cat!.id;

    const b = await createTestUser(BOB);
    bobClient = b.client;
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("owner can delete own expense", async () => {
    const { data: ins } = await aliceClient
      .from("expenses")
      .insert({ cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 12, occurred_on: "2026-04-28", note: null })
      .select("*").single();
    const id = ins!.id;
    const { error } = await aliceClient.from("expenses").delete().eq("id", id);
    expect(error).toBeNull();
    const { data } = await aliceClient.from("expenses").select("id").eq("id", id);
    expect(data).toHaveLength(0);
  });

  it("non-owner cannot delete via RLS", async () => {
    const { data: ins } = await aliceClient
      .from("expenses")
      .insert({ cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 12, occurred_on: "2026-04-28", note: null })
      .select("*").single();
    const id = ins!.id;
    await bobClient.from("expenses").delete().eq("id", id);
    const { data } = await admin().from("expenses").select("id").eq("id", id);
    expect(data).toHaveLength(1);
  });
});
