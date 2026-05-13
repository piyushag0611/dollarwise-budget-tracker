import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown, X, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Transaction, Category, Subcategory } from "@/integrations/sqlite/types";
import type { PeriodFilter } from "@/hooks/useAggregations";

type SortCol = "date" | "amount" | "category" | "updated_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

interface Props {
  transactions: Transaction[];
  categories: Category[];
  subcategories: Subcategory[];
  periodFilter: PeriodFilter | null;
  onClearPeriodFilter: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionsTable({
  transactions,
  categories,
  subcategories,
  periodFilter,
  onClearPeriodFilter,
  onEdit,
  onDelete,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Lookup maps for category / subcategory names
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const subMap = useMemo(() => new Map(subcategories.map((s) => [s.id, s.name])), [subcategories]);

  const handleSortToggle = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let rows = transactions;

    // 1. Period filter
    if (periodFilter) {
      rows = rows.filter((t) => t.date >= periodFilter.from && t.date <= periodFilter.to);
    }

    // 2. Search (description, category name, subcategory name)
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((t) => {
        const desc = (t.description ?? "").toLowerCase();
        const cat = (catMap.get(t.category_id) ?? "").toLowerCase();
        const sub = (subMap.get(t.subcategory_id ?? "") ?? "").toLowerCase();
        return desc.includes(q) || cat.includes(q) || sub.includes(q);
      });
    }

    // 3. Sort
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "date") cmp = a.date.localeCompare(b.date);
      else if (sortCol === "amount") cmp = a.amount - b.amount;
      else if (sortCol === "category") cmp = (catMap.get(a.category_id) ?? "").localeCompare(catMap.get(b.category_id) ?? "");
      else cmp = a.updated_at.localeCompare(b.updated_at);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [transactions, periodFilter, search, sortCol, sortDir, catMap, subMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 inline opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 inline" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 inline" />;
  };

  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Transactions</h2>
        <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Period filter banner */}
      {periodFilter && (
        <div className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Showing:</span>
          <span className="font-medium">{periodFilter.label}</span>
          <button
            onClick={onClearPeriodFilter}
            className="ml-auto rounded-full p-0.5 hover:bg-muted"
            aria-label="Clear period filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search bar */}
      <Input
        placeholder="Search by description, category, subcategory…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="h-8 text-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSortToggle("date")}
            >
              Date <SortIcon col="date" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSortToggle("amount")}
            >
              Amount <SortIcon col="amount" />
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSortToggle("category")}
            >
              Category <SortIcon col="category" />
            </TableHead>
            <TableHead>Subcategory</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Recurring</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
                No transactions match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(parseISO(t.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className={cn("font-medium whitespace-nowrap", t.type === "income" ? "text-emerald-500" : "text-red-400")}>
                  {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", t.type === "income" ? "border-emerald-500/40 text-emerald-500" : "border-red-400/40 text-red-400")}
                  >
                    {t.type === "income" ? "Income" : "Expense"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{catMap.get(t.category_id) ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.subcategory_id ? (subMap.get(t.subcategory_id) ?? "—") : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                  {t.description ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  {t.is_recurring === 1 && <RefreshCw className="h-3.5 w-3.5 mx-auto text-muted-foreground" />}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination controls */}
      <div className="flex items-center justify-between gap-4 pt-1 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>Page {safePage} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
