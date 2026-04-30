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
  onCreateCategory: (name: string) => Promise<void>;
};

export function Row({ state, onToggleInclude, onPickCategory, onCreateCategory }: Props) {
  return (
    <article
      data-row-index={state.index}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (!e.currentTarget.contains(t)) return;
        if (t.closest("[data-no-toggle]")) return;
        onToggleInclude();
      }}
      className={[
        "relative grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3",
        "min-h-[96px] cursor-pointer border-b border-border-muted last:border-b-0 transition-colors",
        state.isDuplicate ? "bg-clay-50" : "bg-surface hover:bg-clay-50",
        state.isUnmapped ? "border-l-2 border-l-accent" : "",
      ].join(" ")}
    >
      <span className="font-mono text-sm text-text-muted">{state.occurredOnDisplay}</span>
      <span
        className={[
          "text-right font-mono text-base font-medium tabular-nums text-text-primary",
          state.isDuplicate ? "text-text-muted line-through" : "",
        ].join(" ")}
      >
        {formatEur(state.amount)}
      </span>

      <div className="col-span-2 flex flex-wrap items-center gap-x-2 text-xs uppercase tracking-wide text-text-muted">
        <span>{state.walletCategory}</span>
        {state.isDuplicate && <span>· {copy.import.duplicatedTag}</span>}
      </div>

      <div className="col-span-2" data-no-toggle>
        <span className="mr-2 text-sm text-text-muted">→</span>
        <CategoryDrawer
          trigger={
            <button
              type="button"
              className={[
                "h-11 min-w-[12rem] rounded-md border border-border bg-surface px-3 text-left text-sm",
                state.isUnmapped ? "text-accent" : "text-text-primary",
              ].join(" ")}
            >
              {state.appCategoryName ?? copy.import.unmappedPlaceholder}
            </button>
          }
          cycleRange={state.cycleRange}
          options={state.categoryOptions}
          onSelect={(name) => onPickCategory(name)}
          onCreate={onCreateCategory}
        />
      </div>

      <p className="col-span-1 line-clamp-2 text-sm italic text-text-muted">
        {state.note ?? ""}
      </p>
      <span
        aria-hidden
        className={[
          "h-6 w-6 self-center justify-self-end rounded-sm border-2",
          state.included ? "border-accent bg-accent" : "border-border",
        ].join(" ")}
      />
    </article>
  );
}
