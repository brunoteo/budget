# % stipendio speso on /trends — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a per-cycle history of "% stipendio speso" (`totalSpent / salary`) as a line chart on `/trends`, below the existing budget-vs-spent bar chart.

**Architecture:** Extend the existing `lib/trends` pure-function layer with a `computeSalaryPercentSeries` function and a `salary` field on `CycleSummary`; thread `salary` through `getTrendsData`'s Supabase query; render a new recharts `LineChart` component and wire it into `/trends`' "Quest'anno" section.

**Tech Stack:** Next.js 16 Server Components, Supabase (Postgres), recharts, Vitest, Playwright.

## Global Constraints

- Italian-only UI copy — all new strings go in `src/lib/copy.ts`, never inline (see `CLAUDE.md`).
- Currency/date formatting only via `lib/format/*` — not applicable here (percentages, not currency), but percentages follow the same "no inline formatting duplication" spirit: reuse `formatMonthYear`-style helpers already established in `trends-chart.tsx`.
- Pure libraries under `lib/trends` import nothing from `next`, `react`, or `@supabase/*`.
- `pnpm typecheck && pnpm lint && pnpm test` must pass before any task is considered done.
- Metric basis: **salary only** (`cycles.salary`), not salary + extra income — confirmed design decision, do not use `percentOfTotalIncomeSpent`.
- Missing/zero salary on a cycle renders as a **gap** in the line (`percent: null`), never `0%`.
- No changes to the home dashboard's existing `% stipendio` tile (`src/app/page.tsx`).

---

### Task 1: `salary` field + pure `computeSalaryPercentSeries`

**Files:**
- Modify: `src/lib/trends/types.ts`
- Create: `src/lib/trends/salary-percent.ts`
- Modify: `src/lib/trends/index.ts`
- Test: `tests/unit/trends/salary-percent.test.ts`

**Interfaces:**
- Consumes: nothing new (pure).
- Produces: `CycleSummary.salary?: number | null` (optional — see note below), `SalaryPercentPoint = { startDate: string; percent: number | null }`, `computeSalaryPercentSeries(cycles: CycleSummary[]): SalaryPercentPoint[]`. Task 2 (query) and Task 3 (UI) both depend on these exact names.

**Note on `salary` being optional:** three existing test files (`tests/unit/trends/group-by-category.test.ts`, `top-movers.test.ts`, `year-rollup.test.ts`) construct `CycleSummary` object literals without a `salary` field. Making `salary: number | null` *required* would force editing ~10 unrelated fixture literals across those files for no behavioral reason. Instead, add it as **optional** (`salary?: number | null`) — `undefined` is treated identically to `null` (both mean "no salary data for this cycle"). This keeps existing tests untouched while `getTrendsData` (Task 2) always populates it going forward.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/trends/salary-percent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeSalaryPercentSeries } from "@/lib/trends/salary-percent";
import type { CycleSummary } from "@/lib/trends/types";

const base: Omit<CycleSummary, "salary"> = {
  startDate: "2026-01-01",
  totalSpent: 100,
  totalBudget: 200,
  perCategory: [],
};

describe("computeSalaryPercentSeries", () => {
  it("returns empty array on empty input", () => {
    expect(computeSalaryPercentSeries([])).toEqual([]);
  });

  it("computes spent/salary ratio when salary is set", () => {
    const cycles: CycleSummary[] = [{ ...base, salary: 2000 }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: 0.05 },
    ]);
  });

  it("returns null percent when salary is null", () => {
    const cycles: CycleSummary[] = [{ ...base, salary: null }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: null },
    ]);
  });

  it("returns null percent when salary is undefined (field absent)", () => {
    const cycles: CycleSummary[] = [{ ...base }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: null },
    ]);
  });

  it("returns null percent when salary is zero", () => {
    const cycles: CycleSummary[] = [{ ...base, salary: 0 }];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: null },
    ]);
  });

  it("preserves cycle order across multiple entries, mixing gaps and values", () => {
    const cycles: CycleSummary[] = [
      { ...base, startDate: "2026-01-01", totalSpent: 100, salary: 1000 },
      { ...base, startDate: "2026-02-01", totalSpent: 300, salary: null },
      { ...base, startDate: "2026-03-01", totalSpent: 400, salary: 800 },
    ];
    expect(computeSalaryPercentSeries(cycles)).toEqual([
      { startDate: "2026-01-01", percent: 0.1 },
      { startDate: "2026-02-01", percent: null },
      { startDate: "2026-03-01", percent: 0.5 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/trends/salary-percent.test.ts`
Expected: FAIL — `Cannot find module '@/lib/trends/salary-percent'` (file doesn't exist yet).

- [ ] **Step 3: Add the `salary` field and `SalaryPercentPoint` type**

Edit `src/lib/trends/types.ts` — add `salary` to `CycleSummary` and a new type after `CategoryAtCycle`:

```ts
export type CycleSummary = {
  startDate: string;
  totalSpent: number;
  totalBudget: number;
  perCategory: CategoryAtCycle[];
  salary?: number | null; // absent/null = no salary data for this cycle (renders as a chart gap)
};
```

Add at the end of the file:

```ts
export type SalaryPercentPoint = {
  startDate: string;
  percent: number | null; // null when the cycle has no salary set — renders as a chart gap
};
```

- [ ] **Step 4: Implement `computeSalaryPercentSeries`**

Create `src/lib/trends/salary-percent.ts`:

```ts
import type { CycleSummary, SalaryPercentPoint } from "./types";

export function computeSalaryPercentSeries(cycles: CycleSummary[]): SalaryPercentPoint[] {
  return cycles.map((c) => ({
    startDate: c.startDate,
    percent: c.salary && c.salary > 0 ? c.totalSpent / c.salary : null,
  }));
}
```

- [ ] **Step 5: Export from the barrel**

Edit `src/lib/trends/index.ts`:

```ts
export * from "./types";
export { groupByCategory } from "./group-by-category";
export { computeTopMovers } from "./top-movers";
export { computeYearRollup } from "./year-rollup";
export { computeSalaryPercentSeries } from "./salary-percent";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/trends/salary-percent.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Run the full unit suite to confirm no regressions in sibling fixtures**

Run: `pnpm vitest run tests/unit/trends`
Expected: PASS — `group-by-category.test.ts`, `top-movers.test.ts`, `year-rollup.test.ts` all still pass unmodified (optional field doesn't break their literals).

- [ ] **Step 8: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/trends/types.ts src/lib/trends/salary-percent.ts src/lib/trends/index.ts tests/unit/trends/salary-percent.test.ts
git commit -m "feat(trends): add computeSalaryPercentSeries for % stipendio history"
```

---

### Task 2: thread `salary` through `getTrendsData`

**Files:**
- Modify: `src/server/queries/trends.ts`

**Interfaces:**
- Consumes: `CycleSummary` (from Task 1, now with optional `salary`).
- Produces: `getTrendsData(limit?: number): Promise<TrendsData>` — same signature as before, but each `CycleSummary` in `recent`/`prior` now carries `salary: number | null`.

- [ ] **Step 1: Add `salary` to the Supabase select and map it onto `CycleSummary`**

Edit `src/server/queries/trends.ts`:

```ts
  const { data: allCycles } = await supabase
    .from("cycles")
    .select("id, start_date, salary")
    .order("start_date", { ascending: false })
    .limit(limit * 2);
```

And in the summary-building map:

```ts
  const summaries: CycleSummary[] = allCycles.map((cycle) => {
    const perCategory = catsByCycle.get(cycle.id) ?? [];
    const totalSpent = perCategory.reduce((s, c) => s + c.spent, 0);
    const totalBudget = perCategory.reduce((s, c) => s + c.budget, 0);
    const salary = cycle.salary === null ? null : Number(cycle.salary);
    return { startDate: cycle.start_date, totalSpent, totalBudget, perCategory, salary };
  });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. (`cycle.salary` comes back as `string | null` from the generated Supabase types for `numeric` columns — same pattern already used for `totalBudget`/`expected_amount` elsewhere in this file — `Number(...)` handles the conversion, matching the existing `Number(c.expected_amount)` and `Number(e.amount)` calls in this same file.)

- [ ] **Step 3: Run the integration test suite to confirm no regression**

Run: `pnpm test tests/integration/trends-query.test.ts`
Expected: PASS — this suite seeds cycles with `salary: 2000` already (`tests/integration/trends-query.test.ts:16`) and only asserts on `cycles`/`categories` rows directly via the admin client, not through `getTrendsData`, so it's unaffected by this change but confirms the seed data and RLS setup still hold.

- [ ] **Step 4: Commit**

```bash
git add src/server/queries/trends.ts
git commit -m "feat(trends): select cycle salary in getTrendsData"
```

---

### Task 3: copy, chart component, page wiring

**Files:**
- Modify: `src/lib/copy.ts`
- Create: `src/components/salary-percent-chart.tsx`
- Modify: `src/app/trends/page.tsx`

**Interfaces:**
- Consumes: `SalaryPercentPoint`, `computeSalaryPercentSeries` (Task 1); `data.recent: CycleSummary[]` with `salary` populated (Task 2); `copy.trends.salaryPercentHeading`, `copy.trends.salaryPercentNoData` (this task).
- Produces: `SalaryPercentChart({ data: SalaryPercentPoint[] })` component, rendered in `/trends`.

- [ ] **Step 1: Add copy strings**

Edit `src/lib/copy.ts`, in the `trends` section, right after `totalHeading: "Totale",`:

```ts
    totalHeading: "Totale",
    salaryPercentHeading: "% stipendio speso",
    salaryPercentNoData: "Nessun dato stipendio disponibile per questo periodo.",
```

- [ ] **Step 2: Create the chart component**

Create `src/components/salary-percent-chart.tsx`:

```tsx
"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalaryPercentPoint } from "@/lib/trends/types";

const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function formatMonthYear(iso: string): string {
  const [yStr, mStr] = iso.split("-");
  const m = Number(mStr);
  if (!yStr || !m || m < 1 || m > 12) return iso;
  return `${MONTHS_IT[m - 1]} '${yStr.slice(-2)}`;
}

export function SalaryPercentChart({ data }: { data: SalaryPercentPoint[] }) {
  const chartData = data.map((p) => ({
    startDate: p.startDate,
    percent: p.percent === null ? null : p.percent * 100,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.924 0.022 60)" vertical={false} />
          <XAxis
            dataKey="startDate"
            tick={{ fontSize: 11 }}
            tickFormatter={formatMonthYear}
            tickMargin={6}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`)}
            labelFormatter={(label) => (typeof label === "string" ? formatMonthYear(label) : String(label))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <ReferenceLine y={100} stroke="oklch(0.581 0.133 38)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="percent"
            stroke="oklch(0.581 0.133 38)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `/trends`**

Edit `src/app/trends/page.tsx` — add imports:

```tsx
import { groupByCategory, computeTopMovers, computeYearRollup, computeSalaryPercentSeries } from "@/lib/trends";
import { SalaryPercentChart } from "@/components/salary-percent-chart";
```

After `const rollup = computeYearRollup(data.recent, data.prior);` add:

```tsx
  const salaryPercent = computeSalaryPercentSeries(data.recent);
  const hasSalaryData = salaryPercent.some((p) => p.percent !== null);
```

Insert a new `<section>` right after the existing "Totale" section (after its closing `</section>`, before the `{recentCount >= 2 && (` block):

```tsx
        <section className="space-y-2">
          <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
            {copy.trends.salaryPercentHeading}
          </h3>
          {hasSalaryData ? (
            <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <SalaryPercentChart data={salaryPercent} />
            </div>
          ) : (
            <p className="text-sm text-text-muted">{copy.trends.salaryPercentNoData}</p>
          )}
        </section>
```

This section is un-gated by `recentCount` (same as the Totale bar chart above it) — shown whenever at least one cycle exists.

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manual verification in the browser**

Run: `pnpm dev`
- Visit `/trends` at 375×667 (mobile) and ≥1024px (desktop) for a user with no salary set on any cycle — confirm `copy.trends.salaryPercentNoData` placeholder shows under the "% stipendio speso" heading.
- Set a salary via `/settings` (the "Stipendio del ciclo corrente" form), add an expense, revisit `/trends` — confirm the line chart renders with a point, a dashed reference line at 100%, and the tooltip shows a formatted percentage on hover/tap.

- [ ] **Step 6: Commit**

```bash
git add src/lib/copy.ts src/components/salary-percent-chart.tsx src/app/trends/page.tsx
git commit -m "feat(trends): render % stipendio speso line chart on /trends"
```

---

### Task 4: E2E coverage

**Files:**
- Modify: `tests/e2e/trends.spec.ts`

**Interfaces:**
- Consumes: the rendered `/trends` page from Task 3 (heading text `copy.trends.salaryPercentHeading` = "% stipendio speso", no-data text `copy.trends.salaryPercentNoData`, `/settings` cycle-salary form with `input[name=salary]` and a "Salva" submit button, per `src/app/settings/_components/cycle-salary-form.tsx`).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Assert the no-data placeholder on the existing test (no salary set)**

Edit `tests/e2e/trends.spec.ts` — after the existing final assertion (`Disponibile dal secondo ciclo`), add:

```ts
  // No salary was ever set for this cycle — the new chart shows its placeholder, not a chart.
  await expect(page.getByRole("heading", { name: "% stipendio speso" })).toBeVisible();
  await expect(page.getByText(/Nessun dato stipendio disponibile/i)).toBeVisible();
```

- [ ] **Step 2: Write a new test for the salary-set case**

Append to `tests/e2e/trends.spec.ts`:

```ts
test("trends page shows the % stipendio speso chart once a salary is set", async ({ page }) => {
  const email = `trends-salary+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Salaried");
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

  await page.goto("/settings");
  const salaryForm = page.locator("form", { has: page.locator("input[name=salary]") });
  await salaryForm.locator("input[name=salary]").fill("2000");
  await salaryForm.getByRole("button", { name: "Salva" }).click();
  await expect(salaryForm.locator("input[name=salary]")).toHaveValue("2000");

  await page.goto("/trends");
  await expect(page.getByRole("heading", { name: "% stipendio speso" })).toBeVisible();
  await expect(page.getByText(/Nessun dato stipendio disponibile/i)).not.toBeVisible();
});
```

- [ ] **Step 3: Run the e2e suite**

Run: `pnpm test:e2e tests/e2e/trends.spec.ts`
Expected: PASS (both tests).

- [ ] **Step 4: Full verification pass**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

Run: `pnpm audit --prod`
Expected: zero `high`/`critical` advisories (no new dependencies were added in this plan, so this should be unchanged from before).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/trends.spec.ts
git commit -m "test(trends): cover % stipendio speso chart and no-data placeholder"
```
