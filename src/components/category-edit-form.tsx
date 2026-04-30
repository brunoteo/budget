"use client";
import Link from "next/link";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { updateCategoryAction } from "@/server/actions/category";
import { initialResult } from "@/server/actions/result";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Field = "cycleId" | "name" | "expectedAmount" | "isFixed" | "id";

export function CategoryEditForm({
  defaults,
}: {
  defaults: { id: string; name: string; expectedAmount: number; isFixed: boolean };
}) {
  const c = copy.categories;
  const [state, action, pending] = useActionState(updateCategoryAction, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      noValidate
    >
      <h2 className="font-display text-lg text-text-primary">{c.editTitle}</h2>
      <input type="hidden" name="id" value={defaults.id} />
      <Input
        name="name"
        required
        defaultValue={defaults.name}
        placeholder={c.namePlaceholder}
        aria-invalid={fieldErr("name") ? true : undefined}
        aria-describedby={fieldErr("name") ? "cat-edit-name-err" : undefined}
      />
      {fieldErr("name") && (
        <span id="cat-edit-name-err" className="block text-sm text-destructive" aria-live="polite">
          {fieldErr("name")}
        </span>
      )}
      <Input
        name="expectedAmount"
        type="number"
        step="0.01"
        min="0"
        required
        inputMode="decimal"
        defaultValue={defaults.expectedAmount}
        placeholder={c.budgetPlaceholder}
        className="font-mono tabular-nums"
        aria-invalid={fieldErr("expectedAmount") ? true : undefined}
        aria-describedby={fieldErr("expectedAmount") ? "cat-edit-amount-err" : undefined}
      />
      {fieldErr("expectedAmount") && (
        <span id="cat-edit-amount-err" className="block text-sm text-destructive" aria-live="polite">
          {fieldErr("expectedAmount")}
        </span>
      )}
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          name="isFixed"
          defaultChecked={defaults.isFixed}
          className="h-4 w-4 rounded border-border accent-accent"
        />{" "}
        {c.fixedLabel}
      </label>
      {!state.ok && state.formError && (
        <p className="text-sm text-destructive" aria-live="polite">{state.formError}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1" size="lg">
          {c.save}
        </Button>
        <Link
          href="/categories"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-border bg-surface px-4 text-text-primary transition-colors hover:bg-clay-200"
        >
          {c.cancel}
        </Link>
      </div>
    </form>
  );
}
