"use client";

import Link from "next/link";
import { useState } from "react";
import { copy } from "@/lib/copy";
import { formatRangeShort } from "@/lib/format/date";
import { undoImportAction } from "@/server/actions/import";

type Props = {
  importId: string;
  count: number;
  range: { start: string; end: string };
};

export function Success({ importId, count, range }: Props) {
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
    <section className="px-6 pt-12 text-center">
      <h2 className="font-display text-3xl text-clay-900">
        {state === "undone" ? copy.import.undone : copy.import.successTitle}
      </h2>
      {state !== "undone" && (
        <p className="mt-2 font-mono text-sm text-clay-600">
          {copy.import.successSubtitle(count, formatRangeShort(range.start, range.end))}
        </p>
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
