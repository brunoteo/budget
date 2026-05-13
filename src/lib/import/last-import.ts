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
