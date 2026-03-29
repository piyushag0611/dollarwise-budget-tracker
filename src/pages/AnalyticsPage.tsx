import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useNetSavingsTrend,
  useTopCategories,
  useSubcategorySpend,
  useTotalIncome,
  type TimeRange,
} from "@/hooks/useAnalytics";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3", label: "Last 3 months" },
  { value: "last_6", label: "Last 6 months" },
];

function TimeRangeSelector({
  value, onChange, showCustom, customFrom, customTo, onCustomFromChange, onCustomToChange,
}: {
  value: TimeRange; onChange: (v: TimeRange) => void;
  showCustom?: boolean;
  customFrom?: string; customTo?: string;
  onCustomFromChange?: (d: string) => void; onCustomToChange?: (d: string) => void;
}) {
  const options = showCustom ? [...TIME_RANGE_OPTIONS, { value: "custom" as TimeRange, label: "Custom" }] : TIME_RANGE_OPTIONS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showCustom && value === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                {customFrom ? format(new Date(customFrom), "MMM d, yyyy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFrom ? new Date(customFrom) : undefined}
                onSelect={(d) => d && onCustomFromChange?.(format(d, "yyyy-MM-dd"))}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                {customTo ? format(new Date(customTo), "MMM d, yyyy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customTo ? new Date(customTo) : undefined}
                onSelect={(d) => d && onCustomToChange?.(format(d, "yyyy-MM-dd"))}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ${p.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

// ─── Chart 1: Net savings trend ───
function NetSavingsChart() {
  const { data, isLoading } = useNetSavingsTrend();

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No transaction data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="income" name="Income" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="net" name="Net" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 2: Top spending categories ───
function TopCategoriesChart() {
  const [range, setRange] = useState<TimeRange>("this_month");
  const [drillCategory, setDrillCategory] = useState<{ id: string; name: string } | null>(null);
  const { data: catData, isLoading: catLoading } = useTopCategories(range);
  const { data: subData, isLoading: subLoading } = useSubcategorySpend(drillCategory?.id || "", range);

  const isDrilling = !!drillCategory;
  const isLoading = isDrilling ? subLoading : catLoading;
  const chartData = isDrilling
    ? (subData ?? []).map((s) => ({ name: s.subcategoryName, total: s.total, id: s.subcategoryId }))
    : (catData ?? []).map((c) => ({ name: c.categoryName, total: c.total, id: c.categoryId }));

  const barHeight = Math.max(200, chartData.length * 40);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TimeRangeSelector value={range} onChange={(v) => { setRange(v); setDrillCategory(null); }} />
        {isDrilling && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setDrillCategory(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to categories
          </Button>
        )}
      </div>
      {isDrilling && <p className="text-xs text-muted-foreground">Subcategories of <span className="font-medium text-foreground">{drillCategory.name}</span></p>}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No spending data for this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={120} />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Total"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar
              dataKey="total"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              cursor={isDrilling ? "default" : "pointer"}
              onClick={(d: any) => {
                if (!isDrilling && d?.id) setDrillCategory({ id: d.id, name: d.name });
              }}
            >
              <LabelList dataKey="total" position="right" formatter={(v: number) => `$${v.toFixed(0)}`} style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Chart 3: Spending % of income ───
function SpendingPercentChart() {
  const [range, setRange] = useState<TimeRange>("this_month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [drillCategory, setDrillCategory] = useState<{ id: string; name: string } | null>(null);

  const { data: catData, isLoading: catLoading } = useTopCategories(range, customFrom, customTo);
  const { data: subData, isLoading: subLoading } = useSubcategorySpend(drillCategory?.id || "", range, customFrom, customTo);
  const { data: totalIncome, isLoading: incomeLoading } = useTotalIncome(range, customFrom, customTo);

  const isDrilling = !!drillCategory;
  const isLoading = catLoading || incomeLoading || (isDrilling && subLoading);

  const chartData = useMemo(() => {
    const income = totalIncome || 0;
    if (income === 0) return [];

    const source = isDrilling
      ? (subData ?? []).map((s) => ({ name: s.subcategoryName, total: s.total, id: s.subcategoryId }))
      : (catData ?? []).map((c) => ({ name: c.categoryName, total: c.total, id: c.categoryId }));

    return source.map((item) => ({
      ...item,
      percent: (item.total / income) * 100,
    })).sort((a, b) => b.percent - a.percent);
  }, [catData, subData, totalIncome, isDrilling]);

  const barHeight = Math.max(200, chartData.length * 40);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TimeRangeSelector
          value={range}
          onChange={(v) => { setRange(v); setDrillCategory(null); }}
          showCustom
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        {isDrilling && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setDrillCategory(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to categories
          </Button>
        )}
      </div>
      {isDrilling && <p className="text-xs text-muted-foreground">Subcategories of <span className="font-medium text-foreground">{drillCategory.name}</span></p>}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : !totalIncome ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No income recorded for this period.</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No spending data for this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={120} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, "% of Income"]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Bar
              dataKey="percent"
              radius={[0, 4, 4, 0]}
              cursor={isDrilling ? "default" : "pointer"}
              onClick={(d: any) => {
                if (!isDrilling && d?.id) setDrillCategory({ id: d.id, name: d.name });
              }}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.percent > 100 ? "hsl(0, 72%, 51%)" : "hsl(var(--primary))"} />
              ))}
              <LabelList dataKey="percent" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Visualize your spending and savings trends</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Net Savings Trend</CardTitle>
          <CardDescription>Monthly income, expenses, and net savings over all time</CardDescription>
        </CardHeader>
        <CardContent>
          <NetSavingsChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Spending Categories</CardTitle>
          <CardDescription>Expense categories ranked by total spend — click a bar to see subcategories</CardDescription>
        </CardHeader>
        <CardContent>
          <TopCategoriesChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spending as % of Income</CardTitle>
          <CardDescription>Each expense category as a percentage of total income — bars exceeding 100% are highlighted in red</CardDescription>
        </CardHeader>
        <CardContent>
          <SpendingPercentChart />
        </CardContent>
      </Card>
    </div>
  );
}
