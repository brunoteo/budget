import { getDashboardForToday } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/kpi-card";
import { PacingBar } from "@/components/pacing-bar";
import { CategoryRow } from "@/components/category-row";
import { AppHeader } from "@/components/app-header";
import { Fab } from "@/components/fab";
import { copy } from "@/lib/copy";
import { formatEur } from "@/lib/format/eur";
import { computeCycleForDate, nextCycle, prevCycle } from "@/lib/cycle/compute";
import { computeForecast } from "@/lib/forecast/compute";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const sp = await searchParams;
  const cycleParam = typeof sp.cycle === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.cycle) ? sp.cycle : undefined;
  const data = await getDashboardForToday(today, cycleParam);
  if (!data) redirect("/login");

  const startDay = data.profile.cycleStartDay;
  const prevStart = prevCycle(data.cycle.range, startDay).start;
  const nextStart = nextCycle(data.cycle.range, startDay).start;
  const todayCycle = computeCycleForDate(today, startDay);
  const isCurrentCycle = data.cycle.range.start === todayCycle.start;

  const forecast = isCurrentCycle
    ? computeForecast({
        cycle: data.cycle.range,
        today,
        categories: data.categories.map((c) => ({
          id: c.id,
          expectedAmount: c.expectedAmount,
          isFixed: c.isFixed,
        })),
        expenses: data.expenses.map((e) => ({
          categoryId: e.categoryId,
          amount: e.amount,
          occurredOn: e.occurredOn,
        })),
      })
    : null;

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const c = copy.dashboard;

  return (
    <>
      <AppHeader
        displayName={data.profile.displayName}
        range={data.cycle.range}
        prevCycleStart={prevStart}
        nextCycleStart={nextStart}
        isCurrentCycle={isCurrentCycle}
      />
      <main className="mx-auto max-w-3xl space-y-3 p-4 pb-24">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label={c.salary} primary={data.cycle.salary ?? 0} />
          <KpiCard label={c.percentSalary} primary={pct(data.kpi.percentOfSalarySpent)} />
          <KpiCard label={c.spent} primary={data.kpi.totalSpent} secondary={c.onBudget(formatEur(data.kpi.totalBudget))} />
          <KpiCard label={c.remaining} primary={data.kpi.totalRemaining} secondary={c.consumed(pct(data.kpi.percentConsumed))} />
        </section>
        <PacingBar
          percentConsumed={data.kpi.percentConsumed}
          cycleProgress={data.kpi.cycleProgress}
          paceDelta={data.kpi.paceDelta}
          forecast={forecast}
        />
        <section className="space-y-2">
          <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
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
            <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-text-muted">
                {copy.dashboard.noCategories}{" "}
                <Link href="/categories" className="font-medium text-accent underline-offset-4 hover:underline">
                  {copy.dashboard.addOne}
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      </main>
      <Fab />
    </>
  );
}
