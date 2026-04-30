import { getTrendCycles } from "@/server/queries/trends";
import { TrendsChart } from "@/components/trends-chart";
import { copy } from "@/lib/copy";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await getTrendCycles(6);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.trends.title}</h1>
      </div>
      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">{copy.trends.needMoreData}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <TrendsChart data={data} />
        </div>
      )}
    </main>
  );
}
