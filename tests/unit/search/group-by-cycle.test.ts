import { describe, it, expect } from "vitest";
import { groupByCycle } from "@/lib/search/group-by-cycle";
import type { SearchRow } from "@/lib/search/types";

function row(over: Partial<SearchRow>): SearchRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    amount: 10,
    occurredOn: "2026-05-12",
    note: null,
    categoryId: "11111111-1111-1111-1111-111111111111",
    categoryName: "Spesa",
    cycleId: "ccccccccc-cccc-cccc-cccc-cccccccccccc",
    cycleStartDate: "2026-04-27",
    cycleEndDate: "2026-05-26",
    ...over,
  };
}

describe("groupByCycle", () => {
  it("returns empty array for empty input", () => {
    expect(groupByCycle([])).toEqual([]);
  });

  it("groups rows of one cycle and sums total", () => {
    const out = groupByCycle([
      row({ id: "a", amount: 10 }),
      row({ id: "b", amount: 20 }),
      row({ id: "c", amount: 5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.total).toBe(35);
    expect(out[0]!.rows).toHaveLength(3);
  });

  it("preserves input order across cycles", () => {
    const out = groupByCycle([
      row({ id: "a", cycleId: "C2", cycleStartDate: "2026-04-27" }),
      row({ id: "b", cycleId: "C1", cycleStartDate: "2026-03-27" }),
      row({ id: "c", cycleId: "C2", cycleStartDate: "2026-04-27" }),
    ]);
    expect(out.map((g) => g.cycleId)).toEqual(["C2", "C1"]);
    expect(out[0]!.rows.map((r) => r.id)).toEqual(["a", "c"]);
  });
});
