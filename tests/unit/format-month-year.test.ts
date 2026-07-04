import { describe, it, expect } from "vitest";
import { formatMonthYear } from "@/lib/format/date";

describe("formatMonthYear", () => {
  it("formats an ISO month as short Italian month + 2-digit year", () => {
    expect(formatMonthYear("2026-01-27")).toBe("gen '26");
  });

  it("formats December correctly", () => {
    expect(formatMonthYear("2025-12-01")).toBe("dic '25");
  });

  it("returns the raw string unchanged on malformed input", () => {
    expect(formatMonthYear("not-a-date")).toBe("not-a-date");
  });

  it("returns the raw string unchanged when month is out of range", () => {
    expect(formatMonthYear("2026-13-01")).toBe("2026-13-01");
  });
});
