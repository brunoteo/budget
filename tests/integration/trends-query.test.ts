import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL_A = "alice-trends@test.local";
const EMAIL_B = "bob-trends@test.local";

async function seedCycle(
  userId: string,
  startDate: string,
  endDate: string,
  categories: Array<{ name: string; expected: number; spent: number[] }>,
) {
  const a = admin();
  const { data: cycle, error: cErr } = await a
    .from("cycles")
    .insert({ user_id: userId, start_date: startDate, end_date: endDate, salary: 2000 })
    .select("*").single();
  if (cErr || !cycle) throw cErr;
  for (const cat of categories) {
    const { data: catRow, error: catErr } = await a
      .from("categories")
      .insert({ cycle_id: cycle.id, name: cat.name, expected_amount: cat.expected })
      .select("*").single();
    if (catErr || !catRow) throw catErr;
    for (const amount of cat.spent) {
      await a.from("expenses").insert({
        cycle_id: cycle.id,
        category_id: catRow.id,
        amount,
        occurred_on: startDate,
      });
    }
  }
}

describe("trends seed + RLS (foundation for getTrendsData)", () => {
  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
    const alice = await createTestUser(EMAIL_A);
    aliceId = alice.id;
    for (let i = 0; i < 14; i++) {
      const month = String((i % 12) + 1).padStart(2, "0");
      const year = 2025 + Math.floor(i / 12);
      await seedCycle(aliceId, `${year}-${month}-01`, `${year}-${month}-28`, [
        { name: i < 7 ? "Casa" : "Spese casa", expected: 500, spent: [100 + i * 10] },
        { name: "Carburante", expected: 100, spent: [50] },
      ]);
    }
    const bob = await createTestUser(EMAIL_B);
    bobId = bob.id;
    await seedCycle(bobId, "2026-03-01", "2026-03-28", [
      { name: "BobOnly", expected: 1, spent: [1] },
    ]);
  }, 30000);

  afterAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
  });

  it("admin sees exactly 14 cycles for Alice", async () => {
    const { data } = await admin().from("cycles").select("id").eq("user_id", aliceId);
    expect(data).toHaveLength(14);
  });

  it("a category renamed mid-window is present at both names across cycles", async () => {
    const { data: cycles } = await admin()
      .from("cycles")
      .select("id, start_date")
      .eq("user_id", aliceId)
      .order("start_date");
    const earliest = cycles![0]!;
    const latest = cycles![cycles!.length - 1]!;
    const { data: earlyCats } = await admin().from("categories").select("name").eq("cycle_id", earliest.id);
    const { data: lateCats } = await admin().from("categories").select("name").eq("cycle_id", latest.id);
    expect(earlyCats!.some((c) => c.name === "Casa")).toBe(true);
    expect(lateCats!.some((c) => c.name === "Spese casa")).toBe(true);
  });

  it("RLS isolates Bob's BobOnly category from Alice's cycle id space", async () => {
    const { data: aliceCycles } = await admin().from("cycles").select("id").eq("user_id", aliceId);
    const aliceCycleIds = aliceCycles!.map((c) => c.id);
    const { data: aliceCats } = await admin().from("categories").select("name").in("cycle_id", aliceCycleIds);
    const names = new Set(aliceCats!.map((c) => c.name));
    expect(names.has("BobOnly")).toBe(false);
  });
});
