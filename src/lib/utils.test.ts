import { describe, it, expect } from "vitest";
import { cn, validateDateRange } from "./utils";

describe("cn()", () => {
  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple classes into one string", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });

  it("resolves conflicting Tailwind classes — last one wins", () => {
    // twMerge should keep p-4 and drop p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values (false, null, undefined)", () => {
    expect(cn("flex", false, null, undefined, "gap-2")).toBe("flex gap-2");
  });

  it("supports conditional class objects", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn({ "bg-blue-500": isActive, "opacity-50": isDisabled })).toBe("bg-blue-500");
  });
});

describe("validateDateRange()", () => {
  it("returns both dates unchanged when the range is valid", () => {
    const result = validateDateRange("2026-01-01", "2026-01-31");
    expect(result).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-01-31" });
  });

  it("returns both dates unchanged when from equals to (same day is valid)", () => {
    const result = validateDateRange("2026-06-15", "2026-06-15");
    expect(result).toEqual({ dateFrom: "2026-06-15", dateTo: "2026-06-15" });
  });

  it("clears dateTo when it is before dateFrom", () => {
    const result = validateDateRange("2026-03-01", "2026-02-01");
    expect(result).toEqual({ dateFrom: "2026-03-01", dateTo: undefined });
  });

  it("returns unchanged when only dateFrom is set", () => {
    const result = validateDateRange("2026-01-01", undefined);
    expect(result).toEqual({ dateFrom: "2026-01-01", dateTo: undefined });
  });

  it("returns unchanged when only dateTo is set", () => {
    const result = validateDateRange(undefined, "2026-12-31");
    expect(result).toEqual({ dateFrom: undefined, dateTo: "2026-12-31" });
  });

  it("returns unchanged when both dates are undefined", () => {
    const result = validateDateRange(undefined, undefined);
    expect(result).toEqual({ dateFrom: undefined, dateTo: undefined });
  });
});
