import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestDatabase } from "@/test/mocks/database";
import { createWrapper } from "@/test/utils/renderWithDb";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  getDateRange,
  useNetSavingsTrend,
  useTopCategories,
  useSubcategorySpend,
  useTotalIncome,
} from "./useAnalytics";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const now = new Date();

let db: DatabaseAdapter;
let wrapper: ReturnType<typeof createWrapper>;

beforeEach(async () => {
  db = createTestDatabase();
  wrapper = createWrapper(db);
  await db.execute(
    "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
    ["c1", "Food", "expense"]
  );
  await db.execute(
    "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
    ["c2", "Salary", "income"]
  );
  await db.execute(
    "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
    ["s1", "Groceries", "c1"]
  );
  await db.execute(
    "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
    ["s2", "Restaurants", "c1"]
  );
});

afterEach(async () => { await db.close(); });

// ─── getDateRange ─────────────────────────────────────────────────────────────

describe("getDateRange", () => {
  it("this_month: from is first day of current month", () => {
    const { from } = getDateRange("this_month");
    expect(from).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("this_month: to is last day of current month", () => {
    const { to } = getDateRange("this_month");
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number(to.slice(8, 10))).toBeGreaterThanOrEqual(28);
  });

  it("last_month: from is before this month", () => {
    const { from } = getDateRange("last_month");
    const { from: thisFrom } = getDateRange("this_month");
    expect(from < thisFrom).toBe(true);
  });

  it("custom: returns provided from and to", () => {
    const { from, to } = getDateRange("custom", "2026-01-01", "2026-03-31");
    expect(from).toBe("2026-01-01");
    expect(to).toBe("2026-03-31");
  });

  it("last_3: starts at the beginning of 2 months ago", () => {
    const { from, to } = getDateRange("last_3");
    expect(from).toBe(fmt(startOfMonth(subMonths(now, 2))));
    expect(to).toBe(fmt(endOfMonth(now)));
  });

  it("last_6: starts at the beginning of 5 months ago", () => {
    const { from, to } = getDateRange("last_6");
    expect(from).toBe(fmt(startOfMonth(subMonths(now, 5))));
    expect(to).toBe(fmt(endOfMonth(now)));
  });
});

// ─── useNetSavingsTrend ───────────────────────────────────────────────────────

describe("useNetSavingsTrend", () => {
  it("returns empty array when no transactions exist", async () => {
    const { result } = renderHook(() => useNetSavingsTrend(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it("aggregates income and expenses by month", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 500, "2026-04-10", "income", "c2"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 100, "2026-04-15", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t3", 200, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(() => useNetSavingsTrend(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    const april = result.current.data!.find(d => d.month === "2026-04");
    expect(april).toBeDefined();
    expect(april!.income).toBe(500);
    expect(april!.expenses).toBe(100);
    expect(april!.net).toBe(400);
    expect(april!.label).toBe("Apr 2026");
  });

  it("returns months in ascending order", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 100, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 100, "2026-03-01", "expense", "c1"]
    );
    const { result } = renderHook(() => useNetSavingsTrend(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data![0].month).toBe("2026-03");
    expect(result.current.data![1].month).toBe("2026-05");
  });
});

// ─── useTopCategories ─────────────────────────────────────────────────────────

describe("useTopCategories", () => {
  it("returns empty array when no expense transactions", async () => {
    const { result } = renderHook(() => useTopCategories("this_month"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it("returns categories sorted by spend descending", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c3", "Transport", "expense"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 300, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 500, "2026-05-02", "expense", "c3"]
    );
    const { result } = renderHook(
      () => useTopCategories("custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data![0].categoryId).toBe("c3");
    expect(result.current.data![0].categoryName).toBe("Transport");
    expect(result.current.data![0].total).toBe(500);
    expect(result.current.data![1].categoryId).toBe("c1");
    expect(result.current.data![1].total).toBe(300);
  });

  it("excludes income transactions from top categories", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 1000, "2026-05-01", "income", "c2"]
    );
    const { result } = renderHook(
      () => useTopCategories("custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it("respects date range boundaries", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 100, "2026-04-30", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 200, "2026-05-15", "expense", "c1"]
    );
    const { result } = renderHook(
      () => useTopCategories("custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].total).toBe(200);
  });
});

// ─── useSubcategorySpend ──────────────────────────────────────────────────────

describe("useSubcategorySpend", () => {
  it("returns breakdown by subcategory sorted by spend descending", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?)",
      ["t1", 80, "2026-05-01", "expense", "c1", "s1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?)",
      ["t2", 50, "2026-05-02", "expense", "c1", "s2"]
    );
    const { result } = renderHook(
      () => useSubcategorySpend("c1", "custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data![0].subcategoryId).toBe("s1");
    expect(result.current.data![0].subcategoryName).toBe("Groceries");
    expect(result.current.data![0].total).toBe(80);
    expect(result.current.data![1].subcategoryId).toBe("s2");
    expect(result.current.data![1].total).toBe(50);
  });

  it("includes Uncategorized entry for transactions without subcategory", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 100, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(
      () => useSubcategorySpend("c1", "custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data![0].subcategoryId).toBe("__none__");
    expect(result.current.data![0].subcategoryName).toBe("Uncategorized");
    expect(result.current.data![0].total).toBe(100);
  });

  it("mixes categorized and uncategorized transactions", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?)",
      ["t1", 60, "2026-05-01", "expense", "c1", "s1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 40, "2026-05-02", "expense", "c1"]
    );
    const { result } = renderHook(
      () => useSubcategorySpend("c1", "custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    const groceries = result.current.data!.find(d => d.subcategoryId === "s1");
    const uncat = result.current.data!.find(d => d.subcategoryId === "__none__");
    expect(groceries?.total).toBe(60);
    expect(uncat?.total).toBe(40);
  });

  it("only includes transactions for the given category", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c3", "Transport", "expense"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 100, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 200, "2026-05-01", "expense", "c3"]
    );
    const { result } = renderHook(
      () => useSubcategorySpend("c1", "custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const total = result.current.data!.reduce((s, d) => s + d.total, 0);
    expect(total).toBe(100);
  });
});

// ─── useTotalIncome ───────────────────────────────────────────────────────────

describe("useTotalIncome", () => {
  it("returns 0 when there are no income transactions", async () => {
    const { result } = renderHook(() => useTotalIncome("this_month"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe(0);
  });

  it("sums income transactions within the date range", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 1000, "2026-05-01", "income", "c2"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 500, "2026-05-15", "income", "c2"]
    );
    const { result } = renderHook(
      () => useTotalIncome("custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toBe(1500));
  });

  it("excludes income outside the date range", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 1000, "2026-05-01", "income", "c2"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 200, "2026-04-01", "income", "c2"]
    );
    const { result } = renderHook(
      () => useTotalIncome("custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toBe(1000));
  });

  it("excludes expense transactions from income total", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 1000, "2026-05-01", "income", "c2"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 300, "2026-05-01", "expense", "c1"]
    );
    const { result } = renderHook(
      () => useTotalIncome("custom", "2026-05-01", "2026-05-31"),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data).toBe(1000));
  });
});
