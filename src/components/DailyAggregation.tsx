import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DailyRow, PeriodFilter } from "@/hooks/useAggregations";

const INITIAL_ROWS = 30;
const LOAD_MORE_STEP = 30;

interface Props {
  rows: DailyRow[];
  periodFilter: PeriodFilter | null;
  onPeriodSelect: (pf: PeriodFilter) => void;
}

export function DailyAggregation({ rows, periodFilter, onPeriodSelect }: Props) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Daily</h2>
        <span className="text-xs text-muted-foreground">{rows.length} day{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right text-emerald-500">Income</TableHead>
            <TableHead className="text-right text-red-400">Expenses</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                No data for the current filters.
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row) => {
              const isActive = periodFilter?.from === row.date && periodFilter?.to === row.date;
              return (
                <TableRow
                  key={row.date}
                  className={cn("cursor-pointer", isActive && "bg-accent")}
                  onClick={() => onPeriodSelect({ from: row.date, to: row.date, label: row.label })}
                >
                  <TableCell className="text-sm">{row.label}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-500">${row.income.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm text-red-400">${row.expenses.toFixed(2)}</TableCell>
                  <TableCell className={cn("text-right text-sm font-medium", row.net >= 0 ? "text-emerald-500" : "text-red-400")}>
                    {row.net >= 0 ? "+" : "-"}${Math.abs(row.net).toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-muted-foreground"
          onClick={() => setVisibleCount((n) => n + LOAD_MORE_STEP)}
        >
          <ChevronDown className="h-4 w-4" />
          Load more ({rows.length - visibleCount} remaining)
        </Button>
      )}
    </div>
  );
}
