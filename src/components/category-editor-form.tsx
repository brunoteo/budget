"use client";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { createCategoryAction } from "@/server/actions/category";
import { initialResult } from "@/server/actions/result";

type Field = "cycleId" | "name" | "expectedAmount" | "isFixed";

export function CategoryEditorForm({ cycleId }: { cycleId: string }) {
  const c = copy.categories;
  const [state, action, pending] = useActionState(createCategoryAction, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  return (
    <form
      action={action}
      className="space-y-2 rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm"
      noValidate
    >
      <h2 className="font-display text-sm font-semibold text-clay-900">{c.addTitle}</h2>
      <input type="hidden" name="cycleId" value={cycleId} />
      <input
        name="name"
        required
        placeholder={c.namePlaceholder}
        aria-invalid={fieldErr("name") ? true : undefined}
        aria-describedby={fieldErr("name") ? "cat-name-err" : undefined}
        className="w-full rounded-lg border border-clay-300 bg-clay-50 p-3"
      />
      {fieldErr("name") && (
        <span id="cat-name-err" className="block text-sm text-terra-700" aria-live="polite">
          {fieldErr("name")}
        </span>
      )}
      <input
        name="expectedAmount"
        type="number"
        step="0.01"
        min="0"
        required
        inputMode="decimal"
        placeholder={c.budgetPlaceholder}
        aria-invalid={fieldErr("expectedAmount") ? true : undefined}
        aria-describedby={fieldErr("expectedAmount") ? "cat-amount-err" : undefined}
        className="w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums"
      />
      {fieldErr("expectedAmount") && (
        <span id="cat-amount-err" className="block text-sm text-terra-700" aria-live="polite">
          {fieldErr("expectedAmount")}
        </span>
      )}
      <label className="flex items-center gap-2 text-sm text-clay-700">
        <input type="checkbox" name="isFixed" /> {c.fixedLabel}
      </label>
      {!state.ok && state.formError && (
        <p className="text-sm text-terra-700" aria-live="polite">{state.formError}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        data-focus-ring="contrast"
        className="w-full rounded-lg bg-terra-500 p-3 text-clay-50 disabled:opacity-60"
      >
        {c.add}
      </button>
    </form>
  );
}
