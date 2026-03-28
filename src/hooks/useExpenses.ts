import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  subcategoryId?: string;
}

export interface CreateExpenseInput {
  amount: number;
  date: string;
  category_id: string;
  subcategory_id?: string | null;
  description?: string | null;
  is_recurring?: boolean;
}

export function useExpenses(filters?: ExpenseFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ["expenses", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("date", filters.dateTo);
      if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
      if (filters?.subcategoryId) query = query.eq("subcategory_id", filters.subcategoryId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...input }: CreateExpenseInput & { id: string }) => {
      const { error } = await supabase.from("expenses").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const total = expensesQuery.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return {
    expenses: expensesQuery.data ?? [],
    isLoading: expensesQuery.isLoading,
    total,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
