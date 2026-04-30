"use client";

import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";

type Props = {
  unmappedCount: number;
  includedCount: number;
  total: number;
  pending: boolean;
  onCommit: () => void;
};

export function CommitFooter({ unmappedCount, includedCount, total, pending, onCommit }: Props) {
  let label: string;
  let disabled = false;
  if (pending) {
    label = copy.import.commitPending;
    disabled = true;
  } else if (unmappedCount > 0) {
    label = copy.import.commitUnmapped(unmappedCount);
    disabled = true;
  } else if (includedCount === 0) {
    label = copy.import.commitNoneSelected;
    disabled = true;
  } else {
    label = copy.import.commitEnabled(includedCount, formatEur(total));
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <button
        type="button"
        className={[
          "h-12 w-full px-6 font-sans text-base",
          disabled ? "bg-terra-500/60 text-white" : "bg-terra-500 text-white",
        ].join(" ")}
        disabled={disabled}
        onClick={onCommit}
      >
        {label}
      </button>
    </div>
  );
}
