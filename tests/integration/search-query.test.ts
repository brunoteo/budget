import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSearchResultsWithClient } from "@/server/queries/search";

const ALICE = "alice-search@test.local";
const BOB = "bob-search@test.local";

describe("getSearchResults", () => {
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceCycleA: string;
  let aliceCycleB: string;
  let aliceCatSpesa: string;
  let aliceCatAuto: string;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceClient = a.client;
    const b = await createTestUser(BOB);
    bobClient = b.client;

    const c1 = await admin().from("cycles").insert({
      user_id: a.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000,
    }).select("id").single();
    aliceCycleA = c1.data!.id;
    const c2 = await admin().from("cycles").insert({
      user_id: a.id, start_date: "2026-03-27", end_date: "2026-04-26", salary: 4000,
    }).select("id").single();
    aliceCycleB = c2.data!.id;

    const cat1 = await admin().from("categories").insert({
      cycle_id: aliceCycleA, name: "Spesa", expected_amount: 500,
    }).select("id").single();
    aliceCatSpesa = cat1.data!.id;
    const cat2 = await admin().from("categories").insert({
      cycle_id: aliceCycleA, name: "Auto", expected_amount: 200,
    }).select("id").single();
    aliceCatAuto = cat2.data!.id;

    await aliceClient.from("expenses").insert([
      { cycle_id: aliceCycleA, category_id: aliceCatSpesa, amount: 67.4,
        occurred_on: "2026-05-12", note: "Esselunga via Roma" },
      { cycle_id: aliceCycleA, category_id: aliceCatAuto, amount: 50,
        occurred_on: "2026-05-10", note: "Benzina Eni" },
      { cycle_id: aliceCycleB, category_id: aliceCatSpesa, amount: 32.9,
        occurred_on: "2026-04-20", note: "Conad" },
    ]);

    const bobC = await admin().from("cycles").insert({
      user_id: b.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 3000,
    }).select("id").single();
    const bobCat = await admin().from("categories").insert({
      cycle_id: bobC.data!.id, name: "Spesa", expected_amount: 400,
    }).select("id").single();
    await bobClient.from("expenses").insert({
      cycle_id: bobC.data!.id, category_id: bobCat.data!.id, amount: 99,
      occurred_on: "2026-05-12", note: "Esselunga di Bob",
    });
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("returns Alice's matching rows when filtering by text", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "esselunga", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.note).toContain("Esselunga via Roma");
    expect(res.totalCount).toBe(1);
    expect(res.totalAmount).toBeCloseTo(67.4);
  });

  it("RLS blocks Bob's row even when text matches", async () => {
    const res = await getSearchResultsWithClient(bobClient, {
      q: "esselunga", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.note).toContain("di Bob");
  });

  it("filters by date range", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "", from: "2026-04-01", to: "2026-04-30",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.note).toBe("Conad");
  });

  it("filters by amount range", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "", from: "2026-01-01", to: "2026-12-31",
      min: 60, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.amount).toBeCloseTo(67.4);
  });

  it("filters by category ids", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [aliceCatAuto], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.categoryName).toBe("Auto");
  });

  it("orders rows by occurred_on descending across cycles", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows.map((r) => r.occurredOn)).toEqual([
      "2026-05-12", "2026-05-10", "2026-04-20",
    ]);
  });

  it("matches by category name in text search", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "auto", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    // Auto category has one expense
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.categoryName).toBe("Auto");
  });

  it("escapes wildcard characters in q", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "%nopattern%", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(0);
  });
});
