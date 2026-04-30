import Link from "next/link";
import { copy } from "@/lib/copy";

export function Fab() {
  return (
    <Link
      href="/expenses/new"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 grid h-14 w-14 place-items-center rounded-full bg-terra-500 text-clay-50 shadow-lg shadow-terra-500/30 transition-transform active:scale-95 md:bottom-6 md:right-6"
      aria-label={copy.fab.addExpense}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </Link>
  );
}
