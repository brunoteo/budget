import { getLastImport } from "@/server/queries/import";
import { daysSince, formatDaysAgo, suggestedStartDate } from "@/lib/import/last-import";
import { formatDate } from "@/lib/format/date";
import { copy } from "@/lib/copy";

export async function LastImportBanner() {
  const { lastOccurredOn, lastUploadedAt } = await getLastImport();
  const c = copy.import.lastImport;

  if (!lastOccurredOn || !lastUploadedAt) {
    return (
      <section
        aria-label={c.transactionLabel}
        className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted"
      >
        {c.emptyState}
      </section>
    );
  }

  const days = daysSince(new Date(lastUploadedAt), new Date());
  const ago = formatDaysAgo(days, {
    today: c.today,
    yesterday: c.yesterday,
    daysAgo: c.daysAgo,
  });
  const nextStart = suggestedStartDate(lastOccurredOn);

  return (
    <section
      aria-label={c.transactionLabel}
      className="rounded-lg border border-border bg-surface p-4 text-sm"
    >
      <p className="text-text-primary">
        <span className="font-medium">{c.transactionLabel}:</span>{" "}
        {formatDate(lastOccurredOn)} · {ago}
      </p>
      <p className="mt-1 text-text-muted">
        {c.exportHint} <span className="font-medium">{formatDate(nextStart)}</span> {c.exportHintSuffix}
      </p>
    </section>
  );
}
