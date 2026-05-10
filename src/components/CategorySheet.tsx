import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategorySheet({ open, onOpenChange }: CategorySheetProps) {
  const {
    categories,
    getSubcategoriesForCategory,
    getCategoriesByType,
    getCategoryTransactionCount,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useCategories();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Edit dialog state (creation is handled inline, not via dialog)
  const [editTarget, setEditTarget] = useState<{ mode: "category" | "subcategory"; id: string; name: string; parentId?: string } | null>(null);
  const [editName, setEditName] = useState("");

  // Inline creation state
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newSubcategoryNames, setNewSubcategoryNames] = useState<Record<string, string>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "subcategory"; id: string; name: string; warning?: string } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEditCategory = (cat: { id: string; name: string }) => {
    setEditTarget({ mode: "category", id: cat.id, name: cat.name });
    setEditName(cat.name);
  };

  const openEditSubcategory = (sub: { id: string; name: string }, parentId: string) => {
    setEditTarget({ mode: "subcategory", id: sub.id, name: sub.name, parentId });
    setEditName(sub.name);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed || !editTarget) return;
    try {
      if (editTarget.mode === "category") {
        await updateCategory.mutateAsync({ id: editTarget.id, name: trimmed });
        toast.success("Category updated");
      } else {
        await updateSubcategory.mutateAsync({ id: editTarget.id, name: trimmed });
        toast.success("Subcategory updated");
      }
      setEditTarget(null);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleCreateCategory = async (name: string, type: "income" | "expense", clear: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync({ name: trimmed, type });
      clear();
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleCreateSubcategory = async (categoryId: string) => {
    const trimmed = (newSubcategoryNames[categoryId] ?? "").trim();
    if (!trimmed) return;
    try {
      await createSubcategory.mutateAsync({ name: trimmed, categoryId });
      setNewSubcategoryNames((prev) => ({ ...prev, [categoryId]: "" }));
      toast.success("Subcategory created");
    } catch {
      toast.error("Failed to create subcategory");
    }
  };

  const confirmDeleteCategory = async (cat: { id: string; name: string }) => {
    const subs = getSubcategoriesForCategory(cat.id);
    const expCount = await getCategoryTransactionCount(cat.id);
    let warning = "";
    if (subs.length > 0 || expCount > 0) {
      const parts = [];
      if (subs.length > 0) parts.push(`${subs.length} subcategor${subs.length === 1 ? "y" : "ies"}`);
      if (expCount > 0) parts.push(`${expCount} transaction${expCount === 1 ? "" : "s"}`);
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
      toast.error("Failed to delete");
    }
    setDeleteTarget(null);
  };

  const incomeCategories = getCategoriesByType("income");
  const expenseCategories = getCategoriesByType("expense");

  const renderCategoryList = (cats: typeof categories) => (
    <div className="space-y-2">
      {cats.map((cat) => {
        const subs = getSubcategoriesForCategory(cat.id);
        const isExpanded = expandedIds.has(cat.id);
        return (
          <div key={cat.id} className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleExpand(cat.id)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <span className="flex-1 font-medium text-sm">{cat.name}</span>
              <span className="text-xs text-muted-foreground mr-2">{subs.length} sub</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(cat)}>
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
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSubcategory(sub, cat.id)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id, name: sub.name })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {/* Inline subcategory creation */}
                <div className="flex items-center gap-2 pl-9 pt-1 pr-px">
                  <Input
                    placeholder="New subcategory..."
                    value={newSubcategoryNames[cat.id] ?? ""}
                    onChange={(e) => setNewSubcategoryNames((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateSubcategory(cat.id); } }}
                    className="h-7 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleCreateSubcategory(cat.id)}
                    disabled={!newSubcategoryNames[cat.id]?.trim() || createSubcategory.isPending}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderInlineCategoryInput = (type: "expense" | "income") => {
    const value = type === "expense" ? newExpenseName : newIncomeName;
    const setValue = type === "expense" ? setNewExpenseName : setNewIncomeName;
    return (
      <div className="flex gap-2 mt-2 px-px">
        <Input
          placeholder="New category..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(value, type, () => setValue("")); } }}
          className="h-8 text-sm"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => handleCreateCategory(value, type, () => setValue(""))}
          disabled={!value.trim() || createCategory.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle className="font-display">Categories</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pt-4 px-1">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider px-1">Expense</h2>
              {renderCategoryList(expenseCategories)}
              {renderInlineCategoryInput("expense")}
            </div>
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider px-1">Income</h2>
              {renderCategoryList(incomeCategories)}
              {renderInlineCategoryInput("income")}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit dialog — rendered outside Sheet to avoid z-index conflicts */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit {editTarget?.mode === "category" ? "Category" : "Subcategory"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                required
                maxLength={100}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={updateCategory.isPending || updateSubcategory.isPending}
            >
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
