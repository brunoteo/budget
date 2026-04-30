import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { ExpenseForm } from "./_components/expense-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today);
  const cats = data?.categories ?? [];

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 font-display text-xl font-semibold text-clay-900">{copy.expense.newTitle}</h1>
      <ExpenseForm categories={cats} defaultDate={today} />
    </main>
  );
}
