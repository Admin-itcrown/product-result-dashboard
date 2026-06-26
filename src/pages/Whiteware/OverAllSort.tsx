import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    CalendarDays,
    CheckCircle2,
    Maximize2,
    Minimize2,
    Moon,
    Palette,
    RefreshCw,
    Sun,
    XCircle
} from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell
} from 'recharts';

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { getApiBaseUrl } from '@/lib/api';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig
} from "@/components/ui/chart";
import { applySortingModeFilter, applyPrefixAndUnitPrefixFilters, formatDisplayDate, getSortedPrefixes } from './components/sortdetailsHelpers';
import { getSortdetailsThemeClasses } from './components/themeStyles';
import type { SortingMode } from './components/sortdetailsConstants';
import type { DbItem } from './components/ProductionReport';
import type { IsoDateRange } from './sharedDateRange';
import './components/overAllSortLayout.css';
import './components/whitewareShared.css';

type CycleFilterValue = 'ALL' | '1ST' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
type PeriodValue = '7D' | '14D' | '1M' | '1Y';
type ExpandedChart = 'line' | 'pie' | null;

type TrendRow = {
    date: string;
    process: number;
    complete: number;
    reject: number;
    scrap: number;
};

type TopDefectItem = {
    reason: string;
    qty: number;
    percent: number;
};
//1
const applyMovingAverage = (rows: TrendRow[], windowSize: number): TrendRow[] => {
    if (windowSize <= 1 || rows.length <= 2) return rows;
    return rows.map((row, index) => {
        const start = Math.max(0, index - windowSize + 1);
        const slice = rows.slice(start, index + 1);
        const sum = slice.reduce(
            (acc, item) => {
                acc.process += item.process;
                acc.complete += item.complete;
                acc.reject += item.reject;
                acc.scrap += item.scrap;
                return acc;
            },
            { process: 0, complete: 0, reject: 0, scrap: 0 }
        );
        const div = slice.length || 1;
        return {
            date: row.date,
            process: Math.round(sum.process / div),
            complete: Math.round(sum.complete / div),
            reject: Math.round(sum.reject / div),
            scrap: Math.round(sum.scrap / div)
        };
    });
};

const toPercentStackRows = (rows: TrendRow[]): TrendRow[] => (
    rows.map((row) => {
        const total = Number(row.complete || 0) + Number(row.reject || 0) + Number(row.scrap || 0);
        if (total <= 0) {
            return { ...row, complete: 0, reject: 0, scrap: 0 };
        }
        return {
            ...row,
            complete: (Number(row.complete || 0) / total) * 100,
            reject: (Number(row.reject || 0) / total) * 100,
            scrap: (Number(row.scrap || 0) / total) * 100
        };
    })
);

const downsampleTrendRows = (rows: TrendRow[], maxPoints: number): TrendRow[] => {
    if (maxPoints <= 1) return rows.slice(0, 1);
    if (rows.length <= maxPoints) return rows;

    const lastIndex = rows.length - 1;
    const sampled = new Array<TrendRow>(maxPoints);
    for (let index = 0; index < maxPoints; index += 1) {
        const sampleIndex = Math.round((index * lastIndex) / (maxPoints - 1));
        sampled[index] = rows[sampleIndex];
    }

    const uniqueSampled = sampled.filter((row, index, items) => (
        index === 0 || row.date !== items[index - 1]?.date
    ));

    return uniqueSampled.length >= 2 ? uniqueSampled : rows.slice(0, maxPoints);
};

const CYCLE_FILTER_OPTIONS: { label: string; value: CycleFilterValue }[] = [
    { label: 'ALL', value: 'ALL' },
    { label: '1st', value: '1ST' },
    { label: 'P1', value: 'P1' },
    { label: 'P2', value: 'P2' },
    { label: 'P3', value: 'P3' },
    { label: 'P4', value: 'P4' },
    { label: 'P5', value: 'P5' }
];

const PERIOD_OPTIONS: { label: string; value: PeriodValue; days: number }[] = [
    { label: '7 days', value: '7D', days: 7 },
    { label: '14 days', value: '14D', days: 14 },
    { label: '1 month', value: '1M', days: 30 },
    { label: '1 year', value: '1Y', days: 365 }
];

const getInitialTheme = (): 'light' | 'dark' | 'japan' => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'japan') return savedTheme;
    return 'light';
};

const toIsoLocal = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getDateRangeByDays = (days: number): IsoDateRange => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    return { start: toIsoLocal(start), end: toIsoLocal(end) };
};

const normalizeCycle = (value?: string): string => String(value || '').trim().toUpperCase();

const normalizeUpperText = (value: unknown): string =>
    String(value ?? '').trim().toUpperCase();

const isReworkKilnRow = (row: DbItem): boolean => {
    const source = row as Record<string, unknown>;
    return normalizeUpperText(source.kiln ?? source.m_kiln) === 'REWORK';
};

const matchesCycleFilter = (cycleValue: string, selectedCycle: CycleFilterValue): boolean => {
    if (selectedCycle === 'ALL') return true;
    const normalized = normalizeCycle(cycleValue);
    if (selectedCycle === '1ST') return normalized === 'C' || normalized === '1ST';
    return normalized === selectedCycle;
};

const parseApiDate = (value?: string): string => String(value || '').split('T')[0];

const numberFormatter = new Intl.NumberFormat('en-US');
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatAxisDateShort = (dateString?: string): string => {
    if (!dateString) return '';
    // Handle week labels (สัปดาห์ที่X)
    if (dateString.startsWith('W')) return dateString;
    // Handle month labels (Jan/26)
    if (dateString.startsWith('M-')) {
        const [, yearStr, monthStr] = dateString.split('-');
        const monthIndex = Number(monthStr) - 1;
        const shortYear = String(yearStr).slice(-2);
        return `${MONTH_SHORT[monthIndex] || monthStr}/${shortYear}`;
    }
    const [year = '', month = '', day = ''] = String(dateString).split('-');
    const monthIndex = Number(month) - 1;
    const shortMonth = MONTH_SHORT[monthIndex] || month;
    const shortYear = year.slice(-2);
    return `${day}/${shortMonth}/${shortYear}`;
};

/** Get the week number within a month (1-based) for a given ISO date string */
const getWeekOfMonth = (isoDate: string): number => {
    const d = new Date(isoDate);
    const dayOfMonth = d.getDate();
    return Math.ceil(dayOfMonth / 7);
};

/** Get a month key like "M-2026-02" for grouping */
const getMonthKey = (isoDate: string): string => {
    const [year, month] = isoDate.split('-');
    return `M-${year}-${month}`;
};

const normalizeDefectReason = (value?: string): string => {
    const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
    return cleaned || 'Unspecified / Other';
};

const classifyDefectKind = (typeValue?: string, reasonValue?: string): 'SCRAP' | 'REJECT' | null => {
    const normalizedType = String(typeValue || '').trim().toUpperCase();
    const normalizedReason = String(reasonValue || '').trim();

    if (normalizedType.startsWith('C') || normalizedType.startsWith('D')) return 'SCRAP';
    if (normalizedType.startsWith('P') || normalizedReason.includes('เจียร์')) return 'REJECT';
    return null;
};

const OverAllSort = () => {
    const [theme, setTheme] = useState<'light' | 'dark' | 'japan'>(() => getInitialTheme());
    const [loading, setLoading] = useState<boolean>(false);
    const [rows, setRows] = useState<DbItem[]>([]);
    const [sortingMode, setSortingMode] = useState<SortingMode>('normal');
    const [selectedCycle, setSelectedCycle] = useState<CycleFilterValue>('ALL');
    const [selectedPrefix, setSelectedPrefix] = useState<string>('ALL');
    const [uniquePrefixes, setUniquePrefixes] = useState<string[]>([]);
    const [selectedUnitPrefix, setSelectedUnitPrefix] = useState<string>('ALL');
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>('7D');
    const [dateRange, setDateRange] = useState<IsoDateRange>(() => getDateRangeByDays(7));
    const [expandedChart, setExpandedChart] = useState<ExpandedChart>(null);

    const isDark = theme === 'dark';
    const isJapan = theme === 'japan';
    const sortdetailsTheme = getSortdetailsThemeClasses(theme);

    const toggleTheme = () => {
        setTheme((prev) => {
            const next = prev === 'light' ? 'dark' : (prev === 'dark' ? 'japan' : 'light');
            window.localStorage.setItem('theme', next);
            return next;
        });
    };

    useEffect(() => {
        if (!expandedChart) return;

        const previousOverflow = document.body.style.overflow;
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setExpandedChart(null);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEsc);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEsc);
        };
    }, [expandedChart]);

    useEffect(() => {
        const controller = new AbortController();
        let isCancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const apiBaseUrl = getApiBaseUrl();
                const res = await fetch(
                    `${apiBaseUrl}/api/production-report/summary?startDate=${dateRange.start}&endDate=${dateRange.end}`,
                    { signal: controller.signal }
                );
                if (!res.ok) throw new Error('API Error');
                const data: DbItem[] = await res.json();
                if (!isCancelled) setRows(data);
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('OverAllSort fetch error:', err);
                if (!isCancelled) setRows([]);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        fetchData();
        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [dateRange.end, dateRange.start]);

    // Compute unique prefixes when rows change
    useEffect(() => {
        const sortedPrefixes = getSortedPrefixes(rows);
        setUniquePrefixes(sortedPrefixes);
        if (sortedPrefixes.includes('142')) {
            setSelectedPrefix('142');
        } else if (sortedPrefixes.length > 0) {
            setSelectedPrefix(sortedPrefixes[0]);
        } else {
            setSelectedPrefix('ALL');
        }
    }, [rows]);

    const filteredByMode = useMemo(
        () => applySortingModeFilter(rows, sortingMode).filter((row) => !isReworkKilnRow(row)),
        [rows, sortingMode]
    );

    const filteredByPrefix = useMemo(
        () => applyPrefixAndUnitPrefixFilters(filteredByMode, selectedPrefix, selectedUnitPrefix),
        [filteredByMode, selectedPrefix, selectedUnitPrefix]
    );

    const filteredRows = useMemo(
        () => filteredByPrefix.filter((row) => matchesCycleFilter(String(row.cycle || ''), selectedCycle)),
        [filteredByPrefix, selectedCycle]
    );

    const totals = useMemo(() => {
        return filteredRows.reduce(
            (acc, row) => {
                acc.process += Number(row.process || 0);
                acc.complete += Number(row.complete || 0);
                acc.reject += Number(row.reject || 0);
                acc.scrap += Number(row.scrap || 0);
                return acc;
            },
            { process: 0, complete: 0, reject: 0, scrap: 0 }
        );
    }, [filteredRows]);
    const kpiPercentages = useMemo(() => {
        const base = Number(totals.process || 0);
        if (base <= 0) {
            return { complete: 0, reject: 0, scrap: 0 };
        }
        return {
            complete: (Number(totals.complete || 0) / base) * 100,
            reject: (Number(totals.reject || 0) / base) * 100,
            scrap: (Number(totals.scrap || 0) / base) * 100
        };
    }, [totals.complete, totals.process, totals.reject, totals.scrap]);
    const topDefectReasons = useMemo(() => {
        const scrapReasonQty = new Map<string, number>();
        const rejectReasonQty = new Map<string, number>();
        let totalScrapQty = 0;
        let totalRejectQty = 0;

        filteredRows.forEach((row) => {
            const defects = Array.isArray(row.defects)
                ? (row.defects as Array<{ type?: string; reason?: string; qty?: number }>)
                : [];
            defects.forEach((defect) => {
                const qty = Number(defect.qty || 0);
                if (qty <= 0) return;

                const kind = classifyDefectKind(defect.type, defect.reason);
                if (!kind) return;

                const reason = normalizeDefectReason(defect.reason);
                if (kind === 'SCRAP') {
                    scrapReasonQty.set(reason, (scrapReasonQty.get(reason) || 0) + qty);
                    totalScrapQty += qty;
                    return;
                }
                rejectReasonQty.set(reason, (rejectReasonQty.get(reason) || 0) + qty);
                totalRejectQty += qty;
            });
        });

        const toTop = (reasonQtyMap: Map<string, number>, totalQty: number): TopDefectItem[] => (
            Array.from(reasonQtyMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([reason, qty]) => ({
                    reason,
                    qty,
                    percent: totalQty > 0 ? (qty / totalQty) * 100 : 0
                }))
        );

        return {
            scrap: toTop(scrapReasonQty, totalScrapQty),
            reject: toTop(rejectReasonQty, totalRejectQty)
        };
    }, [filteredRows]);

    const pieColors = useMemo(
        () => (isJapan
            ? ['#2F4F4F', '#E9C46A', '#D64045']
            : ['#10b981', '#f59e0b', '#ef4444']),
        [isJapan]
    );

    const pieData = useMemo(
        () => [
            { name: 'Complete', value: totals.complete, color: pieColors[0] },
            { name: 'Reject', value: totals.reject, color: pieColors[1] },
            { name: 'Scrap', value: totals.scrap, color: pieColors[2] }
        ],
        [totals.complete, totals.reject, totals.scrap, pieColors]
    );
    const pieTotal = useMemo(
        () => pieData.reduce((sum, item) => sum + Number(item.value || 0), 0),
        [pieData]
    );
    const piePercentages = useMemo(
        () => pieData.map((item) => ({
            ...item,
            percent: pieTotal > 0 ? (Number(item.value || 0) / pieTotal) * 100 : 0
        })),
        [pieData, pieTotal]
    );
    const lineChartConfig = useMemo<ChartConfig>(() => ({
        complete: { label: 'Complete', color: 'hsl(168, 76%, 36%)' },
        reject: { label: 'Reject', color: 'hsl(36, 95%, 50%)' },
        scrap: { label: 'Scrap', color: 'hsl(0, 84%, 60%)' }
    }), []);

    const trendData = useMemo<TrendRow[]>(() => {
        if (selectedPeriod === '1Y') {
            // Group by month
            const byMonth = new Map<string, TrendRow>();
            filteredRows.forEach((row) => {
                const dateKey = parseApiDate(row.date);
                if (!dateKey) return;
                const monthKey = getMonthKey(dateKey);
                if (!byMonth.has(monthKey)) {
                    byMonth.set(monthKey, { date: monthKey, process: 0, complete: 0, reject: 0, scrap: 0 });
                }
                const current = byMonth.get(monthKey)!;
                current.process += Number(row.process || 0);
                current.complete += Number(row.complete || 0);
                current.reject += Number(row.reject || 0);
                current.scrap += Number(row.scrap || 0);
            });
            return Array.from(byMonth.values()).sort((a, b) => a.date.localeCompare(b.date));
        }
        if (selectedPeriod === '1M') {
            // Group by week of month
            const byWeek = new Map<string, TrendRow>();
            filteredRows.forEach((row) => {
                const dateKey = parseApiDate(row.date);
                if (!dateKey) return;
                const weekNum = getWeekOfMonth(dateKey);
                const weekKey = `Weekly ${weekNum}`;
                if (!byWeek.has(weekKey)) {
                    byWeek.set(weekKey, { date: weekKey, process: 0, complete: 0, reject: 0, scrap: 0 });
                }
                const current = byWeek.get(weekKey)!;
                current.process += Number(row.process || 0);
                current.complete += Number(row.complete || 0);
                current.reject += Number(row.reject || 0);
                current.scrap += Number(row.scrap || 0);
            });
            return Array.from(byWeek.values()).sort((a, b) => a.date.localeCompare(b.date));
        }
        // Default: group by day (7D, 14D)
        const byDate = new Map<string, TrendRow>();
        filteredRows.forEach((row) => {
            const dateKey = parseApiDate(row.date);
            if (!dateKey) return;
            if (!byDate.has(dateKey)) {
                byDate.set(dateKey, { date: dateKey, process: 0, complete: 0, reject: 0, scrap: 0 });
            }
            const current = byDate.get(dateKey)!;
            current.process += Number(row.process || 0);
            current.complete += Number(row.complete || 0);
            current.reject += Number(row.reject || 0);
            current.scrap += Number(row.scrap || 0);
        });
        return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredRows, selectedPeriod]);
    const smoothingWindow = useMemo(() => {
        if (selectedPeriod === '1Y') return 1;
        if (selectedPeriod === '1M') return 1;
        if (selectedPeriod === '14D') return 2;
        return 1;
    }, [selectedPeriod]);
    const smoothedTrendData = useMemo(
        () => applyMovingAverage(trendData, smoothingWindow),
        [trendData, smoothingWindow]
    );
    const stackedPercentTrendData = useMemo(
        () => toPercentStackRows(smoothedTrendData),
        [smoothedTrendData]
    );
    const roughTrendData = useMemo(
        () => downsampleTrendRows(stackedPercentTrendData, 8),
        [stackedPercentTrendData]
    );

    const periodLabel = useMemo(() => {
        const found = PERIOD_OPTIONS.find((option) => option.value === selectedPeriod);
        return found ? found.label : '7 days';
    }, [selectedPeriod]);

    const panelClass = isJapan
        ? 'bg-[#F3EAD3] border-[#8D6E63] text-[#3E2723]'
        : (isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900');
    const pieStatThemeClass = isJapan
        ? 'overall-sort-pie-stat-row--japan'
        : (isDark ? 'overall-sort-pie-stat-row--dark' : 'overall-sort-pie-stat-row--light');

    const renderLineChart = (heightClass: string) => (
        <ChartContainer config={lineChartConfig} className={`${heightClass} !aspect-auto w-full`}>
            <AreaChart data={stackedPercentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => formatAxisDateShort(value)}
                    tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    allowDecimals={false}
                    tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Math.round(Number(value))}%`}
                />
                <ChartTooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;

                        const order: Record<string, number> = { complete: 0, reject: 1, scrap: 2 };
                        const sortedPayload = [...payload].sort((a, b) => {
                            const keyA = String(a?.dataKey ?? a?.name ?? '').toLowerCase();
                            const keyB = String(b?.dataKey ?? b?.name ?? '').toLowerCase();
                            return (order[keyA] ?? 99) - (order[keyB] ?? 99);
                        });

                        return (
                            <div className="min-w-[15.5rem] rounded-xl bg-white border border-[hsl(214,32%,91%)] px-4 py-3 text-sm text-gray-900 shadow-lg">
                                <div className="text-[13px] font-semibold text-slate-500 mb-2">
                                    {formatDisplayDate(String(label || ''))}
                                </div>
                                {sortedPayload.map((item, idx) => {
                                    const seriesColor = String(item?.color || item?.payload?.fill || '#111827');
                                    const name = String(item?.name || item?.dataKey || '');
                                    const displayLabel = name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : name;
                                    const value = Number(item?.value || 0);

                                    return (
                                        <div key={`${displayLabel}-${idx}`} className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 py-0.5">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seriesColor }} />
                                            <span className="text-base font-semibold leading-none" style={{ color: seriesColor }}>
                                                {displayLabel}
                                            </span>
                                            <span className="text-base font-mono font-bold tabular-nums leading-none" style={{ color: seriesColor }}>
                                                {`${value.toFixed(1)}%`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" stackId="total" dataKey="scrap" stroke="var(--color-scrap)" strokeWidth={1.5} fill="var(--color-scrap)" fillOpacity={0.7} isAnimationActive={false} />
                <Area type="monotone" stackId="total" dataKey="reject" stroke="var(--color-reject)" strokeWidth={1.5} fill="var(--color-reject)" fillOpacity={0.7} isAnimationActive={false} />
                <Area type="monotone" stackId="total" dataKey="complete" stroke="var(--color-complete)" strokeWidth={1.5} fill="var(--color-complete)" fillOpacity={0.8} isAnimationActive={false} />
            </AreaChart>
        </ChartContainer>
    );

    const renderPiePercentLabel = ({
        cx = 0,
        cy = 0,
        midAngle = 0,
        outerRadius = 0,
        percent = 0
    }: {
        cx?: number;
        cy?: number;
        midAngle?: number;
        outerRadius?: number;
        percent?: number;
    }) => {
        if (percent <= 0) return null;
        const radian = Math.PI / 180;
        const labelRadius = Number(outerRadius) + 24;
        const x = Number(cx) + labelRadius * Math.cos(-Number(midAngle) * radian);
        const y = Number(cy) + labelRadius * Math.sin(-Number(midAngle) * radian);
        const textAnchor = x > Number(cx) ? 'start' : 'end';
        const textColor = isDark ? '#e5e7eb' : '#334155';

        return (
            <text
                x={x}
                y={y}
                fill={textColor}
                textAnchor={textAnchor}
                dominantBaseline="central"
                style={{ fontSize: '16px', fontWeight: 700 }}
            >
                {`${(Number(percent) * 100).toFixed(1)}%`}
            </text>
        );
    };

    const renderPieDonut = (
        innerRadius: number | string,
        outerRadius: number | string,
        showPercentLabels = false
    ) => (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={4}
                    label={showPercentLabels ? renderPiePercentLabel : false}
                    labelLine={showPercentLabels
                        ? { stroke: isDark ? '#9ca3af' : '#64748b', strokeWidth: 1.5 }
                        : false}
                    isAnimationActive={false}
                >
                    {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        const numericValue = Number(item?.value || 0);
                        const percent = pieTotal > 0 ? (numericValue / pieTotal) * 100 : 0;
                        const name = String(item?.name || item?.payload?.name || '');
                        const color = String(item?.color || item?.payload?.color || '#111827');

                        return (
                            <div className="overall-sort-pie-tooltip">
                                <span className="font-semibold" style={{ color }}>
                                    {name}
                                </span>
                                <span className="text-gray-900">
                                    {` : ${percent.toFixed(1)}%`}
                                </span>
                            </div>
                        );
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );

    const renderPieSummaryRows = (showPercent = true, colorPercentByType = true) => (
        <div className="overall-sort-pie-stats">
            {piePercentages.map((item) => (
                <div
                    key={item.name}
                    className={`overall-sort-pie-stat-row ${pieStatThemeClass} ${showPercent ? '' : 'overall-sort-pie-stat-row--no-value'}`}
                >
                    <div className="overall-sort-pie-stat-label">
                        <span className="overall-sort-pie-stat-dot" style={{ backgroundColor: item.color }} />
                        <span className="overall-sort-pie-stat-name">{item.name}</span>
                    </div>
                    {showPercent && (
                        <span className="overall-sort-pie-stat-value" style={colorPercentByType ? { color: item.color } : undefined}>
                            {item.percent.toFixed(1)}%
                        </span>
                    )}
                </div>
            ))}
        </div>
    );

    const renderPieChart = (heightClass: string, innerRadius: number, outerRadius: number) => (
        <div className={`${heightClass} overall-sort-pie-wrap`}>
            <div className="overall-sort-pie-chart-area">
                {renderPieDonut(innerRadius, outerRadius)}
            </div>
            {renderPieSummaryRows(true, false)}
        </div>
    );

    const renderExpandedPieChart = () => (
        <div className="overall-sort-expanded-pie-layout">
            <div className="overall-sort-expanded-top">
                <div className={`overall-sort-expanded-pie-panel ${panelClass}`}>
                    <div className="overall-sort-expanded-block-title">Pie Chart</div>
                    <div className="overall-sort-expanded-pie-canvas">
                        {renderPieDonut('40%', '62%')}
                    </div>
                </div>

                <div className={`overall-sort-expanded-top5-panel ${panelClass}`}>
                    <div className="overall-sort-expanded-block-title">Top 5 Scrap / Reject</div>
                    <div className="overall-sort-expanded-top5-grid">
                        <div className="overall-sort-expanded-top5-col">
                            <div className="overall-sort-expanded-top5-title overall-sort-expanded-top5-title-scrap">Top 5 Scrap</div>
                            <ol className="overall-sort-expanded-top5-list">
                                {topDefectReasons.scrap.length > 0 ? topDefectReasons.scrap.map((item, index) => (
                                    <li key={`scrap-${item.reason}-${index}`} className="overall-sort-expanded-top5-item">
                                        <span className="overall-sort-expanded-top5-rank">{index + 1}.</span>
                                        <span className="overall-sort-expanded-top5-reason">{item.reason}</span>
                                        <span className="overall-sort-expanded-top5-value">
                                            {numberFormatter.format(item.qty)} ({item.percent.toFixed(1)}%)
                                        </span>
                                    </li>
                                )) : (
                                    <li className="overall-sort-expanded-top5-empty">No scrap data</li>
                                )}
                            </ol>
                        </div>

                        <div className="overall-sort-expanded-top5-col">
                            <div className="overall-sort-expanded-top5-title overall-sort-expanded-top5-title-reject">Top 5 Reject</div>
                            <ol className="overall-sort-expanded-top5-list">
                                {topDefectReasons.reject.length > 0 ? topDefectReasons.reject.map((item, index) => (
                                    <li key={`reject-${item.reason}-${index}`} className="overall-sort-expanded-top5-item">
                                        <span className="overall-sort-expanded-top5-rank">{index + 1}.</span>
                                        <span className="overall-sort-expanded-top5-reason">{item.reason}</span>
                                        <span className="overall-sort-expanded-top5-value">
                                            {numberFormatter.format(item.qty)} ({item.percent.toFixed(1)}%)
                                        </span>
                                    </li>
                                )) : (
                                    <li className="overall-sort-expanded-top5-empty">No reject data</li>
                                )}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overall-sort-expanded-bottom-grid">
                <div className={`overall-sort-expanded-bottom overall-sort-expanded-summary ${panelClass}`}>
                    <div className="overall-sort-expanded-bottom-content">
                        {renderPieSummaryRows()}
                    </div>
                </div>

                <div className={`overall-sort-expanded-bottom overall-sort-expanded-rough ${panelClass}`}>
                    <div className="overall-sort-expanded-block-title">Rough Line Trend</div>
                    <div className="overall-sort-expanded-rough-canvas">
                        {roughTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={roughTrendData} margin={{ top: 6, right: 12, left: 4, bottom: 2 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(214, 32%, 91%)" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value: string) => formatAxisDateShort(value)}
                                        tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={12}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        ticks={[0, 50, 100]}
                                        allowDecimals={false}
                                        tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${Math.round(Number(value))}%`}
                                        width={48}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;

                                            return (
                                                <div className="overall-sort-pie-tooltip">
                                                    <div className="text-xs font-semibold text-slate-500 mb-1">
                                                        {formatDisplayDate(String(label || ''))}
                                                    </div>
                                                    {payload.map((item, index) => {
                                                        const name = String(item?.name || item?.dataKey || '');
                                                        const value = Number(item?.value || 0);
                                                        const color = String(item?.color || '#111827');
                                                        return (
                                                            <div key={`${name}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs py-0.5">
                                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                                                <span style={{ color }}>{name}</span>
                                                                <span className="font-semibold tabular-nums" style={{ color }}>
                                                                    {value.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Line type="linear" dataKey="complete" name="Complete" stroke={pieColors[0]} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                                    <Line type="linear" dataKey="reject" name="Reject" stroke={pieColors[1]} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                                    <Line type="linear" dataKey="scrap" name="Scrap" stroke={pieColors[2]} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="overall-sort-expanded-rough-empty">No trend data</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-background">
            <DashboardSidebar />
            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                <DashboardHeader />
                <main className={`flex-1 min-w-0 overflow-hidden flex flex-col relative transition-colors duration-500 ${sortdetailsTheme.mainSurface}`}>
                    <div className={`px-4 py-3 w-full shrink-0 border-b shadow-md transition-colors ${sortdetailsTheme.topBar}`}>
                        <div className="w-full flex flex-wrap items-center justify-between gap-3">
                            <h1 className="text-white text-xl font-bold flex items-center gap-2">
                                OverAllSort
                                <button onClick={toggleTheme} className="md:hidden p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    {isJapan ? <Palette className="w-5 h-5 text-[#D64045]" /> : (isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />)}
                                </button>
                            </h1>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${sortdetailsTheme.dateRangePanel}`}>
                                    <CalendarDays className={`w-4 h-4 ${sortdetailsTheme.dateIcon}`} />
                                    <select
                                        value={selectedPeriod}
                                        onChange={(event) => {
                                            const nextPeriod = event.target.value as PeriodValue;
                                            const nextOption = PERIOD_OPTIONS.find((option) => option.value === nextPeriod) || PERIOD_OPTIONS[0];
                                            setSelectedPeriod(nextPeriod);
                                            setDateRange(getDateRangeByDays(nextOption.days));
                                        }}
                                        className={`h-7 rounded-md border px-2 text-sm font-medium focus:outline-none ${isJapan
                                            ? 'border-[#C9B992] bg-[#F3EAD3] text-[#3E2723]'
                                            : (isDark
                                                ? 'border-gray-600 bg-gray-800 text-gray-100'
                                                : 'border-gray-300 bg-white text-gray-900')}`}
                                    >
                                        {PERIOD_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <span className={`${sortdetailsTheme.dateText} text-xs`}>
                                        {formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)}
                                    </span>
                                </div>

                                <button onClick={toggleTheme} className="hidden md:flex p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors" title="Toggle Theme: Light -> Dark -> Japan">
                                    {isJapan ? <Palette className="w-5 h-5 text-[#D64045]" /> : (isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />)}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- Filter Bar: Mode / Prefix / Clay --- */}
                    <div className={`whiteware-filter-bar ${sortdetailsTheme.filterBar}`}>
                        <div className="w-full whiteware-filter-row">
                            {/* Sorting Mode */}
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold ${sortdetailsTheme.filterLabel}`}>Mode:</span>
                                <button
                                    onClick={() => setSortingMode('normal')}
                                    className={`whiteware-filter-chip ${sortingMode === 'normal'
                                        ? (isJapan ? 'bg-[#E9C46A] text-[#3E2723] border-[#E9C46A] shadow-md' : (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-emerald-600 text-white border-emerald-600 shadow-md'))
                                        : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#E9C46A]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50'))
                                        }`}
                                >Normal</button>
                                <button
                                    onClick={() => setSortingMode('frit')}
                                    className={`whiteware-filter-chip ${sortingMode === 'frit'
                                        ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] border-[#D64045] shadow-md' : (isDark ? 'bg-orange-600 text-white border-orange-500 shadow-md' : 'bg-orange-600 text-white border-orange-600 shadow-md'))
                                        : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#D64045]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'))
                                        }`}
                                >Frit</button>
                            </div>

                            <div className={`whiteware-filter-divider ${sortdetailsTheme.filterDivider}`}></div>

                            {/* Prefix Filter */}
                            {uniquePrefixes.length > 0 && (
                                <>
                                    <div className="whiteware-filter-group">
                                        <span className={`text-xs font-semibold ${sortdetailsTheme.filterLabel}`}>Prefix:</span>
                                        {uniquePrefixes.map((prefix) => (
                                            <button
                                                key={prefix}
                                                onClick={() => setSelectedPrefix(prefix)}
                                                className={`whiteware-filter-chip ${selectedPrefix === prefix
                                                    ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] border-[#D64045] shadow-md' : (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-blue-600 text-white border-blue-600 shadow-md'))
                                                    : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#D64045]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'))
                                                    }`}
                                            >{prefix}</button>
                                        ))}
                                    </div>
                                    <div className={`whiteware-filter-divider ${sortdetailsTheme.filterDivider}`}></div>
                                </>
                            )}

                            {/* Clay Type Filter */}
                            <div className="whiteware-filter-group">
                                <span className={`text-xs font-semibold ${sortdetailsTheme.filterLabel}`}>Clay:</span>
                                <button
                                    onClick={() => setSelectedUnitPrefix('W5240')}
                                    className={`whiteware-filter-chip ${selectedUnitPrefix === 'W5240'
                                        ? (isJapan ? 'bg-[#E9C46A] text-[#3E2723] border-[#E9C46A] shadow-md' : (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-emerald-600 text-white border-emerald-600 shadow-md'))
                                        : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#E9C46A]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50'))
                                        }`}
                                >W5240 (ดินขาว)</button>
                                <button
                                    onClick={() => setSelectedUnitPrefix('W5241')}
                                    className={`whiteware-filter-chip ${selectedUnitPrefix === 'W5241'
                                        ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] border-[#D64045] shadow-md' : (isDark ? 'bg-orange-600 text-white border-orange-500 shadow-md' : 'bg-orange-600 text-white border-orange-600 shadow-md'))
                                        : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#D64045]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'))
                                        }`}
                                >W5241 (ดินดำ)</button>
                                <button
                                    onClick={() => setSelectedUnitPrefix('ALL')}
                                    className={`whiteware-filter-chip ${selectedUnitPrefix === 'ALL'
                                        ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] border-[#D64045] shadow-md' : (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-blue-600 text-white border-blue-600 shadow-md'))
                                        : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#D64045]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'))
                                        }`}
                                >ALL</button>
                            </div>
                        </div>
                    </div>

                    <div className={`overall-sort-content-area ${sortdetailsTheme.contentArea}`}>
                        <div className="overall-sort-content-stack">
                            {loading ? (
                                <div className={`overall-sort-loading-panel ${panelClass}`}>
                                    <div className="inline-flex items-center gap-2 font-semibold">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Loading data...
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="overall-sort-kpi-grid">
                                        <div className={`overall-sort-kpi-card ${panelClass}`}>
                                            <div className="overall-sort-kpi-title">Process</div>
                                            <div className="overall-sort-kpi-value">
                                                <Activity className="w-6 h-6 text-blue-500" />
                                                {numberFormatter.format(totals.process)}
                                            </div>
                                        </div>
                                        <div className={`overall-sort-kpi-card ${panelClass}`}>
                                            <div className="overall-sort-kpi-title-row">
                                                <div className="overall-sort-kpi-title overall-sort-kpi-title-complete">Complete</div>
                                                <span className="overall-sort-kpi-percent overall-sort-kpi-percent-complete">
                                                    {kpiPercentages.complete.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="overall-sort-kpi-value">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                {numberFormatter.format(totals.complete)}
                                            </div>
                                        </div>
                                        <div className={`overall-sort-kpi-card ${panelClass}`}>
                                            <div className="overall-sort-kpi-title-row">
                                                <div className="overall-sort-kpi-title overall-sort-kpi-title-reject">Reject</div>
                                                <span className="overall-sort-kpi-percent overall-sort-kpi-percent-reject">
                                                    {kpiPercentages.reject.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="overall-sort-kpi-value">
                                                <XCircle className="w-6 h-6 text-amber-500" />
                                                {numberFormatter.format(totals.reject)}
                                            </div>
                                        </div>
                                        <div className={`overall-sort-kpi-card ${panelClass}`}>
                                            <div className="overall-sort-kpi-title-row">
                                                <div className="overall-sort-kpi-title overall-sort-kpi-title-scrap">Scrap</div>
                                                <span className="overall-sort-kpi-percent overall-sort-kpi-percent-scrap">
                                                    {kpiPercentages.scrap.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="overall-sort-kpi-value">
                                                <XCircle className="w-6 h-6 text-red-500" />
                                                {numberFormatter.format(totals.scrap)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overall-sort-chart-grid">
                                        <div className={`overall-sort-chart-panel ${panelClass}`}>
                                            <div className="overall-sort-chart-header">
                                                <div className="font-semibold">
                                                    Daily 100% Stacked Area ({periodLabel}){smoothingWindow > 1 ? ` - ${smoothingWindow}D MA` : ''}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedChart('line')}
                                                    className="overall-sort-icon-button"
                                                    title="Expand stacked area chart"
                                                    aria-label="Expand stacked area chart"
                                                >
                                                    <Maximize2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="overall-sort-chart-body">
                                                {renderLineChart('h-full w-full')}
                                            </div>
                                        </div>

                                        <div className={`overall-sort-chart-panel ${panelClass}`}>
                                            <div className="overall-sort-chart-header">
                                                <div className="font-semibold">สัดส่วนโดยรวม</div>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedChart('pie')}
                                                    className="overall-sort-icon-button"
                                                    title="Expand pie chart"
                                                    aria-label="Expand pie chart"
                                                >
                                                    <Maximize2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="overall-sort-chart-body">
                                                {renderPieChart('h-full w-full min-h-[200px]', 60, 90)}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {expandedChart && (
                        <div
                            className="overall-sort-modal-overlay"
                            onClick={() => setExpandedChart(null)}
                        >
                            <div
                                className={`overall-sort-modal-panel ${panelClass}`}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="overall-sort-modal-header">
                                    <div className="font-semibold">
                                        {expandedChart === 'line'
                                            ? `Daily 100% Stacked Area (${periodLabel})${smoothingWindow > 1 ? ` - ${smoothingWindow}D MA` : ''}`
                                            : 'สัดส่วนโดยรวม'}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedChart(null)}
                                        className="overall-sort-icon-button"
                                        title="Exit full screen"
                                        aria-label="Exit full screen"
                                    >
                                        <Minimize2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="overall-sort-modal-body">
                                    {expandedChart === 'line'
                                        ? renderLineChart('h-full')
                                        : renderExpandedPieChart()}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`whiteware-bottom-tabs-bar ${sortdetailsTheme.bottomTabsBar}`}>
                        <div className="w-full whiteware-bottom-tabs-wrap">
                            {CYCLE_FILTER_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelectedCycle(option.value)}
                                    className={`whiteware-filter-chip ${selectedCycle === option.value
                                        ? (isJapan
                                            ? 'bg-[#D64045] text-[#F3EAD3] border-[#D64045] shadow-md'
                                            : (isDark
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                                : 'bg-blue-600 text-white border-blue-600 shadow-md'))
                                        : (isJapan
                                            ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#D64045]/30'
                                            : (isDark
                                                ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'))
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OverAllSort;
