import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";

type Props = {
  percentConsumed: number;
  cycleProgress: number;
  paceDelta: number;
  forecast?: { total: number; deltaVsBudget: number; hasData: boolean } | null;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => `${clamp(n) * 100}%`;

export function PacingBar({ percentConsumed, cycleProgress, paceDelta, forecast }: Props) {
  const under = paceDelta <= 0;
  const status = under ? copy.dashboard.pacingUnder : copy.dashboard.pacingOver;
  const pillClass = under
    ? "bg-under-budget-bg text-sage-600 ring-1 ring-inset ring-under-budget-border"
    : "bg-over-budget-bg text-sienna-600 ring-1 ring-inset ring-over-budget-border";
  const spendBarClass = under ? "bg-sage-500" : "bg-sienna-500";
  const cyclePct = clamp(cycleProgress);

  return (
    <section
      className="space-y-4 rounded-xl border border-accent/20 bg-surface p-5 shadow-md"
      role="group"
      aria-label={copy.dashboard.pacingTitle}
    >
      <div className="flex items-center justify-between gap-3">
        <strong className="font-display text-xl text-text-primary">
          {copy.dashboard.pacingTitle}
        </strong>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wider ${pillClass}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between font-mono text-[0.7rem] tabular-nums text-text-muted">
            <span>{copy.dashboard.pacingTime}</span>
            <span>{(cyclePct * 100).toFixed(0)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-border-muted"
            role="progressbar"
            aria-label={copy.dashboard.pacingTime}
            aria-valuenow={Math.round(cyclePct * 100)}
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
          <div className="relative">
            <div
              className="h-2.5 overflow-hidden rounded-full bg-border-muted"
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
            <div
              className="pointer-events-none absolute -top-1 h-[1.125rem] w-0.5 -translate-x-1/2 rounded-full bg-clay-900/80"
              style={{ left: pct(cycleProgress) }}
              aria-hidden
              title={copy.dashboard.pacingTime}
            />
          </div>
        </div>
      </div>

      {forecast && (
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <span className="text-sm text-text-muted">{copy.dashboard.forecastLabel}</span>
          <span className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-display text-lg text-text-primary tabular-nums">
              {formatEur(forecast.total)}
            </span>
            {forecast.hasData && Math.abs(forecast.deltaVsBudget) >= 0.005 && (
              <span
                className={`text-xs font-medium tabular-nums ${
                  forecast.deltaVsBudget > 0 ? "text-sienna-600" : "text-sage-600"
                }`}
              >
                {forecast.deltaVsBudget > 0
                  ? copy.dashboard.forecastDeltaOver(formatEur(forecast.deltaVsBudget))
                  : copy.dashboard.forecastDeltaUnder(formatEur(Math.abs(forecast.deltaVsBudget)))}
              </span>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
