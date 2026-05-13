import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { WeeklyRow, PeriodFilter } from "@/hooks/useAggregations";

interface Props {
  rows: WeeklyRow[];
  periodFilter: PeriodFilter | null;
  onPeriodSelect: (pf: PeriodFilter) => void;
}

export function WeeklyAggregation({ rows, periodFilter, onPeriodSelect }: Props) {
  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Weekly</h2>
        <span className="text-xs text-muted-foreground">{rows.length} week{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead className="text-right text-emerald-500">Income</TableHead>
            <TableHead className="text-right text-red-400">Expenses</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                No data for the current filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const isActive = periodFilter?.from === row.from && periodFilter?.to === row.to;
              return (
                <TableRow
                  key={row.from}
                  className={cn("cursor-pointer", isActive && "bg-accent")}
                  onClick={() => onPeriodSelect({ from: row.from, to: row.to, label: row.label })}
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
    </div>
  );
}
