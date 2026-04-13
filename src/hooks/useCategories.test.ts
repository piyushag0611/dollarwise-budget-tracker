import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// These imports activate the vi.mock() calls inside them — order matters
import "../test/mocks/auth";
import { mockFrom, mockSupabaseResolve } from "../test/mocks/supabase";
import { createWrapper } from "../test/test-utils";
import { useCategories } from "./useCategories";

// Sample data that the Supabase mock will return
const sampleCategories = [
  { id: "cat-1", name: "Food", type: "expense", user_id: "test-user-id", created_at: "", updated_at: "" },
  { id: "cat-2", name: "Salary", type: "income", user_id: "test-user-id", created_at: "", updated_at: "" },
  { id: "cat-3", name: "Transport", type: "expense", user_id: "test-user-id", created_at: "", updated_at: "" },
];

const sampleSubcategories = [
  { id: "sub-1", name: "Groceries", category_id: "cat-1", user_id: "test-user-id", created_at: "", updated_at: "" },
  { id: "sub-2", name: "Restaurants", category_id: "cat-1", user_id: "test-user-id", created_at: "", updated_at: "" },
  { id: "sub-3", name: "Bus", category_id: "cat-3", user_id: "test-user-id", created_at: "", updated_at: "" },
];

// Make Supabase return the right data based on which table is queried
beforeEach(() => {
  mockFrom.mockImplementation((table: string) => {
    const data = table === "categories" ? sampleCategories : sampleSubcategories;
    return {
      select: () => ({ order: () => Promise.resolve({ data, error: null }) }),
    };
  });
});

describe("useCategories — getSubcategoriesForCategory()", () => {
  it("returns subcategories that belong to the given category", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.subcategories.length).toBeGreaterThan(0));

    const subs = result.current.getSubcategoriesForCategory("cat-1");
    expect(subs).toHaveLength(2);
    expect(subs.map((s) => s.name)).toEqual(["Groceries", "Restaurants"]);
  });

  it("returns only the subcategory for a different category", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.subcategories.length).toBeGreaterThan(0));

    const subs = result.current.getSubcategoriesForCategory("cat-3");
    expect(subs).toHaveLength(1);
    expect(subs[0].name).toBe("Bus");
  });

  it("returns an empty array for a category with no subcategories", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.subcategories.length).toBeGreaterThan(0));

    expect(result.current.getSubcategoriesForCategory("cat-2")).toEqual([]);
  });
});

describe("useCategories — getCategoriesByType()", () => {
  it("returns only expense categories", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.categories.length).toBeGreaterThan(0));

    const expenses = result.current.getCategoriesByType("expense");
    expect(expenses).toHaveLength(2);
    expect(expenses.map((c) => c.name)).toEqual(["Food", "Transport"]);
  });

  it("returns only income categories", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.categories.length).toBeGreaterThan(0));

    const income = result.current.getCategoriesByType("income");
    expect(income).toHaveLength(1);
    expect(income[0].name).toBe("Salary");
  });
});
