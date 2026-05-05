import { getTrendsData } from "@/server/queries/trends";
import { TrendsChart } from "@/components/trends-chart";
import { TopMovers } from "@/components/top-movers";
import { CategorySparklines } from "@/components/category-sparklines";
import { YearRollupTable } from "@/components/year-rollup-table";
import { groupByCategory, computeTopMovers, computeYearRollup } from "@/lib/trends";
import { copy } from "@/lib/copy";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await getTrendsData(12);
  const recentCount = data.recent.length;

  if (recentCount === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
        <PageHeader />
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">{copy.trends.needMoreData}</p>
        </div>
      </main>
    );
  }

  const series = groupByCategory(data.recent);
  const movers = computeTopMovers(data.recent, 3);
  const rollup = computeYearRollup(data.recent, data.prior);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader />

      <section className="space-y-2">
        <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
          {copy.trends.totalHeading(recentCount)}
        </h2>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <TrendsChart data={data.recent} />
        </div>
      </section>

      {recentCount >= 2 ? (
        <>
          <section className="space-y-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.moversHeading}
            </h2>
            <TopMovers movers={movers} />
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.perCategoryHeading(recentCount)}
            </h2>
            <CategorySparklines series={series} mediaLabel={copy.trends.averageLabel} />
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.rollupHeading}
            </h2>
            <YearRollupTable
              rows={rollup}
              labels={{
                category: copy.trends.tableCategory,
                total: copy.trends.tableTotal,
                average: copy.trends.tableAverage,
                delta: copy.trends.tableDelta,
              }}
            />
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{copy.trends.notEnoughCycles}</p>
        </div>
      )}
    </main>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center gap-2">
      <BackLink label={copy.header.back} />
      <h1 className="font-display text-2xl text-text-primary">{copy.trends.title}</h1>
    </div>
  );
}
