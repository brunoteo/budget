import { copy } from "@/lib/copy";

type Props = { included: number; duplicates: number; excluded: number };

export function SummaryHeader({ included, duplicates, excluded }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-border-muted bg-background/85 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="py-3">
        <p className="font-display text-4xl leading-none tabular-nums text-text-primary">{included}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-text-muted">{copy.import.summaryLabel}</p>
        <p className="mt-1 font-mono text-xs text-text-muted">{copy.import.summaryStats(duplicates, excluded)}</p>
      </div>
    </div>
  );
}
