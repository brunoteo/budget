"use client";
import { useTransition } from "react";
import { deleteExpenseAction } from "@/server/actions/expense";
import { copy } from "@/lib/copy";

export function DeleteExpenseButton({ id, returnTo }: { id: string; returnTo?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(copy.expense.deleteConfirm)) return;
        start(() => {
          void deleteExpenseAction(id, returnTo);
        });
      }}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-sienna-600 bg-surface px-4 py-2 text-base font-medium text-sienna-600 transition-colors hover:bg-clay-100 disabled:opacity-60"
    >
      {pending ? "…" : copy.expense.delete}
    </button>
  );
}
