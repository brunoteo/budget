import { describe, it, expect } from "vitest";
import { daysSince, formatDaysAgo, suggestedStartDate } from "@/lib/import/last-import";

describe("daysSince", () => {
  it("returns 0 when uploadedAt and now are the same instant", () => {
    const d = new Date("2026-05-13T10:00:00+02:00");
    expect(daysSince(d, d)).toBe(0);
  });

  it("returns 0 when both fall on the same Europe/Rome calendar day", () => {
    const uploadedAt = new Date("2026-05-13T00:30:00+02:00");
    const now = new Date("2026-05-13T23:30:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(0);
  });

  it("returns 1 when now is the next Europe/Rome calendar day", () => {
    const uploadedAt = new Date("2026-05-12T23:30:00+02:00");
    const now = new Date("2026-05-13T00:30:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(1);
  });

  it("returns N for N full calendar days later", () => {
    const uploadedAt = new Date("2026-05-01T12:00:00+02:00");
    const now = new Date("2026-05-08T12:00:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(7);
  });

  it("handles DST spring-forward without an off-by-one", () => {
    const uploadedAt = new Date("2026-03-28T12:00:00+01:00");
    const now = new Date("2026-03-30T12:00:00+02:00");
    expect(daysSince(uploadedAt, now)).toBe(2);
  });
});

describe("suggestedStartDate", () => {
  it("adds one day in the middle of a month", () => {
    expect(suggestedStartDate("2026-05-12")).toBe("2026-05-13");
  });

  it("rolls over to the next month at month end", () => {
    expect(suggestedStartDate("2026-02-28")).toBe("2026-03-01");
  });

  it("handles leap-year February", () => {
    expect(suggestedStartDate("2024-02-29")).toBe("2024-03-01");
  });

  it("rolls over to the next year at December 31", () => {
    expect(suggestedStartDate("2026-12-31")).toBe("2027-01-01");
  });
});

const dayCopy = {
  today: "oggi",
  yesterday: "ieri",
  daysAgo: (n: number) => `${n} giorni fa`,
};

describe("formatDaysAgo", () => {
  it("returns 'oggi' for 0", () => {
    expect(formatDaysAgo(0, dayCopy)).toBe("oggi");
  });

  it("returns 'ieri' for 1", () => {
    expect(formatDaysAgo(1, dayCopy)).toBe("ieri");
  });

  it("returns '7 giorni fa' for 7", () => {
    expect(formatDaysAgo(7, dayCopy)).toBe("7 giorni fa");
  });
});
