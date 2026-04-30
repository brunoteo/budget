import { copy } from "@/lib/copy";

type Props = { percentConsumed: number; cycleProgress: number; paceDelta: number };

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => `${clamp(n) * 100}%`;

export function PacingBar({ percentConsumed, cycleProgress, paceDelta }: Props) {
  const under = paceDelta <= 0;
  const status = under ? copy.dashboard.pacingUnder : copy.dashboard.pacingOver;
  const statusClass = under ? "text-sage-600" : "text-sienna-600";
  const spendBarClass = under ? "bg-sage-500" : "bg-sienna-500";

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      role="group"
      aria-label={copy.dashboard.pacingTitle}
    >
      <div className="flex items-baseline justify-between">
        <strong className="font-display text-lg text-text-primary">
          {copy.dashboard.pacingTitle}
        </strong>
        <span className={`text-sm ${statusClass}`}>{status}</span>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between font-mono text-[0.7rem] tabular-nums text-text-muted">
            <span>{copy.dashboard.pacingTime}</span>
            <span>{(clamp(cycleProgress) * 100).toFixed(0)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-border-muted"
            role="progressbar"
            aria-label={copy.dashboard.pacingTime}
            aria-valuenow={Math.round(clamp(cycleProgress) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-clay-500 transition-[width] duration-500"
              style={{ width: pct(cycleProgress) }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between font-mono text-[0.7rem] tabular-nums text-text-muted">
            <span>{copy.dashboard.pacingExpense}</span>
            <span>{(clamp(percentConsumed) * 100).toFixed(1)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-border-muted"
            role="progressbar"
            aria-label={copy.dashboard.pacingExpense}
            aria-valuenow={Math.round(clamp(percentConsumed) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${spendBarClass}`}
              style={{ width: pct(percentConsumed) }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
