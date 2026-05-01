"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  List,
  LogOut,
  MoreVertical,
  Settings,
  Upload,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleRange } from "@/lib/cycle/compute";
import { logoutAction } from "@/server/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tapTarget =
  "grid h-11 w-11 place-items-center rounded-full text-clay-700 transition-colors hover:bg-clay-200 active:bg-clay-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

const menuItem =
  "flex h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-text-primary outline-none focus:bg-clay-200";

type Props = {
  displayName: string;
  range: CycleRange;
  prevCycleStart: string;
  nextCycleStart: string;
  isCurrentCycle: boolean;
};

export function AppHeader({
  displayName,
  range,
  prevCycleStart,
  nextCycleStart,
  isCurrentCycle,
}: Props) {
  const label = cycleLabel(range);

  return (
    <header className="sticky top-0 z-10 border-b border-border-muted bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 sm:flex sm:h-14 sm:items-center sm:gap-4">
        <div className="flex h-11 items-center justify-between gap-3 sm:h-auto sm:flex-1 sm:min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-display text-sm leading-none text-accent">
              il quaderno
            </span>
            <span className="truncate text-xs text-text-muted">
              · {displayName}
            </span>
          </div>
          <div className="-mr-2 sm:hidden">
            <ActionsMenu />
          </div>
        </div>

        <div className="flex h-12 items-center justify-center gap-1 sm:h-auto sm:flex-shrink-0">
          <Link
            href={`/?cycle=${prevCycleStart}`}
            className={tapTarget}
            aria-label={copy.header.prevCycle}
            title={copy.header.prevCycle}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
          <div className="font-display text-base leading-none text-text-primary tabular-nums whitespace-nowrap">
            {label}
          </div>
          <Link
            href={`/?cycle=${nextCycleStart}`}
            className={tapTarget}
            aria-label={copy.header.nextCycle}
            title={copy.header.nextCycle}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Link>
          {!isCurrentCycle && (
            <Link
              href="/"
              className="ml-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-clay-200 active:bg-clay-300"
            >
              {copy.header.today}
            </Link>
          )}
        </div>

        <div className="hidden sm:-mr-2 sm:flex sm:flex-1 sm:justify-end">
          <ActionsMenu />
        </div>
      </div>
    </header>
  );
}

function ActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={tapTarget}
        aria-label={copy.header.menu}
        title={copy.header.menu}
      >
        <MoreVertical className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-52 p-1"
      >
        <DropdownMenuItem className={menuItem} render={<Link href="/categories" />}>
          <List className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.header.categories}
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItem} render={<Link href="/import" />}>
          <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.header.import}
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItem} render={<Link href="/settings" />}>
          <Settings className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.header.settings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem
            className={menuItem}
            render={<button type="submit" className="w-full" />}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {copy.header.logout}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
