import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const A_EMAIL = "alice-rls@test.local";
const B_EMAIL = "bob-rls@test.local";

describe("RLS isolation", () => {
  let aliceId: string;
  let bobClient: Awaited<ReturnType<typeof createTestUser>>["client"];

  beforeAll(async () => {
    await deleteTestUsers([A_EMAIL, B_EMAIL]);
    const alice = await createTestUser(A_EMAIL);
    const bob = await createTestUser(B_EMAIL);
    aliceId = alice.id;
    bobClient = bob.client;
    const a = admin();
    const { error } = await a.from("cycles").insert({
      user_id: alice.id,
      start_date: "2026-04-27",
      end_date: "2026-05-26",
    });
    if (error) throw error;
  });

  afterAll(async () => {
    await deleteTestUsers([A_EMAIL, B_EMAIL]);
  });

  it("Bob cannot read Alice's cycles", async () => {
    const { data, error } = await bobClient
      .from("cycles")
      .select("*")
      .eq("user_id", aliceId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Bob cannot insert a cycle owned by Alice", async () => {
    const { error } = await bobClient.from("cycles").insert({
      user_id: aliceId,
      start_date: "2026-06-27",
      end_date: "2026-07-26",
    });
    expect(error).not.toBeNull();
  });
});
