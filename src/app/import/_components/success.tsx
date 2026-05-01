"use client";

import Link from "next/link";
import { useState } from "react";
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { formatRangeShort } from "@/lib/format/date";
import { undoImportAction } from "@/server/actions/import";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <section className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-2xl text-text-primary">
          {state === "undone" ? copy.import.undone : copy.import.successTitle}
        </h2>
        {state !== "undone" && (
          <p className="mt-2 font-mono text-sm text-text-muted">
            {copy.import.successSubtitle(
              count,
              formatRangeShort(range.start, range.end),
              formatEur(total),
            )}
          </p>
        )}
      </div>

      {state !== "undone" && recap.length > 0 && (
        <div className="space-y-2">
          <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
            {copy.import.recapHeading}
          </h3>
          <ul className="divide-y divide-border-muted overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            {recap.map((r) => (
              <li
                key={r.appCategoryName}
                className="flex items-baseline justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{r.appCategoryName}</p>
                  <p className="font-mono text-xs text-text-muted">{copy.import.recapItem(r.count)}</p>
                </div>
                <span className="font-mono text-base tabular-nums text-text-primary">
                  {formatEur(r.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col items-stretch gap-2">
        <Link href="/" className={buttonVariants({ variant: "default", size: "lg" })}>
          {copy.import.goDashboard}
        </Link>
        {state !== "undone" && (
          <Button
            type="button"
            variant="ghost"
            size="default"
            disabled={state === "pending"}
            onClick={handleUndo}
            className="text-text-muted"
          >
            {copy.import.undo}
          </Button>
        )}
      </div>
    </section>
  );
}
