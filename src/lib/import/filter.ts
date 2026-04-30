export type WalletRow = {
  category: string;
  amount: number; // signed as in the CSV; negative for Spese, positive for Entrate
  occurredOn: string; // ISO YYYY-MM-DD
  type: "Spese" | "Entrate";
  transfer: boolean;
  note: string | null;
  payee: string | null;
  account: string | null;
};

export type FilterCounts = { entrate: number; transfer: number; zero: number };

export type FilterResult = { kept: WalletRow[]; counts: FilterCounts };

export function filterRows(rows: WalletRow[]): FilterResult {
  const counts: FilterCounts = { entrate: 0, transfer: 0, zero: 0 };
  const kept: WalletRow[] = [];
  for (const row of rows) {
    if (row.type === "Entrate") {
      counts.entrate++;
      continue;
    }
    if (row.transfer === true) {
      counts.transfer++;
      continue;
    }
    if (row.amount === 0) {
      counts.zero++;
      continue;
    }
    kept.push(row);
  }
  return { kept, counts };
}
