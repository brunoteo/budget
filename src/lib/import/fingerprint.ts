export type FingerprintInput = {
  occurredOn: string;
  amount: number;
  note: string | null | undefined;
};

export async function fingerprint(input: FingerprintInput): Promise<string> {
  const amountCents = Math.round(Math.abs(input.amount) * 100);
  const normalizedNote = (input.note ?? "").toLowerCase().trim();
  const payload = `${input.occurredOn}|${amountCents}|${normalizedNote}`;
  const bytes = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
