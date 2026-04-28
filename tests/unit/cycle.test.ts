import { describe, it, expect } from "vitest";
import { computeCycleForDate, nextCycle } from "@/lib/cycle/compute";

describe("computeCycleForDate", () => {
  it("standard month: today=Apr 28, start_day=27 → cycle Apr 27 to May 26", () => {
    const cycle = computeCycleForDate("2026-04-28", 27);
    expect(cycle.start).toBe("2026-04-27");
    expect(cycle.end).toBe("2026-05-26");
  });

  it("today is exactly start_day: cycle starts today", () => {
    const cycle = computeCycleForDate("2026-04-27", 27);
    expect(cycle.start).toBe("2026-04-27");
    expect(cycle.end).toBe("2026-05-26");
  });

  it("today is the day before start_day: previous cycle still active", () => {
    const cycle = computeCycleForDate("2026-04-26", 27);
    expect(cycle.start).toBe("2026-03-27");
    expect(cycle.end).toBe("2026-04-26");
  });

  it("start_day=10: today=Apr 28 → cycle Apr 10 to May 9", () => {
    const cycle = computeCycleForDate("2026-04-28", 10);
    expect(cycle.start).toBe("2026-04-10");
    expect(cycle.end).toBe("2026-05-09");
  });

  it("clamps to last day of February for start_day=31", () => {
    const cycle = computeCycleForDate("2026-02-15", 31);
    expect(cycle.start).toBe("2026-01-31");
    expect(cycle.end).toBe("2026-02-27");
  });

  it("clamps to last day of February in leap year for start_day=31", () => {
    const cycle = computeCycleForDate("2024-02-15", 31);
    expect(cycle.start).toBe("2024-01-31");
    expect(cycle.end).toBe("2024-02-28");
  });

  it("works at month-end with start_day=30", () => {
    const cycle = computeCycleForDate("2026-03-29", 30);
    expect(cycle.start).toBe("2026-02-28");
    expect(cycle.end).toBe("2026-03-29");
  });

  it("rejects invalid start_day", () => {
    expect(() => computeCycleForDate("2026-04-28", 0)).toThrow();
    expect(() => computeCycleForDate("2026-04-28", 32)).toThrow();
  });
});

describe("nextCycle", () => {
  it("rolls a 27-cycle forward by one month", () => {
    const next = nextCycle({ start: "2026-04-27", end: "2026-05-26" }, 27);
    expect(next.start).toBe("2026-05-27");
    expect(next.end).toBe("2026-06-26");
  });

  it("clamps when next month is shorter than start_day", () => {
    const next = nextCycle({ start: "2026-01-31", end: "2026-02-27" }, 31);
    expect(next.start).toBe("2026-02-28");
    expect(next.end).toBe("2026-03-30");
  });
});
