"use client";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { createCategoryAction } from "@/server/actions/category";
import { initialResult } from "@/server/actions/result";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Field = "cycleId" | "name" | "expectedAmount" | "isFixed";

export function CategoryEditorForm({ cycleId, cycleSlug }: { cycleId: string; cycleSlug?: string }) {
  const c = copy.categories;
  const [state, action, pending] = useActionState(createCategoryAction, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      noValidate
    >
      <h2 className="font-display text-lg text-text-primary">{c.addTitle}</h2>
      <input type="hidden" name="cycleId" value={cycleId} />
      {cycleSlug && <input type="hidden" name="cycleSlug" value={cycleSlug} />}
      <Input
        name="name"
        required
        placeholder={c.namePlaceholder}
        aria-invalid={fieldErr("name") ? true : undefined}
        aria-describedby={fieldErr("name") ? "cat-name-err" : undefined}
      />
      {fieldErr("name") && (
        <span id="cat-name-err" className="block text-sm text-destructive" aria-live="polite">
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
        placeholder={c.budgetPlaceholder}
        className="font-mono tabular-nums"
        aria-invalid={fieldErr("expectedAmount") ? true : undefined}
        aria-describedby={fieldErr("expectedAmount") ? "cat-amount-err" : undefined}
      />
      {fieldErr("expectedAmount") && (
        <span id="cat-amount-err" className="block text-sm text-destructive" aria-live="polite">
          {fieldErr("expectedAmount")}
        </span>
      )}
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          name="isFixed"
          className="h-4 w-4 rounded border-border accent-accent"
        />{" "}
        {c.fixedLabel}
      </label>
      {!state.ok && state.formError && (
        <p className="text-sm text-destructive" aria-live="polite">{state.formError}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {c.add}
      </Button>
    </form>
  );
}
