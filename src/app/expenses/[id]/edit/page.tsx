import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { getExpenseForEdit } from "@/server/queries/expense";
import { BackLink } from "@/components/back-link";
import { ExpenseForm } from "@/components/expense-form";
import { DeleteExpenseButton } from "./_components/delete-expense-button";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { id } = await params;
  const { return: returnRaw } = await searchParams;
  const returnTo =
    typeof returnRaw === "string" && returnRaw.startsWith("/") && !returnRaw.startsWith("//")
      ? returnRaw
      : undefined;
  const data = await getExpenseForEdit(id);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.expense.editTitle}</h1>
      </div>
      <ExpenseForm mode="edit" categories={data.categories} expense={data.expense} returnTo={returnTo} />
      <DeleteExpenseButton id={data.expense.id} returnTo={returnTo} />
    </main>
  );
}
