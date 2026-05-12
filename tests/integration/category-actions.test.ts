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
    await userClient.from("categories").insert({ cycle_id: cycleId, name: "Mutuo", expected_amount: 530 });
    const { data } = await userClient.from("categories").select("*").eq("cycle_id", cycleId);
    expect(data).toHaveLength(1);
    expect(data![0]!.name).toBe("Mutuo");
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

describe("category carry-forward", () => {
  it("carries forward categories from the previous cycle", async () => {
    const FWD_EMAIL = "carrie-fwd@test.local";
    await deleteTestUsers([FWD_EMAIL]);
    const { id, client } = await createTestUser(FWD_EMAIL);
    const a = admin();
    const { data: prev } = await a.from("cycles").insert({ user_id: id, start_date: "2026-03-27", end_date: "2026-04-26" }).select("*").single();
    const { data: target } = await a.from("cycles").insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26" }).select("*").single();
    await a.from("categories").insert([
      { cycle_id: prev!.id, name: "Spese casa", expected_amount: 800, sort_order: 0 },
      { cycle_id: prev!.id, name: "Mutuo", expected_amount: 530, sort_order: 1 },
    ]);

    const { data: prevCats } = await a.from("categories").select("name, expected_amount, sort_order").eq("cycle_id", prev!.id).order("sort_order");
    const rows = prevCats!.map((c) => ({ ...c, cycle_id: target!.id }));
    const { error } = await client.from("categories").insert(rows);
    expect(error).toBeNull();

    const { data: copied } = await client.from("categories").select("*").eq("cycle_id", target!.id).order("sort_order");
    expect(copied).toHaveLength(2);
    expect(copied![0]!.name).toBe("Spese casa");
    expect(copied![1]!.name).toBe("Mutuo");
    await deleteTestUsers([FWD_EMAIL]);
  });
});
