"use client";

import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { CategoryDrawer } from "./category-drawer";

export type RowState = {
  index: number;
  occurredOn: string;          // ISO
  occurredOnDisplay: string;   // "26/04"
  amount: number;
  walletCategory: string;
  note: string | null;
  cycleRange: { startDate: string; endDate: string };
  appCategoryName: string | null;
  isDuplicate: boolean;
  isUnmapped: boolean;
  included: boolean;
  categoryOptions: { id: string; name: string }[];
};

type Props = {
  state: RowState;
  onToggleInclude: () => void;
  onPickCategory: (name: string) => void;
};

export function Row({ state, onToggleInclude, onPickCategory }: Props) {
  return (
    <article
      data-row-index={state.index}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-no-toggle]")) return;
        onToggleInclude();
      }}
      className={[
        "relative grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-6 py-3 border-b border-border-muted",
        "min-h-[96px] cursor-pointer",
        state.isDuplicate ? "bg-clay-200" : "bg-background",
        state.isUnmapped ? "border-l-2 border-l-terra-500" : "",
      ].join(" ")}
    >
      <span className="font-mono text-sm text-clay-700">{state.occurredOnDisplay}</span>
      <span
        className={[
          "font-mono text-base font-medium tabular-nums text-clay-900 text-right",
          state.isDuplicate ? "line-through text-clay-500" : "",
        ].join(" ")}
      >
        {formatEur(state.amount)}
      </span>

      <div className="col-span-2 flex flex-wrap items-center gap-x-2 text-xs uppercase tracking-wide text-clay-600 font-sans">
        <span>{state.walletCategory}</span>
        {state.isDuplicate && <span className="text-clay-500">· {copy.import.duplicatedTag}</span>}
      </div>

      <div className="col-span-2" data-no-toggle>
        <span className="mr-2 font-sans text-sm text-clay-400">→</span>
        <CategoryDrawer
          trigger={
            <button
              type="button"
              className={[
                "h-11 min-w-[12rem] rounded-md border border-border bg-surface px-3 text-left",
                "font-sans text-sm",
                state.isUnmapped ? "text-terra-500" : "text-clay-900",
              ].join(" ")}
            >
              {state.appCategoryName ?? copy.import.unmappedPlaceholder}
            </button>
          }
          cycleRange={state.cycleRange}
          options={state.categoryOptions}
          onSelect={(name) => onPickCategory(name)}
        />
      </div>

      <p className="col-span-1 line-clamp-2 font-sans italic text-sm text-clay-700">
        {state.note ?? ""}
      </p>
      <span
        aria-hidden
        className={[
          "h-6 w-6 self-center justify-self-end border-2 rounded-sm",
          state.included ? "bg-terra-500 border-terra-500" : "border-clay-400",
        ].join(" ")}
      />
    </article>
  );
}
