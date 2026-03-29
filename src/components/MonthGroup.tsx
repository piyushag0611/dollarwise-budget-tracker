import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExpenseCard } from "./ExpenseCard";
import type { Expense } from "@/hooks/useExpenses";
import type { Category, Subcategory } from "@/hooks/useCategories";

interface MonthGroupProps {
  label: string;
  expenses: Expense[];
  categories: Category[];
  subcategories: Subcategory[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function MonthGroup({
  label,
  expenses,
  categories,
  subcategories,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
}: MonthGroupProps) {
  const income = expenses
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const expenseTotal = expenses
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);
  const net = income - expenseTotal;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="mt-4 first:mt-0">
      <CollapsibleTrigger className="w-full">
        <div className="relative glass-card px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary rounded-l-sm">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                !isOpen && "-rotate-90"
              )}
            />
            <h2 className="font-display font-bold text-sm tracking-wide">{label}</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap justify-end">
            <span>
              Income{" "}
              <span className="text-emerald-500 font-medium">
                ${income.toFixed(2)}
              </span>
            </span>
            <span>·</span>
            <span>
              Expenses{" "}
              <span className="text-red-400 font-medium">
                ${expenseTotal.toFixed(2)}
              </span>
            </span>
            <span>·</span>
            <span>
              Net{" "}
              <span
                className={cn(
                  "font-medium",
                  net >= 0 ? "text-emerald-500" : "text-red-400"
                )}
              >
                {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
              </span>
            </span>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 space-y-2 mt-2 pl-3 border-l border-border/50">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              category={categories.find((c) => c.id === expense.category_id)}
              subcategory={subcategories.find(
                (s) => s.id === expense.subcategory_id
              )}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
