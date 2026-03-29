import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import type { ExpenseFilters as Filters } from "@/hooks/useExpenses";

interface ExpenseFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function ExpenseFilters({ filters, onChange }: ExpenseFiltersProps) {
  const { categories, getSubcategoriesForCategory } = useCategories();
  const subcategories = filters.categoryId ? getSubcategoriesForCategory(filters.categoryId) : [];
  const hasFilters = filters.dateFrom || filters.dateTo || filters.categoryId || filters.subcategoryId || filters.type;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Filters</span>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => onChange({})}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={filters.type ?? "all"}
            onValueChange={(v) => onChange({ ...filters, type: v === "all" ? undefined : v as any })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select
            value={filters.categoryId ?? "all"}
            onValueChange={(v) => onChange({ ...filters, categoryId: v === "all" ? undefined : v, subcategoryId: undefined })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {subcategories.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Subcategory</Label>
            <Select
              value={filters.subcategoryId ?? "all"}
              onValueChange={(v) => onChange({ ...filters, subcategoryId: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subcategories</SelectItem>
                {subcategories.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
