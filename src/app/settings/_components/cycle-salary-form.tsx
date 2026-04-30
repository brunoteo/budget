"use client";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { setCycleSalaryAction } from "@/server/actions/cycle";
import { initialResult } from "@/server/actions/result";

type Field = "cycleId" | "salary";

export function CycleSalaryForm({
  cycleId,
  defaultSalary,
}: {
  cycleId: string;
  defaultSalary: number | null;
}) {
  const c = copy.settings;
  const [state, action, pending] = useActionState(setCycleSalaryAction, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  return (
    <form
      action={action}
      className="space-y-2 rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm"
      noValidate
    >
      <h2 className="font-display font-semibold text-clay-900">{c.currentCycleSalary}</h2>
      <input type="hidden" name="cycleId" value={cycleId} />
      <label className="block">
        <span className="text-sm text-clay-700">{c.salary}</span>
        <input
          name="salary"
          type="number"
          step="0.01"
          min={0}
          defaultValue={defaultSalary ?? ""}
          aria-invalid={fieldErr("salary") ? true : undefined}
          aria-describedby={fieldErr("salary") ? "salary-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums"
        />
        {fieldErr("salary") && (
          <span id="salary-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("salary")}
          </span>
        )}
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
        {c.save}
      </button>
    </form>
  );
}
