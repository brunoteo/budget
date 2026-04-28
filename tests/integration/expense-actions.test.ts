import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL = "alice-exp@test.local";

describe("expense actions", () => {
  let userClient: SupabaseClient;
  let cycleId: string;
  let categoryId: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const { id, client } = await createTestUser(EMAIL);
    userClient = client;
    await admin().from("profiles").update({ cycle_start_day: 27, default_salary: 4000 }).eq("id", id);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    cycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: cycleId, name: "Carburante", expected_amount: 20 })
      .select("*").single();
    categoryId = cat!.id;
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("inserts an expense in the current cycle", async () => {
    const { error } = await userClient.from("expenses").insert({
      cycle_id: cycleId, category_id: categoryId, amount: 83.83, occurred_on: "2026-04-28", note: "Benzina",
    });
    expect(error).toBeNull();
    const { data } = await userClient.from("expenses").select("*").eq("cycle_id", cycleId);
    expect(data).toHaveLength(1);
    expect(Number(data![0]!.amount)).toBeCloseTo(83.83);
  });

  it("blocks delete of another user's expense via RLS", async () => {
    const otherEmail = "bob-exp@test.local";
    await deleteTestUsers([otherEmail]);
    const bob = await createTestUser(otherEmail);
    await bob.client.from("expenses").delete().eq("cycle_id", cycleId);
    const { data } = await admin().from("expenses").select("id").eq("cycle_id", cycleId);
    expect(data!.length).toBeGreaterThan(0);
    await deleteTestUsers([otherEmail]);
  });
});
