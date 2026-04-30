import Link from "next/link";
import { Plus } from "lucide-react";
import { copy } from "@/lib/copy";

export function Fab() {
  return (
    <Link
      href="/expenses/new"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-fab transition-transform active:scale-95 md:bottom-6 md:right-6"
      aria-label={copy.fab.addExpense}
      data-focus-ring="contrast"
    >
      <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
    </Link>
  );
}
