"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import { initialResult } from "@/server/actions/result";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialResult);
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";
  const fieldErr = (k: "email" | "password") =>
    !state.ok ? state.fieldErrors[k] : undefined;

  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.loginTitle}</h1>
      <form action={action} className="space-y-3" noValidate>
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
            autoComplete="current-password"
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
        {!state.ok && state.formError && (
          <p className="text-sm text-terra-700" aria-live="polite">{state.formError}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-clay-900 p-3 text-clay-50 disabled:opacity-60"
        >
          {pending ? copy.auth.submittingLogin : copy.auth.submitLogin}
        </button>
      </form>
      {allowSignup && (
        <p className="text-sm text-center">
          {copy.auth.noAccount}{" "}
          <Link href="/signup" className="underline">{copy.auth.goSignup}</Link>
        </p>
      )}
    </main>
  );
}
