import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

function getDateRange(range: TimeRange, customFrom?: string, customTo?: string) {
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ["analytics-trend", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date, type")
        .order("date", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [] as MonthlyData[];

      const map = new Map<string, { income: number; expenses: number }>();
      for (const row of data) {
        const key = row.date.substring(0, 7); // "yyyy-MM"
        if (!map.has(key)) map.set(key, { income: 0, expenses: 0 });
        const entry = map.get(key)!;
        if (row.type === "income") entry.income += Number(row.amount);
        else entry.expenses += Number(row.amount);
      }

      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, vals]) => ({
          month,
          label: format(parseISO(month + "-01"), "MMM yyyy"),
          income: vals.income,
          expenses: vals.expenses,
          net: vals.income - vals.expenses,
        }));
    },
    enabled: !!user,
  });
}

export function useTopCategories(range: TimeRange, customFrom?: string, customTo?: string) {
  const { user } = useAuth();
  const { from, to } = getDateRange(range, customFrom, customTo);

  return useQuery({
    queryKey: ["analytics-top-categories", user?.id, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, category_id")
        .eq("type", "expense")
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;

      // Fetch categories
      const { data: cats, error: catErr } = await supabase.from("categories").select("id, name");
      if (catErr) throw catErr;
      const catMap = new Map(cats?.map((c) => [c.id, c.name]) ?? []);

      const totals = new Map<string, number>();
      for (const row of data ?? []) {
        totals.set(row.category_id, (totals.get(row.category_id) || 0) + Number(row.amount));
      }

      return Array.from(totals.entries())
        .map(([id, total]) => ({ categoryId: id, categoryName: catMap.get(id) || "Unknown", total }))
        .sort((a, b) => b.total - a.total);
    },
    enabled: !!user,
  });
}

export function useSubcategorySpend(categoryId: string, range: TimeRange, customFrom?: string, customTo?: string) {
  const { user } = useAuth();
  const { from, to } = getDateRange(range, customFrom, customTo);

  return useQuery({
    queryKey: ["analytics-subcategory-spend", user?.id, categoryId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, subcategory_id")
        .eq("type", "expense")
        .eq("category_id", categoryId)
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;

      const { data: subs, error: subErr } = await supabase.from("subcategories").select("id, name").eq("category_id", categoryId);
      if (subErr) throw subErr;
      const subMap = new Map(subs?.map((s) => [s.id, s.name]) ?? []);

      const totals = new Map<string, number>();
      let uncategorized = 0;
      for (const row of data ?? []) {
        if (row.subcategory_id) {
          totals.set(row.subcategory_id, (totals.get(row.subcategory_id) || 0) + Number(row.amount));
        } else {
          uncategorized += Number(row.amount);
        }
      }

      const result: SubcategorySpend[] = Array.from(totals.entries())
        .map(([id, total]) => ({ subcategoryId: id, subcategoryName: subMap.get(id) || "Unknown", total }))
        .sort((a, b) => b.total - a.total);

      if (uncategorized > 0) {
        result.push({ subcategoryId: "__none__", subcategoryName: "Uncategorized", total: uncategorized });
      }

      return result;
    },
    enabled: !!user && !!categoryId,
  });
}

export function useTotalIncome(range: TimeRange, customFrom?: string, customTo?: string) {
  const { user } = useAuth();
  const { from, to } = getDateRange(range, customFrom, customTo);

  return useQuery({
    queryKey: ["analytics-total-income", user?.id, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .eq("type", "income")
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    },
    enabled: !!user,
  });
}
