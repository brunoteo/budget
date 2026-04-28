import Link from "next/link";
import { copy } from "@/lib/copy";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleRange } from "@/lib/cycle/compute";
import { logoutAction } from "@/server/actions/auth";

export function AppHeader({ displayName, range }: { displayName: string; range: CycleRange }) {
  return (
    <header className="sticky top-0 z-10 border-b border-clay-200 bg-clay-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-clay-600">{copy.header.cycle}</div>
          <div className="font-display text-base font-semibold text-clay-900">{cycleLabel(range)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-clay-700">{displayName}</span>
          <Link
            href="/settings"
            className="grid h-11 w-11 place-items-center rounded-full text-clay-700 hover:bg-clay-100"
            aria-label={copy.header.settings}
          >
            ⚙
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-clay-700 underline underline-offset-2 hover:text-clay-900">
              {copy.header.logout}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
