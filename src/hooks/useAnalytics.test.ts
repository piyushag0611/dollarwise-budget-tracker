import { describe, it, expect } from "vitest";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { getDateRange } from "./useAnalytics";

// Helper to get expected date strings relative to today
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const now = new Date();

describe("getDateRange()", () => {
  it("this_month — returns the first and last day of the current month", () => {
    const { from, to } = getDateRange("this_month");
    expect(from).toBe(fmt(startOfMonth(now)));
    expect(to).toBe(fmt(endOfMonth(now)));
  });

  it("last_month — returns the first and last day of the previous month", () => {
    const lastMonth = subMonths(now, 1);
    const { from, to } = getDateRange("last_month");
    expect(from).toBe(fmt(startOfMonth(lastMonth)));
    expect(to).toBe(fmt(endOfMonth(lastMonth)));
  });

  it("last_3 — starts at the beginning of 2 months ago, ends today's month end", () => {
    const { from, to } = getDateRange("last_3");
    expect(from).toBe(fmt(startOfMonth(subMonths(now, 2))));
    expect(to).toBe(fmt(endOfMonth(now)));
  });

  it("last_6 — starts at the beginning of 5 months ago, ends today's month end", () => {
    const { from, to } = getDateRange("last_6");
    expect(from).toBe(fmt(startOfMonth(subMonths(now, 5))));
    expect(to).toBe(fmt(endOfMonth(now)));
  });

  it("custom — returns the exact dates provided", () => {
    const { from, to } = getDateRange("custom", "2026-01-01", "2026-03-31");
    expect(from).toBe("2026-01-01");
    expect(to).toBe("2026-03-31");
  });

  it("custom without dates — falls back to the current month", () => {
    const { from, to } = getDateRange("custom");
    expect(from).toBe(fmt(startOfMonth(now)));
    expect(to).toBe(fmt(endOfMonth(now)));
  });
});
