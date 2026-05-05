# Forecast + Trends Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an end-of-cycle spending forecast inside the existing "Andamento ciclo" card, expand `/trends` from one bar chart into four sections (totale, top movers, per-category sparklines, year rollup), and link `/trends` from the dashboard. No schema changes.

**Architecture:** Two pure libs (`src/lib/forecast/`, `src/lib/trends/`) hold all math. One server query (`getTrendsData`) replaces `getTrendCycles` with a richer batched read. UI changes are confined to `<PacingBar>`, `<AppHeader>`, `app/trends/page.tsx`, and three new presentational components. Forecast surfaces only on the current cycle.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 + shadcn primitives, Vitest, Playwright, Supabase. Sparklines are raw SVG (no charts library added).

**Spec:** `docs/superpowers/specs/2026-05-05-forecast-trends-design.md`

---

## File structure

**New files:**

| Path | Purpose |
|---|---|
| `src/lib/forecast/compute.ts` | Pure: `computeForecast(input)` returns per-category projection + cycle total + delta vs budget. |
| `src/lib/trends/types.ts` | Shared types: `CycleSummary`, `CategorySeries`, `TopMover`, `YearRollupRow`. |
| `src/lib/trends/group-by-category.ts` | Pure: collapses per-cycle category lists into a series per category (joined by `foldName`). |
| `src/lib/trends/top-movers.ts` | Pure: € deltas between last cycle and the one before it, sorted by absolute delta. |
| `src/lib/trends/year-rollup.ts` | Pure: per-category total/average over recent window, % delta vs prior window. |
| `src/lib/trends/index.ts` | Barrel re-export. |
| `src/components/top-movers.tsx` | Server component: presentational list of 3 mover rows. |
| `src/components/category-sparklines.tsx` | Server component: small-multiples grid + inline `<Sparkline>` SVG subcomponent. |
| `src/components/year-rollup-table.tsx` | Server component: semantic `<table>`. |
| `tests/unit/forecast.test.ts` | Unit tests for `computeForecast`. |
| `tests/unit/trends/group-by-category.test.ts` | Unit tests for `groupByCategory`. |
| `tests/unit/trends/top-movers.test.ts` | Unit tests for `computeTopMovers`. |
| `tests/unit/trends/year-rollup.test.ts` | Unit tests for `computeYearRollup`. |
| `tests/integration/trends-query.test.ts` | Integration tests for `getTrendsData` against local Supabase. |
| `tests/e2e/trends.spec.ts` | Playwright smoke for `/trends` and the dashboard link. |

**Modified files:**

| Path | Change |
|---|---|
| `src/components/pacing-bar.tsx` | Append optional forecast row below existing bars. |
| `src/components/app-header.tsx` | Insert "Andamento" link next to the cycle navigator. |
| `src/components/trends-chart.tsx` | Switch consumed shape from `TrendCycle` to `CycleSummary` (rename fields). |
| `src/server/queries/trends.ts` | Replace `getTrendCycles` with `getTrendsData(limit = 12)`. Old export deleted. |
| `src/app/page.tsx` | Compute forecast for the current cycle and pass it to `<PacingBar>`. |
| `src/app/trends/page.tsx` | Compose four sections; pass shaped data to each component. |
| `src/lib/copy.ts` | Add `forecast` and expand `trends` blocks. |

---

## Task 1 — Forecast pure lib (TDD)

**Files:**
- Create: `src/lib/forecast/compute.ts`
- Create: `tests/unit/forecast.test.ts`

- [ ] **Step 1: Create the forecast module skeleton with types**

Write `src/lib/forecast/compute.ts`:

```ts
import type { CycleRange } from "@/lib/cycle/compute";

export type ForecastCategory = {
  id: string;
  expectedAmount: number;
  isFixed: boolean;
};

export type ForecastExpense = {
  categoryId: string;
  amount: number;
  occurredOn: string;
};

export type ForecastInput = {
  cycle: CycleRange;
  categories: ForecastCategory[];
  expenses: ForecastExpense[];
};

export type CategoryForecast = { id: string; projected: number };

export type Forecast = {
  perCategory: CategoryForecast[];
  total: number;
  totalBudget: number;
  deltaVsBudget: number;
  hasData: boolean;
  anchorDate: string | null;
};

export function computeForecast(_input: ForecastInput): Forecast {
  throw new Error("not implemented");
}
```

- [ ] **Step 2: Write failing tests**

Write `tests/unit/forecast.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeForecast } from "@/lib/forecast/compute";

const cycle = { start: "2026-04-27", end: "2026-05-26" }; // 30 days inclusive

describe("computeForecast", () => {
  it("empty cycle: forecast equals total budget, hasData false", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "a", expectedAmount: 500, isFixed: false },
        { id: "b", expectedAmount: 850, isFixed: true },
      ],
      expenses: [],
    });
    expect(f.totalBudget).toBeCloseTo(1350);
    expect(f.total).toBeCloseTo(1350);
    expect(f.deltaVsBudget).toBeCloseTo(0);
    expect(f.hasData).toBe(false);
    expect(f.anchorDate).toBeNull();
  });

  it("fixed category projects at expected_amount regardless of actual spend", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "rent", expectedAmount: 850, isFixed: true },
      ],
      expenses: [
        { categoryId: "rent", amount: 850, occurredOn: "2026-04-30" },
      ],
    });
    expect(f.perCategory).toEqual([{ id: "rent", projected: 850 }]);
    expect(f.total).toBeCloseTo(850);
    expect(f.deltaVsBudget).toBeCloseTo(0);
    expect(f.hasData).toBe(true);
    expect(f.anchorDate).toBe("2026-04-30");
  });

  it("variable category paces from latest occurred_on, not today", () => {
    // 30-day cycle starting 2026-04-27. Latest expense on day 10 (2026-05-06).
    // Spent 100 by day 10 → projection = 100 × (30 / 10) = 300.
    const f = computeForecast({
      cycle,
      categories: [
        { id: "groceries", expectedAmount: 250, isFixed: false },
      ],
      expenses: [
        { categoryId: "groceries", amount: 60, occurredOn: "2026-05-01" },
        { categoryId: "groceries", amount: 40, occurredOn: "2026-05-06" },
      ],
    });
    expect(f.perCategory[0]!.projected).toBeCloseTo(300);
    expect(f.total).toBeCloseTo(300);
    expect(f.deltaVsBudget).toBeCloseTo(50);
    expect(f.hasData).toBe(true);
    expect(f.anchorDate).toBe("2026-05-06");
  });

  it("variable category with no expenses falls back to expected_amount", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "carb", expectedAmount: 100, isFixed: false },
        { id: "groceries", expectedAmount: 250, isFixed: false },
      ],
      expenses: [
        { categoryId: "carb", amount: 50, occurredOn: "2026-04-30" },
      ],
    });
    // carb: paced from day 4 of 30 → 50 × (30/4) = 375. groceries: fallback 250. total 625.
    expect(f.perCategory.find((c) => c.id === "carb")!.projected).toBeCloseTo(375);
    expect(f.perCategory.find((c) => c.id === "groceries")!.projected).toBeCloseTo(250);
    expect(f.total).toBeCloseTo(625);
    expect(f.totalBudget).toBeCloseTo(350);
    expect(f.deltaVsBudget).toBeCloseTo(275);
  });

  it("mixed fixed + variable cycle", () => {
    const f = computeForecast({
      cycle,
      categories: [
        { id: "rent", expectedAmount: 850, isFixed: true },
        { id: "groceries", expectedAmount: 250, isFixed: false },
      ],
      expenses: [
        { categoryId: "rent", amount: 850, occurredOn: "2026-05-01" },
        { categoryId: "groceries", amount: 100, occurredOn: "2026-05-11" },
      ],
    });
    // rent: fixed, projects 850. groceries: day 15 of 30, 100 × 2 = 200. total 1050.
    expect(f.perCategory.find((c) => c.id === "rent")!.projected).toBeCloseTo(850);
    expect(f.perCategory.find((c) => c.id === "groceries")!.projected).toBeCloseTo(200);
    expect(f.total).toBeCloseTo(1050);
    expect(f.deltaVsBudget).toBeCloseTo(-50);
    expect(f.anchorDate).toBe("2026-05-11");
  });

  it("anchor day clamped to cycle length when expense date exceeds cycle.end", () => {
    const f = computeForecast({
      cycle,
      categories: [{ id: "x", expectedAmount: 100, isFixed: false }],
      expenses: [{ categoryId: "x", amount: 100, occurredOn: "2026-06-15" }],
    });
    // anchor_elapsed clamped to 30 → projection = 100.
    expect(f.perCategory[0]!.projected).toBeCloseTo(100);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `pnpm test tests/unit/forecast.test.ts`
Expected: all 6 tests FAIL with `Error: not implemented`.

- [ ] **Step 4: Implement `computeForecast`**

Replace the contents of `src/lib/forecast/compute.ts`:

```ts
import type { CycleRange } from "@/lib/cycle/compute";

export type ForecastCategory = {
  id: string;
  expectedAmount: number;
  isFixed: boolean;
};

export type ForecastExpense = {
  categoryId: string;
  amount: number;
  occurredOn: string;
};

export type ForecastInput = {
  cycle: CycleRange;
  categories: ForecastCategory[];
  expenses: ForecastExpense[];
};

export type CategoryForecast = { id: string; projected: number };

export type Forecast = {
  perCategory: CategoryForecast[];
  total: number;
  totalBudget: number;
  deltaVsBudget: number;
  hasData: boolean;
  anchorDate: string | null;
};

function isoToUtc(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetweenInclusive(startISO: string, endISO: string): number {
  return Math.round((isoToUtc(endISO) - isoToUtc(startISO)) / 86_400_000) + 1;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeForecast(input: ForecastInput): Forecast {
  const totalBudget = input.categories.reduce((s, c) => s + c.expectedAmount, 0);
  const cycleLength = daysBetweenInclusive(input.cycle.start, input.cycle.end);

  const expensesByCategory = new Map<string, ForecastExpense[]>();
  for (const e of input.expenses) {
    const list = expensesByCategory.get(e.categoryId) ?? [];
    list.push(e);
    expensesByCategory.set(e.categoryId, list);
  }

  const allLatest = input.expenses
    .map((e) => e.occurredOn)
    .sort()
    .at(-1) ?? null;

  const perCategory: CategoryForecast[] = input.categories.map((c) => {
    if (c.isFixed) return { id: c.id, projected: c.expectedAmount };
    const exps = expensesByCategory.get(c.id) ?? [];
    if (exps.length === 0) return { id: c.id, projected: c.expectedAmount };
    const actual = exps.reduce((s, e) => s + e.amount, 0);
    const latest = exps.map((e) => e.occurredOn).sort().at(-1)!;
    const elapsed = clamp(
      Math.round((isoToUtc(latest) - isoToUtc(input.cycle.start)) / 86_400_000) + 1,
      1,
      cycleLength,
    );
    return { id: c.id, projected: actual * (cycleLength / elapsed) };
  });

  const total = perCategory.reduce((s, p) => s + p.projected, 0);
  return {
    perCategory,
    total,
    totalBudget,
    deltaVsBudget: total - totalBudget,
    hasData: input.expenses.length > 0,
    anchorDate: allLatest,
  };
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm test tests/unit/forecast.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm typecheck`
Expected: zero errors.

```bash
git add src/lib/forecast/ tests/unit/forecast.test.ts
git commit -m "feat(forecast): add pure end-of-cycle forecast lib"
```

---

## Task 2 — Forecast Italian copy

**Files:**
- Modify: `src/lib/copy.ts:53-53` (insert before `expense:` block)

- [ ] **Step 1: Add forecast strings**

In `src/lib/copy.ts`, locate the `dashboard` object and add three keys at the bottom of it (just before the closing `},` and the `expense:` line):

```ts
    forecastLabel: "Previsione fine ciclo",
    forecastDeltaOver: (amount: string) => `+ ${amount} sopra il budget`,
    forecastDeltaUnder: (amount: string) => `− ${amount} sotto il budget`,
```

The `dashboard` block should now end with `noTransactions: "Nessuna transazione."`, then those three keys, then `},`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/copy.ts
git commit -m "feat(copy): add forecast strings to dashboard block"
```

---

## Task 3 — `<PacingBar>` forecast row

**Files:**
- Modify: `src/components/pacing-bar.tsx`

- [ ] **Step 1: Update the component to accept an optional forecast prop and render variant α**

Replace the contents of `src/components/pacing-bar.tsx`:

```tsx
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";

type Props = {
  percentConsumed: number;
  cycleProgress: number;
  paceDelta: number;
  forecast?: { total: number; deltaVsBudget: number; hasData: boolean } | null;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => `${clamp(n) * 100}%`;

export function PacingBar({ percentConsumed, cycleProgress, paceDelta, forecast }: Props) {
  const under = paceDelta <= 0;
  const status = under ? copy.dashboard.pacingUnder : copy.dashboard.pacingOver;
  const statusClass = under ? "text-sage-600" : "text-sienna-600";
  const spendBarClass = under ? "bg-sage-500" : "bg-sienna-500";

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      role="group"
      aria-label={copy.dashboard.pacingTitle}
    >
      <div className="flex items-baseline justify-between">
        <strong className="font-display text-lg text-text-primary">
          {copy.dashboard.pacingTitle}
        </strong>
        <span className={`text-sm ${statusClass}`}>{status}</span>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between font-mono text-[0.7rem] tabular-nums text-text-muted">
            <span>{copy.dashboard.pacingTime}</span>
            <span>{(clamp(cycleProgress) * 100).toFixed(0)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-border-muted"
            role="progressbar"
            aria-label={copy.dashboard.pacingTime}
            aria-valuenow={Math.round(clamp(cycleProgress) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-clay-500 transition-[width] duration-500"
              style={{ width: pct(cycleProgress) }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between font-mono text-[0.7rem] tabular-nums text-text-muted">
            <span>{copy.dashboard.pacingExpense}</span>
            <span>{(clamp(percentConsumed) * 100).toFixed(1)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-border-muted"
            role="progressbar"
            aria-label={copy.dashboard.pacingExpense}
            aria-valuenow={Math.round(clamp(percentConsumed) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${spendBarClass}`}
              style={{ width: pct(percentConsumed) }}
            />
          </div>
        </div>
      </div>

      {forecast && (
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed border-border-muted pt-3">
          <span className="text-sm text-text-muted">{copy.dashboard.forecastLabel}</span>
          <span className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-display text-base text-text-primary tabular-nums">
              {formatEur(forecast.total)}
            </span>
            {forecast.hasData && Math.abs(forecast.deltaVsBudget) >= 0.005 && (
              <span
                className={`text-xs font-medium tabular-nums ${
                  forecast.deltaVsBudget > 0 ? "text-sienna-600" : "text-sage-600"
                }`}
              >
                {forecast.deltaVsBudget > 0
                  ? copy.dashboard.forecastDeltaOver(formatEur(forecast.deltaVsBudget))
                  : copy.dashboard.forecastDeltaUnder(formatEur(Math.abs(forecast.deltaVsBudget)))}
              </span>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/pacing-bar.tsx
git commit -m "feat(pacing-bar): render optional forecast row below bars"
```

---

## Task 4 — Wire forecast into the dashboard page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Compute forecast for current cycle, pass to PacingBar**

Replace the contents of `src/app/page.tsx`:

```tsx
import { getDashboardForToday } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/kpi-card";
import { PacingBar } from "@/components/pacing-bar";
import { CategoryRow } from "@/components/category-row";
import { AppHeader } from "@/components/app-header";
import { Fab } from "@/components/fab";
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { computeCycleForDate, nextCycle, prevCycle } from "@/lib/cycle/compute";
import { computeForecast } from "@/lib/forecast/compute";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const sp = await searchParams;
  const cycleParam = typeof sp.cycle === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.cycle) ? sp.cycle : undefined;
  const data = await getDashboardForToday(today, cycleParam);
  if (!data) redirect("/login");

  const startDay = data.profile.cycleStartDay;
  const prevStart = prevCycle(data.cycle.range, startDay).start;
  const nextStart = nextCycle(data.cycle.range, startDay).start;
  const todayCycle = computeCycleForDate(today, startDay);
  const isCurrentCycle = data.cycle.range.start === todayCycle.start;

  const forecast = isCurrentCycle
    ? computeForecast({
        cycle: data.cycle.range,
        categories: data.categories.map((c) => ({
          id: c.id,
          expectedAmount: c.expectedAmount,
          isFixed: c.isFixed,
        })),
        expenses: data.expenses.map((e) => ({
          categoryId: e.categoryId,
          amount: e.amount,
          occurredOn: e.occurredOn,
        })),
      })
    : null;

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const c = copy.dashboard;

  return (
    <>
      <AppHeader
        displayName={data.profile.displayName}
        range={data.cycle.range}
        prevCycleStart={prevStart}
        nextCycleStart={nextStart}
        isCurrentCycle={isCurrentCycle}
      />
      <main className="mx-auto max-w-3xl space-y-3 p-4 pb-24">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label={c.salary} primary={data.cycle.salary ?? 0} />
          <KpiCard label={c.percentSalary} primary={pct(data.kpi.percentOfSalarySpent)} />
          <KpiCard label={c.spent} primary={data.kpi.totalSpent} secondary={c.onBudget(formatEur(data.kpi.totalBudget))} />
          <KpiCard label={c.remaining} primary={data.kpi.totalRemaining} secondary={c.consumed(pct(data.kpi.percentConsumed))} />
        </section>
        <PacingBar
          percentConsumed={data.kpi.percentConsumed}
          cycleProgress={data.kpi.cycleProgress}
          paceDelta={data.kpi.paceDelta}
          forecast={forecast}
        />
        <section className="space-y-2">
          <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
            {copy.dashboard.categoriesHeading} · {data.categories.length}
          </h2>
          {data.categories.map((cat) => {
            const k = data.kpi.byCategory.find((x) => x.id === cat.id);
            if (!k) return null;
            const txs = data.expenses.filter((e) => e.categoryId === cat.id);
            return (
              <CategoryRow
                key={cat.id}
                name={cat.name}
                expected={cat.expectedAmount}
                actual={k.actual}
                isFixed={cat.isFixed}
                overBudget={k.overBudget}
                transactions={txs}
              />
            );
          })}
          {data.categories.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-text-muted">
                {copy.dashboard.noCategories}{" "}
                <Link href="/categories" className="font-medium text-accent underline-offset-4 hover:underline">
                  {copy.dashboard.addOne}
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      </main>
      <Fab />
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Manual smoke**

Start the dev server: `pnpm dev`. In a browser at 375×812 (mobile viewport), log in and verify:
- The "Andamento ciclo" card shows the forecast row with `Previsione fine ciclo` and a euro amount.
- Navigate to a previous cycle via the chevrons. The forecast row disappears.
- Return to the current cycle. The row reappears.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(dashboard): show end-of-cycle forecast on current cycle"
```

---

## Task 5 — Trends shared types and `groupByCategory` (TDD)

**Files:**
- Create: `src/lib/trends/types.ts`
- Create: `src/lib/trends/group-by-category.ts`
- Create: `tests/unit/trends/group-by-category.test.ts`

- [ ] **Step 1: Define shared types**

Write `src/lib/trends/types.ts`:

```ts
export type CategoryAtCycle = {
  name: string;
  spent: number;
  budget: number;
};

export type CycleSummary = {
  startDate: string;
  totalSpent: number;
  totalBudget: number;
  perCategory: CategoryAtCycle[];
};

export type CategoryDataPoint = {
  startDate: string;
  spent: number;
  budget: number;
};

export type CategorySeries = {
  key: string;          // foldName(displayName) — stable across rename variants
  displayName: string;  // latest spelling
  points: CategoryDataPoint[];  // aligned to input cycle order; missing cycles → spent=0, budget=0
  averageSpent: number; // mean over present points only
};

export type TopMover = {
  key: string;
  displayName: string;
  delta: number; // signed €: positive = increased spend
};

export type YearRollupRow = {
  key: string;
  displayName: string;
  totalSpent: number;
  averageSpent: number;
  deltaPercent: number | null; // null when prior window has no data for this category
};
```

- [ ] **Step 2: Create the function skeleton**

Write `src/lib/trends/group-by-category.ts`:

```ts
import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, CategorySeries } from "./types";

export function groupByCategory(_cycles: CycleSummary[]): CategorySeries[] {
  void foldName;
  throw new Error("not implemented");
}
```

- [ ] **Step 3: Write failing tests**

Write `tests/unit/trends/group-by-category.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupByCategory } from "@/lib/trends/group-by-category";
import type { CycleSummary } from "@/lib/trends/types";

const c1: CycleSummary = {
  startDate: "2026-01-01",
  totalSpent: 100,
  totalBudget: 100,
  perCategory: [{ name: "Casa", spent: 100, budget: 100 }],
};
const c2: CycleSummary = {
  startDate: "2026-02-01",
  totalSpent: 220,
  totalBudget: 200,
  perCategory: [
    { name: "casa", spent: 120, budget: 100 }, // case-insensitive
    { name: "Carburante", spent: 100, budget: 80 },
  ],
};
const c3: CycleSummary = {
  startDate: "2026-03-01",
  totalSpent: 230,
  totalBudget: 220,
  perCategory: [
    { name: "Spese casa", spent: 130, budget: 120 }, // renamed
    { name: "Carburánte", spent: 100, budget: 80 },  // accent
  ],
};

describe("groupByCategory", () => {
  it("returns empty array on empty input", () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it("folds case and accents into a stable key but keeps the latest display name", () => {
    const out = groupByCategory([c1, c2, c3]);
    const casa = out.find((s) => s.points.length === 3);
    expect(casa).toBeDefined();
    expect(casa!.displayName).toBe("Spese casa");
    const carb = out.find((s) => s.displayName === "Carburánte");
    expect(carb).toBeDefined();
    // Carburante & Carburánte fold the same; latest is c3's spelling
    expect(carb!.points).toHaveLength(3);
  });

  it("missing cycles for a category are filled with zero points aligned to input order", () => {
    const out = groupByCategory([c1, c2, c3]);
    const carb = out.find((s) => s.displayName === "Carburánte")!;
    expect(carb.points.map((p) => p.startDate)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(carb.points[0]).toEqual({ startDate: "2026-01-01", spent: 0, budget: 0 });
  });

  it("computes averageSpent across present cycles only", () => {
    const out = groupByCategory([c1, c2, c3]);
    const carb = out.find((s) => s.displayName === "Carburánte")!;
    // present in 2 of 3 cycles, both 100 → average 100
    expect(carb.averageSpent).toBeCloseTo(100);
  });

  it("returns series sorted alphabetically by display name", () => {
    const out = groupByCategory([c1, c2, c3]);
    const names = out.map((s) => s.displayName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "it"));
    expect(names).toEqual(sorted);
  });
});
```

- [ ] **Step 4: Run tests, verify they fail**

Run: `pnpm test tests/unit/trends/group-by-category.test.ts`
Expected: 5 tests FAIL with `Error: not implemented` (the empty-input test will likely also fail because of the throw).

- [ ] **Step 5: Implement `groupByCategory`**

Replace the contents of `src/lib/trends/group-by-category.ts`:

```ts
import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, CategorySeries, CategoryDataPoint } from "./types";

export function groupByCategory(cycles: CycleSummary[]): CategorySeries[] {
  if (cycles.length === 0) return [];

  type Bucket = { displayName: string; latestStart: string; presentByDate: Map<string, { spent: number; budget: number }> };
  const buckets = new Map<string, Bucket>();

  for (const cycle of cycles) {
    for (const cat of cycle.perCategory) {
      const key = foldName(cat.name);
      const existing = buckets.get(key);
      if (existing) {
        if (cycle.startDate >= existing.latestStart) {
          existing.displayName = cat.name;
          existing.latestStart = cycle.startDate;
        }
        existing.presentByDate.set(cycle.startDate, { spent: cat.spent, budget: cat.budget });
      } else {
        buckets.set(key, {
          displayName: cat.name,
          latestStart: cycle.startDate,
          presentByDate: new Map([[cycle.startDate, { spent: cat.spent, budget: cat.budget }]]),
        });
      }
    }
  }

  const orderedDates = cycles.map((c) => c.startDate);

  const series: CategorySeries[] = [];
  for (const [key, b] of buckets) {
    const points: CategoryDataPoint[] = orderedDates.map((d) => {
      const hit = b.presentByDate.get(d);
      return hit ? { startDate: d, ...hit } : { startDate: d, spent: 0, budget: 0 };
    });
    const presentValues = [...b.presentByDate.values()].map((v) => v.spent);
    const averageSpent = presentValues.length === 0
      ? 0
      : presentValues.reduce((s, v) => s + v, 0) / presentValues.length;
    series.push({ key, displayName: b.displayName, points, averageSpent });
  }

  series.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
  return series;
}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pnpm test tests/unit/trends/group-by-category.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm typecheck`
Expected: zero errors.

```bash
git add src/lib/trends/types.ts src/lib/trends/group-by-category.ts tests/unit/trends/group-by-category.test.ts
git commit -m "feat(trends): add groupByCategory pure lib"
```

---

## Task 6 — `computeTopMovers` (TDD)

**Files:**
- Create: `src/lib/trends/top-movers.ts`
- Create: `tests/unit/trends/top-movers.test.ts`

- [ ] **Step 1: Skeleton**

Write `src/lib/trends/top-movers.ts`:

```ts
import type { CycleSummary, TopMover } from "./types";

export function computeTopMovers(_cycles: CycleSummary[], _limit = 3): TopMover[] {
  throw new Error("not implemented");
}
```

- [ ] **Step 2: Failing tests**

Write `tests/unit/trends/top-movers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeTopMovers } from "@/lib/trends/top-movers";
import type { CycleSummary } from "@/lib/trends/types";

const prev: CycleSummary = {
  startDate: "2026-01-01",
  totalSpent: 0,
  totalBudget: 0,
  perCategory: [
    { name: "Casa", spent: 200, budget: 250 },
    { name: "Carburante", spent: 100, budget: 100 },
    { name: "Regali", spent: 150, budget: 100 },
  ],
};
const last: CycleSummary = {
  startDate: "2026-02-01",
  totalSpent: 0,
  totalBudget: 0,
  perCategory: [
    { name: "Casa", spent: 420, budget: 250 },     // +220
    { name: "Carburante", spent: 185, budget: 100 }, // +85
    { name: "Regali", spent: 40, budget: 100 },     // -110
    { name: "Spesa", spent: 50, budget: 100 },      // +50 (new)
  ],
};

describe("computeTopMovers", () => {
  it("returns empty when fewer than 2 cycles", () => {
    expect(computeTopMovers([])).toEqual([]);
    expect(computeTopMovers([last])).toEqual([]);
  });

  it("ranks by absolute delta and keeps signs", () => {
    const movers = computeTopMovers([prev, last], 3);
    expect(movers).toHaveLength(3);
    expect(movers[0]!.displayName).toBe("Casa");
    expect(movers[0]!.delta).toBeCloseTo(220);
    expect(movers[1]!.displayName).toBe("Regali");
    expect(movers[1]!.delta).toBeCloseTo(-110);
    expect(movers[2]!.displayName).toBe("Carburante");
    expect(movers[2]!.delta).toBeCloseTo(85);
  });

  it("treats categories absent in one cycle as zero on that side", () => {
    const movers = computeTopMovers([prev, last], 5);
    const spesa = movers.find((m) => m.displayName === "Spesa");
    expect(spesa?.delta).toBeCloseTo(50);
  });

  it("honors the limit argument", () => {
    expect(computeTopMovers([prev, last], 1)).toHaveLength(1);
    expect(computeTopMovers([prev, last], 2)).toHaveLength(2);
  });

  it("uses only the last two cycles when more are provided", () => {
    const earlier: CycleSummary = {
      startDate: "2025-12-01",
      totalSpent: 0,
      totalBudget: 0,
      perCategory: [{ name: "Casa", spent: 9999, budget: 0 }],
    };
    const movers = computeTopMovers([earlier, prev, last], 3);
    expect(movers[0]!.displayName).toBe("Casa");
    expect(movers[0]!.delta).toBeCloseTo(220); // last vs prev, not last vs earlier
  });

  it("folds names case-insensitively for matching", () => {
    const a: CycleSummary = { startDate: "2026-01-01", totalSpent: 0, totalBudget: 0, perCategory: [{ name: "Casa", spent: 100, budget: 0 }] };
    const b: CycleSummary = { startDate: "2026-02-01", totalSpent: 0, totalBudget: 0, perCategory: [{ name: "casa", spent: 250, budget: 0 }] };
    expect(computeTopMovers([a, b])[0]!.delta).toBeCloseTo(150);
  });
});
```

- [ ] **Step 3: Run, see fail**

Run: `pnpm test tests/unit/trends/top-movers.test.ts`
Expected: tests FAIL.

- [ ] **Step 4: Implement**

Replace the contents of `src/lib/trends/top-movers.ts`:

```ts
import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, TopMover } from "./types";

export function computeTopMovers(cycles: CycleSummary[], limit = 3): TopMover[] {
  if (cycles.length < 2) return [];
  const prev = cycles[cycles.length - 2]!;
  const last = cycles[cycles.length - 1]!;

  const merged = new Map<string, { displayName: string; prev: number; last: number }>();

  for (const c of prev.perCategory) {
    const key = foldName(c.name);
    merged.set(key, { displayName: c.name, prev: c.spent, last: 0 });
  }
  for (const c of last.perCategory) {
    const key = foldName(c.name);
    const existing = merged.get(key);
    if (existing) {
      existing.last = c.spent;
      existing.displayName = c.name; // prefer latest spelling
    } else {
      merged.set(key, { displayName: c.name, prev: 0, last: c.spent });
    }
  }

  const movers: TopMover[] = [];
  for (const [key, v] of merged) {
    movers.push({ key, displayName: v.displayName, delta: v.last - v.prev });
  }
  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return movers.slice(0, limit);
}
```

- [ ] **Step 5: Run, see pass**

Run: `pnpm test tests/unit/trends/top-movers.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trends/top-movers.ts tests/unit/trends/top-movers.test.ts
git commit -m "feat(trends): add computeTopMovers pure lib"
```

---

## Task 7 — `computeYearRollup` (TDD)

**Files:**
- Create: `src/lib/trends/year-rollup.ts`
- Create: `tests/unit/trends/year-rollup.test.ts`

- [ ] **Step 1: Skeleton**

Write `src/lib/trends/year-rollup.ts`:

```ts
import type { CycleSummary, YearRollupRow } from "./types";

export function computeYearRollup(_recent: CycleSummary[], _prior: CycleSummary[]): YearRollupRow[] {
  throw new Error("not implemented");
}
```

- [ ] **Step 2: Failing tests**

Write `tests/unit/trends/year-rollup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeYearRollup } from "@/lib/trends/year-rollup";
import type { CycleSummary } from "@/lib/trends/types";

const recentCycle = (start: string, casa: number, carb: number): CycleSummary => ({
  startDate: start,
  totalSpent: casa + carb,
  totalBudget: 0,
  perCategory: [
    { name: "Casa", spent: casa, budget: 0 },
    { name: "Carburante", spent: carb, budget: 0 },
  ],
});

describe("computeYearRollup", () => {
  it("returns one row per category in the recent window, alphabetical", () => {
    const rows = computeYearRollup([recentCycle("2026-01-01", 100, 50)], []);
    expect(rows.map((r) => r.displayName)).toEqual(["Carburante", "Casa"]);
  });

  it("sums totals and averages over the recent window only", () => {
    const recent = [recentCycle("2026-01-01", 100, 50), recentCycle("2026-02-01", 200, 50)];
    const rows = computeYearRollup(recent, []);
    const casa = rows.find((r) => r.displayName === "Casa")!;
    expect(casa.totalSpent).toBeCloseTo(300);
    expect(casa.averageSpent).toBeCloseTo(150);
  });

  it("computes deltaPercent against prior window mean", () => {
    const prior = [recentCycle("2025-11-01", 100, 50), recentCycle("2025-12-01", 100, 50)];
    const recent = [recentCycle("2026-01-01", 110, 60), recentCycle("2026-02-01", 110, 60)];
    const rows = computeYearRollup(recent, prior);
    const casa = rows.find((r) => r.displayName === "Casa")!;
    expect(casa.deltaPercent).toBeCloseTo(0.10, 3); // 10% increase
  });

  it("returns null deltaPercent when prior window is empty", () => {
    const rows = computeYearRollup([recentCycle("2026-01-01", 100, 50)], []);
    expect(rows.every((r) => r.deltaPercent === null)).toBe(true);
  });

  it("returns null deltaPercent when prior mean for a category is zero", () => {
    const prior: CycleSummary[] = [{
      startDate: "2025-12-01",
      totalSpent: 0,
      totalBudget: 0,
      perCategory: [{ name: "Casa", spent: 0, budget: 0 }],
    }];
    const recent = [recentCycle("2026-01-01", 100, 50)];
    const rows = computeYearRollup(recent, prior);
    const casa = rows.find((r) => r.displayName === "Casa")!;
    expect(casa.deltaPercent).toBeNull();
  });

  it("returns deltaPercent = 0 (not null) for matched categories with zero change", () => {
    const prior = [recentCycle("2025-12-01", 100, 50)];
    const recent = [recentCycle("2026-01-01", 100, 50)];
    const rows = computeYearRollup(recent, prior);
    expect(rows.find((r) => r.displayName === "Casa")!.deltaPercent).toBeCloseTo(0);
  });

  it("does not include categories that exist only in the prior window", () => {
    const prior: CycleSummary[] = [{
      startDate: "2025-12-01",
      totalSpent: 0,
      totalBudget: 0,
      perCategory: [{ name: "Vacanze", spent: 800, budget: 0 }],
    }];
    const recent = [recentCycle("2026-01-01", 100, 50)];
    const rows = computeYearRollup(recent, prior);
    expect(rows.find((r) => r.displayName === "Vacanze")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run, see fail**

Run: `pnpm test tests/unit/trends/year-rollup.test.ts`
Expected: tests FAIL.

- [ ] **Step 4: Implement**

Replace the contents of `src/lib/trends/year-rollup.ts`:

```ts
import { foldName } from "@/lib/import/normalize";
import type { CycleSummary, YearRollupRow } from "./types";

function aggregate(cycles: CycleSummary[]): Map<string, { displayName: string; total: number; count: number }> {
  const m = new Map<string, { displayName: string; total: number; count: number }>();
  for (const cycle of cycles) {
    for (const cat of cycle.perCategory) {
      const key = foldName(cat.name);
      const existing = m.get(key);
      if (existing) {
        existing.total += cat.spent;
        existing.count += 1;
        if (cycle.startDate >= cycles[cycles.length - 1]!.startDate) {
          existing.displayName = cat.name;
        }
      } else {
        m.set(key, { displayName: cat.name, total: cat.spent, count: 1 });
      }
    }
  }
  return m;
}

export function computeYearRollup(recent: CycleSummary[], prior: CycleSummary[]): YearRollupRow[] {
  const recentAgg = aggregate(recent);
  const priorAgg = aggregate(prior);

  const rows: YearRollupRow[] = [];
  for (const [key, r] of recentAgg) {
    const recentMean = r.count === 0 ? 0 : r.total / r.count;
    const p = priorAgg.get(key);
    const priorMean = p && p.count > 0 ? p.total / p.count : null;
    const deltaPercent =
      priorMean === null || priorMean === 0 ? null : (recentMean - priorMean) / priorMean;
    rows.push({
      key,
      displayName: r.displayName,
      totalSpent: r.total,
      averageSpent: recentMean,
      deltaPercent,
    });
  }

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
  return rows;
}
```

- [ ] **Step 5: Run, see pass**

Run: `pnpm test tests/unit/trends/year-rollup.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trends/year-rollup.ts tests/unit/trends/year-rollup.test.ts
git commit -m "feat(trends): add computeYearRollup pure lib"
```

---

## Task 8 — Trends barrel + run all unit tests

**Files:**
- Create: `src/lib/trends/index.ts`

- [ ] **Step 1: Barrel re-export**

Write `src/lib/trends/index.ts`:

```ts
export * from "./types";
export { groupByCategory } from "./group-by-category";
export { computeTopMovers } from "./top-movers";
export { computeYearRollup } from "./year-rollup";
```

- [ ] **Step 2: Run the full unit suite to confirm nothing broke**

Run: `pnpm test tests/unit/`
Expected: all unit tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/trends/index.ts
git commit -m "feat(trends): add barrel export"
```

---

## Task 9 — Replace `getTrendCycles` with `getTrendsData` (integration TDD)

**Files:**
- Modify: `src/server/queries/trends.ts`
- Modify: `src/components/trends-chart.tsx`
- Create: `tests/integration/trends-query.test.ts`

- [ ] **Step 1: Write the integration test**

The function `getTrendsData` reads via `getServerSupabase()`, which depends on Next.js cookies. We therefore verify the schema/seed/RLS behavior at the database level using the `admin()` and user-scoped clients from `_helpers.ts`. End-to-end exercise of `getTrendsData` itself happens through the Playwright test in Task 14.

Write `tests/integration/trends-query.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL_A = "alice-trends@test.local";
const EMAIL_B = "bob-trends@test.local";

async function seedCycle(
  userId: string,
  startDate: string,
  endDate: string,
  categories: Array<{ name: string; expected: number; spent: number[] }>,
) {
  const a = admin();
  const { data: cycle, error: cErr } = await a
    .from("cycles")
    .insert({ user_id: userId, start_date: startDate, end_date: endDate, salary: 2000 })
    .select("*").single();
  if (cErr || !cycle) throw cErr;
  for (const cat of categories) {
    const { data: catRow, error: catErr } = await a
      .from("categories")
      .insert({ cycle_id: cycle.id, name: cat.name, expected_amount: cat.expected })
      .select("*").single();
    if (catErr || !catRow) throw catErr;
    for (const amount of cat.spent) {
      await a.from("expenses").insert({
        cycle_id: cycle.id,
        category_id: catRow.id,
        amount,
        occurred_on: startDate,
      });
    }
  }
}

describe("trends seed + RLS (foundation for getTrendsData)", () => {
  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
    const alice = await createTestUser(EMAIL_A);
    aliceId = alice.id;
    for (let i = 0; i < 14; i++) {
      const month = String((i % 12) + 1).padStart(2, "0");
      const year = 2025 + Math.floor(i / 12);
      await seedCycle(aliceId, `${year}-${month}-01`, `${year}-${month}-28`, [
        { name: i < 7 ? "Casa" : "Spese casa", expected: 500, spent: [100 + i * 10] },
        { name: "Carburante", expected: 100, spent: [50] },
      ]);
    }
    const bob = await createTestUser(EMAIL_B);
    bobId = bob.id;
    await seedCycle(bobId, "2026-03-01", "2026-03-28", [
      { name: "BobOnly", expected: 1, spent: [1] },
    ]);
  }, 30000);

  afterAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
  });

  it("admin sees exactly 14 cycles for Alice", async () => {
    const { data } = await admin().from("cycles").select("id").eq("user_id", aliceId);
    expect(data).toHaveLength(14);
  });

  it("a category renamed mid-window is present at both names across cycles", async () => {
    const { data: cycles } = await admin()
      .from("cycles")
      .select("id, start_date")
      .eq("user_id", aliceId)
      .order("start_date");
    const earliest = cycles![0]!;
    const latest = cycles![cycles!.length - 1]!;
    const { data: earlyCats } = await admin().from("categories").select("name").eq("cycle_id", earliest.id);
    const { data: lateCats } = await admin().from("categories").select("name").eq("cycle_id", latest.id);
    expect(earlyCats!.some((c) => c.name === "Casa")).toBe(true);
    expect(lateCats!.some((c) => c.name === "Spese casa")).toBe(true);
  });

  it("RLS isolates Bob's BobOnly category from Alice's cycle id space", async () => {
    const { data: aliceCycles } = await admin().from("cycles").select("id").eq("user_id", aliceId);
    const aliceCycleIds = aliceCycles!.map((c) => c.id);
    const { data: aliceCats } = await admin().from("categories").select("name").in("cycle_id", aliceCycleIds);
    const names = new Set(aliceCats!.map((c) => c.name));
    expect(names.has("BobOnly")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test against a fresh local DB**

Run: `pnpm db:reset && pnpm test tests/integration/trends-query.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 3: Implement `getTrendsData`, delete `getTrendCycles`**

Replace the contents of `src/server/queries/trends.ts`:

```ts
import "server-only";
import { getServerSupabase } from "@/lib/db/server";
import type { CycleSummary } from "@/lib/trends/types";

export type TrendsData = {
  recent: CycleSummary[];
  prior: CycleSummary[];
};

export async function getTrendsData(limit = 12): Promise<TrendsData> {
  const supabase = await getServerSupabase();
  const { data: allCycles } = await supabase
    .from("cycles")
    .select("id, start_date")
    .order("start_date", { ascending: false })
    .limit(limit * 2);

  if (!allCycles || allCycles.length === 0) return { recent: [], prior: [] };

  const cycleIds = allCycles.map((c) => c.id);

  const { data: cats } = await supabase
    .from("categories")
    .select("id, cycle_id, name, expected_amount")
    .in("cycle_id", cycleIds);

  const { data: exps } = await supabase
    .from("expenses")
    .select("cycle_id, category_id, amount")
    .in("cycle_id", cycleIds);

  const spentByCategory = new Map<string, number>();
  for (const e of exps ?? []) {
    const cur = spentByCategory.get(e.category_id) ?? 0;
    spentByCategory.set(e.category_id, cur + Number(e.amount));
  }

  const catsByCycle = new Map<string, Array<{ name: string; spent: number; budget: number }>>();
  for (const c of cats ?? []) {
    const list = catsByCycle.get(c.cycle_id) ?? [];
    list.push({
      name: c.name,
      spent: spentByCategory.get(c.id) ?? 0,
      budget: Number(c.expected_amount),
    });
    catsByCycle.set(c.cycle_id, list);
  }

  const summaries: CycleSummary[] = allCycles.map((cycle) => {
    const perCategory = catsByCycle.get(cycle.id) ?? [];
    const totalSpent = perCategory.reduce((s, c) => s + c.spent, 0);
    const totalBudget = perCategory.reduce((s, c) => s + c.budget, 0);
    return { startDate: cycle.start_date, totalSpent, totalBudget, perCategory };
  });

  // allCycles is desc; recent (last `limit`) → ascending order in the array.
  const recent = summaries.slice(0, limit).reverse();
  const prior = summaries.slice(limit, limit * 2).reverse();
  return { recent, prior };
}
```

- [ ] **Step 4: Update `<TrendsChart>` to consume the new shape**

Replace the contents of `src/components/trends-chart.tsx`:

```tsx
"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format/eur";
import { copy } from "@/lib/copy";
import type { CycleSummary } from "@/lib/trends/types";

export function TrendsChart({ data }: { data: CycleSummary[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.924 0.022 60)" />
          <XAxis dataKey="startDate" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatEur(Number(v))} />
          <Tooltip formatter={(v) => formatEur(Number(v))} />
          <Legend />
          <Bar dataKey="totalBudget" name={copy.trends.budgetSeries} fill="oklch(0.648 0.052 60)" />
          <Bar dataKey="totalSpent" name={copy.trends.spentSeries} fill="oklch(0.581 0.133 38)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors. (`app/trends/page.tsx` will still import `getTrendCycles`/`TrendCycle` from the old export — those errors are addressed in Task 13.)

> **Caveat:** typecheck WILL fail with one error in `src/app/trends/page.tsx` because it still references the deleted exports. Treat that single error as expected. If any OTHER error appears, stop and fix it.

- [ ] **Step 6: Commit**

```bash
git add src/server/queries/trends.ts src/components/trends-chart.tsx tests/integration/trends-query.test.ts
git commit -m "feat(trends): replace getTrendCycles with batched getTrendsData"
```

---

## Task 10 — `<TopMovers>` component

**Files:**
- Create: `src/components/top-movers.tsx`

- [ ] **Step 1: Implement**

Write `src/components/top-movers.tsx`:

```tsx
import { formatEur } from "@/lib/format/eur";
import type { TopMover } from "@/lib/trends/types";

export function TopMovers({ movers }: { movers: TopMover[] }) {
  if (movers.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <ul className="divide-y divide-dashed divide-border-muted">
        {movers.map((m) => {
          const positive = m.delta >= 0;
          const sign = positive ? "+" : "−";
          return (
            <li key={m.key} className="flex items-baseline justify-between px-4 py-3">
              <span className="text-sm font-medium text-text-primary">{m.displayName}</span>
              <span
                className={`font-mono text-sm tabular-nums ${
                  positive ? "text-sienna-600" : "text-sage-600"
                }`}
              >
                {sign} {formatEur(Math.abs(m.delta))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: same single pre-existing error in `app/trends/page.tsx`; no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/top-movers.tsx
git commit -m "feat(trends): add TopMovers presentational component"
```

---

## Task 11 — `<CategorySparklines>` component

**Files:**
- Create: `src/components/category-sparklines.tsx`

- [ ] **Step 1: Implement**

Write `src/components/category-sparklines.tsx`:

```tsx
import { formatEur } from "@/lib/format/eur";
import type { CategorySeries } from "@/lib/trends/types";

const W = 60;
const H = 18;

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? W / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = H - (v / max) * (H - 2) - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-5 w-full"
      aria-hidden
    >
      <polyline points={points} fill="none" stroke="oklch(0.581 0.133 38)" strokeWidth="1.2" />
    </svg>
  );
}

export function CategorySparklines({ series, mediaLabel }: { series: CategorySeries[]; mediaLabel: string }) {
  if (series.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {series.map((s) => (
        <div key={s.key} className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <div className="truncate text-sm font-medium text-text-primary">{s.displayName}</div>
          <div className="mt-0.5 text-xs text-text-muted">
            {mediaLabel} {formatEur(s.averageSpent)}
          </div>
          <div className="mt-2">
            <Sparkline values={s.points.map((p) => p.spent)} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: same single pre-existing error; no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/category-sparklines.tsx
git commit -m "feat(trends): add CategorySparklines presentational component"
```

---

## Task 12 — `<YearRollupTable>` component

**Files:**
- Create: `src/components/year-rollup-table.tsx`

- [ ] **Step 1: Implement**

Write `src/components/year-rollup-table.tsx`:

```tsx
import { formatEur } from "@/lib/format/eur";
import type { YearRollupRow } from "@/lib/trends/types";

const NOISE_THRESHOLD = 0.02;

type Labels = {
  category: string;
  total: string;
  average: string;
  delta: string;
};

export function YearRollupTable({ rows, labels }: { rows: YearRollupRow[]; labels: Labels }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-muted text-left text-xs uppercase tracking-wider text-text-muted">
            <th className="px-3 py-2 font-medium">{labels.category}</th>
            <th className="px-3 py-2 text-right font-medium">{labels.total}</th>
            <th className="px-3 py-2 text-right font-medium">{labels.average}</th>
            <th className="px-3 py-2 text-right font-medium">{labels.delta}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            let deltaCell = "—";
            let deltaClass = "text-text-muted";
            if (r.deltaPercent !== null && Math.abs(r.deltaPercent) >= NOISE_THRESHOLD) {
              const pct = (r.deltaPercent * 100).toFixed(0);
              const sign = r.deltaPercent > 0 ? "+ " : "− ";
              deltaCell = `${sign}${Math.abs(Number(pct))}%`;
              deltaClass = r.deltaPercent > 0 ? "text-sienna-600" : "text-sage-600";
            }
            return (
              <tr key={r.key} className="border-b border-border-muted/50 last:border-b-0">
                <td className="px-3 py-2 text-text-primary">{r.displayName}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatEur(r.totalSpent)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatEur(r.averageSpent)}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${deltaClass}`}>{deltaCell}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: same single pre-existing error; no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/year-rollup-table.tsx
git commit -m "feat(trends): add YearRollupTable presentational component"
```

---

## Task 13 — Trends copy + page composition + dashboard link

**Files:**
- Modify: `src/lib/copy.ts`
- Modify: `src/app/trends/page.tsx`
- Modify: `src/components/app-header.tsx`

- [ ] **Step 1: Expand the trends copy block**

In `src/lib/copy.ts`, replace the existing `trends` block:

```ts
  trends: {
    title: "Andamento",
    needMoreData: "Servono almeno due cicli per vedere l'andamento.",
    notEnoughCycles: "Disponibile dal secondo ciclo",
    budgetSeries: "Budget",
    spentSeries: "Speso",
    totalHeading: (n: number) => `Totale ultimi ${n} cicli`,
    moversHeading: "Top movimenti — ultimo ciclo vs precedente",
    perCategoryHeading: (n: number) => `Per categoria · ${n} cicli`,
    rollupHeading: "Riepilogo annuale",
    tableCategory: "Categoria",
    tableTotal: "Totale",
    tableAverage: "Media",
    tableDelta: "Δ",
    averageLabel: "media",
    headerLink: "Andamento",
  },
```

- [ ] **Step 2: Rewrite the trends page with four sections**

Replace the contents of `src/app/trends/page.tsx`:

```tsx
import { getTrendsData } from "@/server/queries/trends";
import { TrendsChart } from "@/components/trends-chart";
import { TopMovers } from "@/components/top-movers";
import { CategorySparklines } from "@/components/category-sparklines";
import { YearRollupTable } from "@/components/year-rollup-table";
import { groupByCategory, computeTopMovers, computeYearRollup } from "@/lib/trends";
import { copy } from "@/lib/copy";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await getTrendsData(12);
  const recentCount = data.recent.length;

  if (recentCount === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
        <PageHeader />
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">{copy.trends.needMoreData}</p>
        </div>
      </main>
    );
  }

  const series = groupByCategory(data.recent);
  const movers = computeTopMovers(data.recent, 3);
  const rollup = computeYearRollup(data.recent, data.prior);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader />

      <section className="space-y-2">
        <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
          {copy.trends.totalHeading(recentCount)}
        </h2>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <TrendsChart data={data.recent} />
        </div>
      </section>

      {recentCount >= 2 ? (
        <>
          <section className="space-y-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.moversHeading}
            </h2>
            <TopMovers movers={movers} />
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.perCategoryHeading(recentCount)}
            </h2>
            <CategorySparklines series={series} mediaLabel={copy.trends.averageLabel} />
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.rollupHeading}
            </h2>
            <YearRollupTable
              rows={rollup}
              labels={{
                category: copy.trends.tableCategory,
                total: copy.trends.tableTotal,
                average: copy.trends.tableAverage,
                delta: copy.trends.tableDelta,
              }}
            />
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{copy.trends.notEnoughCycles}</p>
        </div>
      )}
    </main>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center gap-2">
      <BackLink label={copy.header.back} />
      <h1 className="font-display text-2xl text-text-primary">{copy.trends.title}</h1>
    </div>
  );
}
```

- [ ] **Step 3: Add a one-tap "Andamento" link to `<AppHeader>` next to (not inside) the kebab**

The spec requires the link be reachable in a single tap, not by opening the menu. Place a `<Link>` immediately before each `<ActionsMenu />` invocation, in both the mobile row and the desktop trailing slot.

Replace these two occurrences in `src/components/app-header.tsx`:

(a) The mobile slot. Find:

```tsx
          <div className="-mr-2 sm:hidden">
            <ActionsMenu />
          </div>
```

Replace with:

```tsx
          <div className="-mr-2 flex items-center gap-1 sm:hidden">
            <Link
              href="/trends"
              className={tapTarget}
              aria-label={copy.trends.headerLink}
              title={copy.trends.headerLink}
            >
              <LineChart className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </Link>
            <ActionsMenu />
          </div>
```

(b) The desktop slot. Find:

```tsx
        <div className="hidden sm:-mr-2 sm:flex sm:flex-1 sm:justify-end">
          <ActionsMenu />
        </div>
```

Replace with:

```tsx
        <div className="hidden sm:-mr-2 sm:flex sm:flex-1 sm:items-center sm:justify-end sm:gap-1">
          <Link
            href="/trends"
            className={tapTarget}
            aria-label={copy.trends.headerLink}
            title={copy.trends.headerLink}
          >
            <LineChart className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
          <ActionsMenu />
        </div>
```

Add `LineChart` to the `lucide-react` import:

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

This delivers the spec's "one-tap, adjacent to the kebab" requirement. The icon-only button preserves the 44×44 tap target (same `tapTarget` class as the chevrons) and avoids crowding the mobile header with text.

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: zero errors.

- [ ] **Step 5: Manual smoke**

Start the dev server: `pnpm dev`. With seeded cycles, visit `/trends` at the mobile viewport. Verify all four sections render. Tap "Andamento" from the kebab menu on `/`; verify navigation lands on `/trends`. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/lib/copy.ts src/app/trends/page.tsx src/components/app-header.tsx
git commit -m "feat(trends): four-section page + Andamento header link"
```

---

## Task 14 — Trends Playwright E2E

**Files:**
- Create: `tests/e2e/trends.spec.ts`

- [ ] **Step 1: Write the test**

Write `tests/e2e/trends.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("trends page renders sections after the dashboard creates a cycle", async ({ page }) => {
  const email = `trends+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Trender");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "1");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  await page.goto("/categories");
  await page.fill("[name=name]", "Spese casa");
  await page.fill("[name=expectedAmount]", "500");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Spese casa")).toBeVisible();

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "100");
  await page.selectOption("[name=categoryId]", { label: "Spese casa" });
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // The "Andamento" icon button is rendered as a Link with aria-label set
  // to copy.trends.headerLink ("Andamento"). Tap it directly — no dropdown.
  await page.getByRole("link", { name: "Andamento" }).first().click();
  await expect(page).toHaveURL(/\/trends$/);

  // Total chart heading is always rendered when at least one cycle exists.
  await expect(page.getByText(/Totale ultimi \d+ cicli/i)).toBeVisible();

  // With only one cycle, the "Disponibile dal secondo ciclo" hint is shown.
  await expect(page.getByText(/Disponibile dal secondo ciclo/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test**

Run: `pnpm test:e2e tests/e2e/trends.spec.ts`
Expected: PASS on both `mobile` and `desktop` projects.

If the role/name selector matches multiple links (e.g. another "Andamento" string lives in the page heading), narrow it via `page.locator('header').getByRole("link", { name: "Andamento" })`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/trends.spec.ts
git commit -m "test(e2e): trends page renders and is reachable from dashboard"
```

---

## Task 15 — Final verification + roadmap update

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Run the full local suite**

Run, in this exact order:

```bash
pnpm typecheck
pnpm lint
pnpm db:reset
pnpm test
pnpm test:e2e
pnpm audit --prod
```

Expected:
- `typecheck`: zero errors.
- `lint`: zero errors.
- `test`: all unit + integration green.
- `test:e2e`: all green on both projects.
- `audit --prod`: zero `high`/`critical` advisories.

If `audit --prod` reports anything new, address it before continuing (out of scope is acceptable only if it predates this branch).

- [ ] **Step 2: Update the roadmap with Plan 5 row**

In `docs/ROADMAP.md`, add a new row to the table after the Plan 4 row:

```
| 5 | ✅ Shipped | Forecast on dashboard + trends expansion | [`2026-05-05-forecast-trends.md`](superpowers/plans/2026-05-05-forecast-trends.md) |
```

Append a new section before the "Out of scope" section:

```markdown
---

## Plan 5 — Forecast + trends expansion (shipped 2026-05-05)

**Goal:** End-of-cycle forecast inside the existing "Andamento ciclo" card and a four-section `/trends` page (totale, top movers, per-category sparklines, year rollup) reachable from the dashboard kebab menu.

**Delivered:**
- Pure forecast lib (`src/lib/forecast/`) — anchors pacing on the latest expense `occurred_on`; fixed categories project at `expected_amount`; variable categories pace from current spend; empty cycle falls back to the budget total. Surfaces only on the current cycle.
- Pure trends lib (`src/lib/trends/`) — `groupByCategory` (joined via `foldName`), `computeTopMovers` (last cycle vs previous, ranked by absolute Δ), `computeYearRollup` (last 12 vs prior 12, % delta with 2% noise floor).
- Server query refactor: `getTrendCycles` replaced by `getTrendsData(12)`, batched with two `IN` queries instead of 24 round-trips.
- Three new presentational components: `<TopMovers>`, `<CategorySparklines>` (raw SVG, no extra dependency), `<YearRollupTable>`.
- "Andamento" entry in the header kebab menu.
- 5 forecast unit tests, 17 trends unit tests, 3 trends integration tests, 1 trends E2E test.

No schema changes. No new dependencies.
```

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): Plan 5 shipped — forecast + trends expansion"
```

- [ ] **Step 4: Sanity check the working tree**

Run: `git status`
Expected: clean working tree, branch ahead of `main` by 14 commits (one per task except Task 8 which has just the barrel).

---

## Task summary

| # | Task | Commits | Files touched |
|---|---|---|---|
| 1 | Forecast pure lib (TDD) | 1 | 2 new |
| 2 | Forecast Italian copy | 1 | 1 mod |
| 3 | `<PacingBar>` forecast row | 1 | 1 mod |
| 4 | Wire forecast into dashboard | 1 | 1 mod |
| 5 | Trends types + `groupByCategory` (TDD) | 1 | 3 new |
| 6 | `computeTopMovers` (TDD) | 1 | 2 new |
| 7 | `computeYearRollup` (TDD) | 1 | 2 new |
| 8 | Trends barrel | 1 | 1 new |
| 9 | `getTrendsData` query (integration) | 1 | 2 mod, 1 new |
| 10 | `<TopMovers>` component | 1 | 1 new |
| 11 | `<CategorySparklines>` component | 1 | 1 new |
| 12 | `<YearRollupTable>` component | 1 | 1 new |
| 13 | Trends copy + page + header link | 1 | 3 mod |
| 14 | Trends Playwright E2E | 1 | 1 new |
| 15 | Final verification + ROADMAP | 1 | 1 mod |

**Total commits:** 15. **No migrations.** **No new dependencies.**
