import { formatDateRange } from "@/lib/format/date";
import type { CycleRange } from "@/lib/cycle/compute";

export function cycleLabel(range: CycleRange): string {
  return formatDateRange(range.start, range.end);
}
