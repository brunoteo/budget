# Design: % stipendio speso on /trends

**Date:** 2026-07-04
**Status:** Approved

## Problem

The home dashboard already shows "% stipendio" (salary spent this cycle) as a single-cycle KPI tile (`src/app/page.tsx:86`, `kpi.percentOfSalarySpent`). There is no way to see how that percentage has trended across cycles. `/trends` shows category/budget history but never references income.

## Goal

Add a per-cycle history of "% stipendio speso" (`totalSpent / salary`) to `/trends`, so the user can see whether they're spending a growing or shrinking share of their paycheck over time.

## Scope decisions (confirmed with user)

- **Metric basis:** salary only (`cycles.salary`), not salary + extra income. Matches the existing dashboard tile's terminology and formula.
- **Placement:** `/trends` page, in the "Quest'anno" group, directly after the existing `TrendsChart` (Totale budget-vs-spent bar chart).
- **Chart shape:** a separate line chart, not combined into the existing bar chart's axes (avoids €-vs-% dual-axis confusion).
- **Missing salary:** cycles with `salary` null or 0 render as a gap in the line (not 0%, not skipped from the x-axis) — a null point, so the line visibly breaks rather than implying "spent nothing relative to salary."

## Data flow

1. `supabase/migrations` — no schema change. `cycles.salary numeric(12,2)` already exists (`0002_cycles.sql`).
2. `src/server/queries/trends.ts` (`getTrendsData`): extend the `cycles` select to include `salary`, thread it onto each `CycleSummary`.
3. `src/lib/trends/types.ts`: add `salary: number | null` to `CycleSummary`.
4. New pure function `src/lib/trends/salary-percent.ts`:
   ```ts
   export function computeSalaryPercentSeries(
     cycles: CycleSummary[]
   ): { startDate: string; percent: number | null }[]
   ```
   - `percent = null` when `salary` is `null` or `0`.
   - Otherwise `percent = totalSpent / salary` (same formula as `kpi/compute.ts`'s `percentOfSalarySpent`, salary-only, no extra income).
   - No coupling to `next`/`react`/`@supabase` — pure, unit-testable in isolation like the rest of `lib/trends`.
5. Exported via `src/lib/trends/index.ts` barrel alongside existing exports.

## UI

- New component `src/components/salary-percent-chart.tsx`, mirroring the existing `trends-chart.tsx` pattern:
  - `ResponsiveContainer` + recharts `LineChart`.
  - X-axis: `formatMonthYear(startDate)` (reuse existing IT month-label helper from `trends-chart.tsx`).
  - Y-axis: percentage scale (formatted `XX%`).
  - Tooltip: formatted as `XX.X%`.
  - Horizontal `ReferenceLine` at 100% (visual marker for "spent the whole paycheck").
  - Null `percent` values render as a gap in the line (`connectNulls={false}`, recharts default — no prop needed, just don't override it).
- `src/app/trends/page.tsx`: render the new chart in the "Quest'anno" group, right after `<TrendsChart data={data.recent} />`, under its own subheading (`copy.trends.salaryPercentHeading`).
  - Gating: same as `TrendsChart` — shown whenever `recentCount >= 1`, no higher threshold.
  - If **all** points in the series are null (no cycle in the window has a salary set), render `copy.trends.salaryPercentNoData` instead of an empty chart.

## Copy (`src/lib/copy.ts`, `trends` section)

- `salaryPercentHeading: "% stipendio speso"`
- `salaryPercentNoData: "Nessun dato stipendio disponibile per questo periodo."`

## Error handling

No new failure modes. `salary` is already a nullable column handled elsewhere (dashboard defaults it to `?? 0` for display; here null instead becomes "skip this point"). Read-only query — no Zod schema changes needed.

## Testing

- **Unit** (`tests/unit/trends/salary-percent.test.ts`): pure-function tests for `computeSalaryPercentSeries` —
  - null/0 salary → `percent: null`.
  - normal case → correct ratio.
  - empty input → `[]`.
- **Integration:** none needed — no new RLS surface, `cycles.salary` already covered by existing policies.
- **E2E:** extend the existing `/trends` Playwright smoke test to assert the new chart section (or its no-data placeholder) renders. No new spec file if one already visits `/trends`.

## Out of scope

- Total-income (salary + extra income) variant — not requested; `percentOfTotalIncomeSpent` remains computed-but-unused in `kpi/compute.ts` as before.
- Any change to the home dashboard's existing `% stipendio` tile.
- Combined/dual-axis chart.
