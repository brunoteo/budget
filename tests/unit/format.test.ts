import { describe, it, expect } from "vitest";
import { formatEur } from "@/lib/format/eur";

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
