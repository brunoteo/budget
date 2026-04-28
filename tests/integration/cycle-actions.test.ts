import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL = "alice-cyc@test.local";

describe("cycle actions", () => {
  let cycleId: string;
  let userClient: SupabaseClient;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const { id, client } = await createTestUser(EMAIL);
    userClient = client;
    const { data } = await admin()
      .from("cycles").insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26" })
      .select("*").single();
    cycleId = data!.id;
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("updates salary on the user's own cycle", async () => {
    const { error } = await userClient.from("cycles").update({ salary: 4639.82 }).eq("id", cycleId);
    expect(error).toBeNull();
    const { data } = await userClient.from("cycles").select("salary").eq("id", cycleId).single();
    expect(Number(data!.salary)).toBeCloseTo(4639.82);
  });

  it("stores extra_income as JSONB", async () => {
    const items = [{ label: "tredicesima", amount: 4000 }];
    const { error } = await userClient.from("cycles").update({ extra_income: items }).eq("id", cycleId);
    expect(error).toBeNull();
    const { data } = await userClient.from("cycles").select("extra_income").eq("id", cycleId).single();
    expect(data!.extra_income).toEqual(items);
  });
});
