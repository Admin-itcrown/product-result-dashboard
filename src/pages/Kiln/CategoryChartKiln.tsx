import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatNumber, CATEGORY_COLORS } from "./KilnDashboardStyles";
import type { KilnProductionRecord } from "./KilnDashboardStyles";

interface CategoryChartKilnProps {
  data: KilnProductionRecord[];
}

const FILTER_TABS = ['All', 'Biscuit', 'Glaze', 'Decal'] as const;

const KILN_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
];

export function CategoryChartKiln({ data }: CategoryChartKilnProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const chartData = useMemo(() => {
    if (activeFilter === 'All') {
      const map = new Map<string, number>();
      for (const r of data) map.set(r.category, (map.get(r.category) || 0) + r.qtyProc);
      const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
      return {
        total,
        entries: ['Biscuit', 'Glaze', 'Decal']
          .map(cat => ({ name: cat, value: map.get(cat) || 0, color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }))
          .filter(x => x.value > 0)
      };
    } else {
      const map = new Map<string, number>();
      for (const r of data) if (r.category === activeFilter) map.set(r.kilnName, (map.get(r.kilnName) || 0) + r.qtyProc);
      const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
      const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).filter(x => x[1] > 0);
      return { total, entries: sorted.map(([name, value], i) => ({ name, value, color: KILN_COLORS[i % KILN_COLORS.length] })) };
    }
  }, [data, activeFilter]);

  const displayData = chartData.entries.length > 0 ? chartData.entries : [{ name: 'Empty', value: 1, color: '#e5e7eb' }];

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card opacity-0 animate-fade-in h-full flex flex-col" style={{ animationDelay: "200ms" }}>
      {/* Header — title + tabs inline */}
      <div className="flex items-center justify-between mb-2 gap-1">
        <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider leading-tight flex-shrink-0 whitespace-nowrap">
          Process Ratio
        </h3>
        <div className="flex rounded-md border border-border overflow-hidden flex-shrink-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                activeFilter === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Donut */}
      <div className="relative h-[130px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={60}
              paddingAngle={chartData.entries.length > 1 ? 3 : 0}
              dataKey="value"
            >
              {displayData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              wrapperStyle={{ zIndex: 100 }}
              allowEscapeViewBox={{ x: false, y: false }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-foreground">{formatNumber(chartData.total)}</span>
          <span className="text-[9px] text-muted-foreground uppercase">Total</span>
        </div>
      </div>

      {/* Progress bar legend — scrollable if many, with tube bars like TypeRatio */}
      <div className="mt-2 space-y-1.5 max-h-[72px] overflow-y-auto pr-1 scrollbar-thin flex-shrink-0">
        {chartData.entries.map(d => {
          const pct = chartData.total > 0 ? ((d.value / chartData.total) * 100) : 0;
          return (
            <div key={d.name}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground truncate" title={d.name}>{d.name}</span>
                <span className="text-[10px] font-bold text-foreground flex-shrink-0">{pct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: d.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
