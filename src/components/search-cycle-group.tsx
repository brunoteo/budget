import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleGroup } from "@/lib/search/types";
import { SearchResultRow } from "@/components/search-result-row";

type Props = {
  group: CycleGroup;
  returnTo: string;
};

export function SearchCycleGroup({ group, returnTo }: Props) {
  const range = cycleLabel({ start: group.cycleStartDate, end: group.cycleEndDate });
  return (
    <section>
      <h2 className="bg-clay-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {copy.search.cycleGroupTotal(range, formatEur(group.total))}
      </h2>
      <div className="bg-surface">
        {group.rows.map((r) => (
          <SearchResultRow key={r.id} row={r} returnTo={returnTo} />
        ))}
      </div>
    </section>
  );
}
