import { getDashboardForToday } from "@/server/queries/dashboard";
import { KpiHero, KpiStat } from "@/components/kpi-card";
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

const revealBase =
  "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both";

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
  const heroTone: "neutral" | "under" | "over" =
    data.kpi.paceDelta > 0
      ? "over"
      : data.kpi.paceDelta < 0
      ? "under"
      : "neutral";

  return (
    <>
      <AppHeader
        displayName={data.profile.displayName}
        range={data.cycle.range}
        prevCycleStart={prevStart}
        nextCycleStart={nextStart}
        isCurrentCycle={isCurrentCycle}
      />
      <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
        <section className={`${revealBase}`}>
          <KpiHero
            label={c.remaining}
            value={data.kpi.totalRemaining}
            tone={heroTone}
            secondary={c.consumed(pct(data.kpi.percentConsumed))}
          />
        </section>

        <section
          className={`grid grid-cols-3 divide-x divide-border-muted rounded-lg border border-border bg-surface shadow-sm ${revealBase} [animation-delay:80ms]`}
        >
          <KpiStat label={c.salary} value={formatEur(data.cycle.salary ?? 0)} />
          <KpiStat label={c.spent} value={formatEur(data.kpi.totalSpent)} />
          <KpiStat label={c.percentSalary} value={pct(data.kpi.percentOfSalarySpent)} />
        </section>

        <div className={`${revealBase} [animation-delay:160ms]`}>
          <PacingBar
            percentConsumed={data.kpi.percentConsumed}
            cycleProgress={data.kpi.cycleProgress}
            paceDelta={data.kpi.paceDelta}
            forecast={forecast}
          />
        </div>

        <section className={`space-y-2 ${revealBase} [animation-delay:240ms]`}>
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
