"use client";
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
  const fillClass = overBudget
    ? "bg-sienna-500"
    : actual === expected && expected > 0
    ? "bg-budget-amber-500"
    : "bg-sage-500";

  return (
    <div className="overflow-hidden rounded-xl border border-clay-200 bg-clay-50 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-[44px] items-center gap-3 p-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-clay-900">
              {name}
              {isFixed && (
                <span className="ml-2 rounded bg-clay-200 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-clay-700">
                  {copy.dashboard.fixedBadge}
                </span>
              )}
              {overBudget && (
                <span className="ml-2 rounded bg-sienna-500/15 px-1.5 py-0.5 text-[0.65rem] text-sienna-600">
                  +{formatEur(actual - expected)}
                </span>
              )}
            </span>
            <span className="font-mono text-sm tabular-nums text-clay-700">
              {formatEur(actual)} <span className="text-clay-400">/ {formatEur(expected)}</span>
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-clay-200">
            <div className={`${fillClass} h-full transition-[width] duration-200`} style={{ width: `${fillPct}%` }} />
          </div>
        </div>
        <span className="text-clay-400">{open ? "⌃" : "›"}</span>
      </button>
      {open && (
        <div className="border-t border-clay-200 bg-clay-100 p-2 text-sm">
          {transactions.length === 0 ? (
            <div className="p-2 text-center text-clay-600">{copy.dashboard.noTransactions}</div>
          ) : (
            <ul className="divide-y divide-clay-200">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 p-2">
                  <span>
                    <span className="font-mono tabular-nums text-clay-600">{formatDate(t.occurredOn)}</span>
                    {t.note && <em className="ml-2 text-clay-800">{t.note}</em>}
                  </span>
                  <span className="font-mono tabular-nums">− {formatEur(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
