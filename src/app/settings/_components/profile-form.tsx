"use client";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { updateProfileAction } from "@/server/actions/profile";
import { initialResult } from "@/server/actions/result";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      noValidate
      className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-text-primary">{c.profile}</h2>

      <div className="space-y-2">
        <label htmlFor="profile-displayName" className="block text-sm font-medium text-text-primary">
          {c.name}
        </label>
        <Input
          id="profile-displayName"
          name="displayName"
          defaultValue={defaults.displayName}
          required
          aria-invalid={fieldErr("displayName") ? true : undefined}
          aria-describedby={fieldErr("displayName") ? "profile-name-err" : undefined}
        />
        {fieldErr("displayName") && (
          <span id="profile-name-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("displayName")}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="profile-cycleStartDay" className="block text-sm font-medium text-text-primary">
          {c.cycleStartDay}
        </label>
        <Input
          id="profile-cycleStartDay"
          name="cycleStartDay"
          type="number"
          min={1}
          max={31}
          defaultValue={defaults.cycleStartDay}
          required
          className="font-mono tabular-nums"
          aria-invalid={fieldErr("cycleStartDay") ? true : undefined}
          aria-describedby={fieldErr("cycleStartDay") ? "profile-cycle-err" : undefined}
        />
        {fieldErr("cycleStartDay") && (
          <span id="profile-cycle-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("cycleStartDay")}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="profile-defaultSalary" className="block text-sm font-medium text-text-primary">
          {c.defaultSalary}
        </label>
        <Input
          id="profile-defaultSalary"
          name="defaultSalary"
          type="number"
          step="0.01"
          min={0}
          defaultValue={defaults.defaultSalary ?? ""}
          className="font-mono tabular-nums"
          aria-invalid={fieldErr("defaultSalary") ? true : undefined}
          aria-describedby={fieldErr("defaultSalary") ? "profile-salary-err" : undefined}
        />
        {fieldErr("defaultSalary") && (
          <span id="profile-salary-err" className="block text-sm text-destructive" aria-live="polite">
            {fieldErr("defaultSalary")}
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
