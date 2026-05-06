import { useQuery } from "@tanstack/react-query";
import { useDatabase } from "@/contexts/DatabaseContext";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";

export interface MonthlyData {
  month: string; // "yyyy-MM"
  label: string; // "Jan 2026"
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface SubcategorySpend {
  subcategoryId: string;
  subcategoryName: string;
  total: number;
}

export type TimeRange = "this_month" | "last_month" | "last_3" | "last_6" | "custom";

export function getDateRange(range: TimeRange, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (range) {
    case "this_month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: format(startOfMonth(lm), "yyyy-MM-dd"), to: format(endOfMonth(lm), "yyyy-MM-dd") };
    }
    case "last_3": {
      const s = subMonths(now, 2);
      return { from: format(startOfMonth(s), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    case "last_6": {
      const s = subMonths(now, 5);
      return { from: format(startOfMonth(s), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    case "custom":
      return { from: customFrom || format(startOfMonth(now), "yyyy-MM-dd"), to: customTo || format(endOfMonth(now), "yyyy-MM-dd") };
  }
}

export function useNetSavingsTrend() {
  const db = useDatabase();

  return useQuery({
    queryKey: ["analytics-trend"],
    queryFn: async () => {
      const rows = await db!.query<{ month: string; income: number; expenses: number }>(
        `SELECT substr(date, 1, 7) as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
        FROM transactions
        GROUP BY month
        ORDER BY month ASC`
      );
      return rows.map(r => ({
        month: r.month,
        label: format(parseISO(r.month + "-01"), "MMM yyyy"),
        income: r.income,
        expenses: r.expenses,
        net: r.income - r.expenses,
      }));
    },
    enabled: !!db,
  });
}

export function useTopCategories(range: TimeRange, customFrom?: string, customTo?: string) {
  const db = useDatabase();
  const { from, to } = getDateRange(range, customFrom, customTo);

  return useQuery({
    queryKey: ["analytics-top-categories", from, to],
    queryFn: async () => {
      const rows = await db!.query<{ category_id: string; category_name: string; total: number }>(
        `SELECT t.category_id, c.name as category_name, SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
        GROUP BY t.category_id
        ORDER BY total DESC`,
        [from, to]
      );
      return rows.map(r => ({
        categoryId: r.category_id,
        categoryName: r.category_name,
        total: r.total,
      }));
    },
    enabled: !!db,
  });
}

export function useSubcategorySpend(categoryId: string, range: TimeRange, customFrom?: string, customTo?: string) {
  const db = useDatabase();
  const { from, to } = getDateRange(range, customFrom, customTo);

  return useQuery({
    queryKey: ["analytics-subcategory-spend", categoryId, from, to],
    queryFn: async () => {
      const rows = await db!.query<{ subcategory_id: string | null; subcategory_name: string | null; total: number }>(
        `SELECT t.subcategory_id, s.name as subcategory_name, SUM(t.amount) as total
        FROM transactions t
        LEFT JOIN subcategories s ON t.subcategory_id = s.id
        WHERE t.type = 'expense' AND t.category_id = ? AND t.date >= ? AND t.date <= ?
        GROUP BY t.subcategory_id
        ORDER BY total DESC`,
        [categoryId, from, to]
      );

      const result: SubcategorySpend[] = [];
      let uncategorized = 0;

      for (const r of rows) {
        if (r.subcategory_id) {
          result.push({
            subcategoryId: r.subcategory_id,
            subcategoryName: r.subcategory_name || "Unknown",
            total: r.total,
          });
        } else {
          uncategorized += r.total;
        }
      }

      if (uncategorized > 0) {
        result.push({ subcategoryId: "__none__", subcategoryName: "Uncategorized", total: uncategorized });
      }

      return result;
    },
    enabled: !!db && !!categoryId,
  });
}

export function useTotalIncome(range: TimeRange, customFrom?: string, customTo?: string) {
  const db = useDatabase();
  const { from, to } = getDateRange(range, customFrom, customTo);

  return useQuery({
    queryKey: ["analytics-total-income", from, to],
    queryFn: async () => {
      const row = await db!.queryOne<{ total: number | null }>(
        "SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?",
        [from, to]
      );
      return row?.total ?? 0;
    },
    enabled: !!db,
  });
}
