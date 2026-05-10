import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useCategories";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { toast } from "sonner";
import type { CreateTransactionInput, TransactionType } from "@/hooks/useTransactions";
import type { Transaction } from "@/integrations/sqlite/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTransactionInput) => void;
  editingExpense?: Transaction | null;
  isSubmitting?: boolean;
}

export function ExpenseForm({ open, onOpenChange, onSubmit, editingExpense, isSubmitting }: ExpenseFormProps) {
  const { getCategoriesByType, getSubcategoriesForCategory, createCategory, createSubcategory } = useCategories();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const filteredCategories = getCategoriesByType(type);
  const subcategories = categoryId ? getSubcategoriesForCategory(categoryId) : [];

  useEffect(() => {
    if (editingExpense) {
      setType(editingExpense.type ?? "expense");
      setAmount(String(editingExpense.amount));
      setDate(editingExpense.date);
      setCategoryId(editingExpense.category_id);
      setSubcategoryId(editingExpense.subcategory_id ?? "");
      setDescription(editingExpense.description ?? "");
      setIsRecurring(!!editingExpense.is_recurring);
    } else {
      setType("expense");
      setAmount("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCategoryId("");
      setSubcategoryId("");
      setDescription("");
      setIsRecurring(false);
    }
  }, [editingExpense, open]);

  const handleCreateCategory = async (name: string) => {
    try {
      const cat = await createCategory.mutateAsync({ name, type });
      setCategoryId(cat.id);
      setSubcategoryId("");
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleCreateSubcategory = async (name: string) => {
    try {
      const sub = await createSubcategory.mutateAsync({ name, categoryId });
      setSubcategoryId(sub.id);
    } catch {
      toast.error("Failed to create subcategory");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !categoryId) return;

    onSubmit({
      amount: parsedAmount,
      date,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      description: description.trim() || null,
      is_recurring: isRecurring,
      type,
    });
  };

  const isIncome = type === "income";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editingExpense ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                !isIncome
                  ? "bg-red-500/15 text-red-400 border-r border-border"
                  : "text-muted-foreground hover:text-foreground border-r border-border"
              )}
              onClick={() => { setType("expense"); setCategoryId(""); setSubcategoryId(""); }}
            >
              Expense
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                isIncome
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => { setType("income"); setCategoryId(""); setSubcategoryId(""); }}
            >
              Income
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (CAD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <CategoryCombobox
              value={categoryId}
              onChange={(id) => { setCategoryId(id); setSubcategoryId(""); }}
              options={filteredCategories}
              placeholder="Select category"
              onCreate={handleCreateCategory}
              isCreating={createCategory.isPending}
            />
          </div>

          {categoryId && (
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <CategoryCombobox
                value={subcategoryId}
                onChange={setSubcategoryId}
                options={subcategories}
                placeholder="Select subcategory"
                onCreate={handleCreateSubcategory}
                isCreating={createSubcategory.isPending}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="recurring" className="cursor-pointer text-sm">Recurring transaction</Label>
            <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : editingExpense ? "Update Transaction" : "Add Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
