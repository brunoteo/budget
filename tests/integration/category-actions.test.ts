import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL = "alice-cat@test.local";

describe("category actions", () => {
  let cycleId: string;
  let userClient: SupabaseClient;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const { client } = await createTestUser(EMAIL);
    userClient = client;
    const { data: profile } = await admin().from("profiles").select("id").eq("display_name", "alice-cat").single();
    const userId = profile!.id;
    const { data: c } = await admin()
      .from("cycles").insert({ user_id: userId, start_date: "2026-04-27", end_date: "2026-05-26" })
      .select("*").single();
    cycleId = c!.id;
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("creates and lists a category", async () => {
    await userClient.from("categories").insert({ cycle_id: cycleId, name: "Mutuo", expected_amount: 530, is_fixed: true });
    const { data } = await userClient.from("categories").select("*").eq("cycle_id", cycleId);
    expect(data).toHaveLength(1);
    expect(data![0]!.is_fixed).toBe(true);
  });

  it("blocks delete when an expense references the category", async () => {
    const { data: cat } = await userClient.from("categories").select("id").eq("cycle_id", cycleId).single();
    await admin().from("expenses").insert({
      cycle_id: cycleId,
      category_id: cat!.id,
      amount: 530,
      occurred_on: "2026-04-28",
    });
    const { error } = await userClient.from("categories").delete().eq("id", cat!.id);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/foreign key|violates/i);
  });
});
