import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { BackLink } from "@/components/back-link";
import { ExpenseForm } from "./_components/expense-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today);
  const cats = data?.categories ?? [];

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.expense.newTitle}</h1>
      </div>
      <ExpenseForm categories={cats} defaultDate={today} />
    </main>
  );
}
