import { useMemo } from "react";

export interface PeriodFilter {
  from: string;   // yyyy-MM-dd
  to: string;     // yyyy-MM-dd
  label: string;  // human-readable, e.g. "May 5 – May 11, 2026"
}
import { parseISO, format, startOfWeek, endOfWeek } from "date-fns";
import type { Transaction } from "@/integrations/sqlite/types";

export interface DailyRow {
  date: string;       // yyyy-MM-dd
  label: string;      // e.g. "May 5, 2026"
  income: number;
  expenses: number;
  net: number;
}

export interface WeeklyRow {
  from: string;       // yyyy-MM-dd (Monday)
  to: string;         // yyyy-MM-dd (Sunday)
  label: string;      // e.g. "May 5 – May 11, 2026"
  income: number;
  expenses: number;
  net: number;
}

export interface MonthlyRow {
  month: string;      // yyyy-MM
  from: string;       // yyyy-MM-01
  to: string;         // yyyy-MM-last-day
  label: string;      // e.g. "May 2026"
  income: number;
  expenses: number;
  net: number;
}

export function useAggregations(transactions: Transaction[]) {
  const daily = useMemo<DailyRow[]>(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
      const entry = map.get(t.date) ?? { income: 0, expenses: 0 };
      if (t.type === "income") entry.income += t.amount;
      else entry.expenses += t.amount;
      map.set(t.date, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, { income, expenses }]) => ({
        date,
        label: format(parseISO(date), "MMM d, yyyy"),
        income,
        expenses,
        net: income - expenses,
      }));
  }, [transactions]);

  const weekly = useMemo<WeeklyRow[]>(() => {
    const map = new Map<string, { from: string; to: string; income: number; expenses: number }>();
    for (const t of transactions) {
      const d = parseISO(t.date);
      const weekStart = startOfWeek(d, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const entry = map.get(key) ?? {
        from: format(weekStart, "yyyy-MM-dd"),
        to: format(weekEnd, "yyyy-MM-dd"),
        income: 0,
        expenses: 0,
      };
      if (t.type === "income") entry.income += t.amount;
      else entry.expenses += t.amount;
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.from.localeCompare(a.from))
      .map(({ from, to, income, expenses }) => {
        const fromD = parseISO(from);
        const toD = parseISO(to);
        const sameYear = format(fromD, "yyyy") === format(toD, "yyyy");
        const label = sameYear
          ? `${format(fromD, "MMM d")} – ${format(toD, "MMM d, yyyy")}`
          : `${format(fromD, "MMM d, yyyy")} – ${format(toD, "MMM d, yyyy")}`;
        return { from, to, label, income, expenses, net: income - expenses };
      });
  }, [transactions]);

  const monthly = useMemo<MonthlyRow[]>(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
      const key = t.date.slice(0, 7); // yyyy-MM
      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      if (t.type === "income") entry.income += t.amount;
      else entry.expenses += t.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, { income, expenses }]) => {
        const d = parseISO(month + "-01");
        // Last day of month: first day of next month minus 1
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return {
          month,
          from: month + "-01",
          to: format(lastDay, "yyyy-MM-dd"),
          label: format(d, "MMMM yyyy"),
          income,
          expenses,
          net: income - expenses,
        };
      });
  }, [transactions]);

  return { daily, weekly, monthly };
}
