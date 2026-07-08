const dmyFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

const shortDayMonth = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const shortDayMonthYear = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // ISO YYYY-MM-DD — parse as UTC noon to avoid TZ drift in display.
  const [y = 0, m = 1, day = 1] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
}

export function formatDate(d: string | Date): string {
  return dmyFormatter.format(toDate(d));
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = toDate(start);
  const e = toDate(end);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  if (sameYear) {
    return `${shortDayMonth.format(s)} – ${shortDayMonth.format(e)} ${e.getUTCFullYear()}`;
  }
  return `${shortDayMonthYear.format(s)} – ${shortDayMonthYear.format(e)}`;
}

export function formatRangeShort(start: string | Date, end: string | Date): string {
  return `${shortDayMonth.format(toDate(start))} – ${shortDayMonth.format(toDate(end))}`;
}

export function formatMonthYear(iso: string): string {
  const [yStr, mStr] = iso.split("-");
  const m = Number(mStr);
  if (!yStr || !m || m < 1 || m > 12) return iso;
  return `${MONTHS_IT[m - 1]} '${yStr.slice(-2)}`;
}
