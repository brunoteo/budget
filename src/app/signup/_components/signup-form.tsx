"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import { initialResult } from "@/server/actions/result";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Field = "email" | "password" | "displayName" | "cycleStartDay";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialResult);
  const fieldErr = (k: Field) =>
    !state.ok ? state.fieldErrors[k] : undefined;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">il quaderno</p>
        <h1 className="mt-2 font-display text-4xl text-text-primary">{copy.auth.signupTitle}</h1>
      </div>
      <form
        action={action}
        noValidate
        className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-medium text-text-primary">
            {copy.auth.displayName}
          </label>
          <Input
            id="displayName"
            name="displayName"
            required
            maxLength={60}
            aria-invalid={fieldErr("displayName") ? true : undefined}
            aria-describedby={fieldErr("displayName") ? "displayName-err" : undefined}
          />
          {fieldErr("displayName") && (
            <span id="displayName-err" className="block text-sm text-destructive" aria-live="polite">
              {fieldErr("displayName")}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-text-primary">
            {copy.auth.email}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={fieldErr("email") ? true : undefined}
            aria-describedby={fieldErr("email") ? "email-err" : undefined}
          />
          {fieldErr("email") && (
            <span id="email-err" className="block text-sm text-destructive" aria-live="polite">
              {fieldErr("email")}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-text-primary">
            {copy.auth.password}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={fieldErr("password") ? true : undefined}
            aria-describedby={fieldErr("password") ? "pwd-err" : undefined}
          />
          {fieldErr("password") && (
            <span id="pwd-err" className="block text-sm text-destructive" aria-live="polite">
              {fieldErr("password")}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="cycleStartDay" className="block text-sm font-medium text-text-primary">
            {copy.auth.cycleStartDay}
          </label>
          <Input
            id="cycleStartDay"
            name="cycleStartDay"
            type="number"
            min={1}
            max={31}
            required
            inputMode="numeric"
            className="font-mono tabular-nums"
            aria-invalid={fieldErr("cycleStartDay") ? true : undefined}
            aria-describedby={fieldErr("cycleStartDay") ? "cycle-err" : "cycle-help"}
          />
          {fieldErr("cycleStartDay") ? (
            <span id="cycle-err" className="block text-sm text-destructive" aria-live="polite">
              {fieldErr("cycleStartDay")}
            </span>
          ) : (
            <span id="cycle-help" className="block text-xs text-text-muted">
              {copy.auth.cycleStartDayHelp}
            </span>
          )}
        </div>
        {!state.ok && state.formError && (
          <p className="text-sm text-destructive" aria-live="polite">{state.formError}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending ? copy.auth.submittingSignup : copy.auth.submitSignup}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        {copy.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          {copy.auth.goLogin}
        </Link>
      </p>
    </main>
  );
}
