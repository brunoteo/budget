"use client";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { updateProfileAction } from "@/server/actions/profile";
import { initialResult } from "@/server/actions/result";

type Field = "displayName" | "cycleStartDay" | "defaultSalary";

export function ProfileForm({
  defaults,
}: {
  defaults: { displayName: string; cycleStartDay: number; defaultSalary: number | null };
}) {
  const c = copy.settings;
  const [state, action, pending] = useActionState(updateProfileAction, initialResult);
  const fieldErr = (k: Field) => (!state.ok ? state.fieldErrors[k] : undefined);

  return (
    <form
      action={action}
      className="space-y-2 rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm"
      noValidate
    >
      <h2 className="font-display font-semibold text-clay-900">{c.profile}</h2>
      <label className="block">
        <span className="text-sm text-clay-700">{c.name}</span>
        <input
          name="displayName"
          defaultValue={defaults.displayName}
          required
          aria-invalid={fieldErr("displayName") ? true : undefined}
          aria-describedby={fieldErr("displayName") ? "profile-name-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3"
        />
        {fieldErr("displayName") && (
          <span id="profile-name-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("displayName")}
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm text-clay-700">{c.cycleStartDay}</span>
        <input
          name="cycleStartDay"
          type="number"
          min={1}
          max={31}
          defaultValue={defaults.cycleStartDay}
          required
          aria-invalid={fieldErr("cycleStartDay") ? true : undefined}
          aria-describedby={fieldErr("cycleStartDay") ? "profile-cycle-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums"
        />
        {fieldErr("cycleStartDay") && (
          <span id="profile-cycle-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("cycleStartDay")}
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm text-clay-700">{c.defaultSalary}</span>
        <input
          name="defaultSalary"
          type="number"
          step="0.01"
          min={0}
          defaultValue={defaults.defaultSalary ?? ""}
          aria-invalid={fieldErr("defaultSalary") ? true : undefined}
          aria-describedby={fieldErr("defaultSalary") ? "profile-salary-err" : undefined}
          className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums"
        />
        {fieldErr("defaultSalary") && (
          <span id="profile-salary-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
            {fieldErr("defaultSalary")}
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
