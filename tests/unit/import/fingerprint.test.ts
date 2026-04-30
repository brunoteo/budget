import { describe, it, expect } from "vitest";
import { fingerprint } from "@/lib/import/fingerprint";

describe("fingerprint", () => {
  it("returns a 64-char lowercase hex SHA-256", async () => {
    const fp = await fingerprint({ occurredOn: "2026-04-28", amount: 83.83, note: "Benzina" });
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same input", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "Pranzo" });
    const b = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "Pranzo" });
    expect(a).toBe(b);
  });

  it("is case-insensitive on note", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "Pranzo" });
    const b = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "PRANZO" });
    expect(a).toBe(b);
  });

  it("ignores leading/trailing whitespace in note", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "Pranzo" });
    const b = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "  Pranzo  " });
    expect(a).toBe(b);
  });

  it("treats null/undefined/empty note identically", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: null });
    const b = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "" });
    expect(a).toBe(b);
  });

  it("is sign-insensitive on amount (uses absolute cents)", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "x" });
    const b = await fingerprint({ occurredOn: "2026-04-28", amount: -12.5, note: "x" });
    expect(a).toBe(b);
  });

  it("rounds amount to cents (12.5001 ≡ 12.50)", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "x" });
    const b = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5001, note: "x" });
    expect(a).toBe(b);
  });

  it("differs when occurredOn differs", async () => {
    const a = await fingerprint({ occurredOn: "2026-04-28", amount: 12.5, note: "x" });
    const b = await fingerprint({ occurredOn: "2026-04-29", amount: 12.5, note: "x" });
    expect(a).not.toBe(b);
  });
});
