import { copy } from "@/lib/copy";

type Props = { percentConsumed: number; cycleProgress: number; paceDelta: number };

export function PacingBar({ percentConsumed, cycleProgress, paceDelta }: Props) {
  const pct = (n: number) => `${Math.max(0, Math.min(1, n)) * 100}%`;
  const under = paceDelta <= 0;
  const status = under ? copy.dashboard.pacingUnder : copy.dashboard.pacingOver;
  const statusClass = under ? "text-sage-600" : "text-sienna-600";
  return (
    <section className="rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <strong className="font-display text-clay-900">{copy.dashboard.pacingTitle}</strong>
        <span className={statusClass}>{status}</span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded bg-clay-200">
        <div
          className={`absolute left-0 top-0 h-full transition-[width] duration-200 ${under ? "bg-sage-500" : "bg-sienna-500"}`}
          style={{ width: pct(percentConsumed) }}
        />
        <div
          className="absolute top-[-2px] h-3 w-0.5 bg-clay-700"
          style={{ left: pct(cycleProgress) }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.7rem] tabular-nums text-clay-600">
        <span>{copy.dashboard.pacingExpense} {(percentConsumed * 100).toFixed(1)}%</span>
        <span>{copy.dashboard.pacingTime} {(cycleProgress * 100).toFixed(0)}%</span>
      </div>
    </section>
  );
}
