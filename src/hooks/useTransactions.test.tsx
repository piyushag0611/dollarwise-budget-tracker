import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createTestDatabase } from "@/test/mocks/database";
import { createWrapper } from "@/test/utils/renderWithDb";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";
import { useTransactions } from "./useTransactions";

let db: DatabaseAdapter;
let wrapper: ReturnType<typeof createWrapper>;

beforeEach(async () => {
  db = createTestDatabase();
  wrapper = createWrapper(db);
  await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
  await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c2", "Salary", "income"]);
  await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "c1"]);
});

afterEach(async () => { await db.close(); });

describe("useTransactions", () => {
  it("returns empty list when no transactions exist", async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual([]);
  });

  it("fetches all transactions", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 1000, "2026-05-01", "income", "c2"]
    );
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(2));
  });

  it("sorts transactions by date descending", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-04-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 100, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(2));
    expect(result.current.transactions[0].id).toBe("t2");
    expect(result.current.transactions[1].id).toBe("t1");
  });

  it("filters by date range", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-04-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 100, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(
      () => useTransactions({ dateFrom: "2026-05-01", dateTo: "2026-05-31" }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].id).toBe("t2");
  });

  it("filters by type", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 1000, "2026-05-01", "income", "c2"]
    );
    const { result } = renderHook(() => useTransactions({ type: "expense" }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].id).toBe("t1");
  });

  it("filters expenses by category while keeping all income", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c3", "Transport", "expense"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 30, "2026-05-01", "expense", "c3"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t3", 1000, "2026-05-01", "income", "c2"]
    );
    const { result } = renderHook(
      () => useTransactions({ expenseCategoryId: "c1" }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const ids = result.current.transactions.map(t => t.id);
    expect(ids).toContain("t1");
    expect(ids).not.toContain("t2");
    expect(ids).toContain("t3");
  });

  it("filters income by category while keeping all expenses", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c3", "Freelance", "income"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 1000, "2026-05-01", "income", "c2"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t3", 500, "2026-05-01", "income", "c3"]
    );
    const { result } = renderHook(
      () => useTransactions({ incomeCategoryId: "c2" }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const ids = result.current.transactions.map(t => t.id);
    expect(ids).toContain("t1");
    expect(ids).toContain("t2");
    expect(ids).not.toContain("t3");
  });

  it("computes totalIncome, totalExpenses, and net correctly", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 200, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 1000, "2026-05-01", "income", "c2"]
    );
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalIncome).toBe(1000);
    expect(result.current.totalExpenses).toBe(200);
    expect(result.current.net).toBe(800);
  });

  it("totals are zero when there are no transactions", async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalExpenses).toBe(0);
    expect(result.current.net).toBe(0);
  });

  it("createTransaction inserts a new transaction", async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createTransaction.mutateAsync({
        amount: 75,
        date: "2026-05-01",
        type: "expense",
        category_id: "c1",
      });
    });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    expect(result.current.transactions[0].amount).toBe(75);
    expect(result.current.transactions[0].type).toBe("expense");
  });

  it("createTransaction with subcategory stores subcategory_id", async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createTransaction.mutateAsync({
        amount: 40,
        date: "2026-05-01",
        type: "expense",
        category_id: "c1",
        subcategory_id: "s1",
      });
    });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    expect(result.current.transactions[0].subcategory_id).toBe("s1");
  });

  it("updateTransaction changes an existing transaction", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    await act(async () => {
      await result.current.updateTransaction.mutateAsync({
        id: "t1",
        amount: 99,
        date: "2026-05-01",
        type: "expense",
        category_id: "c1",
      });
    });
    await waitFor(() => expect(result.current.transactions[0].amount).toBe(99));
  });

  it("deleteTransaction removes a transaction", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    await act(async () => {
      await result.current.deleteTransaction.mutateAsync("t1");
    });
    await waitFor(() => expect(result.current.transactions).toHaveLength(0));
  });

  it("totals update after createTransaction", async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalExpenses).toBe(0);
    await act(async () => {
      await result.current.createTransaction.mutateAsync({
        amount: 150,
        date: "2026-05-01",
        type: "expense",
        category_id: "c1",
      });
    });
    await waitFor(() => expect(result.current.totalExpenses).toBe(150));
  });
});
