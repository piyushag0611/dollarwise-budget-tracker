import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createTestDatabase } from "@/test/mocks/database";
import { createWrapper } from "@/test/utils/renderWithDb";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";
import { useCategories } from "./useCategories";

let db: DatabaseAdapter;
let wrapper: ReturnType<typeof createWrapper>;

beforeEach(() => {
  db = createTestDatabase();
  wrapper = createWrapper(db);
});

afterEach(async () => { await db.close(); });

describe("useCategories", () => {
  it("returns empty arrays initially", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual([]);
    expect(result.current.subcategories).toEqual([]);
  });

  it("fetches categories sorted by name", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Salary", "income"]
    );
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c2", "Food", "expense"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toHaveLength(2));
    expect(result.current.categories[0].name).toBe("Food");
    expect(result.current.categories[1].name).toBe("Salary");
  });

  it("fetches subcategories sorted by name", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    await db.execute(
      "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
      ["s1", "Takeaway", "c1"]
    );
    await db.execute(
      "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
      ["s2", "Groceries", "c1"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.subcategories).toHaveLength(2));
    expect(result.current.subcategories[0].name).toBe("Groceries");
    expect(result.current.subcategories[1].name).toBe("Takeaway");
  });

  it("createCategory adds a new category", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createCategory.mutateAsync({ name: "Food", type: "expense" });
    });
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    expect(result.current.categories[0].name).toBe("Food");
    expect(result.current.categories[0].type).toBe("expense");
  });

  it("updateCategory renames a category", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    await act(async () => {
      await result.current.updateCategory.mutateAsync({ id: "c1", name: "Groceries" });
    });
    await waitFor(() => expect(result.current.categories[0].name).toBe("Groceries"));
  });

  it("deleteCategory removes a category", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    await act(async () => {
      await result.current.deleteCategory.mutateAsync("c1");
    });
    await waitFor(() => expect(result.current.categories).toHaveLength(0));
  });

  it("createSubcategory adds a subcategory under the given category", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createSubcategory.mutateAsync({ name: "Groceries", categoryId: "c1" });
    });
    await waitFor(() => expect(result.current.subcategories).toHaveLength(1));
    expect(result.current.subcategories[0].name).toBe("Groceries");
    expect(result.current.subcategories[0].category_id).toBe("c1");
  });

  it("updateSubcategory renames a subcategory", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    await db.execute(
      "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
      ["s1", "Groceries", "c1"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.subcategories).toHaveLength(1));
    await act(async () => {
      await result.current.updateSubcategory.mutateAsync({ id: "s1", name: "Supermarket" });
    });
    await waitFor(() => expect(result.current.subcategories[0].name).toBe("Supermarket"));
  });

  it("deleteSubcategory removes a subcategory", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    await db.execute(
      "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
      ["s1", "Groceries", "c1"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.subcategories).toHaveLength(1));
    await act(async () => {
      await result.current.deleteSubcategory.mutateAsync("s1");
    });
    await waitFor(() => expect(result.current.subcategories).toHaveLength(0));
  });

  it("getSubcategoriesForCategory filters by category id", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c2", "Transport", "expense"]
    );
    await db.execute(
      "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
      ["s1", "Groceries", "c1"]
    );
    await db.execute(
      "INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)",
      ["s2", "Bus", "c2"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.subcategories).toHaveLength(2));
    const foodSubs = result.current.getSubcategoriesForCategory("c1");
    expect(foodSubs).toHaveLength(1);
    expect(foodSubs[0].id).toBe("s1");
  });

  it("getCategoriesByType filters by income or expense", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c2", "Salary", "income"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toHaveLength(2));
    expect(result.current.getCategoriesByType("expense")).toHaveLength(1);
    expect(result.current.getCategoriesByType("expense")[0].id).toBe("c1");
    expect(result.current.getCategoriesByType("income")).toHaveLength(1);
    expect(result.current.getCategoriesByType("income")[0].id).toBe("c2");
  });

  it("getCategoryTransactionCount returns count of transactions in a category", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1"]
    );
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["t2", 30, "2026-05-02", "expense", "c1"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const count = await result.current.getCategoryTransactionCount("c1");
    expect(count).toBe(2);
  });

  it("getCategoryTransactionCount returns 0 for category with no transactions", async () => {
    await db.execute(
      "INSERT INTO categories (id, name, type) VALUES (?, ?, ?)",
      ["c1", "Food", "expense"]
    );
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const count = await result.current.getCategoryTransactionCount("c1");
    expect(count).toBe(0);
  });
});
