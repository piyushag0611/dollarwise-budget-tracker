import { useState } from "react";
import { Plus, SlidersHorizontal, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseCard } from "@/components/ExpenseCard";
import { ExpenseFilters } from "@/components/ExpenseFilters";
import { useExpenses, type ExpenseFilters as Filters, type Expense } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

export default function ExpensesPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { expenses, totalIncome, totalExpenses, net, isLoading, createExpense, updateExpense, deleteExpense } = useExpenses(filters);
  const { categories, subcategories } = useCategories();

  const activeFilterCount = [filters.dateFrom, filters.dateTo, filters.categoryId, filters.subcategoryId, filters.type].filter(Boolean).length;

  const handleClearFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    if (!newFilters.dateFrom && !newFilters.dateTo && !newFilters.categoryId && !newFilters.subcategoryId && !newFilters.type) {
      setFiltersOpen(false);
    }
  };

  const handleSubmit = async (data: Parameters<typeof createExpense.mutateAsync>[0]) => {
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ ...data, id: editingExpense.id });
        toast.success("Transaction updated");
      } else {
        await createExpense.mutateAsync(data);
        toast.success("Transaction added");
      }
      setFormOpen(false);
      setEditingExpense(null);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense.mutateAsync(deleteId);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">Track your income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 relative"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button onClick={() => { setEditingExpense(null); setFormOpen(true); }} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </div>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <ExpenseFilters filters={filters} onChange={handleClearFilters} />
        </CollapsibleContent>
      </Collapsible>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card px-4 py-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Income
          </div>
          <p className="font-display font-bold text-lg text-emerald-500">
            ${totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="glass-card px-4 py-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            Expenses
          </div>
          <p className="font-display font-bold text-lg text-red-400">
            ${totalExpenses.toFixed(2)}
          </p>
        </div>
        <div className="glass-card px-4 py-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Net
          </div>
          <p className={cn(
            "font-display font-bold text-lg",
            net >= 0 ? "text-emerald-500" : "text-red-400"
          )}>
            {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No transactions yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              category={categories.find((c) => c.id === expense.category_id)}
              subcategory={subcategories.find((s) => s.id === expense.subcategory_id)}
              onEdit={(e) => { setEditingExpense(e); setFormOpen(true); }}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ExpenseForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingExpense(null); }}
        onSubmit={handleSubmit}
        editingExpense={editingExpense}
        isSubmitting={createExpense.isPending || updateExpense.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
