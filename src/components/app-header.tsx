import Link from "next/link";
import { copy } from "@/lib/copy";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleRange } from "@/lib/cycle/compute";
import { logoutAction } from "@/server/actions/auth";

const iconButtonClass =
  "grid h-11 w-11 place-items-center rounded-full text-clay-700 hover:bg-clay-100 active:bg-clay-200 transition-colors";

export function AppHeader({ displayName, range }: { displayName: string; range: CycleRange }) {
  return (
    <header className="sticky top-0 z-10 border-b border-clay-200 bg-clay-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[0.65rem] uppercase tracking-wider text-clay-600">{copy.header.cycle}</span>
            <span className="truncate text-xs text-clay-500">· {displayName}</span>
          </div>
          <div className="font-display text-base font-semibold leading-tight text-clay-900">
            {cycleLabel(range)}
          </div>
        </div>

        <nav className="flex shrink-0 items-center gap-1" aria-label="Azioni">
          <Link
            href="/categories"
            className={iconButtonClass}
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
            className={iconButtonClass}
            aria-label={copy.header.settings}
            title={copy.header.settings}
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={iconButtonClass} aria-label={copy.header.logout} title={copy.header.logout}>
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
