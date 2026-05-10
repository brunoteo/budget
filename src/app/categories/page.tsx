import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";
import { CategoryEditorForm } from "@/components/category-editor-form";
import { CategoryEditForm } from "@/components/category-edit-form";
import { deleteCategoryAction, carryForwardCategoriesAction } from "@/server/actions/category";
import { formatEur } from "@/lib/format/eur";
import { BackLink } from "@/components/back-link";
import { cycleLabel } from "@/lib/cycle/label";
import { computeCycleForDate, nextCycle, prevCycle } from "@/lib/cycle/compute";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[]; cycle?: string | string[] }>;
}) {
  const sp = await searchParams;
  const cycleParam =
    typeof sp.cycle === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.cycle) ? sp.cycle : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today, cycleParam);
  if (!data) redirect("/login");
  const c = copy.categories;
  const editId = typeof sp.edit === "string" ? sp.edit : undefined;
  const cycleQuery = cycleParam ? `&cycle=${cycleParam}` : "";
  const startDay = data.profile.cycleStartDay;
  const todayCycle = computeCycleForDate(today, startDay);
  const isCurrentCycle = data.cycle.range.start === todayCycle.start;
  const prevStart = prevCycle(data.cycle.range, startDay).start;
  const nextStart = nextCycle(data.cycle.range, startDay).start;
  const dashboardHref = isCurrentCycle ? "/" : `/?cycle=${data.cycle.range.start}`;

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink href={dashboardHref} label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{c.title}</h1>
      </div>

      <div className="flex items-center justify-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm">
        <Link
          href={`/categories?cycle=${prevStart}`}
          aria-label={copy.header.prevCycle}
          title={copy.header.prevCycle}
          className="grid h-11 w-11 place-items-center rounded-full text-clay-700 transition-colors hover:bg-clay-200 active:bg-clay-300"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </Link>
        <div className="font-display text-base leading-none text-text-primary tabular-nums whitespace-nowrap">
          {cycleLabel(data.cycle.range)}
        </div>
        <Link
          href={`/categories?cycle=${nextStart}`}
          aria-label={copy.header.nextCycle}
          title={copy.header.nextCycle}
          className="grid h-11 w-11 place-items-center rounded-full text-clay-700 transition-colors hover:bg-clay-200 active:bg-clay-300"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </Link>
        {!isCurrentCycle && (
          <Link
            href="/categories"
            className="ml-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-clay-200 active:bg-clay-300"
          >
            {copy.header.today}
          </Link>
        )}
      </div>

      {data.categories.length === 0 && (
        <form action={async (fd) => { "use server"; await carryForwardCategoriesAction(fd); }}>
          <input type="hidden" name="targetCycleId" value={data.cycle.id} />
          {cycleParam && <input type="hidden" name="cycleSlug" value={cycleParam} />}
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
                cycleSlug={cycleParam}
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
                    href={`/categories?edit=${cat.id}${cycleQuery}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-accent underline underline-offset-2"
                  >
                    {c.edit}
                  </Link>
                  <form action={async (fd) => { "use server"; await deleteCategoryAction(cat.id, fd); }}>
                    {cycleParam && <input type="hidden" name="cycleSlug" value={cycleParam} />}
                    <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-sienna-600 underline underline-offset-2">{c.delete}</button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!editId && <CategoryEditorForm cycleId={data.cycle.id} cycleSlug={cycleParam} />}
    </main>
  );
}
