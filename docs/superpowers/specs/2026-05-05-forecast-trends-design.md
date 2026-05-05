# Forecast + Trends Expansion — Design Spec

**Date:** 2026-05-05
**Status:** Draft, awaiting user review
**Plan number:** 5

## 1. Purpose

Two reading habits the current dashboard does not support well:

1. **"Where will the cycle land?"** — the existing pacing bar shows pace qualitatively ("In linea / Fuori ritmo"), but doesn't answer "by how much will I overshoot in euros". With imports landing weekly and the cycle being 30+ days, the user wants a numeric end-of-cycle projection.
2. **"Is category X creeping up across the year?"** — `/trends` today is one bar chart of last-6-cycle totals. There's no per-category view, no annual rollup, and the page is not even linked from the dashboard.

This plan addresses both, **without schema changes**.

## 2. Non-goals

- No notifications.
- No drill-down from `/trends` to a category-detail page.
- No date-range picker / arbitrary windows on `/trends` — fixed at last 12 cycles.
- No sortable / filterable year table — alphabetical only in v1.
- No charts-library swap — sparklines are raw SVG.
- No new database migrations.

## 3. Forecast

### 3.1 Where it surfaces

Inside the existing **Andamento ciclo** card on the dashboard (`<PacingBar>` component), as a single row appended below the existing "Tempo" and "Spesa" rows, separated by a 1 px dashed top border (mockup variant α).

The row shows:
- Left: the label `Previsione fine ciclo` (text-text-muted, body size).
- Right: the projected total `€ 2.840` followed by a delta tag `+ € 140` (over) or `− € 140` (under).

No additional bar. No replacement of the existing "Fuori ritmo / In linea" status badge.

### 3.2 What it computes

Given the current cycle, today's date, the cycle's expenses, and the cycle's categories:

- **Anchor day** = the latest `occurred_on` across all expenses in the cycle. If the cycle has zero expenses, the forecast falls through to the no-data branch below — anchor day is undefined.
- **Anchor elapsed** = `anchor_day − cycle.start + 1`, clamped to `[1, cycle_length]`.
- **Per category projection:**
  - **Fixed category** (`is_fixed = true`): projected total = `expected_amount`. Rationale: fixed categories hit at their expected level by definition; pacing them from current spend would underestimate.
  - **Variable category** (`is_fixed = false`):
    - If the category has at least one expense: `projected = actual × (cycle_length / anchor_elapsed)`.
    - Otherwise: `projected = expected_amount`. Rationale: with no data, the budget is the best zero-information prior.
- **Cycle forecast** = sum of per-category projections.
- **Delta vs budget** = `cycle_forecast − total_budget`. Positive = over.

Anchoring on the latest expense date (not "today") is intentional: the user imports CSVs weekly with the real transaction dates preserved, so "current pace" is well-defined at the most recent imported transaction, not the wall clock. A cycle imported up through day 14 with the user opening the dashboard on day 19 paces from day 14, not day 19.

### 3.3 Display rules

- **Past or future cycles** (when navigating away from the current cycle via the prev/next cycle nav): hide the forecast row entirely. For past cycles the bars already show actuals; for future cycles there's nothing meaningful to project.
- **Current cycle, no expenses yet**: show the forecast row anyway. With no expenses the forecast equals total budget; the delta tag is suppressed (just shows `€ X` with no `±` chip).
- **Delta tag color**: terra-700 (over) or a muted green (clay-700 or equivalent token already in the palette) for under. Match the existing over-budget conventions.
- **Number formatting**: `formatEur` for the projection; `formatEur` for the absolute delta value. Sign is prefixed: `+ € 140` / `− € 140`.

### 3.4 Pure lib

New module `src/lib/forecast/compute.ts`. Pure: no Next, no React, no Supabase.

```ts
export type ForecastInput = {
  cycle: CycleRange;
  today: string;
  categories: Array<{ id: string; expectedAmount: number; isFixed: boolean }>;
  expenses: Array<{ categoryId: string; amount: number; occurredOn: string }>;
};

export type CategoryForecast = { id: string; projected: number };

export type Forecast = {
  perCategory: CategoryForecast[];
  total: number;
  deltaVsBudget: number;   // total − sum(expected). positive = over budget.
  hasData: boolean;        // true if at least one expense exists.
  anchorDate: string;      // ISO date used for the projection.
};

export function computeForecast(input: ForecastInput): Forecast;
```

### 3.5 KPI lib coupling

`computeForecast` is independent from `computeKpis` to avoid bloating the existing KPI return shape. Both consume the same cycle-level data; the dashboard server query returns one input and the page calls both pure functions.

### 3.6 Server query

The existing `getDashboardForToday` query already returns categories and expenses. Add `occurred_on` to the expense projection if it's not already there, and return the unchanged shape with that one extra field. No new SQL.

### 3.7 Italian copy

Add to `src/lib/copy.ts` under a new `forecast` section:
- `forecastLabel`: `"Previsione fine ciclo"`
- `forecastDeltaOver(amount: string)`: `\`+ ${amount} sopra il budget\`` (chip text)
- `forecastDeltaUnder(amount: string)`: `\`− ${amount} sotto il budget\``

## 4. Trends expansion

### 4.1 Page structure

`/trends` page becomes a single scrollable mobile-first page with four sections, in this order:

1. **Totale ultimi 12 cicli** — existing total bar chart, kept as-is. The "limit" prop becomes 12 instead of 6. Title updated.
2. **Top movimenti — ultimo ciclo vs precedente** — list of the 3 categories with the largest € change between the most recent cycle and the one before it. Each row: category name + signed delta (`+ € 220` / `− € 110`). Color: terra-700 for increases, muted green for decreases. Hidden when fewer than 2 cycles exist.
3. **Per categoria · 12 cicli** — small-multiple grid (2 columns on mobile). Each cell: category name, average per cycle, 12-point sparkline. Sparklines are raw SVG, no axis labels, single terracotta stroke. All categories that exist in any of the last 12 cycles appear, sorted alphabetically. Hidden when fewer than 2 cycles exist.
4. **Riepilogo annuale (12 cicli)** — table with columns: Categoria, Totale, Media, Δ. The Δ column compares the last-12-cycle window to the 12 cycles before that and is shown as a percentage; values whose absolute Δ is < 2% render as `—` to suppress noise on stable categories. Sorted alphabetically. Hidden when fewer than 2 cycles exist.

### 4.2 Empty / partial states

- **0 cycles**: existing `needMoreData` empty state.
- **1 cycle**: only the Totale chart renders (single bar). All other sections show a one-line empty hint: `"Disponibile dal secondo ciclo"`.
- **2 to 11 cycles**: all sections render; titles say `"ultimi N cicli"` honestly. The Δ column in the year table is `—` for all rows (no prior window to compare to).
- **12 to 23 cycles**: full view, but the prior window for the year-table Δ has fewer than 12 cycles. The Δ is computed against whatever prior cycles exist (≥ 1) so the column is meaningful as soon as a 13th cycle lands.
- **24+ cycles**: full view, full prior window. Older data (cycles 25+) is not shown anywhere on this page.

### 4.3 Category-name join

Categories belong to cycles (spec §3.2) and are not shared. To compute trends per category across cycles, names are joined with normalization:

```
normalize(name) = trim(lowercase(stripAccents(name)))
```

Reuse `foldName` from `src/lib/import/normalize.ts` (already exported, used by Wallet import for category-rule matching). The display name shown in the UI is the spelling from the most recent cycle the category appears in.

**Mid-year renames (e.g., `Casa` → `Spese casa`):** appear as two short series with different display names. Acceptable for v1 — flagged as a known behavior, not a bug.

### 4.4 Pure lib

New directory `src/lib/trends/` with three pure modules and an index file:

```ts
// src/lib/trends/types.ts
export type CycleSummary = {
  startDate: string;
  totalSpent: number;
  totalBudget: number;
  perCategory: Array<{ name: string; spent: number; budget: number }>;
};

// src/lib/trends/group-by-category.ts
export function groupByCategory(cycles: CycleSummary[]): CategorySeries[];
// Each CategorySeries has a normalized key, the display name (latest spelling),
// and a value-per-cycle array aligned to the input cycle order.

// src/lib/trends/top-movers.ts
export function computeTopMovers(
  cycles: CycleSummary[],
  limit = 3
): TopMover[]; // signed € deltas, sorted by absolute delta desc.

// src/lib/trends/year-rollup.ts
export function computeYearRollup(
  cycles: CycleSummary[],
  priorWindowCycles: CycleSummary[]
): YearRollupRow[]; // totale, media, deltaPercent (or null when prior is empty/zero).
```

All four functions are pure, no I/O, fully unit-tested.

### 4.5 Server query

Replace `getTrendCycles(limit)` with a richer `getTrendsData(limit = 12)` returning:

```ts
type TrendsData = {
  recent: CycleSummary[];   // last `limit` cycles, ascending by start_date.
  prior:  CycleSummary[];   // the `limit` cycles before `recent`. Used only for the year rollup Δ.
};
```

One query for cycle ids in scope, then batched queries for categories and expenses joined by cycle_id. The existing per-cycle `for` loop is replaced with a batched read to avoid 24 round-trips on a 12-cycle page. Old `getTrendCycles` is removed (only `app/trends/page.tsx` consumes it).

### 4.6 Components

- `<TopMovers cycles={...} />` — wraps a card, lists 3 rows. New file `src/components/top-movers.tsx`.
- `<CategorySparklines series={...} />` — grid container + repeated `<Sparkline points={...} />`. New file `src/components/category-sparklines.tsx`. Internal `<Sparkline>` is a small SVG-only subcomponent.
- `<YearRollupTable rows={...} />` — semantic `<table>`. New file `src/components/year-rollup-table.tsx`.
- Existing `<TrendsChart>` is reused for the totale section.

All four are server components (no client-side state needed); they receive already-computed data from the page.

### 4.7 Page composition

`app/trends/page.tsx` becomes:

```tsx
const data = await getTrendsData(12);
const series = groupByCategory(data.recent);
const movers = computeTopMovers(data.recent, 3);
const rollup = computeYearRollup(data.recent, data.prior);

return (
  <main ...>
    <Header back title="Andamento" />
    <Section title="Totale ultimi N cicli"><TrendsChart data={...} /></Section>
    {data.recent.length >= 2 && (
      <>
        <Section title="Top movimenti — ultimo ciclo vs precedente"><TopMovers movers={movers} /></Section>
        <Section title="Per categoria · N cicli"><CategorySparklines series={series} /></Section>
        <Section title="Riepilogo annuale"><YearRollupTable rows={rollup} /></Section>
      </>
    )}
  </main>
);
```

### 4.8 Italian copy

Add to `src/lib/copy.ts` under `trends`:
- `title`: stays `"Andamento"`
- `totalHeading(n: number)`: `\`Totale ultimi ${n} cicli\``
- `moversHeading`: `"Top movimenti — ultimo ciclo vs precedente"`
- `perCategoryHeading(n: number)`: `\`Per categoria · ${n} cicli\``
- `rollupHeading`: `"Riepilogo annuale"`
- `notEnoughCycles`: `"Disponibile dal secondo ciclo"`
- Table column labels: `"Categoria"`, `"Totale"`, `"Media"`, `"Δ"`

## 5. Dashboard link to `/trends`

Currently `/trends` has no navigation entry. Add a small text link in the existing `<AppHeader>` next to the cycle navigator: `Andamento` (terra-700, body-small, underline on tap). Located adjacent to the kebab menu, not inside it — one tap, not two.

This is the only change to `<AppHeader>`.

## 6. Tests

### 6.1 Unit (TDD)

For each new pure function:
- `lib/forecast/compute.test.ts`:
  - mid-cycle with mixed fixed + variable categories: variable paces correctly, fixed projects at expected.
  - empty cycle (no expenses): forecast = total budget, hasData = false.
  - all-fixed cycle: forecast = sum of fixed expected_amount regardless of expenses.
  - past cycle (today after cycle.end): currently caller hides the row, but the function should still return a valid result equal to actuals.
  - leap year / clamped cycle boundaries (Feb 28/29 cases — reuse `lib/cycle/compute` test fixtures).
- `lib/trends/group-by-category.test.ts`:
  - rename mid-window: produces the latest display name; data points align to cycle order.
  - accent + case differences fold to the same key.
- `lib/trends/top-movers.test.ts`:
  - sorts by absolute delta; signed values preserved; limit honored.
  - missing category in one cycle counts as zero (delta = full value of the other).
- `lib/trends/year-rollup.test.ts`:
  - Δ % calculation with non-zero prior; null when prior window has no data; suppression at < 2%.

### 6.2 Integration

`tests/integration/trends-query.test.ts`:
- Seed 14 cycles for one user. Verify `getTrendsData(12)` returns 12 in `recent` and the next 2 (oldest available) in `prior`.
- Verify RLS: a second user's cycles are not returned.
- Verify renamed-mid-window category appears as one normalized series.

### 6.3 E2E (Playwright)

`tests/e2e/trends.spec.ts`:
- Seed at least 3 cycles; visit `/trends`; assert all four sections render and at least one sparkline element exists.
- Visit `/` and tap the new `Andamento` link in the header; assert navigation to `/trends`.

## 7. File-level change inventory

```
new   src/lib/forecast/compute.ts
new   src/lib/forecast/compute.test.ts
new   src/lib/trends/types.ts
new   src/lib/trends/group-by-category.ts
new   src/lib/trends/group-by-category.test.ts
new   src/lib/trends/top-movers.ts
new   src/lib/trends/top-movers.test.ts
new   src/lib/trends/year-rollup.ts
new   src/lib/trends/year-rollup.test.ts
new   src/lib/trends/index.ts
new   src/components/top-movers.tsx
new   src/components/category-sparklines.tsx
new   src/components/year-rollup-table.tsx
new   tests/integration/trends-query.test.ts
new   tests/e2e/trends.spec.ts

mod   src/components/pacing-bar.tsx                (append forecast row)
mod   src/components/app-header.tsx                (add /trends link)
mod   src/server/queries/dashboard.ts              (return occurred_on on expenses)
mod   src/server/queries/trends.ts                 (replace getTrendCycles with getTrendsData)
mod   src/app/page.tsx                             (compute forecast, pass to PacingBar)
mod   src/app/trends/page.tsx                      (four-section layout)
mod   src/lib/copy.ts                              (forecast + trends strings)

del   nothing yet — old getTrendCycles is replaced in trends.ts; the old TrendCycle type goes with it.
```

## 8. Out of scope (carried forward)

Per the user's input on 2026-05-05:
- No notifications of any kind (cycle rollover, pacing alerts, etc.).
- No iOS PWA work — Android only.
- No removal of `is_fixed` or manual entry — both stay.
- No drill-down from a sparkline into a category detail.
- No tracking of forecast accuracy over time.

These can be revisited in a later plan.
