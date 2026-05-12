"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { copy } from "@/lib/copy";
import { Input } from "@/components/ui/input";

type Props = {
  initialQ: string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
};

export function SearchBar({ initialQ, basePath, searchParams }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQ);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (value === initialQ) return;
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(searchParams)) {
        if (typeof v === "string" && k !== "q" && k !== "offset") sp.set(k, v);
      }
      if (value) sp.set("q", value);
      router.push(`${basePath}?${sp.toString()}`);
    }, 250);
    return () => clearTimeout(handle);
  }, [value, initialQ, basePath, searchParams, router]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        strokeWidth={1.5}
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={copy.search.inputPlaceholder}
        className="pl-9"
        aria-label={copy.search.inputPlaceholder}
      />
    </div>
  );
}
