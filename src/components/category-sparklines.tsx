import { formatEur } from "@/lib/format/eur";
import type { CategorySeries } from "@/lib/trends/types";

const W = 60;
const H = 18;

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? W / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = H - (v / max) * (H - 2) - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-5 w-full"
      aria-hidden
    >
      <polyline points={points} fill="none" stroke="oklch(0.581 0.133 38)" strokeWidth="1.2" />
    </svg>
  );
}

export function CategorySparklines({ series, mediaLabel }: { series: CategorySeries[]; mediaLabel: string }) {
  if (series.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {series.map((s) => (
        <div key={s.key} className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <div className="truncate text-sm font-medium text-text-primary">{s.displayName}</div>
          <div className="mt-0.5 text-xs text-text-muted">
            {mediaLabel} {formatEur(s.averageSpent)}
          </div>
          <div className="mt-2">
            <Sparkline values={s.points.map((p) => p.spent)} />
          </div>
        </div>
      ))}
    </div>
  );
}
