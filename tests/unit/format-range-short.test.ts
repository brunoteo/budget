import { describe, it, expect } from "vitest";
import { formatRangeShort } from "@/lib/format/date";

describe("formatRangeShort", () => {
  it("renders DD MMM – DD MMM in italian short month, no year", () => {
    expect(formatRangeShort("2026-04-27", "2026-05-03")).toBe("27 apr – 3 mag");
  });

  it("collapses to the same month when start and end are within it", () => {
    expect(formatRangeShort("2026-03-27", "2026-04-26")).toBe("27 mar – 26 apr");
  });

  it("works when start equals end", () => {
    expect(formatRangeShort("2026-04-28", "2026-04-28")).toBe("28 apr – 28 apr");
  });
});
