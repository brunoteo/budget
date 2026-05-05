import { formatEur } from "@/lib/format/eur";

export function KpiCard({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: number | string;
  secondary?: string;
}) {
  const value = typeof primary === "number" ? formatEur(primary) : primary;
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="text-[0.65rem] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-2 whitespace-nowrap font-mono text-xl font-medium tabular-nums leading-none text-text-primary sm:text-2xl">
        {value}
      </div>
      {secondary && <div className="mt-2 text-xs text-text-muted">{secondary}</div>}
    </div>
  );
}
