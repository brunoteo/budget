"use client";

import { useMemo, useState } from "react";
import type { Prepared } from "@/server/actions/import";
import { commitImportAction } from "@/server/actions/import";
import { SummaryHeader } from "./summary-header";
import { Row, type RowState } from "./row";
import { CommitFooter } from "./commit-footer";
import { copy } from "@/lib/copy";
import { formatRangeShort } from "@/lib/format/date";

type Props = {
  prepared: Prepared;
  excludedCount: number;
  onCommitted: (importId: string, count: number, range: { start: string; end: string }) => void;
};

export function Staging({ prepared, excludedCount, onCommitted }: Props) {
  type Local = {
    appCategoryName: string | null;
    included: boolean;
  };
  const [locals, setLocals] = useState<Local[]>(() =>
    prepared.rows.map((r) => ({
      appCategoryName: r.resolved.kind === "mapping" ? r.resolved.appCategoryName : null,
      included: !r.isDuplicate,
    })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rowStates: RowState[] = useMemo(
    () =>
      prepared.rows.map((r, i): RowState => {
        const cycleStart = r.cycleRange.startDate;
        const opts = prepared.categoriesByCycle[cycleStart] ?? [];
        const local = locals[i]!;
        return {
          index: i,
          occurredOn: r.occurredOn,
          occurredOnDisplay: r.occurredOn.slice(8, 10) + "/" + r.occurredOn.slice(5, 7),
          amount: r.amount,
          walletCategory: r.walletCategory,
          note: r.note,
          cycleRange: r.cycleRange,
          appCategoryName: local.appCategoryName,
          isDuplicate: r.isDuplicate,
          isUnmapped: local.appCategoryName === null,
          included: local.included,
          categoryOptions: opts,
        };
      }),
    [prepared, locals],
  );

  function pickCategory(rowIndex: number, name: string) {
    const wallet = prepared.rows[rowIndex]!.walletCategory;
    setLocals((prev) =>
      prev.map((l, i) => {
        if (prepared.rows[i]!.walletCategory === wallet && l.appCategoryName === null) {
          return { ...l, appCategoryName: name };
        }
        if (i === rowIndex) return { ...l, appCategoryName: name };
        return l;
      }),
    );
  }

  function toggleInclude(rowIndex: number) {
    setLocals((prev) => prev.map((l, i) => (i === rowIndex ? { ...l, included: !l.included } : l)));
  }

  // group rows by cycleRange.startDate, preserving order
  const grouped = useMemo(() => {
    const groups: { startDate: string; endDate: string; indices: number[] }[] = [];
    for (let i = 0; i < rowStates.length; i++) {
      const r = rowStates[i]!;
      const last = groups[groups.length - 1];
      if (!last || last.startDate !== r.cycleRange.startDate) {
        groups.push({ startDate: r.cycleRange.startDate, endDate: r.cycleRange.endDate, indices: [i] });
      } else {
        last.indices.push(i);
      }
    }
    return groups;
  }, [rowStates]);

  const includedRows = rowStates.filter((r) => r.included);
  const unmappedIncluded = includedRows.filter((r) => r.isUnmapped).length;
  const total = includedRows.reduce((s, r) => s + r.amount, 0);
  const minDate = prepared.rows.reduce(
    (m, r) => (r.occurredOn < m ? r.occurredOn : m),
    prepared.rows[0]?.occurredOn ?? "",
  );
  const maxDate = prepared.rows.reduce(
    (m, r) => (r.occurredOn > m ? r.occurredOn : m),
    prepared.rows[0]?.occurredOn ?? "",
  );

  async function handleCommit() {
    setPending(true);
    setError(null);
    const rows = rowStates
      .filter((r) => r.included && r.appCategoryName)
      .map((r) => ({
        occurredOn: r.occurredOn,
        amount: r.amount,
        note: r.note,
        walletCategory: r.walletCategory,
        appCategoryName: r.appCategoryName!,
      }));

    // pendingMappings = the user-resolved (previously-unmapped) categories, deduped by walletCategory
    const pendingMap = new Map<string, string>();
    for (let i = 0; i < prepared.rows.length; i++) {
      const wasUnmapped = prepared.rows[i]!.resolved.kind === "unmapped";
      const local = locals[i]!;
      if (wasUnmapped && local.appCategoryName) {
        pendingMap.set(prepared.rows[i]!.walletCategory, local.appCategoryName);
      }
    }
    const pendingMappings = Array.from(pendingMap.entries()).map(([walletCategory, appCategoryName]) => ({
      walletCategory,
      appCategoryName,
    }));

    const result = await commitImportAction({ rows, pendingMappings });
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCommitted(result.importId, result.count, { start: minDate, end: maxDate });
  }

  return (
    <div className="pb-20">
      <p className="px-6 pt-2 font-display italic text-lg text-clay-700">
        {copy.import.subtitle(prepared.rows.length, formatRangeShort(minDate, maxDate))}
      </p>
      <SummaryHeader
        included={includedRows.length}
        duplicates={prepared.counts.duplicates}
        excluded={excludedCount}
      />
      {grouped.map((g, gi) => (
        <section key={g.startDate}>
          {grouped.length > 1 && gi > 0 && (
            <h2 className="border-b border-clay-300 px-6 py-3 font-display italic text-base text-clay-700">
              {copy.import.cyclePrev(formatRangeShort(g.startDate, g.endDate))}
            </h2>
          )}
          {g.indices.map((i) => (
            <Row
              key={i}
              state={rowStates[i]!}
              onToggleInclude={() => toggleInclude(i)}
              onPickCategory={(name) => pickCategory(i, name)}
            />
          ))}
        </section>
      ))}
      {error && <p className="mx-6 mt-4 font-sans text-sm text-sienna-600">{error}</p>}
      <CommitFooter
        unmappedCount={unmappedIncluded}
        includedCount={includedRows.length}
        total={total}
        pending={pending}
        onCommit={handleCommit}
      />
    </div>
  );
}
