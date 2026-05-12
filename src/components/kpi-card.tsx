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

export function KpiHero({
  label,
  value,
  secondary,
  tone = "neutral",
}: {
  label: string;
  value: number;
  secondary?: string;
  tone?: "neutral" | "under" | "over";
}) {
  const toneClass =
    tone === "under"
      ? "text-sage-600"
      : tone === "over"
      ? "text-sienna-600"
      : "text-accent";
  return (
    <div className="rounded-2xl border border-accent/15 bg-surface p-5 shadow-md sm:p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div
          className={`font-display text-4xl leading-none tabular-nums sm:text-5xl ${toneClass}`}
        >
          {formatEur(value)}
        </div>
        {secondary && (
          <div className="font-mono text-xs tabular-nums text-text-muted">
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}

export function KpiStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-3 sm:px-4">
      <div className="text-[0.6rem] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 whitespace-nowrap font-mono text-sm font-medium tabular-nums text-text-primary sm:text-base">
        {value}
      </div>
    </div>
  );
}
