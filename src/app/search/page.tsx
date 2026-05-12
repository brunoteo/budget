import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { BackLink } from "@/components/back-link";
import { parseFilters } from "@/lib/search/parse-params";
import { serializeFilters } from "@/lib/search/serialize-params";
import { groupByCycle } from "@/lib/search/group-by-cycle";
import { SEARCH_LIMIT } from "@/lib/search/types";
import { getSearchResults, getAllCategoryOptions } from "@/server/queries/search";
import { SearchBar } from "./search-bar";
import { FilterSheetDate } from "./filter-sheet-date";
import { FilterSheetAmount } from "./filter-sheet-amount";
import { FilterSheetCategory } from "./filter-sheet-category";
import { SearchCycleGroup } from "@/components/search-cycle-group";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") usp.set(k, v);
  }
  const filters = parseFilters(usp, today);

  const [results, allCategories] = await Promise.all([
    getSearchResults(filters),
    getAllCategoryOptions(),
  ]);
  const groups = groupByCycle(results.rows);
  const returnTo = `/search?${serializeFilters(filters, today)}`;
  const hasMore = filters.offset + SEARCH_LIMIT < results.totalCount;
  const nextOffset = filters.offset + SEARCH_LIMIT;

  function nextPageHref(): string {
    const next = { ...filters, offset: nextOffset };
    const qs = serializeFilters(next, today);
    return qs ? `/search?${qs}` : "/search";
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-0 p-0 sm:p-6">
      <div className="flex items-center gap-2 px-4 pt-4 sm:px-0 sm:pt-0">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">
          {copy.search.pageTitle}
        </h1>
      </div>

      <div className="sticky top-0 z-10 space-y-2 border-b border-border-muted bg-background/95 p-4 backdrop-blur sm:rounded-md sm:border sm:p-3">
        <SearchBar initialQ={filters.q} basePath="/search" searchParams={sp} />
        <div className="flex flex-wrap gap-2">
          <FilterSheetDate
            from={filters.from}
            to={filters.to}
            basePath="/search"
            searchParams={sp}
          />
          <FilterSheetAmount
            min={filters.min}
            max={filters.max}
            basePath="/search"
            searchParams={sp}
          />
          <FilterSheetCategory
            selected={filters.categoryIds}
            options={allCategories}
            basePath="/search"
            searchParams={sp}
          />
        </div>
        <p className="text-xs text-text-muted">
          {results.totalCount === 0
            ? copy.search.counterZero
            : copy.search.counterTemplate(
                results.totalCount,
                formatEur(results.totalAmount),
              )}
        </p>
      </div>

      {results.rows.length === 0 ? (
        <div className="space-y-3 p-6 text-center text-sm text-text-muted">
          <p>{copy.search.emptyState}</p>
          <Link href="/search" className="text-accent underline">
            {copy.search.clearButton}
          </Link>
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <SearchCycleGroup key={g.cycleId} group={g} returnTo={returnTo} />
          ))}
          {hasMore && (
            <div className="p-4 text-center">
              <Link
                href={nextPageHref()}
                className="inline-block rounded-md border border-accent px-4 py-2 text-sm text-accent"
              >
                {copy.search.loadMore}
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
