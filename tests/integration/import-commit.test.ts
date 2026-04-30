import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL = "alice-commit@test.local";

describe("commit-time SQL behavior", () => {
  let userId: string;
  let cycleId: string;
  let categoryId: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const u = await createTestUser(EMAIL);
    userId = u.id;
    await admin().from("profiles").update({ cycle_start_day: 27, default_salary: 4000 }).eq("id", userId);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: userId, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    cycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: cycleId, name: "Carburante", expected_amount: 100 })
      .select("*").single();
    categoryId = cat!.id;
  });

  beforeEach(async () => {
    await admin().from("expenses").delete().eq("cycle_id", cycleId);
    await admin().from("import_mappings").delete().eq("user_id", userId);
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("inserts N expenses with shared import_id and returns rows", async () => {
    const importId = crypto.randomUUID();
    const { data, error } = await admin()
      .from("expenses")
      .insert([
        { cycle_id: cycleId, category_id: categoryId, amount: 10, occurred_on: "2026-04-28", fingerprint: "fp1", import_id: importId },
        { cycle_id: cycleId, category_id: categoryId, amount: 20, occurred_on: "2026-04-29", fingerprint: "fp2", import_id: importId },
      ])
      .select("id, import_id");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data!.every((r) => r.import_id === importId)).toBe(true);
  });

  it("upserts a mapping (insert then update on conflict (user_id, wallet_category))", async () => {
    const a = admin();
    await a.from("import_mappings").upsert(
      { user_id: userId, wallet_category: "Carburante", app_category_name: "Carburante" },
      { onConflict: "user_id,wallet_category" },
    );
    await a.from("import_mappings").upsert(
      { user_id: userId, wallet_category: "Carburante", app_category_name: "Trasporti" },
      { onConflict: "user_id,wallet_category" },
    );
    const { data } = await a.from("import_mappings").select("*").eq("user_id", userId);
    expect(data).toHaveLength(1);
    expect(data![0]!.app_category_name).toBe("Trasporti");
  });

  it("commit flow leaves the database empty when fingerprint matching fails (atomic-by-call)", async () => {
    // We rely on a single `.insert(rows)` call: if the rows array is valid, all-or-nothing happens at the DB level.
    const importId = crypto.randomUUID();
    const { error } = await admin().from("expenses").insert([
      { cycle_id: cycleId, category_id: categoryId, amount: 10, occurred_on: "2026-04-28", fingerprint: "fp", import_id: importId },
      // bad row: missing required cycle_id (simulated with a deliberate empty string)
      { cycle_id: "", category_id: categoryId, amount: 20, occurred_on: "2026-04-29", fingerprint: "fp2", import_id: importId },
    ]);
    expect(error).not.toBeNull();
    const { data } = await admin().from("expenses").select("id").eq("import_id", importId);
    expect(data).toHaveLength(0);
  });
});
