import { formatEur } from "@/lib/format/eur";
import type { CategorySeries } from "@/lib/trends/types";

const W = 60;
const H = 18;

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? W / (values.length - 1) : 0;
  const coords = values.map((v, i) => {
    const x = i * stepX;
    const y = H - (v / max) * (H - 2) - 1;
    return { x, y };
  });
  const linePoints = coords.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;
  const areaPoints = `${first.x.toFixed(2)},${H} ${linePoints} ${last.x.toFixed(2)},${H}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-5 w-full text-accent"
      aria-hidden
    >
      <polygon points={areaPoints} fill="currentColor" fillOpacity="0.08" />
      <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
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
