import { notFound } from "next/navigation";
import { signupAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import Link from "next/link";
import { initialResult } from "@/server/actions/result";

export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") notFound();
  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.signupTitle}</h1>
      <form action={async (fd) => { "use server"; await signupAction(initialResult, fd); }} className="space-y-3">
        <label className="block">
          <span className="text-sm">{copy.auth.displayName}</span>
          <input name="displayName" required maxLength={60} className="mt-1 w-full rounded border p-3" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.email}</span>
          <input name="email" type="email" required className="mt-1 w-full rounded border p-3" autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.password}</span>
          <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded border p-3" autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.cycleStartDay}</span>
          <input name="cycleStartDay" type="number" min={1} max={31} required className="mt-1 w-full rounded border p-3" inputMode="numeric" />
          <span className="text-xs text-clay-700">{copy.auth.cycleStartDayHelp}</span>
        </label>
        <button type="submit" className="w-full rounded bg-clay-900 p-3 text-clay-50">{copy.auth.submitSignup}</button>
      </form>
      <p className="text-sm text-center">
        {copy.auth.haveAccount} <Link href="/login" className="underline">{copy.auth.goLogin}</Link>
      </p>
    </main>
  );
}
