import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function CategoriesPage() {
  const {
    categories, getSubcategoriesForCategory, getCategoryExpenseCount,
    createCategory, updateCategory, deleteCategory,
    createSubcategory, updateSubcategory, deleteSubcategory,
  } = useCategories();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogMode, setDialogMode] = useState<"category" | "subcategory" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "subcategory"; id: string; name: string; warning?: string } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCategoryDialog = (existing?: { id: string; name: string }) => {
    setDialogMode("category");
    setEditId(existing?.id ?? null);
    setName(existing?.name ?? "");
    setParentCategoryId(null);
  };

  const openSubcategoryDialog = (categoryId: string, existing?: { id: string; name: string }) => {
    setDialogMode("subcategory");
    setParentCategoryId(categoryId);
    setEditId(existing?.id ?? null);
    setName(existing?.name ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      if (dialogMode === "category") {
        if (editId) {
          await updateCategory.mutateAsync({ id: editId, name: trimmed });
          toast.success("Category updated");
        } else {
          await createCategory.mutateAsync(trimmed);
          toast.success("Category created");
        }
      } else if (dialogMode === "subcategory" && parentCategoryId) {
        if (editId) {
          await updateSubcategory.mutateAsync({ id: editId, name: trimmed });
          toast.success("Subcategory updated");
        } else {
          await createSubcategory.mutateAsync({ name: trimmed, categoryId: parentCategoryId });
          toast.success("Subcategory created");
        }
      }
      setDialogMode(null);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const confirmDeleteCategory = async (cat: { id: string; name: string }) => {
    const subs = getSubcategoriesForCategory(cat.id);
    const expCount = await getCategoryExpenseCount(cat.id);
    let warning = "";
    if (subs.length > 0 || expCount > 0) {
      const parts = [];
      if (subs.length > 0) parts.push(`${subs.length} subcategor${subs.length === 1 ? "y" : "ies"}`);
      if (expCount > 0) parts.push(`${expCount} expense${expCount === 1 ? "" : "s"}`);
      warning = `This category has ${parts.join(" and ")} attached. They will also be affected.`;
    }
    setDeleteTarget({ type: "category", id: cat.id, name: cat.name, warning });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "category") {
        await deleteCategory.mutateAsync(deleteTarget.id);
        toast.success("Category deleted");
      } else {
        await deleteSubcategory.mutateAsync(deleteTarget.id);
        toast.success("Subcategory deleted");
      }
    } catch {
      toast.error("Failed to delete. It may have expenses attached.");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize your expenses</p>
        </div>
        <Button onClick={() => openCategoryDialog()} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Category</span>
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No categories yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const subs = getSubcategoriesForCategory(cat.id);
            const isExpanded = expandedIds.has(cat.id);
            return (
              <div key={cat.id} className="glass-card overflow-hidden animate-fade-in">
                <div className="flex items-center gap-2 p-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <span className="flex-1 font-medium text-sm">{cat.name}</span>
                  <span className="text-xs text-muted-foreground mr-2">{subs.length} sub</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCategoryDialog(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => confirmDeleteCategory(cat)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-2 space-y-1">
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 py-1.5 pl-9">
                        <span className="flex-1 text-sm text-muted-foreground">{sub.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openSubcategoryDialog(cat.id, sub)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id, name: sub.name })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-9 mt-1 h-7 text-xs text-muted-foreground"
                      onClick={() => openSubcategoryDialog(cat.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add subcategory
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={!!dialogMode} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editId ? "Edit" : "New"} {dialogMode === "category" ? "Category" : "Subcategory"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dialogMode === "category" ? "e.g. Food" : "e.g. Groceries"}
                autoFocus
                required
                maxLength={100}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createCategory.isPending || updateCategory.isPending || createSubcategory.isPending || updateSubcategory.isPending}>
              {editId ? "Save" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.warning || "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
