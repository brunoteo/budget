import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { getExpenseForEdit } from "@/server/queries/expense";
import { BackLink } from "@/components/back-link";
import { ExpenseForm } from "@/components/expense-form";
import { DeleteExpenseButton } from "./_components/delete-expense-button";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getExpenseForEdit(id);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.expense.editTitle}</h1>
      </div>
      <ExpenseForm mode="edit" categories={data.categories} expense={data.expense} />
      <DeleteExpenseButton id={data.expense.id} />
    </main>
  );
}
