"use client";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { setCycleSalaryAction } from "@/server/actions/cycle";
import { initialResult } from "@/server/actions/result";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      noValidate
      className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-text-primary">{c.currentCycleSalary}</h2>
      <input type="hidden" name="cycleId" value={cycleId} />

      <div className="space-y-2">
        <label htmlFor="cycle-salary" className="block text-sm font-medium text-text-primary">
          {c.salary}
        </label>
        <Input
          id="cycle-salary"
          name="salary"
          type="number"
          step="0.01"
          min={0}
          defaultValue={defaultSalary ?? ""}
          className="font-mono tabular-nums"
          aria-invalid={fieldErr("salary") ? true : undefined}
          aria-describedby={fieldErr("salary") ? "salary-err" : undefined}
        />
        {fieldErr("salary") && (
          <span id="salary-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("salary")}
          </span>
        )}
      </div>

      {!state.ok && state.formError && (
        <p className="text-sm text-destructive" aria-live="polite">{state.formError}</p>
      )}

      <Button type="submit" disabled={pending} size="lg" className="w-full">
        {c.save}
      </Button>
    </form>
  );
}
