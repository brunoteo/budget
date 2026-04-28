import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";
import { CategoryEditorForm } from "@/components/category-editor-form";
import { deleteCategoryAction, carryForwardCategoriesAction } from "@/server/actions/category";
import { formatEur } from "@/lib/format/eur";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const data = await getDashboardForToday(new Date().toISOString().slice(0, 10));
  if (!data) redirect("/login");
  const c = copy.categories;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="font-display text-xl font-semibold text-clay-900">{c.title}</h1>

      {data.categories.length === 0 && (
        <form action={async (fd) => { "use server"; await carryForwardCategoriesAction(fd); }}>
          <input type="hidden" name="targetCycleId" value={data.cycle.id} />
          <button type="submit" className="w-full rounded-lg border border-clay-300 bg-clay-50 p-3 text-clay-800">
            {c.carryForward}
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {data.categories.map((cat) => (
          <li key={cat.id} className="rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-clay-900">
                {cat.name}
                {cat.isFixed && (
                  <span className="ml-2 rounded bg-clay-200 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-clay-700">
                    {c.fixedBadge}
                  </span>
                )}
              </strong>
              <span className="font-mono tabular-nums text-clay-700">{formatEur(cat.expectedAmount)}</span>
            </div>
            <form
              action={async () => { "use server"; await deleteCategoryAction(cat.id); }}
              className="mt-2 text-right"
            >
              <button type="submit" className="text-sm text-sienna-600 underline underline-offset-2">{c.delete}</button>
            </form>
          </li>
        ))}
      </ul>

      <CategoryEditorForm cycleId={data.cycle.id} />
    </main>
  );
}
