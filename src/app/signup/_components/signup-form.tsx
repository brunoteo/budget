"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import { initialResult } from "@/server/actions/result";

type Field = "email" | "password" | "displayName" | "cycleStartDay";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialResult);
  const fieldErr = (k: Field) =>
    !state.ok ? state.fieldErrors[k] : undefined;

  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.signupTitle}</h1>
      <form action={action} className="space-y-3" noValidate>
        <label className="block">
          <span className="text-sm">{copy.auth.displayName}</span>
          <input
            name="displayName"
            required
            maxLength={60}
            aria-invalid={fieldErr("displayName") ? true : undefined}
            aria-describedby={fieldErr("displayName") ? "displayName-err" : undefined}
            className="mt-1 w-full rounded border p-3"
          />
          {fieldErr("displayName") && (
            <span id="displayName-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
              {fieldErr("displayName")}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={fieldErr("email") ? true : undefined}
            aria-describedby={fieldErr("email") ? "email-err" : undefined}
            className="mt-1 w-full rounded border p-3"
          />
          {fieldErr("email") && (
            <span id="email-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
              {fieldErr("email")}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={fieldErr("password") ? true : undefined}
            aria-describedby={fieldErr("password") ? "pwd-err" : undefined}
            className="mt-1 w-full rounded border p-3"
          />
          {fieldErr("password") && (
            <span id="pwd-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
              {fieldErr("password")}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.cycleStartDay}</span>
          <input
            name="cycleStartDay"
            type="number"
            min={1}
            max={31}
            required
            inputMode="numeric"
            aria-invalid={fieldErr("cycleStartDay") ? true : undefined}
            aria-describedby={fieldErr("cycleStartDay") ? "cycle-err" : "cycle-help"}
            className="mt-1 w-full rounded border p-3"
          />
          {fieldErr("cycleStartDay") ? (
            <span id="cycle-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
              {fieldErr("cycleStartDay")}
            </span>
          ) : (
            <span id="cycle-help" className="text-xs text-clay-700">{copy.auth.cycleStartDayHelp}</span>
          )}
        </label>
        {!state.ok && state.formError && (
          <p className="text-sm text-terra-700" aria-live="polite">{state.formError}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-clay-900 p-3 text-clay-50 disabled:opacity-60"
        >
          {pending ? copy.auth.submittingSignup : copy.auth.submitSignup}
        </button>
      </form>
      <p className="text-sm text-center">
        {copy.auth.haveAccount}{" "}
        <Link href="/login" className="underline">{copy.auth.goLogin}</Link>
      </p>
    </main>
  );
}
