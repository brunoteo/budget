import Link from "next/link";
import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { createExpenseAction } from "@/server/actions/expense";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today);
  const cats = data?.categories ?? [];
  const c = copy.expense;

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 font-display text-xl font-semibold text-clay-900">{c.newTitle}</h1>
      <form action={async (fd) => { "use server"; await createExpenseAction(fd); }} className="space-y-3">
        <label className="block">
          <span className="text-sm text-clay-700">{c.amount}</span>
          <input name="amount" type="number" step="0.01" min="0" required inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums" />
        </label>
        <label className="block">
          <span className="text-sm text-clay-700">{c.category}</span>
          <select name="categoryId" required disabled={cats.length === 0}
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3">
            {cats.length === 0 && <option>{c.noCategory}</option>}
            {cats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-clay-700">{c.date}</span>
          <input name="occurredOn" type="date" defaultValue={today} required
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3" />
        </label>
        <label className="block">
          <span className="text-sm text-clay-700">{c.note}</span>
          <input name="note" maxLength={500}
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3" />
        </label>
        <div className="flex gap-2 pt-2">
          <Link href="/" className="flex-1 rounded-lg border border-clay-300 p-3 text-center text-clay-700">{c.cancel}</Link>
          <button type="submit" className="flex-1 rounded-lg bg-terra-500 p-3 text-clay-50 shadow-sm">{c.submit}</button>
        </div>
      </form>
    </main>
  );
}
