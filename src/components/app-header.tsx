import Link from "next/link";
import { List, Upload, Settings, LogOut } from "lucide-react";
import { copy } from "@/lib/copy";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleRange } from "@/lib/cycle/compute";
import { logoutAction } from "@/server/actions/auth";

const iconButtonClass =
  "grid h-11 w-11 place-items-center rounded-full text-clay-700 transition-colors hover:bg-clay-200 active:bg-clay-300";

export function AppHeader({ displayName, range }: { displayName: string; range: CycleRange }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border-muted bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm leading-none text-accent">il quaderno</span>
            <span className="truncate text-xs text-text-muted">· {displayName}</span>
          </div>
          <div className="mt-1 font-display text-lg leading-tight text-text-primary">
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
            <List className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
          <Link
            href="/import"
            className={iconButtonClass}
            aria-label={copy.import.title}
            title={copy.import.title}
          >
            <Upload className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
          <Link
            href="/settings"
            className={iconButtonClass}
            aria-label={copy.header.settings}
            title={copy.header.settings}
          >
            <Settings className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className={iconButtonClass}
              aria-label={copy.header.logout}
              title={copy.header.logout}
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
