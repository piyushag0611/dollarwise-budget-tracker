import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/contexts/DatabaseContext";
import type { DatabaseAdapter, Transaction } from "@/integrations/sqlite/types";

export type TransactionType = "income" | "expense";

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  expenseCategoryId?: string;
  expenseSubcategoryId?: string;
  incomeCategoryId?: string;
  incomeSubcategoryId?: string;
  type?: TransactionType;
}

export interface CreateTransactionInput {
  amount: number;
  date: string;
  type: TransactionType;
  category_id: string;
  subcategory_id?: string | null;
  description?: string | null;
  is_recurring?: boolean;
}

function buildTypeQuery(
  type: TransactionType,
  catId: string | undefined,
  subCatId: string | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined
): { sql: string; params: unknown[] } {
  let sql = "SELECT * FROM transactions WHERE type = ?";
  const params: unknown[] = [type];
  if (catId) { sql += " AND category_id = ?"; params.push(catId); }
  if (subCatId) { sql += " AND subcategory_id = ?"; params.push(subCatId); }
  if (dateFrom) { sql += " AND date >= ?"; params.push(dateFrom); }
  if (dateTo) { sql += " AND date <= ?"; params.push(dateTo); }
  return { sql, params };
}

async function fetchTransactions(db: DatabaseAdapter, filters?: TransactionFilters): Promise<Transaction[]> {
  const { dateFrom, dateTo, expenseCategoryId, expenseSubcategoryId, incomeCategoryId, incomeSubcategoryId, type } = filters ?? {};
  const hasExpCat = !!expenseCategoryId;
  const hasIncCat = !!incomeCategoryId;

  let results: Transaction[];

  if (hasExpCat && hasIncCat) {
    const { sql: eSQL, params: eP } = buildTypeQuery("expense", expenseCategoryId, expenseSubcategoryId, dateFrom, dateTo);
    const { sql: iSQL, params: iP } = buildTypeQuery("income", incomeCategoryId, incomeSubcategoryId, dateFrom, dateTo);
    const [exp, inc] = await Promise.all([db.query<Transaction>(eSQL, eP), db.query<Transaction>(iSQL, iP)]);
    results = [...exp, ...inc];
  } else if (hasExpCat) {
    const { sql: eSQL, params: eP } = buildTypeQuery("expense", expenseCategoryId, expenseSubcategoryId, dateFrom, dateTo);
    const { sql: iSQL, params: iP } = buildTypeQuery("income", undefined, undefined, dateFrom, dateTo);
    if (type === "expense") results = await db.query<Transaction>(eSQL, eP);
    else if (type === "income") results = await db.query<Transaction>(iSQL, iP);
    else {
      const [exp, inc] = await Promise.all([db.query<Transaction>(eSQL, eP), db.query<Transaction>(iSQL, iP)]);
      results = [...exp, ...inc];
    }
  } else if (hasIncCat) {
    const { sql: eSQL, params: eP } = buildTypeQuery("expense", undefined, undefined, dateFrom, dateTo);
    const { sql: iSQL, params: iP } = buildTypeQuery("income", incomeCategoryId, incomeSubcategoryId, dateFrom, dateTo);
    if (type === "expense") results = await db.query<Transaction>(eSQL, eP);
    else if (type === "income") results = await db.query<Transaction>(iSQL, iP);
    else {
      const [exp, inc] = await Promise.all([db.query<Transaction>(eSQL, eP), db.query<Transaction>(iSQL, iP)]);
      results = [...exp, ...inc];
    }
  } else {
    let sql = "SELECT * FROM transactions WHERE 1=1";
    const params: unknown[] = [];
    if (dateFrom) { sql += " AND date >= ?"; params.push(dateFrom); }
    if (dateTo) { sql += " AND date <= ?"; params.push(dateTo); }
    if (type) { sql += " AND type = ?"; params.push(type); }
    results = await db.query<Transaction>(sql, params);
  }

  results.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
  });
  return results;
}

async function fetchTotal(db: DatabaseAdapter, type: TransactionType, filters?: TransactionFilters): Promise<number> {
  let sql = "SELECT SUM(amount) as total FROM transactions WHERE type = ?";
  const params: unknown[] = [type];
  if (filters?.dateFrom) { sql += " AND date >= ?"; params.push(filters.dateFrom); }
  if (filters?.dateTo) { sql += " AND date <= ?"; params.push(filters.dateTo); }
  if (type === "expense" && filters?.expenseCategoryId) { sql += " AND category_id = ?"; params.push(filters.expenseCategoryId); }
  if (type === "expense" && filters?.expenseSubcategoryId) { sql += " AND subcategory_id = ?"; params.push(filters.expenseSubcategoryId); }
  if (type === "income" && filters?.incomeCategoryId) { sql += " AND category_id = ?"; params.push(filters.incomeCategoryId); }
  if (type === "income" && filters?.incomeSubcategoryId) { sql += " AND subcategory_id = ?"; params.push(filters.incomeSubcategoryId); }
  const row = await db.queryOne<{ total: number | null }>(sql, params);
  return row?.total ?? 0;
}

export function useTransactions(filters?: TransactionFilters) {
  const db = useDatabase();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => fetchTransactions(db!, filters),
    enabled: !!db,
  });

  const expenseTotalQuery = useQuery({
    queryKey: ["transactions-total-expense", filters?.dateFrom, filters?.dateTo, filters?.expenseCategoryId, filters?.expenseSubcategoryId],
    queryFn: () => fetchTotal(db!, "expense", filters),
    enabled: !!db,
  });

  const incomeTotalQuery = useQuery({
    queryKey: ["transactions-total-income", filters?.dateFrom, filters?.dateTo, filters?.incomeCategoryId, filters?.incomeSubcategoryId],
    queryFn: () => fetchTotal(db!, "income", filters),
    enabled: !!db,
  });

  const createTransaction = useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const id = crypto.randomUUID();
      await db!.execute(
        "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id, description, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, input.amount, input.date, input.type, input.category_id, input.subcategory_id ?? null, input.description ?? null, input.is_recurring ? 1 : 0]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-total-expense"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-total-income"] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...input }: CreateTransactionInput & { id: string }) => {
      await db!.execute(
        "UPDATE transactions SET amount = ?, date = ?, type = ?, category_id = ?, subcategory_id = ?, description = ?, is_recurring = ? WHERE id = ?",
        [input.amount, input.date, input.type, input.category_id, input.subcategory_id ?? null, input.description ?? null, input.is_recurring ? 1 : 0, id]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-total-expense"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-total-income"] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      await db!.execute("DELETE FROM transactions WHERE id = ?", [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-total-expense"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-total-income"] });
    },
  });

  const totalIncome = incomeTotalQuery.data ?? 0;
  const totalExpenses = expenseTotalQuery.data ?? 0;

  return {
    transactions: transactionsQuery.data ?? [],
    isLoading: transactionsQuery.isLoading,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
