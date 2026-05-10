"use client";
import Link from "next/link";
import { useState } from "react";
import { formatEur } from "@/lib/format/eur";
import { formatDate } from "@/lib/format/date";
import { copy } from "@/lib/copy";

type Tx = { id: string; occurredOn: string; amount: number; note: string | null };
type Props = {
  name: string;
  expected: number;
  actual: number;
  isFixed: boolean;
  overBudget: boolean;
  transactions: Tx[];
};

export function CategoryRow({ name, expected, actual, isFixed, overBudget, transactions }: Props) {
  const [open, setOpen] = useState(false);
  const fillPct = expected === 0 ? (actual > 0 ? 100 : 0) : Math.min(100, (actual / expected) * 100);
  const underBudget = !overBudget && !isFixed && expected > 0 && actual < expected;
  const fillClass = overBudget
    ? "bg-sienna-500"
    : actual === expected && expected > 0
    ? "bg-budget-amber-500"
    : "bg-sage-500";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-[44px] items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-text-primary">
              {name}
              {isFixed && (
                <span className="ml-2 rounded-sm bg-clay-200 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-clay-700">
                  {copy.dashboard.fixedBadge}
                </span>
              )}
              {overBudget && (
                <span className="ml-2 inline-block whitespace-nowrap rounded-sm bg-over-budget-bg px-1.5 py-0.5 text-[0.65rem] text-sienna-600">
                  +{formatEur(actual - expected)}
                </span>
              )}
              {underBudget && (
                <span className="ml-2 inline-block whitespace-nowrap rounded-sm bg-under-budget-bg px-1.5 py-0.5 text-[0.65rem] text-sage-600">
                  −{formatEur(expected - actual)}
                </span>
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap font-mono text-sm tabular-nums text-clay-700">
              {formatEur(actual)} <span className="text-clay-400">/ {formatEur(expected)}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-muted">
            <div className={`${fillClass} h-full rounded-full transition-[width] duration-200`} style={{ width: `${fillPct}%` }} />
          </div>
        </div>
        <span className="text-clay-400">{open ? "⌃" : "›"}</span>
      </button>
      {open && (
        <div className="border-t border-border-muted bg-clay-50 p-2 text-sm">
          {transactions.length === 0 ? (
            <div className="p-2 text-center text-text-muted">{copy.dashboard.noTransactions}</div>
          ) : (
            <ul className="divide-y divide-border-muted">
              {transactions.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/expenses/${t.id}/edit`}
                    className="flex min-h-11 items-center justify-between gap-2 p-2 transition-colors hover:bg-clay-100"
                  >
                    <span>
                      <span className="font-mono tabular-nums text-text-muted">{formatDate(t.occurredOn)}</span>
                      {t.note && <em className="ml-2 text-clay-800">{t.note}</em>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums">− {formatEur(t.amount)}</span>
                      <span className="text-clay-400" aria-hidden>›</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
