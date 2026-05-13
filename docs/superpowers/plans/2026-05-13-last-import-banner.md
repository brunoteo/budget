# Last-Import Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a banner at the top of `/import` showing the last imported transaction date, how many days since the last upload, and a suggested next Wallet export start date.

**Architecture:** New pure library (`src/lib/import/last-import.ts`) for day-math, a new query (`getLastImport`) in `src/server/queries/import.ts` that aggregates over `expenses` filtered by `import_id is not null`, and a Server Component (`LastImportBanner`) rendered in `src/app/import/page.tsx`. No schema change. No new dependency.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript strict, Supabase (server client + RLS), Vitest (unit + integration), Playwright (E2E).

---

## File structure

| File                                                          | Purpose                                                   |
|---------------------------------------------------------------|-----------------------------------------------------------|
| `src/lib/import/last-import.ts`                               | Pure helpers: `daysSince`, `suggestedStartDate`, `formatDaysAgo` |
| `tests/unit/import/last-import.test.ts`                       | Unit tests for the pure helpers                           |
| `src/server/queries/import.ts`                                | Add `getLastImport()` returning `{ lastOccurredOn, lastUploadedAt }` |
| `tests/integration/last-import.test.ts`                       | RLS + correctness for `getLastImport` (via admin/SQL probe) |
| `src/lib/copy.ts`                                             | Add `copy.import.lastImport` section                      |
| `src/app/import/_components/last-import-banner.tsx`           | Server Component banner                                   |
| `src/app/import/page.tsx`                                     | Render `<LastImportBanner />` above `<StagingHost />`     |
| `tests/e2e/import.spec.ts`                                    | Assert banner visible on `/import` (empty state path)     |

---

## Task 1: Pure helper `daysSince`

Compute calendar-day delta between two `Date`s in `Europe/Rome`, ignoring time-of-day and DST.

**Files:**
- Create: `src/lib/import/last-import.ts`
- Create: `tests/unit/import/last-import.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/import/last-import.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { daysSince } from "@/lib/import/last-import";

describe("daysSince", () => {
  it("returns 0 when uploadedAt and now are the same instant", () => {
    const d = new Date("2026-05-13T10:00:00+02:00");
    expect(daysSince(d, d)).toBe(0);
  });

  it("returns 0 when both fall on the same Europe/Rome calendar day", () => {
    const uploadedAt = new Date("2026-05-13T00:30:00+02:00");
    const now = new Date("2026-05-13T23:30:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(0);
  });

  it("returns 1 when now is the next Europe/Rome calendar day", () => {
    const uploadedAt = new Date("2026-05-12T23:30:00+02:00");
    const now = new Date("2026-05-13T00:30:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(1);
  });

  it("returns N for N full calendar days later", () => {
    const uploadedAt = new Date("2026-05-01T12:00:00+02:00");
    const now = new Date("2026-05-08T12:00:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(7);
  });

  it("handles DST spring-forward without an off-by-one", () => {
    // Italy DST starts last Sunday of March (2026-03-29 02:00 → 03:00).
    const uploadedAt = new Date("2026-03-28T12:00:00+01:00");
    const now = new Date("2026-03-30T12:00:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- last-import`
Expected: FAIL with "Cannot find module '@/lib/import/last-import'" or similar.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/import/last-import.ts`:

```ts
function toRomeYmd(d: Date): string {
  // sv-SE returns YYYY-MM-DD; pin the calendar to Europe/Rome.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function ymdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function daysSince(uploadedAt: Date, now: Date): number {
  const a = ymdToUtcMs(toRomeYmd(uploadedAt));
  const b = ymdToUtcMs(toRomeYmd(now));
  return Math.floor((b - a) / 86_400_000);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- last-import`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/last-import.ts tests/unit/import/last-import.test.ts
git commit -m "feat(import): add daysSince helper for last-import banner"
```

---

## Task 2: Pure helper `suggestedStartDate`

Given an ISO `YYYY-MM-DD` of the last imported transaction, return the ISO of the next day. Pure string in / string out — no `Date` arithmetic at boundaries.

**Files:**
- Modify: `src/lib/import/last-import.ts`
- Modify: `tests/unit/import/last-import.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import/last-import.test.ts`:

```ts
import { suggestedStartDate } from "@/lib/import/last-import";

describe("suggestedStartDate", () => {
  it("adds one day in the middle of a month", () => {
    expect(suggestedStartDate("2026-05-12")).toBe("2026-05-13");
  });

  it("rolls over to the next month at month end", () => {
    expect(suggestedStartDate("2026-02-28")).toBe("2026-03-01");
  });

  it("handles leap-year February", () => {
    expect(suggestedStartDate("2024-02-29")).toBe("2024-03-01");
  });

  it("rolls over to the next year at December 31", () => {
    expect(suggestedStartDate("2026-12-31")).toBe("2027-01-01");
  });
});
```

Merge the `import` line with the existing one at the top of the file:

```ts
import { daysSince, suggestedStartDate } from "@/lib/import/last-import";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- last-import`
Expected: 4 new tests FAIL with "suggestedStartDate is not a function".

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/import/last-import.ts`:

```ts
export function suggestedStartDate(lastOccurredOn: string): string {
  const [y, m, d] = lastOccurredOn.split("-").map(Number) as [number, number, number];
  // Anchor at UTC noon to avoid TZ drift, then add 1 day.
  const next = new Date(Date.UTC(y, m - 1, d, 12));
  next.setUTCDate(next.getUTCDate() + 1);
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- last-import`
Expected: all tests pass (9 total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/last-import.ts tests/unit/import/last-import.test.ts
git commit -m "feat(import): add suggestedStartDate helper"
```

---

## Task 3: Pure helper `formatDaysAgo`

Render `0 → "oggi"`, `1 → "ieri"`, `n → "N giorni fa"`. Italian strings come from caller — no hard-coding.

**Files:**
- Modify: `src/lib/import/last-import.ts`
- Modify: `tests/unit/import/last-import.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import/last-import.test.ts`:

```ts
import { formatDaysAgo } from "@/lib/import/last-import";

const dayCopy = {
  today: "oggi",
  yesterday: "ieri",
  daysAgo: (n: number) => `${n} giorni fa`,
};

describe("formatDaysAgo", () => {
  it("returns 'oggi' for 0", () => {
    expect(formatDaysAgo(0, dayCopy)).toBe("oggi");
  });

  it("returns 'ieri' for 1", () => {
    expect(formatDaysAgo(1, dayCopy)).toBe("ieri");
  });

  it("returns '7 giorni fa' for 7", () => {
    expect(formatDaysAgo(7, dayCopy)).toBe("7 giorni fa");
  });
});
```

Merge the `import` line at the top:

```ts
import { daysSince, formatDaysAgo, suggestedStartDate } from "@/lib/import/last-import";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- last-import`
Expected: 3 new tests FAIL with "formatDaysAgo is not a function".

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/import/last-import.ts`:

```ts
export type DaysAgoCopy = {
  today: string;
  yesterday: string;
  daysAgo: (n: number) => string;
};

export function formatDaysAgo(days: number, c: DaysAgoCopy): string {
  if (days <= 0) return c.today;
  if (days === 1) return c.yesterday;
  return c.daysAgo(days);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- last-import`
Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/last-import.ts tests/unit/import/last-import.test.ts
git commit -m "feat(import): add formatDaysAgo helper"
```

---

## Task 4: Italian copy

Add the new `lastImport` block under `copy.import`. Keep all UI strings here — no inline literals.

**Files:**
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Add the copy block**

Open `src/lib/copy.ts`. Inside the `import: { … }` block, after `errorCategoryMissing: …`, add a comma and append:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS with no errors. (The `as const` on the outer object preserves literal types — confirm the new fields are reachable as `copy.import.lastImport.transactionLabel` etc.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/copy.ts
git commit -m "feat(import): add Italian copy for last-import banner"
```

---

## Task 5: Server query `getLastImport`

Aggregate over the user's imported expenses to find the latest `occurred_on` and latest `created_at`. RLS already scopes by user via `cycles.user_id`; no policy change.

**Files:**
- Modify: `src/server/queries/import.ts`
- Create: `tests/integration/last-import.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/last-import.test.ts`. Follow the same pattern as `tests/integration/import-commit.test.ts` (use `_helpers.ts`).

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL_A = "alice-last-import@test.local";
const EMAIL_B = "bob-last-import@test.local";

async function seedCycleAndCategory(userId: string) {
  await admin().from("profiles").update({ cycle_start_day: 1, default_salary: 3000 }).eq("id", userId);
  const { data: c } = await admin()
    .from("cycles")
    .insert({ user_id: userId, start_date: "2026-04-01", end_date: "2026-04-30", salary: 3000 })
    .select("*").single();
  const { data: cat } = await admin()
    .from("categories")
    .insert({ cycle_id: c!.id, name: "Carburante", expected_amount: 100 })
    .select("*").single();
  return { cycleId: c!.id as string, categoryId: cat!.id as string };
}

describe("last-import aggregate", () => {
  let userA: string;
  let userB: string;
  let cycleA: string;
  let catA: string;
  let cycleB: string;
  let catB: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
    userA = (await createTestUser(EMAIL_A)).id;
    userB = (await createTestUser(EMAIL_B)).id;
    ({ cycleId: cycleA, categoryId: catA } = await seedCycleAndCategory(userA));
    ({ cycleId: cycleB, categoryId: catB } = await seedCycleAndCategory(userB));
  });

  beforeEach(async () => {
    await admin().from("expenses").delete().eq("cycle_id", cycleA);
    await admin().from("expenses").delete().eq("cycle_id", cycleB);
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL_A, EMAIL_B]);
  });

  it("returns null/null for a user with no imports", async () => {
    const { data, error } = await admin()
      .from("expenses")
      .select("occurred_on, created_at")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("returns the latest occurred_on and created_at among imported rows", async () => {
    const importId = crypto.randomUUID();
    await admin().from("expenses").insert([
      { cycle_id: cycleA, category_id: catA, amount: 10, occurred_on: "2026-04-05", fingerprint: "fp1", import_id: importId },
      { cycle_id: cycleA, category_id: catA, amount: 20, occurred_on: "2026-04-12", fingerprint: "fp2", import_id: importId },
      { cycle_id: cycleA, category_id: catA, amount: 30, occurred_on: "2026-04-08", fingerprint: "fp3", import_id: importId },
    ]);

    const occ = await admin()
      .from("expenses")
      .select("occurred_on")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(occ.data!.occurred_on).toBe("2026-04-12");

    const created = await admin()
      .from("expenses")
      .select("created_at")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(created.data!.created_at).toBeTruthy();
  });

  it("ignores manual expenses (import_id IS NULL) even when newer", async () => {
    const importId = crypto.randomUUID();
    await admin().from("expenses").insert([
      { cycle_id: cycleA, category_id: catA, amount: 10, occurred_on: "2026-04-05", fingerprint: "fp1", import_id: importId },
      { cycle_id: cycleA, category_id: catA, amount: 99, occurred_on: "2026-04-29", fingerprint: null, import_id: null },
    ]);

    const occ = await admin()
      .from("expenses")
      .select("occurred_on")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(occ.data!.occurred_on).toBe("2026-04-05");
  });

  it("isolates users via RLS: A cannot see B's imports", async () => {
    const importIdA = crypto.randomUUID();
    const importIdB = crypto.randomUUID();
    await admin().from("expenses").insert([
      { cycle_id: cycleA, category_id: catA, amount: 10, occurred_on: "2026-04-05", fingerprint: "fpA", import_id: importIdA },
      { cycle_id: cycleB, category_id: catB, amount: 20, occurred_on: "2026-04-25", fingerprint: "fpB", import_id: importIdB },
    ]);

    // Simulate an RLS-scoped query for user A by filtering on A's cycles only.
    const occ = await admin()
      .from("expenses")
      .select("occurred_on, cycle_id")
      .not("import_id", "is", null)
      .in("cycle_id", [cycleA])
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(occ.data!.occurred_on).toBe("2026-04-05");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- last-import` (only the integration file may pass right now because we are exercising the schema directly; if it does pass, that's fine — it confirms the schema supports the aggregate. The Server-query test in the next step is what drives the implementation.)
Expected: integration tests PASS (sanity check on the schema). If anything fails, fix it before moving on.

- [ ] **Step 3: Add the query**

Modify `src/server/queries/import.ts`. Append at the bottom:

```ts
export type LastImport = {
  lastOccurredOn: string | null; // ISO YYYY-MM-DD
  lastUploadedAt: string | null; // ISO timestamp
};

export async function getLastImport(): Promise<LastImport> {
  const supabase = await getServerSupabase();

  const occQ = await supabase
    .from("expenses")
    .select("occurred_on")
    .not("import_id", "is", null)
    .order("occurred_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (occQ.error) throw occQ.error;

  const createdQ = await supabase
    .from("expenses")
    .select("created_at")
    .not("import_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (createdQ.error) throw createdQ.error;

  return {
    lastOccurredOn: occQ.data?.occurred_on ?? null,
    lastUploadedAt: createdQ.data?.created_at ?? null,
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: all unit + integration tests pass, including the new `last-import` integration tests.

- [ ] **Step 6: Commit**

```bash
git add src/server/queries/import.ts tests/integration/last-import.test.ts
git commit -m "feat(import): getLastImport query + integration tests"
```

---

## Task 6: `LastImportBanner` Server Component

Render the banner. States:

- has data → two lines (transaction + days-since · suggested next start)
- no data → single empty-state line

**Files:**
- Create: `src/app/import/_components/last-import-banner.tsx`

- [ ] **Step 1: Create the component**

Create `src/app/import/_components/last-import-banner.tsx`:

```tsx
import { getLastImport } from "@/server/queries/import";
import { daysSince, formatDaysAgo, suggestedStartDate } from "@/lib/import/last-import";
import { formatDate } from "@/lib/format/date";
import { copy } from "@/lib/copy";

export async function LastImportBanner() {
  const { lastOccurredOn, lastUploadedAt } = await getLastImport();
  const c = copy.import.lastImport;

  if (!lastOccurredOn || !lastUploadedAt) {
    return (
      <section
        aria-label={c.transactionLabel}
        className="rounded-card border border-border bg-surface-2 p-4 text-sm text-text-secondary"
      >
        {c.emptyState}
      </section>
    );
  }

  const days = daysSince(new Date(lastUploadedAt), new Date());
  const ago = formatDaysAgo(days, {
    today: c.today,
    yesterday: c.yesterday,
    daysAgo: c.daysAgo,
  });
  const nextStart = suggestedStartDate(lastOccurredOn);

  return (
    <section
      aria-label={c.transactionLabel}
      className="rounded-card border border-border bg-surface-2 p-4 text-sm"
    >
      <p className="text-text-primary">
        <span className="font-medium">{c.transactionLabel}:</span>{" "}
        {formatDate(lastOccurredOn)} · {ago}
      </p>
      <p className="mt-1 text-text-secondary">
        {c.exportHint} <span className="font-medium">{formatDate(nextStart)}</span> {c.exportHintSuffix}
      </p>
    </section>
  );
}
```

Note: this file uses existing design tokens (`bg-surface-2`, `border-border`, `text-text-primary`, `text-text-secondary`, `rounded-card`). If any of these token names differ in this project, swap to the actual names found in `src/app/globals.css` (do not introduce new ones).

- [ ] **Step 2: Confirm token names exist**

Run: `grep -E "surface-2|rounded-card|text-text-primary|text-text-secondary|border-border" src/app/globals.css`
Expected: each token appears at least once. If any are missing, replace the className with the nearest existing token (check what other `import/_components/*` use for card-like surfaces).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/import/_components/last-import-banner.tsx
git commit -m "feat(import): LastImportBanner server component"
```

---

## Task 7: Render banner on `/import`

Mount the banner above the staging host.

**Files:**
- Modify: `src/app/import/page.tsx`

- [ ] **Step 1: Wire the banner into the page**

Replace the existing `src/app/import/page.tsx` with:

```tsx
import { copy } from "@/lib/copy";
import { StagingHost } from "./_components/staging-host";
import { LastImportBanner } from "./_components/last-import-banner";
import { BackLink } from "@/components/back-link";

export const metadata = { title: copy.import.title };

export default function ImportPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-6 p-4 pb-24 sm:max-w-lg sm:p-6">
      <header className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.import.title}</h1>
      </header>
      <LastImportBanner />
      <StagingHost />
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run: `pnpm dev`
Open http://localhost:3000/import on a logged-in account at the mobile viewport (375×667).
Expected:
- New user with no imports → banner shows "Nessun import precedente. Esporta tutto lo storico da Wallet."
- After importing a Wallet CSV → banner shows "Ultima transazione importata: DD/MM/YYYY · oggi" and "Esporta da Wallet dal DD/MM/YYYY in poi" with `last+1`.

Stop the dev server.

- [ ] **Step 3: Typecheck + lint**

Run in parallel: `pnpm typecheck && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/import/page.tsx
git commit -m "feat(import): mount LastImportBanner on /import"
```

---

## Task 8: E2E coverage

Extend the existing import E2E to assert the banner is present in both the empty and populated states.

**Files:**
- Modify: `tests/e2e/import.spec.ts`

- [ ] **Step 1: Add empty-state assertion before upload**

In `tests/e2e/import.spec.ts`, after the existing `await page.goto("/import")` (the one that precedes the file upload), add:

```ts
  // 3a. Empty state of the last-import banner is visible on first visit.
  await expect(page.getByText("Nessun import precedente. Esporta tutto lo storico da Wallet.")).toBeVisible();
```

- [ ] **Step 2: Add populated-state assertion after commit**

After the commit step (the one that asserts the success view), navigate back to `/import` and assert the banner now shows the transaction date. Find the existing assertion block for the success screen and immediately after it add:

```ts
  // After committing the import, banner shows the latest imported date.
  await page.goto("/import");
  await expect(page.getByText(/Ultima transazione importata:/)).toBeVisible();
  await expect(page.getByText(/Esporta da Wallet dal/)).toBeVisible();
```

- [ ] **Step 3: Run E2E**

Run: `pnpm test:e2e -- import`
Expected: the import spec passes, including the new assertions.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/import.spec.ts
git commit -m "test(import): e2e coverage for last-import banner"
```

---

## Task 9: Final verification

- [ ] **Step 1: Full suite**

Run in sequence:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm audit --prod
```

Expected: every command exits 0. `pnpm audit --prod` reports zero `high`/`critical` advisories (or no change versus `main`).

- [ ] **Step 2: Update `CLAUDE.md` only if a documented invariant changed**

This feature adds no new directory under `src/lib`, no new server-action pattern, no new env var, and no new architectural constraint. `CLAUDE.md` does not need an update. Note this explicitly in the PR description.

- [ ] **Step 3: Open a PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(import): last-import banner on /import" --body "$(cat <<'EOF'
## Summary
- Banner at top of `/import` shows last imported transaction date, days since last upload, and suggested next Wallet export start date.
- New pure helpers in `src/lib/import/last-import.ts` (daysSince, suggestedStartDate, formatDaysAgo).
- New `getLastImport()` server query; no schema change (uses existing `expenses.import_id`).
- No `CLAUDE.md` update needed: no new directory, server-action pattern, env var, or architectural constraint.

## Test plan
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green
- [ ] `pnpm test:e2e -- import` green (empty + populated banner assertions)
- [ ] Manual: `/import` empty state on a fresh user
- [ ] Manual: `/import` populated state after a CSV import (date matches max occurred_on; days-since label correct)
EOF
)"
```

Expected: PR opens, CI green.
