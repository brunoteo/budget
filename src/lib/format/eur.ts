const formatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

export function formatEur(amount: number): string {
  // Intl produces "1.234,56 €"; we want "€ 1.234,56" / "-€ 1.234,56".
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const parts = formatter.formatToParts(abs);
  const number = parts
    .filter((p) => p.type !== "currency" && p.type !== "literal")
    .map((p) => p.value)
    .join("");
  return `${sign}€ ${number}`;
}
