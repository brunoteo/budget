import { getTrendsData } from "@/server/queries/trends";
import { TrendsChart } from "@/components/trends-chart";
import { TopMovers } from "@/components/top-movers";
import { CategorySparklines } from "@/components/category-sparklines";
import { YearRollupTable } from "@/components/year-rollup-table";
import { groupByCategory, computeTopMovers, computeYearRollup, computeSalaryPercentSeries } from "@/lib/trends";
import { SalaryPercentChart } from "@/components/salary-percent-chart";
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
  const salaryPercent = computeSalaryPercentSeries(data.recent);
  const hasSalaryData = salaryPercent.some((p) => p.percent !== null);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-6">
      <PageHeader />

      {recentCount >= 2 ? (
        <div className="space-y-4">
          <GroupHeader
            title={copy.trends.groupMonthlyTitle}
            subtitle={copy.trends.groupMonthlySubtitle}
          />

          <section className="space-y-2">
            <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
              {copy.trends.moversHeading}
            </h3>
            <TopMovers movers={movers} />
          </section>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{copy.trends.notEnoughCycles}</p>
        </div>
      )}

      <div className="space-y-4">
        <GroupHeader
          title={copy.trends.groupAnnualTitle}
          subtitle={copy.trends.groupAnnualSubtitle(recentCount)}
        />

        <section className="space-y-2">
          <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
            {copy.trends.totalHeading}
          </h3>
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <TrendsChart data={data.recent} />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
            {copy.trends.salaryPercentHeading}
          </h3>
          {hasSalaryData ? (
            <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <SalaryPercentChart data={salaryPercent} />
            </div>
          ) : (
            <p className="text-sm text-text-muted">{copy.trends.salaryPercentNoData}</p>
          )}
        </section>

        {recentCount >= 2 && (
          <>
            <section className="space-y-2">
              <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
                {copy.trends.perCategoryHeading}
              </h3>
              <CategorySparklines series={series} mediaLabel={copy.trends.averageLabel} />
            </section>

            <section className="space-y-2">
              <h3 className="px-1 text-xs uppercase tracking-wider text-text-muted">
                {copy.trends.rollupHeading}
              </h3>
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
        )}
      </div>
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

function GroupHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="px-1">
      <h2 className="font-display text-lg text-text-primary">{title}</h2>
      <p className="text-xs text-text-muted">{subtitle}</p>
    </header>
  );
}
