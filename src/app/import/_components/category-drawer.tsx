"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { copy } from "@/lib/copy";
import { formatRangeShort } from "@/lib/format/date";

type Props = {
  trigger: React.ReactNode;
  cycleRange: { startDate: string; endDate: string };
  options: { id: string; name: string }[];
  onSelect: (name: string) => void;
};

export function CategoryDrawer({ trigger, cycleRange, options, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-display text-base text-clay-700">
            {copy.import.drawerCycleHeader(formatRangeShort(cycleRange.startDate, cycleRange.endDate))}
          </DrawerTitle>
        </DrawerHeader>
        <ul className="max-h-[60vh] overflow-y-auto pb-6">
          {options.map((o) => (
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
          {options.length === 0 && (
            <li className="px-6 py-4 font-sans text-sm text-clay-500">Nessuna categoria nel ciclo.</li>
          )}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
