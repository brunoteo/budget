import { copy } from "@/lib/copy";

type Props = { included: number; duplicates: number; excluded: number };

export function SummaryHeader({ included, duplicates, excluded }: Props) {
  return (
    <div
      className="sticky top-0 z-10 backdrop-blur-sm"
      style={{ background: "color-mix(in oklch, var(--color-background) 85%, transparent)" }}
    >
      <div className="px-6 py-4">
        <p className="font-display text-5xl leading-none text-clay-900 tabular-nums">{included}</p>
        <p className="mt-1 font-sans text-xs uppercase tracking-wider text-clay-600">{copy.import.summaryLabel}</p>
        <p className="mt-1 font-mono text-xs text-clay-500">{copy.import.summaryStats(duplicates, excluded)}</p>
      </div>
    </div>
  );
}
