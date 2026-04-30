import { describe, it, expect } from "vitest";
import { parseWalletCsv, ParseError } from "@/lib/import/parse";

const HEADER =
  "account;category;currency;amount;ref_currency_amount;type;payment_type;payment_type_local;note;date;gps_latitude;gps_longitude;gps_accuracy_in_meters;warranty_in_month;transfer;payee;labels;envelope_id;custom_category";

function row(parts: Partial<{ category: string; amount: string; type: string; note: string; date: string; transfer: string; payee: string; account: string }> = {}): string {
  const v = {
    account: parts.account ?? "BBVA",
    category: parts.category ?? "Carburante",
    currency: "EUR",
    amount: parts.amount ?? "-83,83",
    ref_currency_amount: parts.amount ?? "-83,83",
    type: parts.type ?? "Spese",
    payment_type: "TRANSFER",
    payment_type_local: "Bonifico bancario",
    note: parts.note ?? "Benzina Marzo",
    date: parts.date ?? "2026-04-28 02:00:00",
    gps_latitude: "",
    gps_longitude: "",
    gps_accuracy_in_meters: "",
    warranty_in_month: "0",
    transfer: parts.transfer ?? "false",
    payee: parts.payee ?? "",
    labels: "",
    envelope_id: "5000",
    custom_category: "false",
  };
  return [
    v.account, v.category, v.currency, v.amount, v.ref_currency_amount, v.type, v.payment_type,
    v.payment_type_local, v.note, v.date, v.gps_latitude, v.gps_longitude, v.gps_accuracy_in_meters,
    v.warranty_in_month, v.transfer, v.payee, v.labels, v.envelope_id, v.custom_category,
  ].join(";");
}

describe("parseWalletCsv", () => {
  it("parses Italian decimals (comma) into JS numbers", () => {
    const csv = `${HEADER}\n${row({ amount: "-83,83" })}`;
    const out = parseWalletCsv(csv);
    expect(out).toHaveLength(1);
    expect(out[0]!.amount).toBeCloseTo(-83.83);
  });

  it("strips time from the date and yields ISO YYYY-MM-DD", () => {
    const csv = `${HEADER}\n${row({ date: "2026-04-28 15:27:28" })}`;
    const out = parseWalletCsv(csv);
    expect(out[0]!.occurredOn).toBe("2026-04-28");
  });

  it("parses transfer true/false as boolean", () => {
    const csv = `${HEADER}\n${row({ transfer: "true" })}\n${row({ transfer: "false" })}`;
    const out = parseWalletCsv(csv);
    expect(out[0]!.transfer).toBe(true);
    expect(out[1]!.transfer).toBe(false);
  });

  it("preserves type, category, note, payee, account", () => {
    const csv = `${HEADER}\n${row({ category: "Spesa", note: "EUROSPIN", payee: "EUROSPIN", account: "BBVA - CONTO BBVA", type: "Spese" })}`;
    const out = parseWalletCsv(csv);
    expect(out[0]).toMatchObject({
      category: "Spesa",
      note: "EUROSPIN",
      payee: "EUROSPIN",
      account: "BBVA - CONTO BBVA",
      type: "Spese",
    });
  });

  it("treats empty note/payee as null", () => {
    const csv = `${HEADER}\n${row({ note: "", payee: "" })}`;
    const out = parseWalletCsv(csv);
    expect(out[0]!.note).toBeNull();
    expect(out[0]!.payee).toBeNull();
  });

  it("rejects when a required header is missing", () => {
    const bad = HEADER.replace(";amount;", ";");
    const csv = `${bad}\n${row()}`;
    expect(() => parseWalletCsv(csv)).toThrow(ParseError);
  });

  it("rejects when the file uses comma delimiters instead of semicolons", () => {
    const csv = HEADER.replace(/;/g, ",") + "\n" + row().replace(/;/g, ",");
    expect(() => parseWalletCsv(csv)).toThrow(ParseError);
  });

  it("rejects when amount is not a number", () => {
    const csv = `${HEADER}\n${row({ amount: "abc" })}`;
    expect(() => parseWalletCsv(csv)).toThrow(ParseError);
  });

  it("rejects when date is not YYYY-MM-DD HH:MM:SS", () => {
    const csv = `${HEADER}\n${row({ date: "28/04/2026" })}`;
    expect(() => parseWalletCsv(csv)).toThrow(ParseError);
  });
});
