"use client";
import { useActionState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import { createExpenseAction } from "@/server/actions/expense";
import { initialResult } from "@/server/actions/result";

type Field = "amount" | "categoryId" | "occurredOn" | "note";

export function ExpenseForm({
  categories,
  defaultDate,
}: {
  categories: { id: string; name: string }[];
  defaultDate: string;
}) {
  const c = copy.expense;
  const [state, action, pending] = useActionState(createExpenseAction, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  return (
    <form action={action} className="space-y-3" noValidate>
      <label className="block">
        <span className="text-sm text-clay-700">{c.amount}</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          inputMode="decimal"
          aria-invalid={fieldErr("amount") ? true : undefined}
          aria-describedby={fieldErr("amount") ? "amount-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums"
        />
        {fieldErr("amount") && (
          <span id="amount-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("amount")}
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm text-clay-700">{c.category}</span>
        <select
          name="categoryId"
          required
          disabled={categories.length === 0}
          aria-invalid={fieldErr("categoryId") ? true : undefined}
          aria-describedby={fieldErr("categoryId") ? "category-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3"
        >
          {categories.length === 0 && <option>{c.noCategory}</option>}
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        {fieldErr("categoryId") && (
          <span id="category-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("categoryId")}
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm text-clay-700">{c.date}</span>
        <input
          name="occurredOn"
          type="date"
          defaultValue={defaultDate}
          required
          aria-invalid={fieldErr("occurredOn") ? true : undefined}
          aria-describedby={fieldErr("occurredOn") ? "date-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3"
        />
        {fieldErr("occurredOn") && (
          <span id="date-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("occurredOn")}
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm text-clay-700">{c.note}</span>
        <input
          name="note"
          maxLength={500}
          aria-invalid={fieldErr("note") ? true : undefined}
          aria-describedby={fieldErr("note") ? "note-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3"
        />
        {fieldErr("note") && (
          <span id="note-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("note")}
          </span>
        )}
      </label>
      {!state.ok && state.formError && (
        <p className="text-sm text-terra-700" aria-live="polite">{state.formError}</p>
      )}
      <div className="flex gap-2 pt-2">
        <Link href="/" className="flex-1 rounded-lg border border-clay-300 p-3 text-center text-clay-700">{c.cancel}</Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-terra-500 p-3 text-clay-50 shadow-sm disabled:opacity-60"
        >
          {c.submit}
        </button>
      </div>
    </form>
  );
}
