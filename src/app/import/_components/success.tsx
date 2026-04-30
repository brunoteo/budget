"use client";

import Link from "next/link";
import { useState } from "react";
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { formatRangeShort } from "@/lib/format/date";
import { undoImportAction } from "@/server/actions/import";
import type { CategoryRecap } from "./staging-host";

type Props = {
  importId: string;
  count: number;
  range: { start: string; end: string };
  total: number;
  recap: CategoryRecap[];
};

export function Success({ importId, count, range, total, recap }: Props) {
  const [state, setState] = useState<"idle" | "pending" | "undone" | "error">("idle");

  async function handleUndo() {
    setState("pending");
    const result = await undoImportAction({ importId });
    if ("error" in result) {
      setState("error");
      return;
    }
    setState("undone");
  }

  return (
    <section className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="text-center">
        <h2 className="font-display text-3xl text-clay-900">
          {state === "undone" ? copy.import.undone : copy.import.successTitle}
        </h2>
        {state !== "undone" && (
          <p className="mt-2 font-mono text-sm text-clay-600">
            {copy.import.successSubtitle(
              count,
              formatRangeShort(range.start, range.end),
              formatEur(total),
            )}
          </p>
        )}
      </div>

      {state !== "undone" && recap.length > 0 && (
        <div className="mt-8">
          <h3 className="font-sans text-xs uppercase tracking-wider text-clay-600">
            {copy.import.recapHeading}
          </h3>
          <ul className="mt-2 divide-y divide-border-muted rounded-xl border border-border-muted bg-surface">
            {recap.map((r) => (
              <li
                key={r.appCategoryName}
                className="flex items-baseline justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-sm text-clay-900">{r.appCategoryName}</p>
                  <p className="font-mono text-xs text-clay-500">{copy.import.recapItem(r.count)}</p>
                </div>
                <span className="font-mono text-base tabular-nums text-clay-900">
                  {formatEur(r.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        {state !== "undone" && (
          <button
            type="button"
            disabled={state === "pending"}
            onClick={handleUndo}
            className="h-12 rounded-md border border-terra-500 px-6 font-sans text-base text-terra-500 disabled:opacity-60"
          >
            {copy.import.undo}
          </button>
        )}
        <Link
          href="/"
          className="h-12 inline-flex items-center justify-center px-6 font-sans text-base text-clay-700 underline-offset-4 hover:underline"
        >
          {copy.import.goDashboard}
        </Link>
      </div>
    </section>
  );
}
