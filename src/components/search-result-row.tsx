import Link from "next/link";
import { formatEur } from "@/lib/format/eur";
import { formatDate } from "@/lib/format/date";
import type { SearchRow } from "@/lib/search/types";

type Props = {
  row: SearchRow;
  returnTo: string;
};

export function SearchResultRow({ row, returnTo }: Props) {
  const href = `/expenses/${row.id}/edit?return=${encodeURIComponent(returnTo)}`;
  const title = row.note?.trim() || row.categoryName;
  return (
    <Link
      href={href}
      className="flex h-14 items-center justify-between gap-3 border-b border-border-muted px-4 active:bg-clay-200"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-text-primary">{title}</div>
        <div className="truncate text-xs text-text-muted">
          {row.categoryName} · {formatDate(row.occurredOn)}
        </div>
      </div>
      <div className="font-mono tabular-nums text-sm font-semibold text-text-primary">
        {formatEur(row.amount)}
      </div>
    </Link>
  );
}
