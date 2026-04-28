import { formatEur } from "@/lib/format/eur";

export function KpiCard({ label, primary, secondary }: { label: string; primary: number | string; secondary?: string }) {
  const value = typeof primary === "number" ? formatEur(primary) : primary;
  return (
    <div className="rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm">
      <div className="text-[0.65rem] uppercase tracking-wider text-clay-600">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-clay-900 sm:text-xl">{value}</div>
      {secondary && <div className="mt-1 text-xs text-clay-600">{secondary}</div>}
    </div>
  );
}
