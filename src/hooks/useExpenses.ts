import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses"> & { type: string };

export type TransactionType = "income" | "expense";

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  expenseCategoryId?: string;
  expenseSubcategoryId?: string;
  incomeCategoryId?: string;
  incomeSubcategoryId?: string;
  type?: TransactionType;
}

export interface CreateExpenseInput {
  amount: number;
  date: string;
  category_id: string;
  subcategory_id?: string | null;
  description?: string | null;
  is_recurring?: boolean;
  type?: TransactionType;
}

export function useExpenses(filters?: ExpenseFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Main query: fetches transactions matching the combined filter logic
  const expensesQuery = useQuery({
    queryKey: ["expenses", user?.id, filters],
    queryFn: async () => {
      const hasExpenseCatFilter = !!filters?.expenseCategoryId;
      const hasIncomeCatFilter = !!filters?.incomeCategoryId;

      // If both type-specific category filters are set, we need two queries
      // If only one is set along with a type filter, single query works
      // Build queries based on what filters are active

      let allResults: Expense[] = [];

      if (hasExpenseCatFilter && hasIncomeCatFilter) {
        // Fetch expense transactions matching expense category filter
        let expQ = supabase
          .from("expenses")
          .select("*")
          .eq("type", "expense")
          .eq("category_id", filters!.expenseCategoryId!);
        if (filters?.expenseSubcategoryId) expQ = expQ.eq("subcategory_id", filters.expenseSubcategoryId);
        if (filters?.dateFrom) expQ = expQ.gte("date", filters.dateFrom);
        if (filters?.dateTo) expQ = expQ.lte("date", filters.dateTo);

        // Fetch income transactions matching income category filter
        let incQ = supabase
          .from("expenses")
          .select("*")
          .eq("type", "income")
          .eq("category_id", filters!.incomeCategoryId!);
        if (filters?.incomeSubcategoryId) incQ = incQ.eq("subcategory_id", filters.incomeSubcategoryId);
        if (filters?.dateFrom) incQ = incQ.gte("date", filters.dateFrom);
        if (filters?.dateTo) incQ = incQ.lte("date", filters.dateTo);

        const [expRes, incRes] = await Promise.all([expQ, incQ]);
        if (expRes.error) throw expRes.error;
        if (incRes.error) throw incRes.error;
        allResults = [...(expRes.data as Expense[]), ...(incRes.data as Expense[])];
      } else if (hasExpenseCatFilter && !hasIncomeCatFilter) {
        // Expense category filter active: show filtered expenses + all income
        let expQ = supabase
          .from("expenses")
          .select("*")
          .eq("type", "expense")
          .eq("category_id", filters!.expenseCategoryId!);
        if (filters?.expenseSubcategoryId) expQ = expQ.eq("subcategory_id", filters.expenseSubcategoryId);
        if (filters?.dateFrom) expQ = expQ.gte("date", filters.dateFrom);
        if (filters?.dateTo) expQ = expQ.lte("date", filters.dateTo);

        let incQ = supabase.from("expenses").select("*").eq("type", "income");
        if (filters?.dateFrom) incQ = incQ.gte("date", filters.dateFrom);
        if (filters?.dateTo) incQ = incQ.lte("date", filters.dateTo);

        // If type filter is set, only show that type
        if (filters?.type === "expense") {
          const { data, error } = await expQ;
          if (error) throw error;
          allResults = data as Expense[];
        } else if (filters?.type === "income") {
          const { data, error } = await incQ;
          if (error) throw error;
          allResults = data as Expense[];
        } else {
          const [expRes, incRes] = await Promise.all([expQ, incQ]);
          if (expRes.error) throw expRes.error;
          if (incRes.error) throw incRes.error;
          allResults = [...(expRes.data as Expense[]), ...(incRes.data as Expense[])];
        }
      } else if (!hasExpenseCatFilter && hasIncomeCatFilter) {
        // Income category filter active: show all expenses + filtered income
        let expQ = supabase.from("expenses").select("*").eq("type", "expense");
        if (filters?.dateFrom) expQ = expQ.gte("date", filters.dateFrom);
        if (filters?.dateTo) expQ = expQ.lte("date", filters.dateTo);

        let incQ = supabase
          .from("expenses")
          .select("*")
          .eq("type", "income")
          .eq("category_id", filters!.incomeCategoryId!);
        if (filters?.incomeSubcategoryId) incQ = incQ.eq("subcategory_id", filters.incomeSubcategoryId);
        if (filters?.dateFrom) incQ = incQ.gte("date", filters.dateFrom);
        if (filters?.dateTo) incQ = incQ.lte("date", filters.dateTo);

        if (filters?.type === "expense") {
          const { data, error } = await expQ;
          if (error) throw error;
          allResults = data as Expense[];
        } else if (filters?.type === "income") {
          const { data, error } = await incQ;
          if (error) throw error;
          allResults = data as Expense[];
        } else {
          const [expRes, incRes] = await Promise.all([expQ, incQ]);
          if (expRes.error) throw expRes.error;
          if (incRes.error) throw incRes.error;
          allResults = [...(expRes.data as Expense[]), ...(incRes.data as Expense[])];
        }
      } else {
        // No category filters — simple query
        let query = supabase.from("expenses").select("*");
        if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
        if (filters?.dateTo) query = query.lte("date", filters.dateTo);
        if (filters?.type) query = query.eq("type", filters.type);

        const { data, error } = await query;
        if (error) throw error;
        allResults = data as Expense[];
      }

      // Sort by date desc, then created_at desc
      allResults.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return b.created_at.localeCompare(a.created_at);
      });

      return allResults;
    },
    enabled: !!user,
  });

  // Scoped totals: expense total uses date + expense category filter only
  const expenseTotalQuery = useQuery({
    queryKey: ["expenses-total-expense", user?.id, filters?.dateFrom, filters?.dateTo, filters?.expenseCategoryId, filters?.expenseSubcategoryId],
    queryFn: async () => {
      let query = supabase.from("expenses").select("amount").eq("type", "expense");
      if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("date", filters.dateTo);
      if (filters?.expenseCategoryId) query = query.eq("category_id", filters.expenseCategoryId);
      if (filters?.expenseSubcategoryId) query = query.eq("subcategory_id", filters.expenseSubcategoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    },
    enabled: !!user,
  });

  // Scoped totals: income total uses date + income category filter only
  const incomeTotalQuery = useQuery({
    queryKey: ["expenses-total-income", user?.id, filters?.dateFrom, filters?.dateTo, filters?.incomeCategoryId, filters?.incomeSubcategoryId],
    queryFn: async () => {
      let query = supabase.from("expenses").select("amount").eq("type", "income");
      if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("date", filters.dateTo);
      if (filters?.incomeCategoryId) query = query.eq("category_id", filters.incomeCategoryId);
      if (filters?.incomeSubcategoryId) query = query.eq("subcategory_id", filters.incomeSubcategoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total-expense"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total-income"] });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...input }: CreateExpenseInput & { id: string }) => {
      const { error } = await supabase.from("expenses").update(input as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total-expense"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total-income"] });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total-expense"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total-income"] });
    },
  });

  const totalIncome = incomeTotalQuery.data ?? 0;
  const totalExpenses = expenseTotalQuery.data ?? 0;
  const net = totalIncome - totalExpenses;

  return {
    expenses: expensesQuery.data ?? [],
    isLoading: expensesQuery.isLoading,
    totalIncome,
    totalExpenses,
    net,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
