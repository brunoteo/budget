import { formatEur } from "@/lib/format/eur";
import type { YearRollupRow } from "@/lib/trends/types";

const NOISE_THRESHOLD = 0.02;

type Labels = {
  category: string;
  total: string;
  average: string;
  delta: string;
};

export function YearRollupTable({ rows, labels }: { rows: YearRollupRow[]; labels: Labels }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-muted text-left text-xs uppercase tracking-wider text-text-muted">
            <th className="px-3 py-2 font-medium">{labels.category}</th>
            <th className="px-3 py-2 text-right font-medium">{labels.total}</th>
            <th className="px-3 py-2 text-right font-medium">{labels.average}</th>
            <th className="px-3 py-2 text-right font-medium">{labels.delta}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            let deltaCell = "—";
            let deltaClass = "text-text-muted";
            if (r.deltaPercent !== null && Math.abs(r.deltaPercent) >= NOISE_THRESHOLD) {
              const pct = (r.deltaPercent * 100).toFixed(0);
              const sign = r.deltaPercent > 0 ? "+ " : "− ";
              deltaCell = `${sign}${Math.abs(Number(pct))}%`;
              deltaClass = r.deltaPercent > 0 ? "text-sienna-600" : "text-sage-600";
            }
            return (
              <tr key={r.key} className="border-b border-border-muted/50 last:border-b-0">
                <td className="px-3 py-2 text-text-primary">{r.displayName}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">{formatEur(r.totalSpent)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">{formatEur(r.averageSpent)}</td>
                <td className={`whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums ${deltaClass}`}>{deltaCell}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
