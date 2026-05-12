"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Euro } from "lucide-react";
import { copy } from "@/lib/copy";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  min: number | null;
  max: number | null;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
};

export function FilterSheetAmount({ min, max, basePath, searchParams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(min === null ? "" : String(min));
  const [localMax, setLocalMax] = useState(max === null ? "" : String(max));

  function apply() {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string" && k !== "min" && k !== "max" && k !== "offset") {
        sp.set(k, v);
      }
    }
    if (localMin) sp.set("min", localMin);
    if (localMax) sp.set("max", localMax);
    router.push(`${basePath}?${sp.toString()}`);
    setOpen(false);
  }

  const isDefault = min === null && max === null;
  const chipClass = isDefault
    ? "rounded-full border border-border px-3 py-1 text-xs text-text-muted"
    : "rounded-full border border-accent px-3 py-1 text-xs text-accent";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={chipClass}>
        <Euro className="mr-1 inline h-3 w-3" aria-hidden /> {copy.search.chipAmount}
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{copy.search.chipAmount}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-2">
          <div className="space-y-2">
            <label className="block text-sm">{copy.search.amountMinLabel}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">{copy.search.amountMaxLabel}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={apply} className="w-full">{copy.search.applyButton}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
