import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates a date filter range, ensuring dateTo >= dateFrom.
 * If the constraint is violated, the offending field is cleared.
 * Dates are "yyyy-MM-dd" strings (or undefined).
 */
export function validateDateRange(
  dateFrom: string | undefined,
  dateTo: string | undefined
): { dateFrom: string | undefined; dateTo: string | undefined } {
  if (dateFrom && dateTo && dateTo < dateFrom) {
    // The user just broke the constraint — clear the field they didn't just set.
    // Callers decide which to clear; this helper just detects the violation
    // and returns a safe state by clearing dateTo.
    return { dateFrom, dateTo: undefined };
  }
  return { dateFrom, dateTo };
}
