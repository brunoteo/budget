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
        <div className="flex items-center gap-2">
          <span className="text-sm text-clay-700">{displayName}</span>
          <Link
            href="/categories"
            className="grid h-11 w-11 place-items-center rounded-full text-clay-700 hover:bg-clay-100"
            aria-label={copy.header.categories}
            title={copy.header.categories}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4.5" cy="6" r="1" fill="currentColor" />
              <circle cx="4.5" cy="12" r="1" fill="currentColor" />
              <circle cx="4.5" cy="18" r="1" fill="currentColor" />
            </svg>
          </Link>
          <Link
            href="/settings"
            className="grid h-11 w-11 place-items-center rounded-full text-clay-700 hover:bg-clay-100"
            aria-label={copy.header.settings}
            title={copy.header.settings}
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
