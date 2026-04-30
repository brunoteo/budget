import type { z } from "zod";

export type ActionResult<F extends string = string> =
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<F, string>>; formError?: string };

export const initialResult: ActionResult = { ok: false, fieldErrors: {} };

export function fromZod<F extends string>(err: z.ZodError): ActionResult<F> {
  const flat = err.flatten().fieldErrors as Record<string, string[] | undefined>;
  const fieldErrors = Object.fromEntries(
    Object.entries(flat)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => [k, v![0]]),
  ) as Partial<Record<F, string>>;
  return { ok: false, fieldErrors };
}
