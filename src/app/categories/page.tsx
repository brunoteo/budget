import Link from "next/link";
import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";
import { CategoryEditorForm } from "@/components/category-editor-form";
import { CategoryEditForm } from "@/components/category-edit-form";
import { deleteCategoryAction, carryForwardCategoriesAction } from "@/server/actions/category";
import { formatEur } from "@/lib/format/eur";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const data = await getDashboardForToday(new Date().toISOString().slice(0, 10));
  if (!data) redirect("/login");
  const c = copy.categories;
  const sp = await searchParams;
  const editId = typeof sp.edit === "string" ? sp.edit : undefined;

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{c.title}</h1>
      </div>

      {data.categories.length === 0 && (
        <form action={async (fd) => { "use server"; await carryForwardCategoriesAction(fd); }}>
          <input type="hidden" name="targetCycleId" value={data.cycle.id} />
          <button type="submit" className="h-11 w-full rounded-md border border-border bg-surface px-4 text-text-primary transition-colors hover:bg-clay-200">
            {c.carryForward}
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {data.categories.map((cat) => (
          <li key={cat.id}>
            {editId === cat.id ? (
              <CategoryEditForm
                defaults={{
                  id: cat.id,
                  name: cat.name,
                  expectedAmount: cat.expectedAmount,
                  isFixed: cat.isFixed,
                }}
              />
            ) : (
              <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-text-primary">
                    {cat.name}
                    {cat.isFixed && (
                      <span className="ml-2 rounded-sm bg-clay-200 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-clay-700">
                        {c.fixedBadge}
                      </span>
                    )}
                  </strong>
                  <span className="font-mono tabular-nums text-clay-700">{formatEur(cat.expectedAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-4">
                  <Link
                    href={`/categories?edit=${cat.id}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-accent underline underline-offset-2"
                  >
                    {c.edit}
                  </Link>
                  <form action={async () => { "use server"; await deleteCategoryAction(cat.id); }}>
                    <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-sienna-600 underline underline-offset-2">{c.delete}</button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!editId && <CategoryEditorForm cycleId={data.cycle.id} />}
    </main>
  );
}
