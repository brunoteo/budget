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
  | { mode: "create"; categories: Cat[]; defaultDate: string; returnTo?: string }
  | { mode: "edit"; categories: Cat[]; expense: Expense; returnTo?: string };

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
      {props.returnTo && <input type="hidden" name="return" value={props.returnTo} />}

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
          href={props.returnTo ?? "/"}
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
