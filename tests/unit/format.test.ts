import { describe, it, expect } from "vitest";
import { formatEur } from "@/lib/format/eur";
import { formatDate, formatDateRange } from "@/lib/format/date";

describe("formatEur", () => {
  it("formats positive integers", () => {
    expect(formatEur(800)).toBe("€ 800,00");
  });
  it("formats decimals with comma separator", () => {
    expect(formatEur(83.83)).toBe("€ 83,83");
  });
  it("formats thousands with dot separator", () => {
    expect(formatEur(4639.82)).toBe("€ 4.639,82");
  });
  it("formats zero", () => {
    expect(formatEur(0)).toBe("€ 0,00");
  });
  it("formats negative with leading minus", () => {
    expect(formatEur(-3115.3)).toBe("-€ 3.115,30");
  });
  it("rounds half-to-even at 2 decimals", () => {
    expect(formatEur(1.005)).toBe("€ 1,01");
  });
});

describe("formatDate", () => {
  it("formats ISO date as DD/MM/YYYY", () => {
    expect(formatDate("2026-04-27")).toBe("27/04/2026");
  });
  it("accepts a Date object", () => {
    expect(formatDate(new Date(Date.UTC(2026, 3, 27)))).toBe("27/04/2026");
  });
});

describe("formatDateRange", () => {
  it("renders Italian short range", () => {
    expect(formatDateRange("2026-03-27", "2026-04-26")).toBe("27 mar – 26 apr 2026");
  });
  it("includes both years when they differ", () => {
    expect(formatDateRange("2025-12-27", "2026-01-26")).toBe("27 dic 2025 – 26 gen 2026");
  });
});
