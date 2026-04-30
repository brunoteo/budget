import { describe, it, expect } from "vitest";
import { z } from "zod";
import { fromZod, initialResult, type ActionResult } from "@/server/actions/result";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

describe("ActionResult", () => {
  it("initialResult is a not-yet-submitted state", () => {
    const r: ActionResult = initialResult;
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors).toEqual({});
  });

  it("fromZod maps each field's first error", () => {
    const parsed = Schema.safeParse({ email: "nope", password: "short" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const result = fromZod<"email" | "password">(parsed.error);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
  });

  it("fromZod returns no fieldErrors for fields that passed", () => {
    const parsed = Schema.safeParse({ email: "a@b.co", password: "short" });
    if (parsed.success) throw new Error("should not parse");
    const result = fromZod<"email" | "password">(parsed.error);
    if (result.ok) return;
    expect(result.fieldErrors.email).toBeUndefined();
    expect(result.fieldErrors.password).toBeDefined();
  });
});
