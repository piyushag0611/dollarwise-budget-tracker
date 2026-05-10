import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/contexts/DatabaseContext";
import type { Category, Subcategory } from "@/integrations/sqlite/types";

export function useCategories() {
  const db = useDatabase();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => db!.query<Category>("SELECT * FROM categories ORDER BY name"),
    enabled: !!db,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => db!.query<Subcategory>("SELECT * FROM subcategories ORDER BY name"),
    enabled: !!db,
  });

  const createCategory = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: "income" | "expense" }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db!.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", [id, name, type]);
      return { id, name, type, created_at: now, updated_at: now } as Category;
    },
    onSuccess: (newCat) => {
      queryClient.setQueryData<Category[]>(["categories"], (old) => [...(old ?? []), newCat]);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await db!.execute("UPDATE categories SET name = ? WHERE id = ?", [name, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await db!.execute("DELETE FROM categories WHERE id = ?", [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const createSubcategory = useMutation({
    mutationFn: async ({ name, categoryId }: { name: string; categoryId: string }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db!.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", [id, name, categoryId]);
      return { id, name, category_id: categoryId, created_at: now, updated_at: now } as Subcategory;
    },
    onSuccess: (newSub) => {
      queryClient.setQueryData<Subcategory[]>(["subcategories"], (old) => [...(old ?? []), newSub]);
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await db!.execute("UPDATE subcategories SET name = ? WHERE id = ?", [name, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subcategories"] }),
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      await db!.execute("DELETE FROM subcategories WHERE id = ?", [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const getSubcategoriesForCategory = (categoryId: string): Subcategory[] =>
    subcategoriesQuery.data?.filter(s => s.category_id === categoryId) ?? [];

  const getCategoriesByType = (type: "income" | "expense"): Category[] =>
    categoriesQuery.data?.filter(c => c.type === type) ?? [];

  const getCategoryTransactionCount = async (categoryId: string): Promise<number> => {
    if (!db) return 0;
    const row = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM transactions WHERE category_id = ?",
      [categoryId]
    );
    return row?.count ?? 0;
  };

  return {
    categories: categoriesQuery.data ?? [],
    subcategories: subcategoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading || subcategoriesQuery.isLoading,
    getSubcategoriesForCategory,
    getCategoriesByType,
    getCategoryTransactionCount,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  };
}
