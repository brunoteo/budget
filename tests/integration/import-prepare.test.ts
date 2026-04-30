import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL = "alice-prep@test.local";

describe("prepareImportAction (via Supabase, no server-action wiring)", () => {
  // The integration tests below exercise the SQL queries that prepareImportAction
  // performs, with the user's RLS-scoped client. The action itself is exercised
  // end-to-end by the Playwright spec in Task 24.
  let userId: string;
  let userClient: SupabaseClient;
  let cycleId: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const u = await createTestUser(EMAIL);
    userId = u.id;
    userClient = u.client;
    await admin().from("profiles").update({ cycle_start_day: 27, default_salary: 4000 }).eq("id", userId);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: userId, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    cycleId = c!.id;
    await admin().from("categories").insert([
      { cycle_id: cycleId, name: "Carburante", expected_amount: 100 },
      { cycle_id: cycleId, name: "Spesa", expected_amount: 400 },
    ]);
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("returns mappings for the user only (RLS)", async () => {
    await admin().from("import_mappings").insert({
      user_id: userId, wallet_category: "Carburante", app_category_name: "Carburante",
    });
    const { data } = await userClient.from("import_mappings").select("*");
    expect(data).toHaveLength(1);
    expect(data![0]!.wallet_category).toBe("Carburante");
  });

  it("returns categories for cycles the user owns", async () => {
    const { data } = await userClient.from("categories").select("name").eq("cycle_id", cycleId);
    const names = (data ?? []).map((r) => r.name).sort();
    expect(names).toEqual(["Carburante", "Spesa"]);
  });

  it("queries fingerprints over the user's expenses", async () => {
    await admin().from("expenses").insert({
      cycle_id: cycleId,
      category_id: (await admin().from("categories").select("id").eq("cycle_id", cycleId).eq("name", "Carburante").single()).data!.id,
      amount: 83.83, occurred_on: "2026-04-28", note: "Benzina",
      fingerprint: "abc123",
    });
    const { data } = await userClient.from("expenses").select("fingerprint").eq("fingerprint", "abc123");
    expect(data).toHaveLength(1);
  });
});
