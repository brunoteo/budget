import { describe, it, expect } from "vitest";
import { serializeFilters } from "@/lib/search/serialize-params";
import { parseFilters } from "@/lib/search/parse-params";

const TODAY = "2026-05-12";

describe("serializeFilters", () => {
  it("returns empty string for default filters", () => {
    const defaults = parseFilters(new URLSearchParams(""), TODAY);
    expect(serializeFilters(defaults, TODAY)).toBe("");
  });

  it("serializes only non-default fields", () => {
    const f = parseFilters(new URLSearchParams({ q: "esselunga" }), TODAY);
    expect(serializeFilters(f, TODAY)).toBe("q=esselunga");
  });

  it("serializes a fully populated filter", () => {
    const sp = new URLSearchParams({
      q: "spesa",
      from: "2026-01-01",
      to: "2026-03-31",
      min: "10",
      max: "200",
      cat: "11111111-1111-1111-1111-111111111111",
      offset: "30",
    });
    const f = parseFilters(sp, TODAY);
    const out = new URLSearchParams(serializeFilters(f, TODAY));
    expect(out.get("q")).toBe("spesa");
    expect(out.get("from")).toBe("2026-01-01");
    expect(out.get("to")).toBe("2026-03-31");
    expect(out.get("min")).toBe("10");
    expect(out.get("max")).toBe("200");
    expect(out.get("cat")).toBe("11111111-1111-1111-1111-111111111111");
    expect(out.get("offset")).toBe("30");
  });

  it("round-trips parse → serialize → parse", () => {
    const sp = new URLSearchParams({ q: "x", min: "5", offset: "60" });
    const a = parseFilters(sp, TODAY);
    const b = parseFilters(new URLSearchParams(serializeFilters(a, TODAY)), TODAY);
    expect(b).toEqual(a);
  });
});
