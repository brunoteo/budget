# Last-Import Banner — Design

**Date:** 2026-05-13
**Status:** Draft — awaiting user review
**Scope:** Single screen addition on `/import`.

## Problem

The user uploads Wallet CSV exports periodically. To create the next Wallet export, they need to know the last transaction date already imported into the app, so they can set the Wallet export start date to `last + 1 day`. They also want a sense of how long it has been since the last upload, as a nudge that an import is overdue.

Today nothing on the page tells them either fact. They either guess, re-export the full history (and rely on dedup), or look up the most recent transaction in the dashboard manually.

## Solution

A banner at the top of `/import`, above the staging host, that shows:

- The date of the most recent **imported** transaction (`occurred_on`).
- A relative "how long ago" label for the most recent upload event (`created_at`).
- A suggested next Wallet export start date (`last occurred_on + 1 day`).

If the user has never imported anything, the banner shows a fallback line guiding them to export the full history.

## Placement

`src/app/import/page.tsx` renders the banner inside the existing `<main>` container, above `<StagingHost />`:

```
<main>
  <header>…</header>
  <LastImportBanner />     ← new
  <StagingHost />
</main>
```

The banner is a Server Component that performs its own data fetch (no prop drilling).

## Data layer

### Query

New query in `src/server/queries/import.ts`:

```ts
export type LastImport = {
  lastOccurredOn: string | null; // ISO date, no time
  lastUploadedAt: string | null; // ISO timestamp
};

export async function getLastImport(): Promise<LastImport>;
```

Implementation: two `select` calls (or one combined) against `expenses` filtered by `import_id is not null`. RLS scopes by user via the existing `cycles.user_id` policy. No new policy needed.

We return both `max(occurred_on)` and `max(created_at)` because:

- `occurred_on` answers "what is the last transaction date I already have?"
- `created_at` answers "when did I last upload?" — relevant even if the user re-imports an old date range.

### No new tables, no schema change

`expenses.import_id` already exists (migration `0007_expense_import.sql`). Manual entries have `import_id IS NULL` and are excluded by design — the user is asking about *imported* data specifically.

## Pure library

New file `src/lib/import/last-import.ts`. Pure: no Next, no Supabase, no `Date.now()` inside the functions (callers pass `now`).

```ts
export function daysSince(uploadedAt: Date, now: Date): number;
export function suggestedStartDate(lastOccurredOn: Date): Date;
export function formatDaysAgo(days: number, copy: DaysAgoCopy): string;
```

- `daysSince`: floor of `(now - uploadedAt) / 86_400_000`. Both inputs treated as wall-clock `Europe/Rome` for the date portion (callers pass already-zoned `Date` values built from `occurred_on`/`created_at`).
- `suggestedStartDate`: returns a new `Date` one day after `lastOccurredOn`. Day-only math, no time component.
- `formatDaysAgo`: `0 → "oggi"`, `1 → "ieri"`, `n → "N giorni fa"`. Copy strings are injected, not hard-coded.

## UI

`src/app/import/_components/last-import-banner.tsx` — Server Component.

States:

| State           | Content                                                                                                              |
|-----------------|----------------------------------------------------------------------------------------------------------------------|
| Has imports     | `Ultima transazione importata: 12/05/2026 · 1 giorno fa`<br>`Esporta da Wallet dal 13/05/2026 in poi`                |
| No imports yet  | `Nessun import precedente. Esporta tutto lo storico da Wallet.`                                                      |

Visual: card surface using existing tokens (no new colors, radii, or shadows). Compact: ~64–80 px tall on mobile. Single column on `<sm`, two-line layout on `>=sm` is acceptable but not required.

Format dates via `lib/format/date.ts` (`DD/MM/YYYY`). No inline formatting.

## Copy

Add a new section to `src/lib/copy.ts`:

```ts
import: {
  …,
  lastImport: {
    transactionLabel: "Ultima transazione importata",
    uploadLabel: "Ultimo upload",
    exportHint: "Esporta da Wallet dal",
    exportHintSuffix: "in poi",
    emptyState: "Nessun import precedente. Esporta tutto lo storico da Wallet.",
    today: "oggi",
    yesterday: "ieri",
    daysAgo: (n: number) => `${n} giorni fa`,
  },
}
```

## Tests

### Unit — `tests/unit/last-import.test.ts`

- `daysSince(now, now)` → `0`
- `daysSince(yesterday23:59, today00:01)` → `0` if same calendar day in `Europe/Rome`; otherwise `1`
- `daysSince` across DST boundary returns calendar-day delta, not 23/25-hour artifacts
- `suggestedStartDate(2026-05-12)` → `2026-05-13`
- `suggestedStartDate(2026-02-28)` → `2026-03-01`
- `formatDaysAgo(0)` → `oggi`; `(1)` → `ieri`; `(7)` → `7 giorni fa`

### Integration — `tests/integration/last-import.test.ts`

- User with no imports: `getLastImport()` returns `{ lastOccurredOn: null, lastUploadedAt: null }`.
- User with imports: returns the correct max values.
- Manual expenses (no `import_id`) are ignored even when newer than imported ones.
- RLS isolation: user A's `getLastImport()` does not see user B's imports.

### E2E — extend existing import smoke test

After seeding one import for the test user, visit `/import` and assert the banner shows the seeded date and the suggested next date (`+1 day`).

## Edge cases

- **Timezone.** `expenses.occurred_on` is `date` (no TZ); compare day-only. "Today" is computed in `Europe/Rome`.
- **Future-dated imports.** Wallet occasionally exports a row whose date is `today + 1` due to settlement timing. We do not clamp: the banner shows the actual `max(occurred_on)`, and the suggested start date is `that + 1`. The user can adjust manually.
- **Re-import of older range.** If the user imports an older CSV after a newer one, `max(occurred_on)` is unchanged but `max(created_at)` advances. Banner stays correct: still suggests start from the latest imported transaction date, while "days since upload" resets to ~0.
- **Soft-deleted / removed imports.** Not in scope; the schema has no soft delete. If an import is deleted via the existing UI, the next render reflects the new `max()`.

## Non-goals

- No dashboard tile or notification badge.
- No automatic prefilling of Wallet — Wallet is a separate app; the banner only shows a string the user copies/applies manually.
- No history list of past imports. (Could be a follow-up.)
- No new design tokens, no new dependencies.

## Files touched

| File                                                          | Change             |
|---------------------------------------------------------------|--------------------|
| `src/lib/import/last-import.ts`                               | new pure lib       |
| `src/server/queries/import.ts`                                | add `getLastImport`|
| `src/app/import/_components/last-import-banner.tsx`           | new component      |
| `src/app/import/page.tsx`                                     | render banner      |
| `src/lib/copy.ts`                                             | new copy section   |
| `tests/unit/last-import.test.ts`                              | new                |
| `tests/integration/last-import.test.ts`                       | new                |
| `tests/e2e/…import smoke`                                     | extend             |
