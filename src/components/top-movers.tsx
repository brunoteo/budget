import { formatEur } from "@/lib/format/eur";
import type { TopMover } from "@/lib/trends/types";

export function TopMovers({ movers }: { movers: TopMover[] }) {
  if (movers.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <ul className="divide-y divide-dashed divide-border-muted">
        {movers.map((m) => {
          const positive = m.delta >= 0;
          const sign = positive ? "+" : "−";
          return (
            <li key={m.key} className="flex items-baseline justify-between px-4 py-3">
              <span className="text-sm font-medium text-text-primary">{m.displayName}</span>
              <span
                className={`font-mono text-sm tabular-nums ${
                  positive ? "text-sienna-600" : "text-sage-600"
                }`}
              >
                {sign} {formatEur(Math.abs(m.delta))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
