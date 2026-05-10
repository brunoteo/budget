"use client";

import { useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { copy } from "@/lib/copy";
import { formatRangeShort } from "@/lib/format/date";
import { sortCategoriesByName } from "@/lib/category/sort";

type Props = {
  trigger: React.ReactNode;
  cycleRange: { startDate: string; endDate: string };
  options: { id: string; name: string }[];
  onSelect: (name: string) => void;
  onCreate?: (name: string) => Promise<void>;
};

export function CategoryDrawer({ trigger, cycleRange, options, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  const sortedOptions = useMemo(() => sortCategoriesByName(options), [options]);

  async function handleCreate() {
    if (!onCreate) return;
    const name = draft.trim();
    if (name.length === 0) return;
    setCreating(true);
    try {
      await onCreate(name);
      setDraft("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft("");
      }}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-display text-base text-clay-700">
            {copy.import.drawerCycleHeader(formatRangeShort(cycleRange.startDate, cycleRange.endDate))}
          </DrawerTitle>
        </DrawerHeader>
        <ul className="max-h-[50vh] overflow-y-auto">
          {sortedOptions.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="flex h-12 w-full items-center px-6 text-left font-sans text-clay-900 hover:bg-clay-200"
                onClick={() => {
                  onSelect(o.name);
                  setOpen(false);
                }}
              >
                {o.name}
              </button>
            </li>
          ))}
          {sortedOptions.length === 0 && (
            <li className="px-6 py-4 font-sans text-sm text-clay-500">Nessuna categoria nel ciclo.</li>
          )}
        </ul>
        {onCreate && (
          <div className="border-t border-border-muted px-6 py-4 flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
              placeholder={copy.import.createPlaceholder}
              maxLength={80}
              disabled={creating}
              className="h-11 flex-1 rounded-md border border-border bg-surface px-3 font-sans text-sm text-clay-900 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={creating || draft.trim().length === 0}
              onClick={handleCreate}
              className="h-11 rounded-md bg-terra-500 px-4 font-sans text-sm text-white disabled:opacity-60"
            >
              {creating ? copy.import.creating : copy.import.createButton}
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
