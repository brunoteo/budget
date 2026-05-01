# Edit / Delete Transactions + KPI Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder dashboard KPI cards (top row: Stipendio · % Stipendio; bottom row: Speso · Rimanente) and add a `/expenses/[id]/edit` route that lets the user update or delete an existing transaction.

**Architecture:** Two independent feature drops in one branch. KPI reorder is a one-line JSX swap in `src/app/page.tsx`. Edit/delete adds an `updateExpenseAction` server action, a new `getExpenseForEdit` query, a new dynamic route at `src/app/expenses/[id]/edit/page.tsx`, a `DeleteExpenseButton` client component using `useTransition`, and generalizes `ExpenseForm` with a `mode: "create" | "edit"` discriminator. Transactions in `CategoryRow` become `<Link>`s so tapping a row navigates to the edit page.

**Tech Stack:** Next.js 16 App Router (server components + server actions), TypeScript strict, Supabase + RLS, Zod, Vitest (integration), Playwright (E2E), Tailwind v4 + shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-30-edit-delete-transactions-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/app/page.tsx` | Modify | Reorder two `<KpiCard>` instances. |
| `src/lib/copy.ts` | Modify | Add `expense.{editTitle, update, delete, deleteConfirm}` and `toast.expenseUpdated`. |
| `src/components/toast-from-query.tsx` | Modify | Map `expenseUpdated` → `toast.success(copy.toast.expenseUpdated)`. |
| `src/server/actions/expense.ts` | Modify | Add `updateExpenseAction`; add `revalidatePath` + `redirect` to `deleteExpenseAction`. |
| `src/server/queries/expense.ts` | Create | `getExpenseForEdit(id)` returning expense + cycle's category list. |
| `src/components/expense-form.tsx` | Create (move) | Generalized form with `mode: "create" \| "edit"` discriminator. |
| `src/app/expenses/new/_components/expense-form.tsx` | Delete | Moved to `src/components/`. |
| `src/app/expenses/new/page.tsx` | Modify | Update import path; pass `mode="create"` props. |
| `src/app/expenses/[id]/edit/page.tsx` | Create | Server component for the edit route. |
| `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx` | Create | Client component with `useTransition` + `window.confirm`. |
| `src/components/category-row.tsx` | Modify | Wrap each transaction `<li>` content in a `<Link>` with chevron. |
| `tests/integration/expense-update.test.ts` | Create | Update happy path, cycle recompute on date change, RLS isolation. |
| `tests/integration/expense-delete.test.ts` | Create | Delete happy path + RLS isolation (action-level, not raw client). |
| `tests/e2e/edit-expense.spec.ts` | Create | Smoke: expand category → tap tx → edit amount → save → verify total. |
| `tests/e2e/delete-expense.spec.ts` | Create | Smoke: expand category → tap tx → delete → confirm dialog → verify removal. |

**Cycle/category subtlety:** `categories` are per-cycle (each row has `cycle_id`). The edit page loads categories from the expense's *current* cycle. If the user changes the date so the expense crosses into a different cycle that has different categories, the existing `category_id` may no longer exist — Supabase's FK will reject the update and the user sees the error in `formError`. This is acceptable for v1; document it but do not auto-recategorize.

---

## Task 1: Reorder KPI cards

**Files:**
- Modify: `src/app/page.tsx:26-31`

- [ ] **Step 1: Edit the KPI grid**

Replace the four-card section with the new order. Open `src/app/page.tsx` and change the `<section>` block to:

```tsx
<section className="grid grid-cols-2 gap-2 md:grid-cols-4">
  <KpiCard label={c.salary} primary={data.cycle.salary ?? 0} />
  <KpiCard label={c.percentSalary} primary={pct(data.kpi.percentOfSalarySpent)} />
  <KpiCard label={c.spent} primary={data.kpi.totalSpent} secondary={c.onBudget(formatEur(data.kpi.totalBudget))} />
  <KpiCard label={c.remaining} primary={data.kpi.totalRemaining} secondary={c.consumed(pct(data.kpi.percentConsumed))} />
</section>
```

- [ ] **Step 2: Visual check**

Run `pnpm dev` and open the dashboard at mobile viewport (DevTools device toolbar, 375 × 667). Confirm row 1 reads `STIPENDIO · % STIPENDIO` and row 2 reads `SPESO · RIMANENTE`. Confirm desktop ≥ 1024 px renders one row of four in the same left-to-right order.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(dashboard): reorder KPI cards (salary + % first, spent + remaining second)"
```

---

## Task 2: Add Italian copy + toast wiring

**Files:**
- Modify: `src/lib/copy.ts`
- Modify: `src/components/toast-from-query.tsx`

`copy.toast.expenseDeleted` and `copy.toast.expenseAdded` already exist; only `expenseUpdated` is new. Verify by reading the current `toast` block before editing.

- [ ] **Step 1: Add expense edit/delete keys**

In `src/lib/copy.ts`, the `expense` block currently ends after `noCategory`. Insert these four keys before the closing brace:

```ts
expense: {
  newTitle: "Nuova spesa",
  amount: "Importo",
  category: "Categoria",
  date: "Data",
  note: "Nota",
  submit: "Salva",
  cancel: "Annulla",
  noCategory: "Nessuna categoria — creane una prima",
  editTitle: "Modifica spesa",
  update: "Aggiorna",
  delete: "Elimina",
  deleteConfirm: "Eliminare questa spesa?",
},
```

- [ ] **Step 2: Add toast key**

In the same file, add `expenseUpdated` to the `toast` block:

```ts
toast: {
  expenseAdded: "Spesa aggiunta",
  expenseUpdated: "Spesa aggiornata",
  expenseDeleted: "Spesa rimossa",
  categorySaved: "Categoria aggiornata",
  categoryDeleted: "Categoria rimossa",
  settingsSaved: "Impostazioni salvate",
  unexpectedError: "Si è verificato un errore. Riprova.",
},
```

- [ ] **Step 3: Wire the toast**

In `src/components/toast-from-query.tsx`, add the `expenseUpdated` row to the `TOASTS` map:

```ts
const TOASTS: Record<string, () => void> = {
  expenseAdded:    () => toast.success(copy.toast.expenseAdded),
  expenseUpdated:  () => toast.success(copy.toast.expenseUpdated),
  expenseDeleted:  () => toast.success(copy.toast.expenseDeleted),
  categorySaved:   () => toast.success(copy.toast.categorySaved),
  categoryDeleted: () => toast.success(copy.toast.categoryDeleted),
  settingsSaved:   () => toast.success(copy.toast.settingsSaved),
};
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy.ts src/components/toast-from-query.tsx
git commit -m "feat(copy): add expense edit/delete strings + expenseUpdated toast"
```

---

## Task 3: Add `updateExpenseAction` (TDD)

**Files:**
- Create: `tests/integration/expense-update.test.ts`
- Modify: `src/server/actions/expense.ts`

Tests live in `tests/integration/`, run against local Supabase via `pnpm test`. They drive the Supabase client directly (the canonical pattern in `tests/integration/expense-actions.test.ts`) — Server Actions in Next.js can't be invoked outside the request context, so we test the *write* using a user-scoped Supabase client to verify RLS, and we test the *action's* path-recompute behavior with a small unit-style harness.

For this codebase the integration-test convention (see `expense-actions.test.ts`) is to test the SQL+RLS layer, not the action wrapper itself. We follow that convention here: the action wrapper is exercised by E2E tests in Tasks 13–14.

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/expense-update.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALICE = "alice-update@test.local";
const BOB = "bob-update@test.local";

describe("expense update via RLS", () => {
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceCycleId: string;
  let aliceCategoryId: string;
  let aliceExpenseId: string;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceClient = a.client;
    await admin().from("profiles").update({ cycle_start_day: 27, default_salary: 4000 }).eq("id", a.id);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: a.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    aliceCycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: aliceCycleId, name: "Carburante", expected_amount: 20 })
      .select("*").single();
    aliceCategoryId = cat!.id;
    const { data: exp } = await aliceClient
      .from("expenses")
      .insert({ cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 50, occurred_on: "2026-04-28", note: "old" })
      .select("*").single();
    aliceExpenseId = exp!.id;

    const b = await createTestUser(BOB);
    bobClient = b.client;
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("owner can update amount and note", async () => {
    const { error } = await aliceClient
      .from("expenses")
      .update({ amount: 75.5, note: "new" })
      .eq("id", aliceExpenseId);
    expect(error).toBeNull();
    const { data } = await aliceClient.from("expenses").select("*").eq("id", aliceExpenseId).single();
    expect(Number(data!.amount)).toBeCloseTo(75.5);
    expect(data!.note).toBe("new");
  });

  it("non-owner cannot update via RLS (silent zero rows)", async () => {
    const { error } = await bobClient
      .from("expenses")
      .update({ amount: 9999 })
      .eq("id", aliceExpenseId);
    // RLS blocks the update silently — no error, but the row is unchanged.
    expect(error).toBeNull();
    const { data } = await admin().from("expenses").select("amount").eq("id", aliceExpenseId).single();
    expect(Number(data!.amount)).not.toBeCloseTo(9999);
  });
});
```

- [ ] **Step 2: Run the test to make sure it passes against the existing schema**

Run: `pnpm db:reset && pnpm test tests/integration/expense-update.test.ts`
Expected: PASS (these assertions exercise existing RLS, not the new action — they prove the substrate works before we add the action wrapper).

- [ ] **Step 3: Add `updateExpenseAction`**

In `src/server/actions/expense.ts`, after the existing `createExpenseAction`, add:

```ts
const UpdateExpenseSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().nonnegative(),
  categoryId: z.string().uuid(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
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

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/expense.ts tests/integration/expense-update.test.ts
git commit -m "feat(expense): updateExpenseAction with cycle recompute + RLS test"
```

---

## Task 4: Wire `deleteExpenseAction` to redirect + revalidate

**Files:**
- Modify: `src/server/actions/expense.ts`
- Create: `tests/integration/expense-delete.test.ts`

The current `deleteExpenseAction(id)` returns `{ error } | { ok: true }` and is unused. We change it to perform `revalidatePath("/")` then `redirect("/?toast=expenseDeleted")` on success. RLS continues to silently no-op cross-user deletes.

- [ ] **Step 1: Write the integration test**

Create `tests/integration/expense-delete.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALICE = "alice-del@test.local";
const BOB = "bob-del@test.local";

describe("expense delete via RLS", () => {
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceCycleId: string;
  let aliceCategoryId: string;

  beforeAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
    const a = await createTestUser(ALICE);
    aliceClient = a.client;
    await admin().from("profiles").update({ cycle_start_day: 27 }).eq("id", a.id);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: a.id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    aliceCycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: aliceCycleId, name: "Spesa", expected_amount: 100 })
      .select("*").single();
    aliceCategoryId = cat!.id;

    const b = await createTestUser(BOB);
    bobClient = b.client;
  });

  afterAll(async () => {
    await deleteTestUsers([ALICE, BOB]);
  });

  it("owner can delete own expense", async () => {
    const { data: ins } = await aliceClient
      .from("expenses")
      .insert({ cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 12, occurred_on: "2026-04-28", note: null })
      .select("*").single();
    const id = ins!.id;
    const { error } = await aliceClient.from("expenses").delete().eq("id", id);
    expect(error).toBeNull();
    const { data } = await aliceClient.from("expenses").select("id").eq("id", id);
    expect(data).toHaveLength(0);
  });

  it("non-owner cannot delete via RLS", async () => {
    const { data: ins } = await aliceClient
      .from("expenses")
      .insert({ cycle_id: aliceCycleId, category_id: aliceCategoryId, amount: 12, occurred_on: "2026-04-28", note: null })
      .select("*").single();
    const id = ins!.id;
    await bobClient.from("expenses").delete().eq("id", id);
    const { data } = await admin().from("expenses").select("id").eq("id", id);
    expect(data).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm db:reset && pnpm test tests/integration/expense-delete.test.ts`
Expected: PASS

- [ ] **Step 3: Update `deleteExpenseAction`**

In `src/server/actions/expense.ts`, replace the current `deleteExpenseAction` body with:

```ts
export async function deleteExpenseAction(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect("/?toast=expenseDeleted");
}
```

(The function still returns `{ error }` on failure; on success it throws `redirect(...)` which is the standard Next pattern. No callers exist yet, so no migration concern.)

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/expense.ts tests/integration/expense-delete.test.ts
git commit -m "feat(expense): wire deleteExpenseAction redirect + RLS test"
```

---

## Task 5: Add `getExpenseForEdit` query

**Files:**
- Create: `src/server/queries/expense.ts`

- [ ] **Step 1: Write the query**

Create `src/server/queries/expense.ts`:

```ts
import "server-only";
import { getServerSupabase } from "@/lib/db/server";

export type ExpenseForEdit = {
  expense: {
    id: string;
    amount: number;
    categoryId: string;
    occurredOn: string;
    note: string | null;
    cycleId: string;
  };
  categories: { id: string; name: string; isFixed: boolean }[];
};

export async function getExpenseForEdit(id: string): Promise<ExpenseForEdit | null> {
  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("expenses")
    .select("id, amount, category_id, occurred_on, note, cycle_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, is_fixed")
    .eq("cycle_id", row.cycle_id)
    .order("sort_order");
  return {
    expense: {
      id: row.id,
      amount: Number(row.amount),
      categoryId: row.category_id,
      occurredOn: row.occurred_on,
      note: row.note,
      cycleId: row.cycle_id,
    },
    categories: (cats ?? []).map((c) => ({ id: c.id, name: c.name, isFixed: c.is_fixed })),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/queries/expense.ts
git commit -m "feat(query): getExpenseForEdit returns expense + cycle's categories"
```

---

## Task 6: Move `ExpenseForm` to `src/components/`

**Files:**
- Create: `src/components/expense-form.tsx` (moved content)
- Delete: `src/app/expenses/new/_components/expense-form.tsx`
- Modify: `src/app/expenses/new/page.tsx`

This task is a pure move with import-path update so subsequent tasks can edit the form's behavior in one place. No behavior change.

- [ ] **Step 1: Move the file**

Run: `git mv src/app/expenses/new/_components/expense-form.tsx src/components/expense-form.tsx`

(Then `rmdir src/app/expenses/new/_components` if it's now empty — `git mv` leaves the directory if there are no other files.)

- [ ] **Step 2: Update the importer**

In `src/app/expenses/new/page.tsx`, change:

```ts
import { ExpenseForm } from "./_components/expense-form";
```

to:

```ts
import { ExpenseForm } from "@/components/expense-form";
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. The existing E2E `golden-path.spec.ts` covers this form unchanged.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/expenses/new src/components/expense-form.tsx
git commit -m "refactor(expense-form): move to src/components for reuse in edit page"
```

---

## Task 7: Generalize `ExpenseForm` with `mode` discriminator

**Files:**
- Modify: `src/components/expense-form.tsx`

- [ ] **Step 1: Replace the file body**

Open `src/components/expense-form.tsx`. Replace the entire file with:

```tsx
"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { copy } from "@/lib/copy";
import { createExpenseAction, updateExpenseAction } from "@/server/actions/expense";
import { initialResult } from "@/server/actions/result";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Field = "amount" | "categoryId" | "occurredOn" | "note";
type Cat = { id: string; name: string };
type Expense = {
  id: string;
  amount: number;
  categoryId: string;
  occurredOn: string;
  note: string | null;
};

type Props =
  | { mode: "create"; categories: Cat[]; defaultDate: string }
  | { mode: "edit"; categories: Cat[]; expense: Expense };

const fieldShellClass =
  "h-11 w-full rounded-md border border-input bg-surface px-3 text-base text-text-primary outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25";

export function ExpenseForm(props: Props) {
  const c = copy.expense;
  const action = props.mode === "edit" ? updateExpenseAction : createExpenseAction;
  const [state, formAction, pending] = useActionState(action, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  const defaults = props.mode === "edit"
    ? {
        amount: String(props.expense.amount),
        categoryId: props.expense.categoryId,
        occurredOn: props.expense.occurredOn,
        note: props.expense.note ?? "",
      }
    : {
        amount: "",
        categoryId: undefined as string | undefined,
        occurredOn: props.defaultDate,
        note: "",
      };

  const submitLabel = props.mode === "edit" ? c.update : c.submit;

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      {props.mode === "edit" && <input type="hidden" name="id" value={props.expense.id} />}

      <div className="space-y-2">
        <label htmlFor="amount" className="block text-sm font-medium text-text-primary">
          {c.amount}
        </label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          inputMode="decimal"
          defaultValue={defaults.amount}
          className="font-mono tabular-nums text-md"
          aria-invalid={fieldErr("amount") ? true : undefined}
          aria-describedby={fieldErr("amount") ? "amount-err" : undefined}
        />
        {fieldErr("amount") && (
          <span id="amount-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("amount")}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="categoryId" className="block text-sm font-medium text-text-primary">
          {c.category}
        </label>
        <div className="relative">
          <select
            id="categoryId"
            name="categoryId"
            required
            disabled={props.categories.length === 0}
            defaultValue={defaults.categoryId}
            aria-invalid={fieldErr("categoryId") ? true : undefined}
            aria-describedby={fieldErr("categoryId") ? "category-err" : undefined}
            className={`${fieldShellClass} appearance-none pr-10 disabled:opacity-60`}
          >
            {props.categories.length === 0 && <option>{c.noCategory}</option>}
            {props.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
        {fieldErr("categoryId") && (
          <span id="category-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("categoryId")}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="occurredOn" className="block text-sm font-medium text-text-primary">
          {c.date}
        </label>
        <input
          id="occurredOn"
          name="occurredOn"
          type="date"
          defaultValue={defaults.occurredOn}
          required
          aria-invalid={fieldErr("occurredOn") ? true : undefined}
          aria-describedby={fieldErr("occurredOn") ? "date-err" : undefined}
          className={`${fieldShellClass} font-mono tabular-nums`}
        />
        {fieldErr("occurredOn") && (
          <span id="date-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("occurredOn")}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="note" className="block text-sm font-medium text-text-primary">
          {c.note}
        </label>
        <Input
          id="note"
          name="note"
          maxLength={500}
          defaultValue={defaults.note}
          aria-invalid={fieldErr("note") ? true : undefined}
          aria-describedby={fieldErr("note") ? "note-err" : undefined}
        />
        {fieldErr("note") && (
          <span id="note-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("note")}
          </span>
        )}
      </div>

      {!state.ok && state.formError && (
        <p className="text-sm text-destructive" aria-live="polite">{state.formError}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Link
          href="/"
          className="flex h-12 flex-1 items-center justify-center rounded-md border border-border bg-surface text-base font-medium text-text-primary transition-colors hover:bg-clay-200"
        >
          {c.cancel}
        </Link>
        <Button type="submit" disabled={pending} size="lg" className="flex-1">
          {pending ? "…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update the new-expense page to use the discriminated prop**

In `src/app/expenses/new/page.tsx`, change the JSX call from:

```tsx
<ExpenseForm categories={cats} defaultDate={today} />
```

to:

```tsx
<ExpenseForm mode="create" categories={cats} defaultDate={today} />
```

- [ ] **Step 3: Typecheck, lint, run existing E2E**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

Then start the dev server (`pnpm dev`) and manually create one expense at mobile viewport to confirm nothing regressed. Existing `tests/e2e/golden-path.spec.ts` will exercise this in Task 13's verification step.

- [ ] **Step 4: Commit**

```bash
git add src/components/expense-form.tsx src/app/expenses/new/page.tsx
git commit -m "refactor(expense-form): support create + edit modes via discriminated prop"
```

---

## Task 8: `DeleteExpenseButton` client component

**Files:**
- Create: `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx`

- [ ] **Step 1: Make the directory**

Run: `mkdir -p src/app/expenses/\[id\]/edit/_components`

(Bracketed path on macOS zsh; the `\[` and `\]` are literal in the filesystem.)

- [ ] **Step 2: Write the component**

Create `src/app/expenses/[id]/edit/_components/delete-expense-button.tsx`:

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
        start(() => {
          void deleteExpenseAction(id);
        });
      }}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-sienna-600 bg-surface px-4 py-2 text-base font-medium text-sienna-600 transition-colors hover:bg-clay-100 disabled:opacity-60"
    >
      {pending ? "…" : copy.expense.delete}
    </button>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/expenses/\[id\]/edit/_components/delete-expense-button.tsx
git commit -m "feat(expense): DeleteExpenseButton client component with confirm + transition"
```

---

## Task 9: Edit page route

**Files:**
- Create: `src/app/expenses/[id]/edit/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/expenses/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { getExpenseForEdit } from "@/server/queries/expense";
import { BackLink } from "@/components/back-link";
import { ExpenseForm } from "@/components/expense-form";
import { DeleteExpenseButton } from "./_components/delete-expense-button";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getExpenseForEdit(id);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.expense.editTitle}</h1>
      </div>
      <ExpenseForm mode="edit" categories={data.categories} expense={data.expense} />
      <DeleteExpenseButton id={data.expense.id} />
    </main>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Manual smoke**

Start `pnpm dev`. From the dashboard, copy an existing expense's UUID from the database (`pnpm db:start` and inspect via Studio, or grab one from `expenses` table). Visit `/expenses/<uuid>/edit` directly. Confirm the form pre-fills with the expense's amount, category, date, note. Confirm the title reads "Modifica spesa". Confirm a red "Elimina" button appears below the form.

- [ ] **Step 4: Commit**

```bash
git add src/app/expenses/\[id\]/edit/page.tsx
git commit -m "feat(expense): /expenses/[id]/edit route with form + delete"
```

---

## Task 10: Wire `CategoryRow` transactions to `<Link>`

**Files:**
- Modify: `src/components/category-row.tsx`

- [ ] **Step 1: Import `Link`**

At the top of `src/components/category-row.tsx`, add:

```ts
import Link from "next/link";
```

- [ ] **Step 2: Replace the transactions list**

Replace the existing `<ul>` block (lines 64–74 in the current file) with:

```tsx
<ul className="divide-y divide-border-muted">
  {transactions.map((t) => (
    <li key={t.id}>
      <Link
        href={`/expenses/${t.id}/edit`}
        className="flex min-h-11 items-center justify-between gap-2 p-2 transition-colors hover:bg-clay-100"
      >
        <span>
          <span className="font-mono tabular-nums text-text-muted">{formatDate(t.occurredOn)}</span>
          {t.note && <em className="ml-2 text-clay-800">{t.note}</em>}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono tabular-nums">− {formatEur(t.amount)}</span>
          <span className="text-clay-400" aria-hidden>›</span>
        </span>
      </Link>
    </li>
  ))}
</ul>
```

- [ ] **Step 3: Typecheck, lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Manual smoke**

`pnpm dev`, expand a category with at least one transaction, confirm each row is tappable, the chevron renders, and tapping navigates to `/expenses/[id]/edit` with the form pre-filled.

- [ ] **Step 5: Commit**

```bash
git add src/components/category-row.tsx
git commit -m "feat(dashboard): make transaction rows tap to edit"
```

---

## Task 11: E2E — edit transaction

**Files:**
- Create: `tests/e2e/edit-expense.spec.ts`

- [ ] **Step 1: Write the test**

Create `tests/e2e/edit-expense.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("edit transaction: change amount and note, see updated totals", async ({ page }) => {
  const email = `e2e-edit+${Date.now()}@test.local`;

  // Sign up
  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // Create category
  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "20");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Carburante")).toBeVisible();

  // Create expense
  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "50.00");
  await page.selectOption("[name=categoryId]", { label: "Carburante" });
  await page.fill("[name=note]", "Pieno");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/€\s*50,00/).first()).toBeVisible();

  // Expand category, tap the transaction row
  await page.getByRole("button", { name: /Carburante/ }).click();
  await page.getByRole("link", { name: /Pieno/ }).click();

  // Edit page
  await expect(page.getByRole("heading", { name: "Modifica spesa" })).toBeVisible();
  await page.fill("[name=amount]", "75.50");
  await page.fill("[name=note]", "Pieno aggiornato");
  await page.getByRole("button", { name: "Aggiorna" }).click();

  // Back on dashboard, see new total + toast
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByText(/spesa aggiornata/i)).toBeVisible();
  await expect(page.getByText(/€\s*75,50/).first()).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test:e2e tests/e2e/edit-expense.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/edit-expense.spec.ts
git commit -m "test(e2e): edit transaction smoke"
```

---

## Task 12: E2E — delete transaction

**Files:**
- Create: `tests/e2e/delete-expense.spec.ts`

- [ ] **Step 1: Write the test**

Create `tests/e2e/delete-expense.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("delete transaction: confirm dialog, row removed, toast shown", async ({ page }) => {
  const email = `e2e-del+${Date.now()}@test.local`;

  // Sign up
  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // Category + expense
  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "20");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Carburante")).toBeVisible();

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "33.33");
  await page.selectOption("[name=categoryId]", { label: "Carburante" });
  await page.fill("[name=note]", "Da cancellare");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // Navigate to edit
  await page.getByRole("button", { name: /Carburante/ }).click();
  await page.getByRole("link", { name: /Da cancellare/ }).click();
  await expect(page.getByRole("heading", { name: "Modifica spesa" })).toBeVisible();

  // Accept the native confirm
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Elimina" }).click();

  // Back on dashboard, no row + toast
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByText(/spesa rimossa/i)).toBeVisible();
  await expect(page.getByText("Da cancellare")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test:e2e tests/e2e/delete-expense.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/delete-expense.spec.ts
git commit -m "test(e2e): delete transaction smoke"
```

---

## Task 13: Final verification

**Files:** none.

- [ ] **Step 1: Full test suite**

Run: `pnpm db:reset && pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 2: Full E2E**

Run: `pnpm test:e2e`
Expected: PASS (existing suites + the two new specs).

- [ ] **Step 3: Audit**

Run: `pnpm audit --prod`
Expected: zero `high` or `critical` advisories. Resolve any new advisory in this branch.

- [ ] **Step 4: Manual mobile smoke**

Start `pnpm dev`. At 375 × 667:

1. Confirm KPI grid order: row 1 `STIPENDIO · % STIPENDIO`, row 2 `SPESO · RIMANENTE`.
2. Expand a category, tap a transaction → land on `/expenses/[id]/edit` with form pre-filled.
3. Change amount, save → toast "Spesa aggiornata", dashboard total reflects the change.
4. Open another transaction, tap "Elimina", accept confirm → toast "Spesa rimossa", row gone.
5. Edit a transaction and change its date so it crosses the cycle boundary (e.g., from 28 Apr to 27 Mar with a 27th-of-month cycle start) → expense disappears from the current cycle's totals on next dashboard render.

- [ ] **Step 5: Commit any audit fixes**

If `pnpm audit` required updates, commit them as a separate fix commit:

```bash
git add pnpm-lock.yaml package.json
git commit -m "fix(deps): resolve high/critical advisory <id>"
```

Otherwise nothing to commit.

---

## Self-Review Notes

- **Spec coverage:** All sections of the spec (KPI reorder, server actions, query, edit page, ExpenseForm generalization, DeleteExpenseButton, CategoryRow wiring, copy, edge cases, testing) map to a task above.
- **No placeholders:** Every code block is the real code to paste. No TBD/TODO/"add appropriate" steps.
- **Type consistency:** `ExpenseForEdit.expense` shape (id/amount/categoryId/occurredOn/note/cycleId) matches what the edit page passes to `ExpenseForm`'s `expense` prop (id/amount/categoryId/occurredOn/note). The extra `cycleId` is dropped at the page boundary on purpose. `Cat` shape (id/name) matches the form's `categories` prop. `categoryId` is the property name everywhere.
- **Categories per cycle:** `getExpenseForEdit` loads categories from the expense's *own* `cycle_id`. If the user changes the date so the new cycle has different categories, the FK on update fails and `formError` shows the message. Documented as v1 behavior.
