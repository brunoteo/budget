function toRomeYmd(d: Date): string {
  // sv-SE returns YYYY-MM-DD; pin the calendar to Europe/Rome.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function ymdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function daysSince(uploadedAt: Date, now: Date): number {
  const a = ymdToUtcMs(toRomeYmd(uploadedAt));
  const b = ymdToUtcMs(toRomeYmd(now));
  return Math.floor((b - a) / 86_400_000);
}

export function suggestedStartDate(lastOccurredOn: string): string {
  const [y, m, d] = lastOccurredOn.split("-").map(Number) as [number, number, number];
  // Anchor at UTC noon to avoid TZ drift, then add 1 day.
  const next = new Date(Date.UTC(y, m - 1, d, 12));
  next.setUTCDate(next.getUTCDate() + 1);
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export type DaysAgoCopy = {
  today: string;
  yesterday: string;
  daysAgo: (n: number) => string;
};

export function formatDaysAgo(days: number, c: DaysAgoCopy): string {
  if (days <= 0) return c.today;
  if (days === 1) return c.yesterday;
  return c.daysAgo(days);
}
