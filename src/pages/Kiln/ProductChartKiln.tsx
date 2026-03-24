import { useState, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CATEGORY_COLORS } from "./KilnDashboardStyles";
import type { KilnProductionRecord } from "./KilnDashboardStyles";
import { Maximize2, X, ChevronDown } from "lucide-react";

interface ProductChartKilnProps {
  data: KilnProductionRecord[];
}

// Helper: get ISO week label from date string 'yyyy-MM-dd'
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  // Get ISO week number
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `W${String(weekNum).padStart(2, '0')}`;
}

interface ChartPoint {
  label: string;
  sortKey: string;
  Biscuit: number;
  Glaze: number;
  Decal: number;
}

export function ProductChartKiln({ data }: ProductChartKilnProps) {
  const [selectedKiln, setSelectedKiln] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const kiln_options = useMemo(() => {
    const kilns = Array.from(new Set(data.map(r => r.kilnName))).sort();
    return ['All', ...kilns];
  }, [data]);

  const chartData = useMemo((): ChartPoint[] => {
    const filtered = selectedKiln === 'All' ? data : data.filter(r => r.kilnName === selectedKiln);
    const map = new Map<string, ChartPoint>();
    for (const r of filtered) {
      const key = viewMode === 'Monthly'
        ? r.trx_date.slice(0, 7)   // 'yyyy-MM'
        : getWeekLabel(r.trx_date); // 'W01'
      const sortKey = viewMode === 'Monthly'
        ? r.trx_date.slice(0, 7)
        : r.trx_date.slice(0, 7) + '-' + key; // keep month order for weeks
      const existing = map.get(key) || { label: key, sortKey, Biscuit: 0, Glaze: 0, Decal: 0 };
      existing[r.category] += r.qtyProc;
      if (!map.has(key)) map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [data, selectedKiln, viewMode]);

  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  const chartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          {['Biscuit', 'Glaze', 'Decal'].map(cat => (
            <linearGradient key={cat} id={`grad_${cat}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
          wrapperStyle={{ zIndex: 100 }}
          allowEscapeViewBox={{ x: false, y: false }}
        />
        <Legend
          verticalAlign="bottom"
          height={24}
          formatter={(value: string) => <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
        />
        {['Biscuit', 'Glaze', 'Decal'].map(cat => (
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLORS[cat]}
            strokeWidth={1.5}
            fill={`url(#grad_${cat})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  const modeToggle = (
    <div className="flex rounded-md border border-border overflow-hidden">
      {(['Weekly', 'Monthly'] as const).map(m => (
        <button
          key={m}
          onClick={() => setViewMode(m)}
          className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${viewMode === m
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
        >
          {m}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-5xl" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Production</h3>
                {modeToggle}
                <div className="relative">
                  <select
                    value={selectedKiln}
                    onChange={e => setSelectedKiln(e.target.value)}
                    title="เลือกเตา"
                    className="appearance-none pl-2.5 pr-6 py-1 text-xs font-medium rounded-md border border-border bg-muted text-foreground cursor-pointer focus:outline-none"
                  >
                    {kiln_options.map(k => <option key={k} value={k}>{k === 'All' ? '— All Kilns —' : k}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <button
                onClick={closeFullscreen}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="ปิด"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6" style={{ height: 'calc(90vh - 80px)' }}>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">ไม่มีข้อมูล</div>
              ) : chartContent}
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-4 flex flex-col shadow-card opacity-0 animate-fade-in h-full" style={{ animationDelay: "300ms", minHeight: '280px' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Production — <span className="text-primary normal-case font-semibold">{selectedKiln === 'All' ? 'All Kilns' : selectedKiln}</span>
          </h4>
          <div className="flex items-center gap-1.5">
            {modeToggle}
            <div className="relative">
              <select
                value={selectedKiln}
                onChange={e => setSelectedKiln(e.target.value)}
                title="เลือกเตา"
                className="appearance-none pl-2.5 pr-6 py-1 text-[10px] font-medium rounded-md border border-border bg-muted text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {kiln_options.map(k => <option key={k} value={k}>{k === 'All' ? '— All Kilns —' : k}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1 rounded-md bg-muted border border-border hover:bg-accent transition-colors"
              title="ขยายเต็มจอ"
            >
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex-1" style={{ minHeight: '140px' }}>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">ไม่มีข้อมูล</div>
          ) : chartContent}
        </div>
      </div>
    </>
  );
}
