import { describe, it, expect } from "vitest";
import { filterRows, type WalletRow } from "@/lib/import/filter";

const base = (overrides: Partial<WalletRow> = {}): WalletRow => ({
  category: "Carburante",
  amount: -10,
  occurredOn: "2026-04-28",
  type: "Spese",
  transfer: false,
  note: null,
  payee: null,
  account: null,
  ...overrides,
});

describe("filterRows", () => {
  it("keeps a normal Spese row", () => {
    const out = filterRows([base()]);
    expect(out.kept).toHaveLength(1);
    expect(out.counts).toEqual({ entrate: 0, transfer: 0, zero: 0 });
  });

  it("drops Entrate rows", () => {
    const out = filterRows([base({ type: "Entrate", amount: 4639.82 })]);
    expect(out.kept).toHaveLength(0);
    expect(out.counts.entrate).toBe(1);
  });

  it("drops transfer=true even when type is Spese", () => {
    const out = filterRows([base({ transfer: true })]);
    expect(out.kept).toHaveLength(0);
    expect(out.counts.transfer).toBe(1);
  });

  it("drops amount=0", () => {
    const out = filterRows([base({ amount: 0 })]);
    expect(out.kept).toHaveLength(0);
    expect(out.counts.zero).toBe(1);
  });

  it("counts each reason independently across a mixed batch", () => {
    const out = filterRows([
      base(),
      base({ type: "Entrate" }),
      base({ transfer: true }),
      base({ amount: 0 }),
      base(),
    ]);
    expect(out.kept).toHaveLength(2);
    expect(out.counts).toEqual({ entrate: 1, transfer: 1, zero: 1 });
  });

  it("when both Entrate and transfer apply, counts only the first matched reason (Entrate)", () => {
    const out = filterRows([base({ type: "Entrate", transfer: true })]);
    expect(out.kept).toHaveLength(0);
    expect(out.counts).toEqual({ entrate: 1, transfer: 0, zero: 0 });
  });
});
