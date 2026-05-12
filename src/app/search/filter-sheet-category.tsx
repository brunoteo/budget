"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tag } from "lucide-react";
import { copy } from "@/lib/copy";
import { Check } from "lucide-react";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type CategoryOption = { id: string; name: string };

type Props = {
  selected: string[];
  options: CategoryOption[];
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
};

export function FilterSheetCategory({ selected, options, basePath, searchParams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string[]>(selected);

  function toggle(id: string) {
    setLocal((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function apply() {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string" && k !== "cat" && k !== "offset") sp.set(k, v);
    }
    if (local.length) sp.set("cat", local.join(","));
    router.push(`${basePath}?${sp.toString()}`);
    setOpen(false);
  }

  const isDefault = selected.length === 0;
  const chipClass = isDefault
    ? "rounded-full border border-border px-3 py-1 text-xs text-text-muted"
    : "rounded-full border border-accent px-3 py-1 text-xs text-accent";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={chipClass}>
        <Tag className="mr-1 inline h-3 w-3" aria-hidden /> {copy.search.chipCategory}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{copy.search.chipCategory}</SheetTitle>
        </SheetHeader>
        <ul className="flex-1 divide-y divide-border-muted overflow-y-auto px-4">
          {options.map((c) => {
            const checked = local.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="flex h-12 w-full items-center justify-between gap-3 text-left text-sm"
                >
                  <span className="truncate">{c.name}</span>
                  {checked && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
        <SheetFooter>
          <Button onClick={apply} className="w-full">{copy.search.applyButton}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
