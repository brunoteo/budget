"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tag } from "lucide-react";
import { copy } from "@/lib/copy";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
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
      <SheetContent side="bottom" className="max-h-[80vh] space-y-3 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{copy.search.chipCategory}</SheetTitle>
        </SheetHeader>
        <ul className="divide-y divide-border-muted">
          {options.map((c) => {
            const checked = local.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="flex h-12 w-full items-center justify-between px-2 text-left text-sm"
                >
                  <span>{c.name}</span>
                  <span aria-hidden>{checked ? "✓" : ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="pt-2">
          <Button onClick={apply} className="w-full">{copy.search.applyButton}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
