import { getDashboardForToday } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/kpi-card";
import { PacingBar } from "@/components/pacing-bar";
import { CategoryRow } from "@/components/category-row";
import { AppHeader } from "@/components/app-header";
import { Fab } from "@/components/fab";
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today);
  if (!data) redirect("/login");

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const c = copy.dashboard;

  return (
    <>
      <AppHeader displayName={data.profile.displayName} range={data.cycle.range} />
      <main className="mx-auto max-w-3xl space-y-3 p-4 pb-24">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label={c.salary} primary={data.cycle.salary ?? 0} />
          <KpiCard label={c.spent} primary={data.kpi.totalSpent} secondary={c.onBudget(formatEur(data.kpi.totalBudget))} />
          <KpiCard label={c.remaining} primary={data.kpi.totalRemaining} secondary={c.consumed(pct(data.kpi.percentConsumed))} />
          <KpiCard label={c.percentSalary} primary={pct(data.kpi.percentOfSalarySpent)} />
        </section>
        <PacingBar
          percentConsumed={data.kpi.percentConsumed}
          cycleProgress={data.kpi.cycleProgress}
          paceDelta={data.kpi.paceDelta}
        />
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-clay-600">
            {copy.dashboard.categoriesHeading} · {data.categories.length}
          </h2>
          {data.categories.map((cat) => {
            const k = data.kpi.byCategory.find((x) => x.id === cat.id);
            if (!k) return null;
            const txs = data.expenses.filter((e) => e.categoryId === cat.id);
            return (
              <CategoryRow
                key={cat.id}
                name={cat.name}
                expected={cat.expectedAmount}
                actual={k.actual}
                isFixed={cat.isFixed}
                overBudget={k.overBudget}
                transactions={txs}
              />
            );
          })}
          {data.categories.length === 0 && (
            <div className="rounded-xl border border-clay-200 bg-clay-50 p-6 text-center text-clay-600">
              {copy.dashboard.noCategories} <Link href="/categories" className="underline">{copy.dashboard.addOne}</Link>.
            </div>
          )}
        </section>
      </main>
      <Fab />
    </>
  );
}
