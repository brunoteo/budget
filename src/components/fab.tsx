import Link from "next/link";
import { copy } from "@/lib/copy";

export function Fab() {
  return (
    <Link
      href="/expenses/new"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 grid h-14 w-14 place-items-center rounded-full bg-terra-500 text-3xl font-light text-clay-50 shadow-lg shadow-terra-500/30 transition-transform active:scale-95 md:bottom-6 md:right-6"
      aria-label={copy.fab.addExpense}
    >
      +
    </Link>
  );
}
