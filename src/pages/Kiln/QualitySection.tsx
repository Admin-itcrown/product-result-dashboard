import { useState, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { QualityKpiCard } from "./StatCardKiln";
import { ProductTableKiln } from "./ProductTableKiln";
import type { QualityRecord, WeeklyQualityRecord, QualityKilnMetrics } from "./KilnDashboardStyles";
import { QUALITY_COLORS } from "./KilnDashboardStyles";
import { Maximize2, X, ChevronDown } from "lucide-react";

interface QualitySectionProps {
    rawData: QualityRecord[];
    weeklyData: WeeklyQualityRecord[];
}

const CP_TABS = ['All', 'C', 'P1', 'P2'] as const;

function aggregateByKiln(records: QualityRecord[]): QualityKilnMetrics[] {
    const map = new Map<string, { qtyp: number; comp: number; scrp: number; rjct: number }>();
    for (const r of records) {
        const existing = map.get(r.m_kiln);
        if (existing) {
            existing.qtyp += r.totalQtyp;
            existing.comp += r.totalQtycomp;
            existing.scrp += r.totalScrap;
            existing.rjct += r.totalReject;
        } else {
            map.set(r.m_kiln, { qtyp: r.totalQtyp, comp: r.totalQtycomp, scrp: r.totalScrap, rjct: r.totalReject });
        }
    }
    return Array.from(map.entries()).map(([name, v]) => ({
        m_kiln: name,
        totalQtyp: v.qtyp,
        totalQtycomp: v.comp,
        totalScrap: v.scrp,
        totalReject: v.rjct,
        compRate: v.qtyp > 0 ? (v.comp / v.qtyp) * 100 : 0,
        scrapRate: v.qtyp > 0 ? (v.scrp / v.qtyp) * 100 : 0,
        rejectRate: v.qtyp > 0 ? (v.rjct / v.qtyp) * 100 : 0,
    }));
}

// ─── Quality Trend Chart Component ───
interface TrendChartProps {
    data: WeeklyQualityRecord[];
    kiln: string;  // 'All' or kiln name
    viewMode: 'Weekly' | 'Monthly';
    isFullscreen?: boolean;
}

interface DayPoint { date: string; compRate: number; scrapRate: number; rejectRate: number; }

function buildChartPoints(data: WeeklyQualityRecord[], kiln: string, viewMode: 'Weekly' | 'Monthly'): DayPoint[] {
    const filtered = kiln === 'All' ? data : data.filter(r => r.m_kiln === kiln);
    const groupMap = new Map<string, { qtyp: number; comp: number; scrp: number; rjct: number }>();
    for (const r of filtered) {
        // Group key: daily date for Weekly view, yyyy-MM for Monthly view
        const key = viewMode === 'Monthly' ? r.trx_date.slice(0, 7) : r.trx_date;
        const d = groupMap.get(key) ?? { qtyp: 0, comp: 0, scrp: 0, rjct: 0 };
        d.qtyp += r.totalQtyp;
        d.comp += r.totalQtycomp;
        d.scrp += r.totalScrap;
        d.rjct += r.totalReject;
        groupMap.set(key, d);
    }
    const entries = Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    // For weekly view show last 28 days, for monthly show all
    const sliced = viewMode === 'Weekly' ? entries.slice(-28) : entries;
    return sliced.map(([date, d]) => ({
        date: viewMode === 'Monthly' ? date : date.slice(5),   // yyyy-MM or MM-DD
        compRate: d.qtyp > 0 ? parseFloat(((d.comp / d.qtyp) * 100).toFixed(1)) : 0,
        scrapRate: d.qtyp > 0 ? parseFloat(((d.scrp / d.qtyp) * 100).toFixed(1)) : 0,
        rejectRate: d.qtyp > 0 ? parseFloat(((d.rjct / d.qtyp) * 100).toFixed(1)) : 0,
    }));
}

function TrendChart({ data, kiln, viewMode, isFullscreen }: TrendChartProps) {
    const points = useMemo(() => buildChartPoints(data, kiln, viewMode), [data, kiln, viewMode]);
    const chartH = isFullscreen ? '100%' : '100%';

    if (points.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                ไม่มีข้อมูล
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={chartH}>
            <AreaChart data={points} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                    <linearGradient id="gcomp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={QUALITY_COLORS.complete} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={QUALITY_COLORS.complete} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gscrp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={QUALITY_COLORS.scrap} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={QUALITY_COLORS.scrap} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grjct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={QUALITY_COLORS.reject} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={QUALITY_COLORS.reject} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval={isFullscreen ? 0 : 3}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, 100]}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                    }}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    wrapperStyle={{ zIndex: 100 }}
                    allowEscapeViewBox={{ x: false, y: false }}
                />
                <Legend
                    verticalAlign="bottom"
                    height={22}
                    formatter={(value: string) => <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                />
                <Area type="monotoneX" dataKey="compRate" name="Complete" stroke={QUALITY_COLORS.complete} strokeWidth={1.5} fill="url(#gcomp)" />
                <Area type="monotoneX" dataKey="scrapRate" name="Scrap" stroke={QUALITY_COLORS.scrap} strokeWidth={1.5} fill="url(#gscrp)" />
                <Area type="monotoneX" dataKey="rejectRate" name="Reject" stroke={QUALITY_COLORS.reject} strokeWidth={1.5} fill="url(#grjct)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ─── Main Export ───
export function QualitySection({ rawData, weeklyData }: QualitySectionProps) {
    const [cpFilter, setCpFilter] = useState<string>('C');
    const [selectedKiln, setSelectedKiln] = useState<string>('All');
    const [trendViewMode, setTrendViewMode] = useState<'Weekly' | 'Monthly'>('Weekly');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const filteredWeekly = useMemo(() => {
        if (cpFilter === 'All') return weeklyData;
        return weeklyData.filter(r => {
            if (cpFilter === 'C') return r.computed_cp === 'C' || r.computed_cp === 'Cs';
            return r.computed_cp === cpFilter;
        });
    }, [weeklyData, cpFilter]);

    const kiln_options = useMemo(() => {
        const kilns = Array.from(new Set(weeklyData.map(r => r.m_kiln))).sort();
        return ['All', ...kilns];
    }, [weeklyData]);

    const filtered = useMemo(() => {
        if (cpFilter === 'All') return rawData;
        return rawData.filter(r => {
            if (cpFilter === 'C') return r.computed_cp === 'C' || r.computed_cp === 'Cs';
            return r.computed_cp === cpFilter;
        });
    }, [rawData, cpFilter]);

    const overallMetrics = useMemo(() => {
        let qtyp = 0, comp = 0, scrp = 0, rjct = 0;
        for (const r of filtered) { qtyp += r.totalQtyp; comp += r.totalQtycomp; scrp += r.totalScrap; rjct += r.totalReject; }
        return {
            compRate: qtyp > 0 ? ((comp / qtyp) * 100).toFixed(1) : '0.0',
            scrapRate: qtyp > 0 ? ((scrp / qtyp) * 100).toFixed(1) : '0.0',
            rejectRate: qtyp > 0 ? ((rjct / qtyp) * 100).toFixed(1) : '0.0',
        };
    }, [filtered]);

    const wwMetrics = useMemo(() => aggregateByKiln(filtered.filter(r => r.wareType === 'WW')), [filtered]);
    const dwMetrics = useMemo(() => aggregateByKiln(filtered.filter(r => r.wareType === 'DW')), [filtered]);

    const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

    const modeToggle = (
        <div className="flex rounded-md border border-border overflow-hidden">
            {(['Weekly', 'Monthly'] as const).map(m => (
                <button
                    key={m}
                    onClick={() => setTrendViewMode(m)}
                    className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${trendViewMode === m
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                >
                    {m}
                </button>
            ))}
        </div>
    );

    const chartCard = (
        <div className="bg-card rounded-lg border border-border p-4 shadow-card flex-1 min-w-0 flex flex-col" style={{ minHeight: '220px' }}>
            <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Quality Trend — <span className="text-primary normal-case font-semibold">{selectedKiln === 'All' ? 'All Kilns' : selectedKiln}</span>
                </h4>
                <div className="flex items-center gap-1.5">
                    {modeToggle}
                    {/* Kiln Dropdown */}
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
                    {/* Fullscreen */}
                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="p-1 rounded-md bg-muted border border-border hover:bg-accent transition-colors"
                        title="ขยายเต็มจอ"
                    >
                        <Maximize2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                </div>
            </div>
            <div className="flex-1" style={{ minHeight: '170px' }}>
                <TrendChart data={filteredWeekly} kiln={selectedKiln} viewMode={trendViewMode} />
            </div>
        </div>
    );

    return (
        <>
            {/* ─── Fullscreen Modal ─── */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-5xl" style={{ maxHeight: '90vh' }}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Quality Trend</h3>
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
                        {/* Chart Area */}
                        <div className="p-6" style={{ height: 'calc(90vh - 80px)' }}>
                            <TrendChart data={filteredWeekly} kiln={selectedKiln} viewMode={trendViewMode} isFullscreen />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {/* Row 1: CP Filter + KPI Cards + Weekly Chart */}
                <div className="flex gap-3">
                    {/* CP Tabs (vertical left column) */}
                    <div className="flex flex-col gap-1 flex-shrink-0 bg-card border border-border rounded-lg p-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">CP</span>
                        {CP_TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setCpFilter(tab)}
                                className={cn(
                                    "px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap",
                                    cpFilter === tab
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Right side: KPI cards (compact) + chart */}
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                        {/* KPI Cards — compact row */}
                        <div className="grid grid-cols-3 gap-2">
                            <QualityKpiCard label="Complete Rate" value={overallMetrics.compRate} subtitle="YTD Average" type="complete" delay={100} />
                            <QualityKpiCard label="Scrap Rate" value={overallMetrics.scrapRate} subtitle="YTD Average" type="scrap" delay={150} />
                            <QualityKpiCard label="Reject Rate" value={overallMetrics.rejectRate} subtitle="YTD Average" type="reject" delay={200} />
                        </div>

                        {/* Weekly Trend chart */}
                        {chartCard}
                    </div>
                </div>

                {/* Row 2: Top 3 Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ProductTableKiln title="White Ware" titleColor="#3b82f6" kilnMetrics={wwMetrics} delay={250} />
                    <ProductTableKiln title="Decorated Ware" titleColor="#f97316" kilnMetrics={dwMetrics} delay={300} />
                </div>
            </div>
        </>
    );
}
