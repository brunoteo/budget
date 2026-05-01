# Edit / delete a transaction + KPI reorder

**Date:** 2026-04-30
**Status:** Spec — pending implementation plan

## Goal

Two independent dashboard improvements bundled in a single spec:

1. Reorder the four KPI cards on the dashboard so that on mobile (2×2 grid) the top
   row reads `Stipendio · % Stipendio` and the bottom row reads `Speso · Rimanente`.
2. Allow a user to update or delete an existing transaction. Today the dashboard
   only lists transactions read-only inside an expanded category, and there is
   no UI path that calls the already-existing `deleteExpenseAction`.

Out of scope: bulk edit, restore-after-delete, audit log of changes, edit history,
changes to the category-delete UX (categories continue to delete with no
confirmation as they do today — that is tracked separately).

## Constraints

- Mobile-first (≤ 420 px), tap targets ≥ 44 × 44 px, Italian-only UI.
- No new libraries unless strictly necessary. No new shadcn components.
- All Italian strings live in `src/lib/copy.ts`.
- All mutations through Server Actions; all reads through `src/server/queries/`.
- RLS must continue to enforce per-user isolation; no service-role usage.
- Cycle id is a function of `occurred_on` and the user's `cycle_start_day` and
  must be recomputed at every write.

## Feature 1 — KPI reorder

**File:** `src/app/page.tsx` (the `<section>` block at lines 26–31).

Swap the second and fourth `<KpiCard>` so the rendered order becomes:

```
Stipendio   |   % Stipendio
Speso       |   Rimanente
```

Desktop (`md:grid-cols-4`) inherits the same left-to-right order:
`Stipendio · % Stipendio · Speso · Rimanente`.

No new components, no copy changes (`copy.dashboard` already has all four
labels), no token changes. This is a one-edit change to JSX.

## Feature 2 — Update / delete a transaction

### User flow

1. User opens the dashboard and expands a category.
2. Each transaction in the expanded list is now a tappable link (whole row,
   ≥ 44 px tall, with a `›` chevron affordance on the right).
3. Tapping it navigates to `/expenses/[id]/edit`.
4. The edit page shows the existing `ExpenseForm` pre-filled with the
   transaction's amount, category, date, and note. Submit label reads `Aggiorna`.
5. Below the form, a red "Elimina" button. Tapping it triggers
   `window.confirm("Eliminare questa spesa?")`; if confirmed, the expense is
   deleted and the user is redirected to `/` with a toast.
6. Saving an edit redirects back to `/` with an "aggiornata" toast.

### Server-action layer

**File:** `src/server/actions/expense.ts`

Add `updateExpenseAction`. Mirrors `createExpenseAction` plus an `id` field on
the schema. RLS already restricts the row to its owner — no extra ownership
check is performed in app code.

```ts
const UpdateExpenseSchema = ExpenseSchema.extend({
  id: z.string().uuid(),
});

export async function updateExpenseAction(
  _prev: ActionResult<ExpenseFields>,
  formData: FormData,
): Promise<ActionResult<ExpenseFields>> {
  const parsed = UpdateExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<ExpenseFields>(parsed.error);
  try {
    const cycleId = await ensureCycleForDate(parsed.data.occurredOn);
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("expenses")
      .update({
        cycle_id: cycleId,
        category_id: parsed.data.categoryId,
        amount: parsed.data.amount,
        occurred_on: parsed.data.occurredOn,
        note: parsed.data.note ?? null,
      })
      .eq("id", parsed.data.id);
    if (error) return { ok: false, fieldErrors: {}, formError: error.message };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  revalidatePath("/");
  redirect("/?toast=expenseUpdated");
}
```

**Cycle recomputation.** `cycle_id` is always reassigned via
`ensureCycleForDate(occurredOn)` — same path the create action takes — so a
date that crosses the user's pay-cycle boundary correctly moves the expense to
the new cycle. The previous cycle's KPIs naturally lose the row on next
dashboard render.

`deleteExpenseAction` already exists. Wire it up and append:

```ts
revalidatePath("/");
redirect("/?toast=expenseDeleted");
```

### Query layer

**New file:** `src/server/queries/expense.ts`

```ts
export async function getExpenseForEdit(id: string): Promise<{
  expense: { id; amount; categoryId; occurredOn; note };
  categories: Array<{ id; name; isFixed }>;
} | null>
```

Single query that returns the expense (RLS-scoped) plus the user's category
list (reused from existing dashboard query helpers — extract a small
`getCategoriesForUser` helper if cleaner). Returns `null` if the expense does
not exist or RLS hides it; the page maps that to `notFound()`.

### Page layer

**New route:** `src/app/expenses/[id]/edit/page.tsx`

Server component:

```tsx
export default async function EditExpensePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getExpenseForEdit(id);
  if (!data) notFound();
  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">
          {copy.expense.editTitle}
        </h1>
      </div>
      <ExpenseForm
        mode="edit"
        expense={data.expense}
        categories={data.categories}
      />
      <DeleteExpenseButton id={id} />
    </main>
  );
}
```

### `ExpenseForm` generalization

Move `src/app/expenses/new/_components/expense-form.tsx` to
`src/components/expense-form.tsx` (both routes use it now). Update the import
in `src/app/expenses/new/page.tsx`.

Add a discriminated prop:

```ts
type Props =
  | { mode: "create"; categories: Cat[]; defaultDate: string }
  | { mode: "edit"; categories: Cat[]; expense: {
      id: string;
      amount: number;
      categoryId: string;
      occurredOn: string;
      note: string | null;
    } };
```

In `"create"` mode: behavior unchanged (`useActionState(createExpenseAction, …)`,
button label `copy.expense.submit`).

In `"edit"` mode:

- `useActionState(updateExpenseAction, …)`.
- Render `<input type="hidden" name="id" value={expense.id} />` as the first
  child of the form so it ships with `formData`.
- Add `defaultValue` to every visible input: `amount`, `note` (string),
  `occurredOn` (replaces the create-mode `defaultDate`), and `categoryId` —
  the native `<select>` honors `defaultValue` directly.
- Submit button label reads `copy.expense.update` ("Aggiorna").
- Cancel link continues to point at `/`.

### Delete button

**New file:** `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx`

Client component that calls `deleteExpenseAction(id)` directly through a
transition — keeps the existing single-arg server-action signature unchanged
and lets `confirm()` block the call before any network request:

```tsx
"use client";
import { useTransition } from "react";
import { deleteExpenseAction } from "@/server/actions/expense";
import { copy } from "@/lib/copy";

export function DeleteExpenseButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(copy.expense.deleteConfirm)) return;
        start(() => { void deleteExpenseAction(id); });
      }}
      className="inline-flex min-h-11 w-full items-center justify-center
                 rounded-lg border border-sienna-600 bg-surface px-4 py-2
                 text-sienna-600 disabled:opacity-60"
    >
      {pending ? "…" : copy.expense.delete}
    </button>
  );
}
```

`deleteExpenseAction(id)` keeps its current signature and adds two lines on
success: `revalidatePath("/")` then `redirect("/?toast=expenseDeleted")`. The
`redirect` thrown inside the transition is caught by the Next runtime and
performs the navigation — no extra plumbing.

### `CategoryRow` wiring

**File:** `src/components/category-row.tsx`

Each `<li>` becomes a `<Link>`:

```tsx
<li key={t.id}>
  <Link
    href={`/expenses/${t.id}/edit`}
    className="flex min-h-11 items-center justify-between gap-2 p-2"
  >
    <span>
      <span className="font-mono tabular-nums text-text-muted">
        {formatDate(t.occurredOn)}
      </span>
      {t.note && <em className="ml-2 text-clay-800">{t.note}</em>}
    </span>
    <span className="flex items-center gap-2">
      <span className="font-mono tabular-nums">− {formatEur(t.amount)}</span>
      <span className="text-clay-400" aria-hidden>›</span>
    </span>
  </Link>
</li>
```

Visual style is preserved aside from the chevron and the slightly enlarged tap
area.

### Italian copy

**File:** `src/lib/copy.ts`

```ts
expense: {
  ...,
  editTitle: "Modifica spesa",
  update: "Aggiorna",
  delete: "Elimina",
  deleteConfirm: "Eliminare questa spesa?",
}
toast: {
  ...,
  expenseUpdated: "Spesa aggiornata",
  expenseDeleted: "Spesa eliminata",
}
```

The toast lookup in `toast-from-query.tsx` gets the two new keys.

## Edge cases

| Scenario | Behavior |
|---|---|
| User opens edit URL for an id that no longer exists (deleted in another tab) | Page returns `notFound()` (404). |
| User submits an edit but the row was deleted between load and submit | Supabase reports 0 rows affected; action returns `formError` shown above the form. |
| Category was deleted between viewing and editing | The category select no longer offers it; submitting an FK-violating id surfaces as `formError`. |
| Date moved to a different cycle | `ensureCycleForDate` returns the new cycle id; previous cycle loses the row on next render. |
| Negative amount, malformed date | Existing Zod schema (`nonnegative`, ISO regex) rejects; field-level error rendered. |
| Stale form (user edits, then a sibling tab edits the same row) | Last write wins. No optimistic-locking column; this matches the rest of the app. |

## Data model

No schema changes. No new migrations.

## Testing

**Unit.** No new pure libs; existing `lib/cycle/*`, `lib/format/*`, `lib/kpi/*`
tests cover the unchanged math.

**Integration (`tests/integration/`).** Run against local Supabase, no mocks.

- `updateExpenseAction` happy path: amount + note change persists, response is
  the expected `redirect`.
- `updateExpenseAction` recomputes cycle when `occurred_on` crosses a
  user-specific cycle boundary.
- `updateExpenseAction` RLS isolation: user A cannot update user B's expense
  (Supabase returns 0 rows; we treat it as success-with-no-effect — assert that
  user B's row is unchanged).
- `deleteExpenseAction` happy path: row is gone, dashboard query no longer
  returns it.
- `deleteExpenseAction` RLS isolation: user A's delete on user B's row is a
  no-op for B.

**E2E (`tests/e2e/`).** Two smoke tests at mobile viewport (375×667):

- *Edit*: log in, expand a category, tap a transaction, change amount, save,
  assert dashboard total updated and toast visible.
- *Delete*: log in, navigate to edit, tap "Elimina", accept the native confirm
  (`page.on("dialog", d => d.accept())`), assert row absent and toast visible.

## Verification before claiming complete

- `pnpm typecheck && pnpm lint && pnpm test` green.
- `pnpm db:reset && pnpm test` green.
- `pnpm test:e2e` green.
- `pnpm audit --prod` reports zero `high`/`critical` advisories.
- Manual mobile test (375×667) and desktop (≥ 1024 px): expand a category,
  edit a transaction, change every field including the date (cross a cycle
  boundary if possible), save, confirm KPIs reflect the change. Delete one,
  confirm KPIs reflect the change.

## Implementation hooks for downstream skills

- **frontend-design**: invoke when authoring the edit page markup and the
  delete-button component to keep the visual treatment aligned with
  `DESIGN.md` and the existing route style. The reorder change does not need
  this — it is a one-line JSX swap.
- **context7**: query for current Next.js 16 dynamic-route + Server Action
  patterns (`params: Promise<{ id: string }>` is the App Router 15+ shape; we
  want a fresh confirmation against the installed version) and for any
  Supabase JS update-syntax we touch.

## File-by-file summary

| File | Change |
|---|---|
| `src/app/page.tsx` | Reorder two `<KpiCard>` instances. |
| `src/app/expenses/[id]/edit/page.tsx` | New route. |
| `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx` | New client component. |
| `src/components/expense-form.tsx` | Moved from `src/app/expenses/new/_components/expense-form.tsx`; gains discriminated `mode` prop, `useActionState` swap, hidden id input, per-field defaults. |
| `src/app/expenses/new/_components/expense-form.tsx` | Deleted (moved). |
| `src/app/expenses/new/page.tsx` | Update import path. |
| `src/components/category-row.tsx` | Wrap each transaction `<li>` in a `<Link>` with chevron. |
| `src/server/actions/expense.ts` | Add `updateExpenseAction`; add revalidate+redirect to `deleteExpenseAction`. |
| `src/server/queries/expense.ts` | New file: `getExpenseForEdit`. |
| `src/lib/copy.ts` | Add four expense keys + two toast keys. |
| `src/components/toast-from-query.tsx` | Map the two new toast keys. |
| `tests/integration/expense-update.test.ts` | New. |
| `tests/integration/expense-delete.test.ts` | New (or extend existing). |
| `tests/e2e/edit-expense.spec.ts` | New. |
| `tests/e2e/delete-expense.spec.ts` | New. |
