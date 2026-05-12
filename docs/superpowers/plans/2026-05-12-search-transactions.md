# Search Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/search` page that lets each user query their own expenses across every cycle by free-text, date range, amount range, and categories — reusing the existing edit/delete flow for row mutations.

**Architecture:** Server component reads filters from `searchParams`, calls a single server-side `getSearchResults(filters)` function, and renders results grouped by cycle. Filters live in the URL so the back button works and links are shareable. Client components only handle the input + bottom-sheet pickers (debounced submit). A `pg_trgm` GIN index on `expenses.note` supports text search at scale; no schema changes other than the index migration.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), TypeScript strict, Tailwind v4 + shadcn/ui (`Sheet`, `DropdownMenu`), Supabase JS (PostgREST), Zod, Vitest, Playwright. Italian-only via `src/lib/copy.ts`.

---

## File map

**New files:**

| Path | Purpose |
|------|---------|
| `supabase/migrations/0009_search_indexes.sql` | Enable `pg_trgm`, add GIN index on `expenses.note` |
| `src/lib/search/parse-params.ts` | PURE: `URLSearchParams` → typed `Filters` (Zod, fallback to defaults) |
| `src/lib/search/serialize-params.ts` | PURE: `Filters` → `URLSearchParams` (omit defaults) |
| `src/lib/search/group-by-cycle.ts` | PURE: rows → `[{ cycle, total, rows }]` |
| `src/lib/search/types.ts` | Shared `Filters`, `SearchRow`, `SearchResult`, `CycleGroup` types + `LIMIT` constant |
| `src/server/queries/search.ts` | `getSearchResults(filters)` against Supabase |
| `src/app/search/page.tsx` | Server: read params, fetch results, render |
| `src/app/search/search-bar.tsx` | Client: text input (debounced) + 3 chip triggers |
| `src/app/search/filter-sheet-date.tsx` | Client: bottom sheet, presets + custom dates |
| `src/app/search/filter-sheet-amount.tsx` | Client: bottom sheet, min/max inputs |
| `src/app/search/filter-sheet-category.tsx` | Client: bottom sheet, multi-select |
| `src/components/search-result-row.tsx` | Presentational row → `Link` to edit |
| `src/components/search-cycle-group.tsx` | Presentational group header + rows |
| `tests/unit/search/parse-params.test.ts` | Round-trip + fallbacks |
| `tests/unit/search/serialize-params.test.ts` | Default omission + URL output |
| `tests/unit/search/group-by-cycle.test.ts` | Empty / single / multi-cycle grouping |
| `tests/integration/search-query.test.ts` | All filter combos + RLS isolation + pagination |
| `tests/e2e/search.spec.ts` | Open from kebab → search → tap row → edit → return |

**Modified files:**

| Path | Change |
|------|--------|
| `src/lib/copy.ts` | Add `search` namespace |
| `src/components/app-header.tsx` | Add "Ricerca" entry to `ActionsMenu` |
| `src/server/actions/expense.ts` | `updateExpenseAction` + `deleteExpenseAction` honor optional `return` form field |
| `src/app/expenses/[id]/edit/page.tsx` | Read `return` searchParam, pass to form + delete button |
| `src/components/expense-form.tsx` | Accept `returnTo` prop, render hidden `<input name="return">`, cancel link uses it |
| `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx` | Accept `returnTo`, send via form data |
| `CLAUDE.md` | Mention `lib/search/` and `/search` route in repo layout section |

---

## Conventions used by every task

- **Commit message style:** `feat(search): …`, `test(search): …`, `chore(db): …` (matches recent history).
- **Co-author trailer** (per repo policy):

  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

- **Use the Edit tool** to modify existing files; **Write tool** for new files.
- **Italian copy** lives in `src/lib/copy.ts` only. Never hard-code Italian elsewhere.
- **Do not** import `next`, `react`, or `@supabase/*` from anything under `src/lib/search/`.
- **Run** `pnpm typecheck && pnpm lint && pnpm test` after each task; commit only when green.

---

### Task 1: Database migration — `pg_trgm` extension + index

**Files:**
- Create: `supabase/migrations/0009_search_indexes.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 0009_search_indexes.sql
-- Trigram index on expenses.note for cross-cycle search.
-- gin_trgm_ops supports both LIKE and ILIKE patterns of length >= 3.

create extension if not exists pg_trgm;

create index if not exists expenses_note_trgm_idx
  on public.expenses
  using gin (coalesce(note, '') gin_trgm_ops);
```

- [ ] **Step 2: Reset local DB and confirm migration applies**

Run: `pnpm db:reset`
Expected: prints "Applied migration ... 0009_search_indexes.sql" with no error.

- [ ] **Step 3: Verify the index exists**

Run: `pnpm supabase db psql -c "\\d+ public.expenses"`
Expected: output includes a row mentioning `expenses_note_trgm_idx` of type `gin`.

- [ ] **Step 4: Run the existing test suite to confirm nothing broke**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0009_search_indexes.sql
git commit -m "$(cat <<'EOF'
chore(db): add pg_trgm index on expenses.note for search

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Italian copy strings

**Files:**
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Add the `search` namespace before the closing `} as const;`**

Place between the `mappings` namespace and `toast` namespace:

```ts
  search: {
    headerLink: "Ricerca",
    pageTitle: "Ricerca",
    inputPlaceholder: "Cerca in note o categoria…",
    chipDate: "Data",
    chipAmount: "Importo",
    chipCategory: "Categoria",
    counterTemplate: (n: number, amount: string) =>
      `${n} risultati · totale ${amount}`,
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
    cycleGroupTotal: (range: string, total: string) =>
      `${range} · ${total}`,
  },
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/copy.ts
git commit -m "$(cat <<'EOF'
feat(copy): add search namespace strings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Pure lib — types

**Files:**
- Create: `src/lib/search/types.ts`

- [ ] **Step 1: Write the types file**

```ts
export const SEARCH_LIMIT = 30;

export type Filters = {
  q: string;
  from: string;       // YYYY-MM-DD
  to: string;         // YYYY-MM-DD
  min: number | null;
  max: number | null;
  categoryIds: string[];
  offset: number;
};

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

export type CycleGroup = {
  cycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  total: number;
  rows: SearchRow[];
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (file has no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/types.ts
git commit -m "$(cat <<'EOF'
feat(search): add shared types and LIMIT constant

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Pure lib — `parse-params` (TDD)

**Files:**
- Create: `tests/unit/search/parse-params.test.ts`
- Create: `src/lib/search/parse-params.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseFilters } from "@/lib/search/parse-params";

const TODAY = "2026-05-12";

describe("parseFilters", () => {
  it("returns defaults when given empty params", () => {
    const f = parseFilters(new URLSearchParams(""), TODAY);
    expect(f.q).toBe("");
    expect(f.from).toBe("2026-04-12");
    expect(f.to).toBe(TODAY);
    expect(f.min).toBeNull();
    expect(f.max).toBeNull();
    expect(f.categoryIds).toEqual([]);
    expect(f.offset).toBe(0);
  });

  it("parses all valid params", () => {
    const sp = new URLSearchParams({
      q: "esselunga",
      from: "2026-01-01",
      to: "2026-03-31",
      min: "10",
      max: "200",
      cat: "11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222",
      offset: "30",
    });
    const f = parseFilters(sp, TODAY);
    expect(f.q).toBe("esselunga");
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-03-31");
    expect(f.min).toBe(10);
    expect(f.max).toBe(200);
    expect(f.categoryIds).toHaveLength(2);
    expect(f.offset).toBe(30);
  });

  it("falls back to defaults for malformed input", () => {
    const sp = new URLSearchParams({
      q: "x".repeat(200),
      from: "not-a-date",
      to: "also-bad",
      min: "abc",
      max: "-5",
      cat: "not-a-uuid",
      offset: "-7",
    });
    const f = parseFilters(sp, TODAY);
    expect(f.q.length).toBeLessThanOrEqual(100);
    expect(f.from).toBe("2026-04-12");
    expect(f.to).toBe(TODAY);
    expect(f.min).toBeNull();
    expect(f.max).toBeNull();
    expect(f.categoryIds).toEqual([]);
    expect(f.offset).toBe(0);
  });

  it("swaps from/to if reversed", () => {
    const sp = new URLSearchParams({ from: "2026-05-01", to: "2026-04-01" });
    const f = parseFilters(sp, TODAY);
    expect(f.from).toBe("2026-04-01");
    expect(f.to).toBe("2026-05-01");
  });

  it("clamps offset to multiples of 30", () => {
    const sp = new URLSearchParams({ offset: "47" });
    const f = parseFilters(sp, TODAY);
    expect(f.offset).toBe(30);
  });

  it("caps q length at 100", () => {
    const sp = new URLSearchParams({ q: "a".repeat(150) });
    const f = parseFilters(sp, TODAY);
    expect(f.q.length).toBe(100);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/unit/search/parse-params.test.ts`
Expected: FAIL — module `@/lib/search/parse-params` not found.

- [ ] **Step 3: Implement `parseFilters`**

```ts
import { z } from "zod";
import type { Filters } from "./types";
import { SEARCH_LIMIT } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shiftDays(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

const NumOrNull = z
  .preprocess((v) => {
    if (v === null || v === "" || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, z.number().nullable());

export function parseFilters(sp: URLSearchParams, today: string): Filters {
  const defaultFrom = shiftDays(today, -30);
  const q = (sp.get("q") ?? "").slice(0, 100);

  let from = sp.get("from") ?? "";
  let to = sp.get("to") ?? "";
  if (!DATE_RE.test(from)) from = defaultFrom;
  if (!DATE_RE.test(to)) to = today;
  if (from > to) [from, to] = [to, from];

  const min = NumOrNull.parse(sp.get("min"));
  const max = NumOrNull.parse(sp.get("max"));

  const catRaw = sp.get("cat") ?? "";
  const categoryIds = catRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 50);

  const offsetRaw = Number(sp.get("offset") ?? "0");
  const offset =
    Number.isFinite(offsetRaw) && offsetRaw >= 0
      ? Math.floor(offsetRaw / SEARCH_LIMIT) * SEARCH_LIMIT
      : 0;

  return { q, from, to, min, max, categoryIds, offset };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/unit/search/parse-params.test.ts`
Expected: 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/parse-params.ts tests/unit/search/parse-params.test.ts
git commit -m "$(cat <<'EOF'
feat(search): add parseFilters with Zod fallback to defaults

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Pure lib — `serialize-params` (TDD)

**Files:**
- Create: `tests/unit/search/serialize-params.test.ts`
- Create: `src/lib/search/serialize-params.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { serializeFilters } from "@/lib/search/serialize-params";
import { parseFilters } from "@/lib/search/parse-params";

const TODAY = "2026-05-12";

describe("serializeFilters", () => {
  it("returns empty string for default filters", () => {
    const defaults = parseFilters(new URLSearchParams(""), TODAY);
    expect(serializeFilters(defaults, TODAY)).toBe("");
  });

  it("serializes only non-default fields", () => {
    const f = parseFilters(new URLSearchParams({ q: "esselunga" }), TODAY);
    expect(serializeFilters(f, TODAY)).toBe("q=esselunga");
  });

  it("serializes a fully populated filter", () => {
    const sp = new URLSearchParams({
      q: "spesa",
      from: "2026-01-01",
      to: "2026-03-31",
      min: "10",
      max: "200",
      cat: "11111111-1111-1111-1111-111111111111",
      offset: "30",
    });
    const f = parseFilters(sp, TODAY);
    const out = new URLSearchParams(serializeFilters(f, TODAY));
    expect(out.get("q")).toBe("spesa");
    expect(out.get("from")).toBe("2026-01-01");
    expect(out.get("to")).toBe("2026-03-31");
    expect(out.get("min")).toBe("10");
    expect(out.get("max")).toBe("200");
    expect(out.get("cat")).toBe("11111111-1111-1111-1111-111111111111");
    expect(out.get("offset")).toBe("30");
  });

  it("round-trips parse → serialize → parse", () => {
    const sp = new URLSearchParams({ q: "x", min: "5", offset: "60" });
    const a = parseFilters(sp, TODAY);
    const b = parseFilters(new URLSearchParams(serializeFilters(a, TODAY)), TODAY);
    expect(b).toEqual(a);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/unit/search/serialize-params.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `serializeFilters`**

```ts
import type { Filters } from "./types";

function shiftDays(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function serializeFilters(f: Filters, today: string): string {
  const defaultFrom = shiftDays(today, -30);
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.from !== defaultFrom) sp.set("from", f.from);
  if (f.to !== today) sp.set("to", f.to);
  if (f.min !== null) sp.set("min", String(f.min));
  if (f.max !== null) sp.set("max", String(f.max));
  if (f.categoryIds.length) sp.set("cat", f.categoryIds.join(","));
  if (f.offset > 0) sp.set("offset", String(f.offset));
  return sp.toString();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/unit/search/serialize-params.test.ts`
Expected: 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/serialize-params.ts tests/unit/search/serialize-params.test.ts
git commit -m "$(cat <<'EOF'
feat(search): add serializeFilters omitting defaults

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Pure lib — `group-by-cycle` (TDD)

**Files:**
- Create: `tests/unit/search/group-by-cycle.test.ts`
- Create: `src/lib/search/group-by-cycle.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { groupByCycle } from "@/lib/search/group-by-cycle";
import type { SearchRow } from "@/lib/search/types";

function row(over: Partial<SearchRow>): SearchRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    amount: 10,
    occurredOn: "2026-05-12",
    note: null,
    categoryId: "11111111-1111-1111-1111-111111111111",
    categoryName: "Spesa",
    cycleId: "ccccccccc-cccc-cccc-cccc-cccccccccccc",
    cycleStartDate: "2026-04-27",
    cycleEndDate: "2026-05-26",
    ...over,
  };
}

describe("groupByCycle", () => {
  it("returns empty array for empty input", () => {
    expect(groupByCycle([])).toEqual([]);
  });

  it("groups rows of one cycle and sums total", () => {
    const out = groupByCycle([
      row({ id: "a", amount: 10 }),
      row({ id: "b", amount: 20 }),
      row({ id: "c", amount: 5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.total).toBe(35);
    expect(out[0]!.rows).toHaveLength(3);
  });

  it("preserves input order across cycles", () => {
    const out = groupByCycle([
      row({ id: "a", cycleId: "C2", cycleStartDate: "2026-04-27" }),
      row({ id: "b", cycleId: "C1", cycleStartDate: "2026-03-27" }),
      row({ id: "c", cycleId: "C2", cycleStartDate: "2026-04-27" }),
    ]);
    expect(out.map((g) => g.cycleId)).toEqual(["C2", "C1"]);
    expect(out[0]!.rows.map((r) => r.id)).toEqual(["a", "c"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/unit/search/group-by-cycle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `groupByCycle`**

```ts
import type { CycleGroup, SearchRow } from "./types";

export function groupByCycle(rows: SearchRow[]): CycleGroup[] {
  const order: string[] = [];
  const map = new Map<string, CycleGroup>();
  for (const r of rows) {
    let g = map.get(r.cycleId);
    if (!g) {
      g = {
        cycleId: r.cycleId,
        cycleStartDate: r.cycleStartDate,
        cycleEndDate: r.cycleEndDate,
        total: 0,
        rows: [],
      };
      map.set(r.cycleId, g);
      order.push(r.cycleId);
    }
    g.rows.push(r);
    g.total += r.amount;
  }
  return order.map((id) => map.get(id)!);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/unit/search/group-by-cycle.test.ts`
Expected: 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/group-by-cycle.ts tests/unit/search/group-by-cycle.test.ts
git commit -m "$(cat <<'EOF'
feat(search): add groupByCycle pure helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Server query — `getSearchResults` with integration tests

**Files:**
- Create: `tests/stubs/server-only.ts` (empty stub)
- Modify: `vitest.config.ts` (alias `server-only` to the stub)
- Create: `tests/integration/search-query.test.ts`
- Create: `src/server/queries/search.ts`

- [ ] **Step 0a: Create the `server-only` stub for vitest**

```ts
// tests/stubs/server-only.ts
// Empty stub so vitest can import modules guarded by `import "server-only"`.
export {};
```

- [ ] **Step 0b: Wire the alias in `vitest.config.ts`**

Replace the `resolve` block:

```ts
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
```

with:

```ts
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
```

- [ ] **Step 0c: Confirm existing tests still pass with the new alias**

Run: `pnpm test`
Expected: same green count as before this task.

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSearchResultsWithClient } from "@/server/queries/search";

const ALICE = "alice-search@test.local";
const BOB = "bob-search@test.local";

describe("getSearchResults", () => {
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceCycleA: string;
  let aliceCycleB: string;
  let aliceCatSpesa: string;
  let aliceCatAuto: string;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceClient = a.client;
    const b = await createTestUser(BOB);
    bobClient = b.client;

    // Two cycles for Alice
    const c1 = await admin().from("cycles").insert({
      user_id: a.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000,
    }).select("id").single();
    aliceCycleA = c1.data!.id;
    const c2 = await admin().from("cycles").insert({
      user_id: a.id, start_date: "2026-03-27", end_date: "2026-04-26", salary: 4000,
    }).select("id").single();
    aliceCycleB = c2.data!.id;

    // Categories
    const cat1 = await admin().from("categories").insert({
      cycle_id: aliceCycleA, name: "Spesa", expected_amount: 500,
    }).select("id").single();
    aliceCatSpesa = cat1.data!.id;
    const cat2 = await admin().from("categories").insert({
      cycle_id: aliceCycleA, name: "Auto", expected_amount: 200,
    }).select("id").single();
    aliceCatAuto = cat2.data!.id;

    // Expenses for Alice
    await aliceClient.from("expenses").insert([
      { cycle_id: aliceCycleA, category_id: aliceCatSpesa, amount: 67.4,
        occurred_on: "2026-05-12", note: "Esselunga via Roma" },
      { cycle_id: aliceCycleA, category_id: aliceCatAuto, amount: 50,
        occurred_on: "2026-05-10", note: "Benzina Eni" },
      { cycle_id: aliceCycleB, category_id: aliceCatSpesa, amount: 32.9,
        occurred_on: "2026-04-20", note: "Conad" },
    ]);

    // Bob has expense whose note matches Alice's text
    const bobC = await admin().from("cycles").insert({
      user_id: b.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 3000,
    }).select("id").single();
    const bobCat = await admin().from("categories").insert({
      cycle_id: bobC.data!.id, name: "Spesa", expected_amount: 400,
    }).select("id").single();
    await bobClient.from("expenses").insert({
      cycle_id: bobC.data!.id, category_id: bobCat.data!.id, amount: 99,
      occurred_on: "2026-05-12", note: "Esselunga di Bob",
    });
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("returns Alice's matching rows when filtering by text", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "esselunga",
      from: "2026-01-01",
      to: "2026-12-31",
      min: null,
      max: null,
      categoryIds: [],
      offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.note).toContain("Esselunga via Roma");
    expect(res.totalCount).toBe(1);
    expect(res.totalAmount).toBeCloseTo(67.4);
  });

  it("RLS blocks Bob's row even when text matches", async () => {
    const res = await getSearchResultsWithClient(bobClient, {
      q: "esselunga",
      from: "2026-01-01",
      to: "2026-12-31",
      min: null,
      max: null,
      categoryIds: [],
      offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.note).toContain("di Bob");
  });

  it("filters by date range", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "",
      from: "2026-04-01",
      to: "2026-04-30",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.note).toBe("Conad");
  });

  it("filters by amount range", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "",
      from: "2026-01-01",
      to: "2026-12-31",
      min: 60, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.amount).toBeCloseTo(67.4);
  });

  it("filters by category ids", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "",
      from: "2026-01-01",
      to: "2026-12-31",
      min: null, max: null,
      categoryIds: [aliceCatAuto],
      offset: 0,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.categoryName).toBe("Auto");
  });

  it("orders rows by occurred_on descending across cycles", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows.map((r) => r.occurredOn)).toEqual([
      "2026-05-12", "2026-05-10", "2026-04-20",
    ]);
  });

  it("escapes wildcard characters in q", async () => {
    const res = await getSearchResultsWithClient(aliceClient, {
      q: "%nopattern%", from: "2026-01-01", to: "2026-12-31",
      min: null, max: null, categoryIds: [], offset: 0,
    });
    expect(res.rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/integration/search-query.test.ts`
Expected: FAIL — `getSearchResultsWithClient` not exported.

- [ ] **Step 3: Implement `src/server/queries/search.ts`**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/db/server";
import type { Filters, SearchResult, SearchRow } from "@/lib/search/types";
import { SEARCH_LIMIT } from "@/lib/search/types";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type Row = {
  id: string;
  amount: number | string;
  occurred_on: string;
  note: string | null;
  category_id: string;
  cycle_id: string;
  cycles: { start_date: string; end_date: string };
  categories: { name: string };
};

function mapRow(r: Row): SearchRow {
  return {
    id: r.id,
    amount: Number(r.amount),
    occurredOn: r.occurred_on,
    note: r.note,
    categoryId: r.category_id,
    categoryName: r.categories.name,
    cycleId: r.cycle_id,
    cycleStartDate: r.cycles.start_date,
    cycleEndDate: r.cycles.end_date,
  };
}

export async function getSearchResultsWithClient(
  supabase: SupabaseClient,
  f: Filters,
): Promise<SearchResult> {
  const select =
    "id, amount, occurred_on, note, category_id, cycle_id, " +
    "cycles!inner(start_date, end_date), categories!inner(name)";

  let q = supabase
    .from("expenses")
    .select(select, { count: "exact" })
    .gte("occurred_on", f.from)
    .lte("occurred_on", f.to);

  if (f.min != null) q = q.gte("amount", f.min);
  if (f.max != null) q = q.lte("amount", f.max);
  if (f.categoryIds.length) q = q.in("category_id", f.categoryIds);
  if (f.q) {
    const pat = `%${escapeIlike(f.q)}%`;
    q = q.or(`note.ilike.${pat},categories.name.ilike.${pat}`);
  }

  const { data, count, error } = await q
    .order("occurred_on", { ascending: false })
    .range(f.offset, f.offset + SEARCH_LIMIT - 1);

  if (error) throw error;

  let sumQ = supabase
    .from("expenses")
    .select("amount.sum()")
    .gte("occurred_on", f.from)
    .lte("occurred_on", f.to);
  if (f.min != null) sumQ = sumQ.gte("amount", f.min);
  if (f.max != null) sumQ = sumQ.lte("amount", f.max);
  if (f.categoryIds.length) sumQ = sumQ.in("category_id", f.categoryIds);
  if (f.q) {
    const pat = `%${escapeIlike(f.q)}%`;
    sumQ = sumQ.or(`note.ilike.${pat},categories.name.ilike.${pat}`);
  }
  const { data: sumRows } = await sumQ;
  const totalAmount = Number(
    (sumRows as Array<{ sum: number | string | null }> | null)?.[0]?.sum ?? 0,
  );

  return {
    rows: (data as unknown as Row[] | null)?.map(mapRow) ?? [],
    totalCount: count ?? 0,
    totalAmount,
  };
}

export async function getSearchResults(f: Filters): Promise<SearchResult> {
  const supabase = await getServerSupabase();
  return getSearchResultsWithClient(supabase, f);
}
```

- [ ] **Step 4: Run the integration test to verify it passes**

Run: `pnpm db:reset && pnpm test tests/integration/search-query.test.ts`
Expected: 7 tests passed.

- [ ] **Step 5: Run the full suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/server/queries/search.ts tests/integration/search-query.test.ts \
        tests/stubs/server-only.ts vitest.config.ts
git commit -m "$(cat <<'EOF'
feat(search): add getSearchResults server query with RLS coverage

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Presentational components — row + cycle group

**Files:**
- Create: `src/components/search-result-row.tsx`
- Create: `src/components/search-cycle-group.tsx`

- [ ] **Step 1: Write `search-result-row.tsx`**

```tsx
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
```

- [ ] **Step 2: Write `search-cycle-group.tsx`**

```tsx
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleGroup } from "@/lib/search/types";
import { SearchResultRow } from "@/components/search-result-row";

type Props = {
  group: CycleGroup;
  returnTo: string;
};

export function SearchCycleGroup({ group, returnTo }: Props) {
  const range = cycleLabel({ start: group.cycleStartDate, end: group.cycleEndDate });
  return (
    <section>
      <h2 className="bg-clay-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {copy.search.cycleGroupTotal(range, formatEur(group.total))}
      </h2>
      <div className="bg-surface">
        {group.rows.map((r) => (
          <SearchResultRow key={r.id} row={r} returnTo={returnTo} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/search-result-row.tsx src/components/search-cycle-group.tsx
git commit -m "$(cat <<'EOF'
feat(search): add presentational row and cycle-group components

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Filter sheet — date

**Files:**
- Create: `src/app/search/filter-sheet-date.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { copy } from "@/lib/copy";
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
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
      <SheetContent side="bottom" className="space-y-4">
        <SheetHeader>
          <SheetTitle>{copy.search.chipDate}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => apply(shiftDays(today, -30), today)}>
            {copy.search.rangePresetLast30}
          </Button>
          <Button variant="outline" onClick={() => apply(shiftDays(today, -60), today)}>
            {copy.search.rangePresetLast60}
          </Button>
          <Button variant="outline" onClick={() => apply(shiftDays(today, -90), today)}>
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
        <SheetClose asChild>
          <Button onClick={() => apply(localFrom, localTo)} className="w-full">
            {copy.search.applyButton}
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/search/filter-sheet-date.tsx
git commit -m "$(cat <<'EOF'
feat(search): add date-range filter sheet

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Filter sheet — amount

**Files:**
- Create: `src/app/search/filter-sheet-amount.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Euro } from "lucide-react";
import { copy } from "@/lib/copy";
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
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
      <SheetContent side="bottom" className="space-y-4">
        <SheetHeader>
          <SheetTitle>{copy.search.chipAmount}</SheetTitle>
        </SheetHeader>
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
        <SheetClose asChild>
          <Button onClick={apply} className="w-full">{copy.search.applyButton}</Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/search/filter-sheet-amount.tsx
git commit -m "$(cat <<'EOF'
feat(search): add amount-range filter sheet

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Filter sheet — category

**Files:**
- Create: `src/app/search/filter-sheet-category.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tag } from "lucide-react";
import { copy } from "@/lib/copy";
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
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
        <SheetClose asChild>
          <Button onClick={apply} className="w-full">{copy.search.applyButton}</Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/search/filter-sheet-category.tsx
git commit -m "$(cat <<'EOF'
feat(search): add category multi-select filter sheet

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Search bar (text input + chip wrapper)

**Files:**
- Create: `src/app/search/search-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/search/search-bar.tsx
git commit -m "$(cat <<'EOF'
feat(search): add debounced search input

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: `/search` page wiring

**Files:**
- Create: `src/app/search/page.tsx`

- [ ] **Step 1: Add a query helper to fetch all distinct categories for filter sheet**

Append to `src/server/queries/search.ts`:

```ts
export type CategoryOption = { id: string; name: string };

export async function getAllCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });
  if (!data) return [];
  // dedupe by lowercase name, keep first occurrence
  const seen = new Set<string>();
  const out: CategoryOption[] = [];
  for (const c of data) {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: c.id, name: c.name });
  }
  return out;
}
```

- [ ] **Step 2: Write `src/app/search/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Manual sanity check**

Run: `pnpm dev`
Visit: `http://localhost:3000/search`
Expected: page renders with default filter chips + last-30-days expenses (after seeding via UI or import).

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/app/search/page.tsx src/server/queries/search.ts
git commit -m "$(cat <<'EOF'
feat(search): add /search page with filters and grouped results

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Header menu — add "Ricerca" entry

**Files:**
- Modify: `src/components/app-header.tsx`

- [ ] **Step 1: Add the `Search` icon import**

Find the lucide-react import block at the top of the file. Replace:

```tsx
import {
  ChevronLeft,
  ChevronRight,
  LineChart,
  List,
  LogOut,
  MoreVertical,
  Settings,
  Upload,
} from "lucide-react";
```

with:

```tsx
import {
  ChevronLeft,
  ChevronRight,
  LineChart,
  List,
  LogOut,
  MoreVertical,
  Search,
  Settings,
  Upload,
} from "lucide-react";
```

- [ ] **Step 2: Add the menu item before the `categoriesHref` item inside `ActionsMenu`**

Replace:

```tsx
        <DropdownMenuItem className={menuItem} render={<Link href={categoriesHref} />}>
          <List className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.header.categories}
        </DropdownMenuItem>
```

with:

```tsx
        <DropdownMenuItem className={menuItem} render={<Link href="/search" />}>
          <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.search.headerLink}
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItem} render={<Link href={categoriesHref} />}>
          <List className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.header.categories}
        </DropdownMenuItem>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `pnpm dev`
Open the kebab menu on the dashboard.
Expected: "Ricerca" appears as the first item with a search icon.

- [ ] **Step 5: Commit**

```bash
git add src/components/app-header.tsx
git commit -m "$(cat <<'EOF'
feat(search): add Ricerca entry to header kebab menu

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Edit/delete return-param wiring

**Files:**
- Modify: `src/server/actions/expense.ts`
- Modify: `src/components/expense-form.tsx`
- Modify: `src/app/expenses/[id]/edit/page.tsx`
- Modify: `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx`

- [ ] **Step 1: Add a safe-return helper at the top of `src/server/actions/expense.ts`**

After the imports, before the `ExpenseSchema` declaration, add:

```ts
function safeReturn(raw: FormDataEntryValue | null, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}
```

- [ ] **Step 2: In `updateExpenseAction`, replace the redirect line**

Find:

```ts
  redirect("/?toast=expenseUpdated");
```

at the bottom of `updateExpenseAction`. Replace with:

```ts
  const back = safeReturn(formData.get("return"), "/?toast=expenseUpdated");
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}toast=expenseUpdated`);
```

- [ ] **Step 3: Update `deleteExpenseAction` signature to accept `returnTo`**

Replace the entire `deleteExpenseAction` function with:

```ts
export async function deleteExpenseAction(id: string, returnTo?: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  const back = safeReturn(returnTo ?? null, "/?toast=expenseDeleted");
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}toast=expenseDeleted`);
}
```

- [ ] **Step 4: In `src/components/expense-form.tsx`, accept and render the return field**

Update the `Props` union to include `returnTo`:

```ts
type Props =
  | { mode: "create"; categories: Cat[]; defaultDate: string; returnTo?: string }
  | { mode: "edit"; categories: Cat[]; expense: Expense; returnTo?: string };
```

Inside the form, just below the existing hidden `id` input (around line 56), add:

```tsx
      {props.returnTo && <input type="hidden" name="return" value={props.returnTo} />}
```

Update the cancel link `href` from `"/"` to:

```tsx
href={props.returnTo ?? "/"}
```

- [ ] **Step 5: Update `src/app/expenses/[id]/edit/page.tsx` to read and propagate `return`**

Replace the function signature and body:

```tsx
export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { id } = await params;
  const { return: returnRaw } = await searchParams;
  const returnTo =
    typeof returnRaw === "string" && returnRaw.startsWith("/") && !returnRaw.startsWith("//")
      ? returnRaw
      : undefined;
  const data = await getExpenseForEdit(id);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.expense.editTitle}</h1>
      </div>
      <ExpenseForm mode="edit" categories={data.categories} expense={data.expense} returnTo={returnTo} />
      <DeleteExpenseButton id={data.expense.id} returnTo={returnTo} />
    </main>
  );
}
```

- [ ] **Step 6: Update `delete-expense-button.tsx` to forward `returnTo`**

Read current file first; then replace its action handler to pass the second argument. Concretely, change the `Props` type to include `returnTo?: string` and update the `onClick`/`formAction` invocation that calls `deleteExpenseAction(id)` to call `deleteExpenseAction(id, returnTo)`.

If the existing call is wrapped in a server-action form, change the `<form action={...}>` setter to a closure:

```tsx
<form action={async () => { "use server"; await deleteExpenseAction(id, returnTo); }}>
```

If the existing implementation already binds the id via `bind`, switch to the closure form above for clarity.

- [ ] **Step 7: Typecheck + lint + tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. Existing `tests/integration/expense-update.test.ts` and `tests/integration/expense-delete.test.ts` should still pass.

- [ ] **Step 8: Manual check**

Run: `pnpm dev`
Open `/search`, tap any row, edit the amount, save.
Expected: redirects back to `/search` with the same filters and a "Spesa aggiornata" toast.

- [ ] **Step 9: Commit**

```bash
git add src/server/actions/expense.ts src/components/expense-form.tsx \
        src/app/expenses/[id]/edit/page.tsx \
        src/app/expenses/[id]/edit/_components/delete-expense-button.tsx
git commit -m "$(cat <<'EOF'
feat(expenses): honor return param on edit and delete actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Playwright E2E

**Files:**
- Create: `tests/e2e/search.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from "@playwright/test";

test.describe("Search transactions", () => {
  test.use({ storageState: "tests/e2e/.auth/user.json" });

  test("opens /search from kebab, filters, edits, returns", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Menù").click();
    await page.getByRole("menuitem", { name: "Ricerca" }).click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByPlaceholder(/Cerca in note/)).toBeVisible();

    await page.getByPlaceholder(/Cerca in note/).fill("a");
    // wait for debounced URL update
    await page.waitForURL(/\/search\?.*q=a/);

    const firstRow = page.locator("a[href^='/expenses/']").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/expenses\/.*\/edit\?return=/);

    await page.getByRole("link", { name: /Annulla/i }).click();
    await expect(page).toHaveURL(/\/search\?.*q=a/);
  });
});
```

(The test relies on the existing Playwright auth helper used by other specs. If `tests/e2e/.auth/user.json` does not exist in this checkout, mirror the bootstrap pattern from `tests/e2e/edit-expense.spec.ts`.)

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e tests/e2e/search.spec.ts`
Expected: green. If the test relies on seed data, ensure at least one expense with note containing "a" exists in the test user's account before running.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/search.spec.ts
git commit -m "$(cat <<'EOF'
test(search): add Playwright smoke for search → edit → return

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Documentation + final verification

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Update `CLAUDE.md` repo layout**

In the "Repository layout" code block, locate the `lib/` section. Add a `search/` line after `import/`:

```
    search/               # PURE: filter parse/serialize, group-by-cycle for /search
```

Also add `/search` to the `app/` section:

```
    /search               # cross-cycle transaction search and filters
```

- [ ] **Step 2: Append a new entry to `docs/ROADMAP.md`**

Add a new row to the status table:

```markdown
| 6 | ✅ Shipped | Cross-cycle transaction search | [`2026-05-12-search-transactions.md`](superpowers/plans/2026-05-12-search-transactions.md) |
```

Append a new section after Plan 5:

```markdown
---

## Plan 6 — Cross-cycle transaction search (shipped 2026-05-12)

**Goal:** Dedicated `/search` page where each user can find any past expense by free-text, date, amount, or category, with results grouped by cycle and a tap-through to the existing edit/delete flow.

**Delivered:**
- Pure libs (`src/lib/search/`): `parseFilters`, `serializeFilters`, `groupByCycle`, shared types and `SEARCH_LIMIT`.
- Server query `getSearchResults` against Supabase using `cycles!inner` + `categories!inner` joins; counts and totals via aggregate query; URL-state-only filters.
- Migration `0009_search_indexes.sql`: `pg_trgm` extension + GIN index on `expenses.note`.
- New route `/search` with sticky filter bar, three bottom-sheet pickers (date / amount / category), debounced text input, paginated `Carica altri`.
- "Ricerca" entry added to header kebab.
- `updateExpenseAction` and `deleteExpenseAction` now honor an optional `return` param so search → edit → return preserves filters.
- Tests: 6 + 4 + 3 unit, 7 integration (incl. RLS), 1 Playwright E2E.

No new dependencies.
```

- [ ] **Step 3: Final verification**

Run all four:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

Expected: all green.

- [ ] **Step 4: Audit**

Run: `pnpm audit --prod`
Expected: zero `high` / `critical` advisories.

- [ ] **Step 5: Commit and merge**

```bash
git add CLAUDE.md docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record Plan 6 (search) in CLAUDE.md and ROADMAP

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If working on a feature branch, open a PR via `gh pr create` per repo policy.

---

## Self-review (writer's checklist)

- [x] **Spec coverage** — every numbered section in `2026-05-12-search-transactions-design.md` (1 goal, 2 non-goals, 3 user flow, 4 UI contract, 5 pure libs, 6 server query, 7 schema, 8 copy, 9 errors, 10 testing, 11 verification, 12 out-of-scope) maps to at least one task above.
- [x] **No placeholders** — every code block contains real, runnable code; every command has expected output.
- [x] **Type consistency** — `Filters`, `SearchRow`, `SearchResult`, `CycleGroup`, `SEARCH_LIMIT` are defined in Task 3 and used unchanged in Tasks 4–13. Function names (`parseFilters`, `serializeFilters`, `groupByCycle`, `getSearchResults`, `getSearchResultsWithClient`, `getAllCategoryOptions`) are consistent across tasks.
- [x] **Bite-sized** — each task has 3–9 numbered steps; each step is 2–5 minutes.
- [x] **TDD ordering** — pure libs (Tasks 4, 5, 6) and the server query (Task 7) write the failing test before implementation. UI components are skipped from TDD because the existing app convention is integration + E2E only for view code.
- [x] **DRY** — the safe-return helper in Task 15 is defined once. Filters parse/serialize are the only source of URL truth.
