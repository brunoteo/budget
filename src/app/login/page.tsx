import { loginAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.loginTitle}</h1>
      <form action={async (fd) => { await loginAction(fd); }} className="space-y-3">
        <label className="block">
          <span className="text-sm">{copy.auth.email}</span>
          <input name="email" type="email" required className="mt-1 w-full rounded border p-3" autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.password}</span>
          <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded border p-3" autoComplete="current-password" />
        </label>
        <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">{copy.auth.submitLogin}</button>
      </form>
      <p className="text-sm text-center">
        {copy.auth.noAccount} <Link href="/signup" className="underline">{copy.auth.goSignup}</Link>
      </p>
    </main>
  );
}
