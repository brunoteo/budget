import Papa from "papaparse";
import { z } from "zod";
import type { WalletRow } from "./filter";

export class ParseError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "ParseError";
  }
}

const REQUIRED_HEADERS = ["category", "amount", "date", "type", "transfer"] as const;

const RawRowSchema = z.object({
  account: z.string().optional().default(""),
  category: z.string().min(1),
  amount: z.string().min(1),
  type: z.enum(["Spese", "Entrate"]),
  note: z.string().optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "date format"),
  transfer: z.enum(["true", "false"]),
  payee: z.string().optional().default(""),
});

function parseAmount(raw: string): number {
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) throw new ParseError(`amount not a number: ${raw}`);
  return n;
}

export function parseWalletCsv(text: string): WalletRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]!;
    throw new ParseError(`csv error: ${first.message}`);
  }
  const headers = parsed.meta.fields ?? [];
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      throw new ParseError(`missing column: ${required}`);
    }
  }
  const rows: WalletRow[] = [];
  for (const raw of parsed.data) {
    const validated = RawRowSchema.safeParse(raw);
    if (!validated.success) {
      throw new ParseError(`row invalid: ${validated.error.issues[0]?.message ?? "unknown"}`);
    }
    const r = validated.data;
    rows.push({
      account: r.account.length > 0 ? r.account : null,
      category: r.category,
      amount: parseAmount(r.amount),
      type: r.type,
      note: r.note.length > 0 ? r.note : null,
      occurredOn: r.date.slice(0, 10),
      transfer: r.transfer === "true",
      payee: r.payee.length > 0 ? r.payee : null,
    });
  }
  return rows;
}
