import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Expense } from "@/hooks/useExpenses";
import type { Category, Subcategory } from "@/hooks/useCategories";
import { format, parseISO } from "date-fns";

interface ExpenseCardProps {
  expense: Expense;
  category?: Category;
  subcategory?: Subcategory;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpenseCard({ expense, category, subcategory, onEdit, onDelete }: ExpenseCardProps) {
  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-semibold font-display">
              ${Number(expense.amount).toFixed(2)}
            </span>
            {expense.is_recurring && (
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="rounded-md bg-accent px-2 py-0.5 text-accent-foreground">
              {category?.name ?? "Unknown"}
            </span>
            {subcategory && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
                {subcategory.name}
              </span>
            )}
            <span>·</span>
            <span>{format(parseISO(expense.date), "MMM d, yyyy")}</span>
          </div>
          {expense.description && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{expense.description}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
