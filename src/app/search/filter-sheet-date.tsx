"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { copy } from "@/lib/copy";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  from: string;
  to: string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
};

function shiftDays(today: string, delta: number): string {
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function FilterSheetDate({ from, to, basePath, searchParams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const today = new Date().toISOString().slice(0, 10);

  function apply(nextFrom: string, nextTo: string) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string" && k !== "from" && k !== "to" && k !== "offset") {
        sp.set(k, v);
      }
    }
    sp.set("from", nextFrom);
    sp.set("to", nextTo);
    router.push(`${basePath}?${sp.toString()}`);
    setOpen(false);
  }

  const isDefault =
    from === shiftDays(today, -30) && to === today;
  const chipClass = isDefault
    ? "rounded-full border border-border px-3 py-1 text-xs text-text-muted"
    : "rounded-full border border-accent px-3 py-1 text-xs text-accent";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={chipClass}>
        <Calendar className="mr-1 inline h-3 w-3" aria-hidden /> {copy.search.chipDate}
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{copy.search.chipDate}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-2">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => apply(shiftDays(today, -30), today)}>
              {copy.search.rangePresetLast30}
            </Button>
            <Button variant="outline" size="sm" onClick={() => apply(shiftDays(today, -60), today)}>
              {copy.search.rangePresetLast60}
            </Button>
            <Button variant="outline" size="sm" onClick={() => apply(shiftDays(today, -90), today)}>
              {copy.search.rangePresetLast90}
            </Button>
          </div>
          <div className="space-y-2">
            <label className="block text-sm">{copy.search.rangePresetCustom}</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
              />
              <Input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
              />
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button onClick={() => apply(localFrom, localTo)} className="w-full">
            {copy.search.applyButton}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
