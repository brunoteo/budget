# Ricerca transazioni — design contract

**Status:** Draft (2026-05-12)
**Plan slot:** 6 (next after Plan 5 — forecast/trends)
**Theme:** Cross-cycle transaction search and filtering

## 1. Goal

Allow each user to search and filter their own expenses across every cycle from a single dedicated page. The current dashboard exposes transactions only inside the *current* cycle (tap-to-expand on a category) and the `/trends` page aggregates by cycle. Neither answers the recurring question: *"dove ho speso X negli ultimi mesi?"*.

The feature is read-only. It reuses the existing edit/delete forms by linking to `/expenses/[id]/edit` from each result row.

## 2. Non-goals

- Full-text ranking or "relevance" — results sort by `occurred_on DESC` only.
- Saved searches.
- CSV / PDF export of results.
- Search inside a single cycle (already covered by category expand on the dashboard).
- Editing or bulk-deleting from the search results (single-row edit goes through the existing `/expenses/[id]/edit` page).

## 3. User flow

1. User taps the kebab menu in `app-header.tsx` → "Ricerca".
2. `/search` opens with the default empty-state filters: text empty, date range = last 30 days, no amount cap, all categories.
3. The page renders all matching expenses, grouped by cycle, newest first, paginated 30 at a time.
4. The user changes the text input or any of the three filter chips. Each change updates the URL search params and triggers a fresh server render (server component).
5. The user taps a row → navigates to `/expenses/[id]/edit?return=/search?...`. After save/delete, the existing post-action redirect honors the `return` param and brings the user back to `/search` with the same filters intact.

## 4. UI contract

### Page layout (`/search`)

Mobile-first 375 px portrait, scaling up to desktop ≥ 1024 px (same breakpoints as dashboard).

```
┌────────────────────────────────────────┐
│ ← Ricerca                          ⋮  │  AppHeader (existing)
├────────────────────────────────────────┤
│ [ search input full width        ]    │  Sticky filter bar
│ [📅 ultimi 30 gg ▾] [€ ▾] [🏷 ▾]      │  3 chip triggers
│ 42 risultati · totale € 1.847,32      │  Counter
├────────────────────────────────────────┤
│ CICLO 27 APR – 26 MAG · € 1.234,50    │  Cycle group header
│ ─ Esselunga via Roma   Spesa  12/05  €67,40 │
│ ─ Benzina Eni          Auto   10/05  €50,00 │
│ ─ ...                                          │
├────────────────────────────────────────┤
│ CICLO 27 MAR – 26 APR · € 612,82      │
│ ─ ...                                          │
├────────────────────────────────────────┤
│         [ Carica altri 30 ]            │
└────────────────────────────────────────┘
```

### Components

| Element | Type | Responsibility |
|---------|------|----------------|
| `app/search/page.tsx` | Server | Read `searchParams`, call `getSearchResults`, render |
| `app/search/search-bar.tsx` | Client | Text input (debounced submit, 250 ms) + chip trigger buttons |
| `app/search/filter-sheet-date.tsx` | Client | Bottom sheet with date-range presets (ultimi 30/60/90 gg, ciclo corrente, custom) + two date inputs |
| `app/search/filter-sheet-amount.tsx` | Client | Bottom sheet with min and max amount inputs |
| `app/search/filter-sheet-category.tsx` | Client | Bottom sheet, multi-select category list (loaded server-side, passed as prop) |
| `components/search-result-row.tsx` | Presentational | Single row: category name + date + amount + truncated note. Whole row is a `Link` to edit page |
| `components/search-cycle-group.tsx` | Presentational | Cycle header (range + total) + list of rows |

`<Sheet>` is the existing shadcn primitive used elsewhere in the app (e.g., expense edit on dashboard).

### Header menu

Add a third entry "Ricerca" to the kebab menu in `src/components/app-header.tsx`, positioned above "Andamento". Use the `Search` icon from `lucide-react`. Italian copy lives in `src/lib/copy.ts` under a new `search` namespace (label, page title, empty-state message, "carica altri", chip labels, counter format).

### URL state

All filters live in the query string so the back button works and a URL is shareable between the two users.

```
/search?q=esselunga&from=2026-04-12&to=2026-05-12&min=10&max=200&cat=uuid1,uuid2&offset=30
```

| Param  | Type        | Default                |
|--------|-------------|------------------------|
| `q`    | string      | empty                  |
| `from` | YYYY-MM-DD  | today − 30 days        |
| `to`   | YYYY-MM-DD  | today                  |
| `min`  | number      | unset                  |
| `max`  | number      | unset                  |
| `cat`  | csv of uuid | unset (all categories) |
| `offset` | number    | 0                      |

`limit` is fixed at 30 (constant in the search lib, not user-tunable).

## 5. Pure libraries

```
src/lib/search/
  parse-params.ts        # URLSearchParams → Filters (Zod schema)
  serialize-params.ts    # Filters → URLSearchParams
  group-by-cycle.ts      # rows → [{ cycle, total, rows }]
```

Each is unit-tested with Vitest. They import nothing from `next`, `react`, or `@supabase/*`.

`Filters` type:

```ts
type Filters = {
  q: string;
  from: string;     // YYYY-MM-DD
  to: string;       // YYYY-MM-DD
  min: number | null;
  max: number | null;
  categoryIds: string[];
  offset: number;
};
```

Zod schema enforces:

- `q` length ≤ 100
- `from` ≤ `to`
- `min` ≥ 0 if set, `max` ≥ `min` if both set
- `offset` ≥ 0, multiple of 30
- `categoryIds` all valid UUID strings, max 50 entries

Invalid params silently fall back to defaults (no error UI — search page must always render).

## 6. Server query

`src/server/queries/search.ts`:

```ts
export type SearchRow = {
  id: string;
  amount: number;
  occurredOn: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  cycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
};

export type SearchResult = {
  rows: SearchRow[];
  totalCount: number;
  totalAmount: number;
};

export async function getSearchResults(filters: Filters): Promise<SearchResult>;
```

Implementation (build chain, then await):

```ts
let q = supabase
  .from("expenses")
  .select(
    "id, amount, occurred_on, note, category_id, cycle_id, " +
    "cycles!inner(start_date, end_date), categories!inner(name)",
    { count: "exact" }
  )
  .gte("occurred_on", filters.from)
  .lte("occurred_on", filters.to);

if (filters.min != null) q = q.gte("amount", filters.min);
if (filters.max != null) q = q.lte("amount", filters.max);
if (filters.categoryIds.length) q = q.in("category_id", filters.categoryIds);
if (filters.q) {
  const pat = `%${escape(filters.q)}%`;
  q = q.or(`note.ilike.${pat},categories.name.ilike.${pat}`);
}

const { data, count, error } = await q
  .order("occurred_on", { ascending: false })
  .range(filters.offset, filters.offset + LIMIT - 1);
```

`totalAmount`: second query with the same filter chain but `.select("amount.sum()")` aggregate — single round trip, no client-side sum.

**`.or()` across joined tables** — PostgREST supports `categories.name.ilike.%x%` inside `.or()` only when the joined relation appears in the embedded `select`. The `categories!inner(name)` embed in this query satisfies that. If a future Supabase JS upgrade breaks this syntax, fallback is two parallel queries (one filtered by `note`, one filtered via category id list pre-resolved by name) merged + deduped server-side.

RLS on `expenses` already scopes by `cycles.user_id = auth.uid()` (see `supabase/migrations/0004_expenses.sql`). The search query uses the request-scoped Supabase client — no service-role.

### Text-search semantics

- `ilike '%foo%'` is case-insensitive but **not** accent-insensitive.
- The matched columns are `expenses.note` (free text typed by user) and `categories.name` (e.g. "Caffè", "Spesa").
- Trade-off: `ilike '%foo%'` cannot use a b-tree index. Migration `0009` adds a `pg_trgm` GIN index on `coalesce(note, '')`; the `gin_trgm_ops` operator class supports both `LIKE` and `ILIKE` and the planner picks the index automatically for patterns of length ≥ 3. With ~5 k expenses per user (2 years × 200/mo) the sequential fallback is also acceptable; the index pre-empts the cliff at higher volumes.

### Escape rule

`escape(s)` replaces `%`, `_`, `\` with their literal-escaped form to prevent users typing wildcards. Implemented as a 4-line helper inside `search.ts`.

## 7. Schema changes

`supabase/migrations/0009_search_indexes.sql`:

```sql
create extension if not exists pg_trgm;

create index expenses_note_trgm_idx
  on public.expenses
  using gin (coalesce(note, '') gin_trgm_ops);
```

No new tables, no new columns, no RLS changes.

The index supports case-insensitive trigram search on `note`. Accent-insensitive matching is **out of scope for this plan** — it would require an `unaccent` wrapper marked `IMMUTABLE`, which Supabase does not ship by default; deferred to a future spec when query volume warrants it.

(The existing `expenses_cycle_date_idx` already covers `(cycle_id, occurred_on)`. The cross-cycle query orders by `occurred_on` — Postgres can use the existing index to satisfy ordering even without a global `(user_id, occurred_on)` index because the RLS subquery filters via `cycles.user_id` first. If query plans show full-table scans in production, add `expenses_occurred_on_idx (occurred_on desc)` in a follow-up migration.)

## 8. Italian copy

New entries in `src/lib/copy.ts`:

```ts
search: {
  pageTitle: "Ricerca",
  inputPlaceholder: "Cerca in note o categoria…",
  chipDate: "Data",
  chipAmount: "Importo",
  chipCategory: "Categoria",
  counterTemplate: "{n} risultati · totale {amount}",
  counterZero: "Nessun risultato",
  loadMore: "Carica altri",
  emptyState: "Nessuna spesa nel periodo selezionato",
  rangePresetLast30: "Ultimi 30 giorni",
  rangePresetLast60: "Ultimi 60 giorni",
  rangePresetLast90: "Ultimi 90 giorni",
  rangePresetCurrentCycle: "Ciclo corrente",
  rangePresetCustom: "Personalizzato",
  amountMinLabel: "Importo minimo",
  amountMaxLabel: "Importo massimo",
  applyButton: "Applica",
  clearButton: "Azzera filtri",
}
```

## 9. Errors and edge cases

- **No results** → render empty-state copy + "Azzera filtri" button that links to `/search` (no params).
- **Invalid `searchParams`** → Zod fallback to defaults, page still renders. No flash of error.
- **Pagination past last page** → empty rows array but `totalCount` still accurate; the "Carica altri" button is hidden when `offset + LIMIT >= totalCount`.
- **User has zero cycles** → empty state, same copy.
- **Edit-then-return navigation** → existing `redirect()` calls in `editExpenseAction`/`deleteExpenseAction` accept an optional `return` param. If the param is present and starts with `/search`, redirect there; otherwise fall back to the current default. This is the only change to existing server actions.

## 10. Testing

| Layer | Where | What |
|-------|-------|------|
| Unit | `tests/unit/search/parse-params.test.ts` | Round-trip parse/serialize for all filter combinations. Invalid input falls back to defaults. |
| Unit | `tests/unit/search/group-by-cycle.test.ts` | Empty input → empty array. Single cycle. Multiple cycles in correct order. Total per cycle. |
| Integration | `tests/integration/search.test.ts` | RLS: user A search returns zero rows from user B's expenses with matching text. All filter combinations return correct rows. Pagination. |
| E2E | `tests/e2e/search.spec.ts` | Open `/search` from kebab → type "esselunga" → see results → tap row → arrive at edit page → save → return to `/search` with original filters intact. |

`pnpm typecheck && pnpm lint && pnpm test` and `pnpm test:e2e` must all pass. `pnpm audit --prod` clean.

## 11. Verification checklist

- [ ] Mobile viewport (375 × 667) tested in browser via `pnpm dev`.
- [ ] Desktop viewport (≥ 1024 px) tested.
- [ ] Filter chips open bottom sheets correctly on touch.
- [ ] URL state preserved across back-button navigation.
- [ ] Search-then-edit-then-return preserves filters.
- [ ] `pnpm db:reset && pnpm test` green.
- [ ] Manual: user A logged in cannot see user B rows even when text matches.
- [ ] `CLAUDE.md` updated to mention `lib/search/` (new pure library) and the `/search` route.

## 12. Out of scope (future plans)

- `pg_trgm`-backed accent-insensitive ranking with `similarity()`.
- Saved-search shortcuts.
- Export to CSV.
- Search history.
- Push reminder when an import is stale (separate spec — Plan 7).
