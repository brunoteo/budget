export type CycleRange = { start: string; end: string };

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function iso(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function clampDay(year: number, month0: number, day: number): number {
  return Math.min(day, daysInMonth(year, month0));
}

function parseISO(d: string): { y: number; m: number; d: number } {
  const [y = 0, m = 1, day = 1] = d.split("-").map(Number);
  return { y, m: m - 1, d: day };
}

function addDays(year: number, month0: number, day: number, delta: number): string {
  const t = Date.UTC(year, month0, day) + delta * 86400000;
  const d = new Date(t);
  return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function computeCycleForDate(today: string, startDay: number): CycleRange {
  if (!Number.isInteger(startDay) || startDay < 1 || startDay > 31) {
    throw new Error(`Invalid startDay: ${startDay}`);
  }
  const { y, m, d } = parseISO(today);
  const thisMonthStart = clampDay(y, m, startDay);
  let startY = y;
  let startM = m;
  if (d < thisMonthStart) {
    if (m === 0) {
      startY = y - 1;
      startM = 11;
    } else {
      startM = m - 1;
    }
  }
  const startD = clampDay(startY, startM, startDay);
  const start = iso(startY, startM, startD);
  const next = nextCycle({ start, end: "" }, startDay);
  const end = addDays(parseISO(next.start).y, parseISO(next.start).m, parseISO(next.start).d, -1);
  return { start, end };
}

export function nextCycle(current: CycleRange, startDay: number): CycleRange {
  const { y, m } = parseISO(current.start);
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  const nd = clampDay(ny, nm, startDay);
  const start = iso(ny, nm, nd);
  const ny2 = nm === 11 ? ny + 1 : ny;
  const nm2 = nm === 11 ? 0 : nm + 1;
  const nd2 = clampDay(ny2, nm2, startDay);
  const end = addDays(ny2, nm2, nd2, -1);
  return { start, end };
}

export function prevCycle(current: CycleRange, startDay: number): CycleRange {
  const { y, m } = parseISO(current.start);
  const py = m === 0 ? y - 1 : y;
  const pm = m === 0 ? 11 : m - 1;
  const pd = clampDay(py, pm, startDay);
  const start = iso(py, pm, pd);
  const cd = clampDay(y, m, startDay);
  const end = addDays(y, m, cd, -1);
  return { start, end };
}
