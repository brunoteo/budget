import { getTrendCycles } from "@/server/queries/trends";
import { TrendsChart } from "@/components/trends-chart";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await getTrendCycles(6);
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 font-display text-xl font-semibold text-clay-900">{copy.trends.title}</h1>
      {data.length === 0 ? (
        <p className="text-clay-600">{copy.trends.needMoreData}</p>
      ) : (
        <TrendsChart data={data} />
      )}
    </main>
  );
}
