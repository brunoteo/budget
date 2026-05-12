import { describe, it, expect } from "vitest";
import { parseFilters } from "@/lib/search/parse-params";

const TODAY = "2026-05-12";

describe("parseFilters", () => {
  it("returns defaults when given empty params", () => {
    const f = parseFilters(new URLSearchParams(""), TODAY);
    expect(f.q).toBe("");
    expect(f.from).toBe("2026-04-12");
    expect(f.to).toBe(TODAY);
    expect(f.min).toBeNull();
    expect(f.max).toBeNull();
    expect(f.categoryIds).toEqual([]);
    expect(f.offset).toBe(0);
  });

  it("parses all valid params", () => {
    const sp = new URLSearchParams({
      q: "esselunga",
      from: "2026-01-01",
      to: "2026-03-31",
      min: "10",
      max: "200",
      cat: "11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222",
      offset: "30",
    });
    const f = parseFilters(sp, TODAY);
    expect(f.q).toBe("esselunga");
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-03-31");
    expect(f.min).toBe(10);
    expect(f.max).toBe(200);
    expect(f.categoryIds).toHaveLength(2);
    expect(f.offset).toBe(30);
  });

  it("falls back to defaults for malformed input", () => {
    const sp = new URLSearchParams({
      q: "x".repeat(200),
      from: "not-a-date",
      to: "also-bad",
      min: "abc",
      max: "-5",
      cat: "not-a-uuid",
      offset: "-7",
    });
    const f = parseFilters(sp, TODAY);
    expect(f.q.length).toBeLessThanOrEqual(100);
    expect(f.from).toBe("2026-04-12");
    expect(f.to).toBe(TODAY);
    expect(f.min).toBeNull();
    expect(f.max).toBeNull();
    expect(f.categoryIds).toEqual([]);
    expect(f.offset).toBe(0);
  });

  it("swaps from/to if reversed", () => {
    const sp = new URLSearchParams({ from: "2026-05-01", to: "2026-04-01" });
    const f = parseFilters(sp, TODAY);
    expect(f.from).toBe("2026-04-01");
    expect(f.to).toBe("2026-05-01");
  });

  it("clamps offset to multiples of 30", () => {
    const sp = new URLSearchParams({ offset: "47" });
    const f = parseFilters(sp, TODAY);
    expect(f.offset).toBe(30);
  });

  it("caps q length at 100", () => {
    const sp = new URLSearchParams({ q: "a".repeat(150) });
    const f = parseFilters(sp, TODAY);
    expect(f.q.length).toBe(100);
  });
});
