import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALICE = "alice-map@test.local";
const BOB = "bob-map@test.local";

describe("import_mappings RLS + update/delete", () => {
  let aliceId: string;
  let bobClient: SupabaseClient;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceId = a.id;
    const b = await createTestUser(BOB);
    bobClient = b.client;
  });

  beforeEach(async () => {
    await admin().from("import_mappings").delete().eq("user_id", aliceId);
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("inserting two mappings with the same wallet_category and user fails the unique constraint", async () => {
    const a = admin();
    await a.from("import_mappings").insert({ user_id: aliceId, wallet_category: "Carburante", app_category_name: "X" });
    const { error } = await a.from("import_mappings").insert({ user_id: aliceId, wallet_category: "Carburante", app_category_name: "Y" });
    expect(error).not.toBeNull();
  });

  it("updating a mapping's app_category_name persists", async () => {
    const a = admin();
    await a.from("import_mappings").insert({ user_id: aliceId, wallet_category: "Carburante", app_category_name: "X" });
    await a.from("import_mappings").update({ app_category_name: "Y" }).eq("user_id", aliceId).eq("wallet_category", "Carburante");
    const { data } = await a.from("import_mappings").select("app_category_name").eq("user_id", aliceId).single();
    expect(data!.app_category_name).toBe("Y");
  });

  it("bob cannot read alice's mappings (RLS)", async () => {
    await admin().from("import_mappings").insert({ user_id: aliceId, wallet_category: "Carburante", app_category_name: "X" });
    const { data } = await bobClient.from("import_mappings").select("*").eq("user_id", aliceId);
    expect(data).toEqual([]);
  });
});
