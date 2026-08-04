import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Check, Moon, Palette, Sun } from 'lucide-react';

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import AdvancedSearch from './components/AdvancedSearch';
import { buildTokenIndex, searchByTokens } from '../../utils/searchUtils';
import { applySortingModeFilter, applyPrefixAndUnitPrefixFilters, formatDisplayDate, getSortedPrefixes } from './components/sortdetailsHelpers';
import type { SortingMode } from './components/sortdetailsConstants';
import { getSortdetailsThemeClasses } from './components/themeStyles';
import './components/whitewareShared.css';
import {
    formatLocalDateToIso,
    getDatePickerClassNames,
    getDatePickerPanelClass,
    getEmptyDateRange,
    getTodayDateRange,
    parseIsoDateToLocal,
    type IsoDateRange
} from './sharedDateRange';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { getApiBaseUrl } from '@/lib/api';

type SortColourRow = {
    id?: string;
    date?: string;
    mDoc?: string;
    itemId?: string;
    job?: string;
    detail1?: string;
    detail2?: string;
    line?: string;
    kiln?: string;
    unit?: string;
    cycle?: string;
    process?: number;
    complete?: number;
    scrap?: number;
    reject?: number;
    qtyp?: number | string;
    qtycomp?: number | string;
    qtyscrp?: number | string;
    qtyrjct?: number | string;
    defects?: SortColourDefect[];
    [key: string]: unknown;
};

type SortColourDefect = {
    type?: string;
    reason?: string;
    qty?: number;
};

type TopReasonItem = {
    reason: string;
    qty: number;
    percent: number;
};

type SortColourGroupedRow = {
    groupKey: string;
    date: string;
    dateCount: number;
    dates: string[];
    detail1: string;
    itemId: string;
    unit: string;
    cycle: string;
    qtyp: number;
    qtycomp: number;
    qtyscrp: number;
    qtyrjct: number;
    mKiln: string;
    mJob: string;
    ptDesc2: string;
    mLine: string;
    rowCount: number;
    topScrapReasons: TopReasonItem[];
    topRejectReasons: TopReasonItem[];
    rawRows: SortColourRow[];
};

const numberFormatter = new Intl.NumberFormat('en-US');

const CYCLE_FILTER_OPTIONS = [
    { label: 'ALL', value: 'ALL' },
    { label: '1st', value: '1ST' },
    { label: 'P1', value: 'P1' },
    { label: 'P2', value: 'P2' },
    { label: 'P3', value: 'P3' },
    { label: 'P4', value: 'P4' },
    { label: 'P5', value: 'P5' }
] as const;

type CycleFilterValue = (typeof CYCLE_FILTER_OPTIONS)[number]['value'];

const getInitialTheme = (): 'light' | 'dark' | 'japan' => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'japan') return savedTheme;
    return 'light';
};

const normalizeCycle = (value?: string): string => String(value || '').trim().toUpperCase();

const normalizeUpperText = (value: unknown): string =>
    String(value ?? '').trim().toUpperCase();

const isReworkKilnRow = (row: SortColourRow): boolean => {
    const source = row as Record<string, unknown>;
    return normalizeUpperText(source.kiln ?? source.m_kiln) === 'REWORK';
};

const matchesCycleFilter = (cycleValue: string, selectedCycle: CycleFilterValue): boolean => {
    if (selectedCycle === 'ALL') return true;
    const normalized = normalizeCycle(cycleValue);
    if (selectedCycle === '1ST') {
        return normalized === 'C' || normalized === '1ST';
    }
    return normalized === selectedCycle;
};

const classifyDefectType = (type?: string): 'SCRAP' | 'REJECT' | null => {
    const normalized = String(type || '').trim().toUpperCase();
    if (!normalized) return null;

    if (normalized.startsWith('C') || normalized.startsWith('D')) {
        return 'SCRAP';
    }
    if (normalized.startsWith('P') || normalized.includes('เจียร์')) {
        return 'REJECT';
    }
    return null;
};

const formatTopReasons = (reasonQtyMap: Map<string, number>, limit = 2): TopReasonItem[] => {
    if (reasonQtyMap.size === 0) return [];
    const totalQty = Array.from(reasonQtyMap.values()).reduce((sum, qty) => sum + Number(qty || 0), 0);
    return Array.from(reasonQtyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([reason, qty]) => ({
            reason,
            qty: Number(qty || 0),
            percent: totalQty > 0 ? (Number(qty || 0) / totalQty) * 100 : 0
        }));
};

const getTopReasonsFromDefects = (
    defects: SortColourDefect[] | undefined,
    kind: 'SCRAP' | 'REJECT',
    limit = 2
): TopReasonItem[] => {
    const reasonQtyMap = new Map<string, number>();
    (defects || []).forEach((defect) => {
        const defectType = classifyDefectType(defect.type);
        if (defectType !== kind) return;

        const reason = sanitizeReasonText(String(defect.reason || 'Unspecified / Other'));
        const qty = Number(defect.qty || 0);
        if (qty <= 0) return;
        reasonQtyMap.set(reason, (reasonQtyMap.get(reason) || 0) + qty);
    });
    return formatTopReasons(reasonQtyMap, limit);
};

const getFirstPresentValue = (row: SortColourRow, keys: string[]): string => {
    const source = row as Record<string, unknown>;
    for (const key of keys) {
        const raw = source[key];
        const normalized = String(raw ?? '').trim();
        if (normalized) return normalized;
    }
    return '-';
};

const getFirstPresentNumber = (row: SortColourRow, keys: string[]): number => {
    const source = row as Record<string, unknown>;
    for (const key of keys) {
        const raw = source[key];
        if (raw === null || raw === undefined || raw === '') continue;
        const normalized = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
        if (Number.isFinite(normalized)) return Number(normalized);
    }
    return 0;
};

const formatPercentFromTotal = (value: number, total: number): string => {
    const numerator = Number(value || 0);
    const denominator = Number(total || 0);
    if (denominator <= 0) return '0%';
    return `${Math.round((numerator / denominator) * 100)}%`;
};

const toIsoDateString = (value?: string): string => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';

    const datePart = normalized.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatShortDate = (value?: string): string => {
    const iso = toIsoDateString(value);
    if (!iso) return '-';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
};

const formatDateToDayMonthYear = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
};

const sanitizeReasonText = (reason: string): string => {
    const normalized = reason.replace(/\s+/g, ' ').trim();
    const withoutMarkers = normalized
        .replace(/\b[CDJP]\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s\-|,.:;]+|[\s\-|,.:;]+$/g, '')
        .trim();
    return withoutMarkers || 'Unspecified / Other';
};

const SortColour = () => {
    const [tokenQuery, setTokenQuery] = useState<string>('');
    const [resultCount, setResultCount] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [allTokens, setAllTokens] = useState<string[]>([]);
    const [tokenIndex, setTokenIndex] = useState<Map<string, Set<number>>>(new Map());
    const [rows, setRows] = useState<SortColourRow[]>([]);
    const [resultRows, setResultRows] = useState<SortColourRow[]>([]);
    const [dateRange, setDateRange] = useState<IsoDateRange>(() => getEmptyDateRange());
    const [dateRangeDraft, setDateRangeDraft] = useState<IsoDateRange>(() => getTodayDateRange());
    const [startCalendarOpen, setStartCalendarOpen] = useState<boolean>(false);
    const [endCalendarOpen, setEndCalendarOpen] = useState<boolean>(false);
    const [theme, setTheme] = useState<'light' | 'dark' | 'japan'>(() => getInitialTheme());
    const [selectedCycleFilter, setSelectedCycleFilter] = useState<CycleFilterValue>('ALL');
    const [selectedPrefix, setSelectedPrefix] = useState<string>('ALL');
    const [uniquePrefixes, setUniquePrefixes] = useState<string[]>([]);
    const [selectedUnitPrefix, setSelectedUnitPrefix] = useState<string>('ALL');
    const [sortingMode, setSortingMode] = useState<SortingMode>('normal');
    const [selectedGroup, setSelectedGroup] = useState<SortColourGroupedRow | null>(null);

    const isDark = theme === 'dark';
    const isJapan = theme === 'japan';
    const sortdetailsTheme = getSortdetailsThemeClasses(theme);

    const isDateRangeDirty = dateRangeDraft.start !== dateRange.start || dateRangeDraft.end !== dateRange.end;
    const isDateRangeComplete = Boolean(dateRangeDraft.start && dateRangeDraft.end);
    const isDateRangeValid = isDateRangeComplete && dateRangeDraft.start <= dateRangeDraft.end;
    const canApplyDateRange = isDateRangeDirty && isDateRangeValid && !loading;
    const hasLoadedData = rows.length > 0;

    const toggleTheme = () => {
        setTheme((prev) => {
            const next = prev === 'light' ? 'dark' : (prev === 'dark' ? 'japan' : 'light');
            window.localStorage.setItem('theme', next);
            return next;
        });
    };

    const applyDateRange = useCallback(() => {
        if (!isDateRangeComplete) return;
        if (dateRangeDraft.start > dateRangeDraft.end) return;
        setDateRange({ ...dateRangeDraft });
    }, [dateRangeDraft, isDateRangeComplete]);

    // Auto-apply date range when both dates are selected
    useEffect(() => {
        if (!isDateRangeComplete) return;
        if (dateRangeDraft.start > dateRangeDraft.end) return;
        setDateRange({ ...dateRangeDraft });
    }, [dateRangeDraft, isDateRangeComplete]);

    const handleStartDateSelect = useCallback((date?: Date) => {
        if (!date) return;
        setDateRangeDraft((prev) => ({ ...prev, start: formatLocalDateToIso(date) }));
        setStartCalendarOpen(false);
    }, []);

    const handleEndDateSelect = useCallback((date?: Date) => {
        if (!date) return;
        setDateRangeDraft((prev) => ({ ...prev, end: formatLocalDateToIso(date) }));
        setEndCalendarOpen(false);
    }, []);

    const datePickerPanelClass = getDatePickerPanelClass({ isDark, isJapan });
    const datePickerClassNames = useMemo(
        () => getDatePickerClassNames({ isDark, isJapan }),
        [isDark, isJapan]
    );

    useEffect(() => {
        if (!dateRange.start || !dateRange.end) return;

        const controller = new AbortController();
        let isCancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const apiBaseUrl = (getApiBaseUrl() || 'http://localhost:3001').replace(/\/$/, '');
                const res = await fetch(
                    `${apiBaseUrl}/api/production-report/summary?startDate=${dateRange.start}&endDate=${dateRange.end}`,
                    { signal: controller.signal }
                );
                if (!res.ok) throw new Error('API Error');

                const data: SortColourRow[] = await res.json();
                if (isCancelled) return;

                setRows(data);
                setResultRows(data);
                setResultCount(data.length);
                setSelectedCycleFilter('ALL');
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('SortColour fetch error:', err);
                if (!isCancelled) {
                    setRows([]);
                    setResultRows([]);
                    setResultCount(null);
                    setAllTokens([]);
                    setTokenIndex(new Map());
                }
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => fetchData(), 300);
        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [dateRange.start, dateRange.end]);

    // Compute unique prefixes when rows change
    useEffect(() => {
        const rowsForPrefix = rows.filter((row) => !isReworkKilnRow(row));
        const sortedPrefixes = getSortedPrefixes(rowsForPrefix as any);
        setUniquePrefixes(sortedPrefixes);
        if (sortedPrefixes.includes('142')) {
            setSelectedPrefix('142');
        } else if (sortedPrefixes.length > 0) {
            setSelectedPrefix(sortedPrefixes[0]);
        } else {
            setSelectedPrefix('ALL');
        }
    }, [rows]);

    const rowsByMode = useMemo(() => (
        (applySortingModeFilter(rows as any, sortingMode) as SortColourRow[])
            .filter((row) => !isReworkKilnRow(row))
    ), [rows, sortingMode]);

    const rowsByPrefix = useMemo(() => (
        applyPrefixAndUnitPrefixFilters(rowsByMode as any, selectedPrefix, selectedUnitPrefix) as SortColourRow[]
    ), [rowsByMode, selectedPrefix, selectedUnitPrefix]);

    const rowsByCycle = useMemo(() => (
        rowsByPrefix.filter((row) => matchesCycleFilter(String(row.cycle || ''), selectedCycleFilter))
    ), [rowsByPrefix, selectedCycleFilter]);

    useEffect(() => {
        const { allTokens: tokens, tokenToRows: index } = buildTokenIndex(rowsByCycle);
        setAllTokens(tokens);
        setTokenIndex(index);
    }, [rowsByCycle]);

    const runTokenFilter = useCallback((query: string) => {
        if (!query.trim()) {
            // Show all data from current cycle when search is empty
            setResultRows(rowsByCycle);
            setResultCount(rowsByCycle.length);
            return;
        }

        const filtered = searchByTokens(query, tokenIndex, rowsByCycle);
        setResultCount(filtered.length);
        setResultRows(filtered);
    }, [rowsByCycle, tokenIndex]);

    const handleTokenSearch = (query: string) => {
        runTokenFilter(query);
    };

    useEffect(() => {
        runTokenFilter(tokenQuery);
    }, [tokenQuery, runTokenFilter]);

    useEffect(() => {
        if (!selectedGroup) return;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSelectedGroup(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [selectedGroup]);

    const groupedResultRows = useMemo<SortColourGroupedRow[]>(() => {
        const groups = new Map<string, {
            first: SortColourRow;
            count: number;
            dates: Set<string>;
            parts: Set<string>;
            units: Set<string>;
            mJobs: Set<string>;
            ptDesc2s: Set<string>;
            mLines: Set<string>;
            mKilns: Set<string>;
            qtypTotal: number;
            qtycompTotal: number;
            qtyscrpTotal: number;
            qtyrjctTotal: number;
            scrapReasonQty: Map<string, number>;
            rejectReasonQty: Map<string, number>;
            rows: SortColourRow[];
        }>();

        const addIfPresent = (target: Set<string>, value?: string) => {
            const normalized = String(value || '').trim();
            if (normalized) target.add(normalized);
        };

        resultRows.forEach((row) => {
            const model = String(row.detail1 || '-').trim();
            const cycle = String(row.cycle || '-').trim();
            const groupKey = `${model.toUpperCase()}__${cycle.toUpperCase()}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    first: row,
                    count: 0,
                    dates: new Set<string>(),
                    parts: new Set<string>(),
                    units: new Set<string>(),
                    mJobs: new Set<string>(),
                    ptDesc2s: new Set<string>(),
                    mLines: new Set<string>(),
                    mKilns: new Set<string>(),
                    qtypTotal: 0,
                    qtycompTotal: 0,
                    qtyscrpTotal: 0,
                    qtyrjctTotal: 0,
                    scrapReasonQty: new Map<string, number>(),
                    rejectReasonQty: new Map<string, number>(),
                    rows: []
                });
            }

            const current = groups.get(groupKey)!;
            current.count += 1;
            addIfPresent(current.dates, row.date);
            addIfPresent(current.parts, row.itemId);
            addIfPresent(current.units, row.unit);
            addIfPresent(current.mJobs, getFirstPresentValue(row, ['m_job', 'job', 'mJob']));
            addIfPresent(current.ptDesc2s, getFirstPresentValue(row, ['pt_desc2', 'detail2', 'ptDesc2']));
            addIfPresent(current.mLines, getFirstPresentValue(row, ['m_line', 'line', 'mLine']));
            addIfPresent(current.mKilns, getFirstPresentValue(row, ['m_kiln', 'kiln', 'mKiln']));
            current.qtypTotal += getFirstPresentNumber(row, ['qtyp', 'process']);
            current.qtycompTotal += getFirstPresentNumber(row, ['qtycomp', 'complete']);
            current.qtyscrpTotal += getFirstPresentNumber(row, ['qtyscrp', 'scrap']);
            current.qtyrjctTotal += getFirstPresentNumber(row, ['qtyrjct', 'reject']);
            current.rows.push(row);

            (row.defects || []).forEach((defect) => {
                const defectType = classifyDefectType(defect.type);
                if (!defectType) return;

                const reason = sanitizeReasonText(String(defect.reason || 'Unspecified / Other'));
                const qty = Number(defect.qty || 0);
                if (qty <= 0) return;

                const targetMap = defectType === 'SCRAP' ? current.scrapReasonQty : current.rejectReasonQty;
                targetMap.set(reason, (targetMap.get(reason) || 0) + qty);
            });
        });

        const formatSummary = (values: Set<string>, pluralLabel: string): string => {
            const list = Array.from(values);
            if (list.length === 0) return '-';
            if (list.length === 1) return list[0];
            return `${list.length} ${pluralLabel}`;
        };

        return Array.from(groups.entries()).map(([groupKey, group]) => {
            const first = group.first;
            const dateList = Array.from(group.dates).sort((a, b) => a.localeCompare(b));
            return {
                groupKey,
                date: formatSummary(group.dates, 'dates'),
                dateCount: group.dates.size,
                dates: dateList,
                detail1: String(first.detail1 || '-').trim() || '-',
                itemId: formatSummary(group.parts, 'parts'),
                unit: formatSummary(group.units, 'units'),
                cycle: String(first.cycle || '-').trim() || '-',
                qtyp: group.qtypTotal,
                qtycomp: group.qtycompTotal,
                qtyscrp: group.qtyscrpTotal,
                qtyrjct: group.qtyrjctTotal,
                mKiln: formatSummary(group.mKilns, 'kilns'),
                mJob: formatSummary(group.mJobs, 'jobs'),
                ptDesc2: formatSummary(group.ptDesc2s, 'descs'),
                mLine: formatSummary(group.mLines, 'lines'),
                rowCount: group.count,
                topScrapReasons: formatTopReasons(group.scrapReasonQty, 2),
                topRejectReasons: formatTopReasons(group.rejectReasonQty, 2),
                rawRows: [...group.rows]
            };
        });
    }, [resultRows]);

    const visibleRows = useMemo(() => groupedResultRows.slice(0, 200), [groupedResultRows]);
    const selectedGroupDetails = useMemo(() => {
        if (!selectedGroup) return [];
        return selectedGroup.rawRows
            .map((row, index) => {
                const dateIso = toIsoDateString(String(row.date || ''));
                return {
                    key: `${String(row.id || '')}-${String(row.date || '')}-${index}`,
                    date: formatShortDate(dateIso),
                    dateSort: dateIso || '9999-99-99',
                    mJob: getFirstPresentValue(row, ['m_job', 'job', 'mJob']),
                    ptDesc2: getFirstPresentValue(row, ['pt_desc2', 'detail2', 'ptDesc2']),
                    mLine: getFirstPresentValue(row, ['m_line', 'line', 'mLine']),
                    mKiln: getFirstPresentValue(row, ['m_kiln', 'kiln', 'mKiln']),
                    cycle: String(row.cycle || '-').trim() || '-',
                    qtyp: getFirstPresentNumber(row, ['qtyp', 'process']),
                    qtycomp: getFirstPresentNumber(row, ['qtycomp', 'complete']),
                    qtyscrp: getFirstPresentNumber(row, ['qtyscrp', 'scrap']),
                    qtyrjct: getFirstPresentNumber(row, ['qtyrjct', 'reject']),
                    topScrapReasons: getTopReasonsFromDefects(row.defects, 'SCRAP', 5),
                    topRejectReasons: getTopReasonsFromDefects(row.defects, 'REJECT', 5)
                };
            })
            .sort((a, b) => a.dateSort.localeCompare(b.dateSort));
    }, [selectedGroup]);

    useEffect(() => {
        if (!selectedGroup) return;
        const stillExists = groupedResultRows.some((row) => row.groupKey === selectedGroup.groupKey);
        if (!stillExists) setSelectedGroup(null);
    }, [groupedResultRows, selectedGroup]);

    const tableContainerClass = isJapan
        ? 'bg-[#F3EAD3] border-[#8D6E63]'
        : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200');
    const tableHeaderClass = isJapan
        ? 'border-[#8D6E63] bg-[#E6D7B5] text-[#3E2723]'
        : (isDark ? 'border-gray-700 bg-gray-900 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-700');
    const tableHeadClass = isJapan
        ? 'bg-[#E6D7B5] text-[#5D4037]'
        : (isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700');
    const tableRowClass = isJapan
        ? 'border-[#C9B992] hover:bg-[#E6D7B5]/60'
        : (isDark ? 'border-gray-700 hover:bg-gray-700/60' : 'border-gray-200 hover:bg-blue-50/40');
    const tableBodyTextClass = isJapan
        ? 'text-[#3E2723]'
        : (isDark ? 'text-gray-200' : 'text-gray-800');
    const emptyStateTextClass = isJapan
        ? 'text-[#3E2723]'
        : (isDark ? 'text-gray-400' : 'text-gray-500');
    const scrapHeaderTextClass = isJapan
        ? 'text-[#D64045]'
        : (isDark ? 'text-red-300' : 'text-red-600');
    const rejectHeaderTextClass = isJapan
        ? 'text-[#A16207]'
        : (isDark ? 'text-amber-300' : 'text-amber-600');
    const scrapReasonItemClass = isDark
        ? 'flex w-full items-baseline gap-2 whitespace-nowrap text-gray-100'
        : 'flex w-full items-baseline gap-2 whitespace-nowrap';
    const rejectReasonItemClass = isDark
        ? 'flex w-full items-baseline gap-2 whitespace-nowrap text-gray-100'
        : 'flex w-full items-baseline gap-2 whitespace-nowrap';
    const scrapQtyTextClass = isJapan
        ? 'font-bold text-[#e60000]'
        : (isDark ? 'font-bold text-red-300' : 'font-bold text-[#d10000]');
    const scrapPercentTextClass = isJapan
        ? 'font-bold text-[#c1205e]'
        : (isDark ? 'font-bold text-rose-200' : 'font-bold text-[#ff6767]');
    const rejectQtyTextClass = isJapan
        ? 'font-bold text-[#c76d00]'
        : (isDark ? 'font-bold text-amber-300' : 'font-bold text-[#d97706]');
    const rejectPercentTextClass = isJapan
        ? 'font-bold text-[#7A4307]'
        : (isDark ? 'font-bold text-yellow-200' : 'font-bold text-[#fccf00]');
    const scrapReasonLabelClass = 'inline-block min-w-[180px]';
    const rejectReasonLabelClass = 'inline-block min-w-[132px]';
    const scrapMetricClass = 'ml-auto inline-flex min-w-[120px] items-baseline justify-end gap-1 whitespace-nowrap text-right font-mono tabular-nums';
    const rejectMetricClass = 'ml-auto inline-flex min-w-[108px] items-baseline justify-end gap-1 whitespace-nowrap text-right font-mono tabular-nums';
    const processHeaderTextClass = isJapan
        ? 'text-[#374151]'
        : (isDark ? 'text-slate-200' : 'text-slate-700');
    const completeHeaderTextClass = isJapan
        ? 'text-[#16A34A]'
        : (isDark ? 'text-emerald-300' : 'text-emerald-600');
    const processMetricValueClass = isJapan
        ? 'font-bold text-[#111827] font-mono tabular-nums'
        : (isDark ? 'font-bold text-slate-100 font-mono tabular-nums' : 'font-bold text-slate-900 font-mono tabular-nums');
    const completeMetricQtyClass = isJapan
        ? 'font-bold text-[#16A34A] font-mono tabular-nums'
        : (isDark ? 'font-bold text-emerald-300 font-mono tabular-nums' : 'font-bold text-emerald-600 font-mono tabular-nums');
    const completeMetricPercentClass = isJapan
        ? 'text-[#22C55E] font-semibold font-mono tabular-nums'
        : (isDark ? 'text-emerald-200 font-semibold font-mono tabular-nums' : 'text-emerald-500 font-semibold font-mono tabular-nums');
    const scrapMetricQtyClass = isJapan
        ? 'font-bold text-[#EF4444] font-mono tabular-nums'
        : (isDark ? 'font-bold text-red-300 font-mono tabular-nums' : 'font-bold text-red-500 font-mono tabular-nums');
    const scrapMetricPercentClass = isJapan
        ? 'text-[#F87171] font-semibold font-mono tabular-nums'
        : (isDark ? 'text-rose-200 font-semibold font-mono tabular-nums' : 'text-rose-400 font-semibold font-mono tabular-nums');
    const rejectMetricQtyClass = isJapan
        ? 'font-bold text-[#F97316] font-mono tabular-nums'
        : (isDark ? 'font-bold text-orange-300 font-mono tabular-nums' : 'font-bold text-orange-500 font-mono tabular-nums');
    const rejectMetricPercentClass = isJapan
        ? 'text-[#FB923C] font-semibold font-mono tabular-nums'
        : (isDark ? 'text-orange-200 font-semibold font-mono tabular-nums' : 'text-orange-400 font-semibold font-mono tabular-nums');
    const stackedMetricCellClass = 'flex flex-col items-end leading-tight text-right';
    const stackedMetricPercentClass = 'mt-1 text-xs text-right';
    const dateDrilldownButtonClass = isJapan
        ? 'font-semibold underline decoration-dotted text-[#5D4037] hover:text-[#3E2723]'
        : (isDark ? 'font-semibold underline decoration-dotted text-blue-300 hover:text-blue-200' : 'font-semibold underline decoration-dotted text-blue-700 hover:text-blue-900');
    const modalOverlayClass = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-0';
    const modalPanelClass = isJapan
        ? 'w-full h-full max-w-none max-h-none overflow-hidden rounded-none border-0 bg-[#F3EAD3] text-[#3E2723] shadow-2xl flex flex-col'
        : (isDark
            ? 'w-full h-full max-w-none max-h-none overflow-hidden rounded-none border-0 bg-gray-900 text-gray-100 shadow-2xl flex flex-col'
            : 'w-full h-full max-w-none max-h-none overflow-hidden rounded-none border-0 bg-white text-gray-900 shadow-2xl flex flex-col');
    const modalHeaderClass = isJapan
        ? 'px-4 py-3 border-b border-[#C9B992] bg-[#E6D7B5]'
        : (isDark ? 'px-4 py-3 border-b border-gray-700 bg-gray-800' : 'px-4 py-3 border-b border-gray-200 bg-gray-50');
    const modalBodyClass = isJapan
        ? 'pt-0 pb-0 pl-0 pr-0 overflow-hidden bg-[#F3EAD3] flex-1 min-h-0'
        : (isDark ? 'pt-0 pb-0 pl-0 pr-0 overflow-hidden bg-gray-900 flex-1 min-h-0' : 'pt-0 pb-0 pl-0 pr-0 overflow-hidden bg-white flex-1 min-h-0');
    const modalSubtleTextClass = isJapan
        ? 'text-[#6D4C41]'
        : (isDark ? 'text-gray-400' : 'text-gray-500');
    const modalTableWrapClass = 'sortcolour-modal-scroll';

    return (
        <div className="flex min-h-screen bg-background">
            <DashboardSidebar />
            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                <DashboardHeader />
                <main className={`flex-1 min-w-0 overflow-hidden flex flex-col relative transition-colors duration-500 ${sortdetailsTheme.mainSurface}`}>
                    <div className={`px-4 py-3 w-full shrink-0 border-b shadow-md transition-colors ${sortdetailsTheme.topBar}`}>
                        <div className="max-w-7xl mx-auto flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h1 className="text-white text-xl font-bold flex items-center gap-2">
                                    SortColour
                                    <button onClick={toggleTheme} className="md:hidden p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                        {isJapan ? <Palette className="w-5 h-5 text-[#D64045]" /> : (isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />)}
                                    </button>
                                </h1>

                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className={`flex gap-1.5 items-center p-1 rounded-lg border ${sortdetailsTheme.dateRangePanel}`}>
                                        <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={`w-28 h-6 rounded-md flex items-center justify-center gap-1.5 transition-colors ${isJapan
                                                        ? 'hover:bg-[#F3EAD3]/20'
                                                        : (isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-800/40')}`}
                                                    aria-label="Pick start date"
                                                >
                                                    <span className={`${sortdetailsTheme.dateText} text-xs font-medium`}>
                                                        {formatDisplayDate(dateRangeDraft.start)}
                                                    </span>
                                                    <CalendarIcon className={`w-3.5 h-3.5 ${sortdetailsTheme.dateIcon} opacity-80`} />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" sideOffset={8}>
                                                <DateCalendar
                                                    mode="single"
                                                    selected={parseIsoDateToLocal(dateRangeDraft.start)}
                                                    onSelect={handleStartDateSelect}
                                                    captionLayout="dropdown-buttons"
                                                    fromYear={2000}
                                                    toYear={2035}
                                                    className={datePickerPanelClass}
                                                    classNames={datePickerClassNames}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        <span className={sortdetailsTheme.dateSeparator}>-</span>

                                        <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={`w-28 h-6 rounded-md flex items-center justify-center gap-1.5 transition-colors ${isJapan
                                                        ? 'hover:bg-[#F3EAD3]/20'
                                                        : (isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-800/40')}`}
                                                    aria-label="Pick end date"
                                                >
                                                    <span className={`${sortdetailsTheme.dateText} text-xs font-medium`}>
                                                        {formatDisplayDate(dateRangeDraft.end)}
                                                    </span>
                                                    <CalendarIcon className={`w-3.5 h-3.5 ${sortdetailsTheme.dateIcon} opacity-80`} />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" sideOffset={8}>
                                                <DateCalendar
                                                    mode="single"
                                                    selected={parseIsoDateToLocal(dateRangeDraft.end)}
                                                    onSelect={handleEndDateSelect}
                                                    captionLayout="dropdown-buttons"
                                                    fromYear={2000}
                                                    toYear={2035}
                                                    className={datePickerPanelClass}
                                                    classNames={datePickerClassNames}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <AdvancedSearch
                                        allTokens={allTokens}
                                        tokenQuery={tokenQuery}
                                        onTokenQueryChange={setTokenQuery}
                                        onTokenSearch={handleTokenSearch}
                                        theme={theme}
                                        showMDoc={false}
                                    />
                                    <button onClick={toggleTheme} className="hidden md:flex p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors" title="Toggle Theme: Light -> Dark -> Japan">
                                        {isJapan ? <Palette className="w-5 h-5 text-[#D64045]" /> : (isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Filter Bar: Mode / Prefix / Clay --- */}
                    <div className={`whiteware-filter-bar ${sortdetailsTheme.filterBar}`}>
                        <div className="max-w-7xl mx-auto whiteware-filter-row">
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

                    <div className={`flex-1 min-h-0 overflow-hidden transition-colors ${sortdetailsTheme.contentArea}`}>
                        <div className="h-full w-full">
                            {!dateRange.start || !dateRange.end ? (
                                <div className={`h-[60vh] flex items-center justify-center ${emptyStateTextClass}`}>
                                    Select date range and press ✓ to load data
                                </div>
                            ) : loading ? (
                                <div className={`h-[60vh] flex flex-col items-center justify-center ${isJapan ? 'text-[#3E2723]' : (isDark ? 'text-gray-300' : 'text-gray-600')}`}>
                                    <div className={`animate-spin rounded-full h-10 w-10 border-4 border-transparent mb-4 ${isJapan
                                        ? 'border-t-[#D64045] border-r-[#D64045]'
                                        : (isDark ? 'border-t-blue-400 border-r-blue-400' : 'border-t-blue-600 border-r-blue-600')}`}></div>
                                    Loading data...
                                </div>
                            ) : !hasLoadedData ? (
                                <div className={`h-[60vh] flex items-center justify-center ${emptyStateTextClass}`}>
                                    ยังไม่พบข้อมูลของวันที่ {formatDateToDayMonthYear(dateRange.start)} ถึง {formatDateToDayMonthYear(dateRange.end)}
                                </div>
                            ) : resultRows.length === 0 ? (
                                <div className={`h-[60vh] flex items-center justify-center ${emptyStateTextClass}`}>
                                     ยังไม่พบข้อมูลของวันที่ {formatDateToDayMonthYear(dateRange.start)} ถึง {formatDateToDayMonthYear(dateRange.end)}
                                </div>
                            ) : (
                                <div className={`h-full w-full overflow-hidden flex flex-col ${tableContainerClass}`}>

                                    <div className="flex-1 min-h-0 overflow-auto">
                                        <table className={`w-max min-w-full table-auto text-sm ${tableBodyTextClass}`}>
                                            <thead className={`sticky top-0 ${tableHeadClass}`}>
                                                <tr>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap min-w-[120px]">Date</th>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap min-w-[420px]">Model</th>
                                                    <th className={`px-3 py-2 text-left whitespace-nowrap min-w-[360px] font-bold ${scrapHeaderTextClass}`}>Top 2 Scrap</th>
                                                    <th className={`px-3 pr-8 py-2 text-left whitespace-nowrap min-w-[320px] font-bold ${rejectHeaderTextClass}`}>Top 2 Reject</th>
                                                    <th className={`px-3 pl-8 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${processHeaderTextClass}`}>Process</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${completeHeaderTextClass}`}>Complete</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${scrapHeaderTextClass}`}>Scrap</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${rejectHeaderTextClass}`}>Reject</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[110px]">m_kiln</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[170px]">Job</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[170px]">Customer</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[120px]">LineProd</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[90px]">CP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleRows.map((row, idx) => (
                                                    <tr
                                                        key={`${row.groupKey}_${idx}`}
                                                        className={`border-b last:border-b-0 ${tableRowClass} cursor-pointer`}
                                                        onClick={() => setSelectedGroup(row)}
                                                        title={`Open detail (${row.dateCount} dates, ${row.rowCount} rows)`}
                                                    >
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <span className={dateDrilldownButtonClass}>
                                                                {row.date || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{row.detail1 || '-'}</td>
                                                        <td className="px-3 py-2 leading-snug">
                                                            <div className="flex flex-col gap-1">
                                                                {row.topScrapReasons.length > 0 ? row.topScrapReasons.map((item, reasonIdx) => (
                                                                    <span key={`scrap-${row.groupKey}-${reasonIdx}`} className={scrapReasonItemClass}>
                                                                        <span className={scrapReasonLabelClass}>{item.reason}</span>
                                                                        <span className={scrapMetricClass}>
                                                                            <span className={scrapQtyTextClass}>{numberFormatter.format(item.qty)}</span>
                                                                            <span className={scrapPercentTextClass}>{`(${item.percent.toFixed(0)}%)`}</span>
                                                                        </span>
                                                                    </span>
                                                                )) : (
                                                                    <span className={scrapReasonItemClass}>-</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 pr-8 py-2 leading-snug">
                                                            <div className="flex flex-col gap-1">
                                                                {row.topRejectReasons.length > 0 ? row.topRejectReasons.map((item, reasonIdx) => (
                                                                    <span key={`reject-${row.groupKey}-${reasonIdx}`} className={rejectReasonItemClass}>
                                                                        <span className={rejectReasonLabelClass}>{item.reason}</span>
                                                                        <span className={rejectMetricClass}>
                                                                            <span className={rejectQtyTextClass}>{numberFormatter.format(item.qty)}</span>
                                                                            <span className={rejectPercentTextClass}>{`(${item.percent.toFixed(0)}%)`}</span>
                                                                        </span>
                                                                    </span>
                                                                )) : (
                                                                    <span className={rejectReasonItemClass}>-</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 pl-8 py-2 whitespace-nowrap text-right">
                                                            <span className={processMetricValueClass}>{numberFormatter.format(row.qtyp || 0)}</span>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">
                                                            <div className={stackedMetricCellClass}>
                                                                <span className={completeMetricQtyClass}>{numberFormatter.format(row.qtycomp || 0)}</span>
                                                                <span className={`${stackedMetricPercentClass} ${completeMetricPercentClass}`}>{formatPercentFromTotal(row.qtycomp || 0, row.qtyp || 0)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">
                                                            <div className={stackedMetricCellClass}>
                                                                <span className={scrapMetricQtyClass}>{numberFormatter.format(row.qtyscrp || 0)}</span>
                                                                <span className={`${stackedMetricPercentClass} ${scrapMetricPercentClass}`}>{formatPercentFromTotal(row.qtyscrp || 0, row.qtyp || 0)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">
                                                            <div className={stackedMetricCellClass}>
                                                                <span className={rejectMetricQtyClass}>{numberFormatter.format(row.qtyrjct || 0)}</span>
                                                                <span className={`${stackedMetricPercentClass} ${rejectMetricPercentClass}`}>{formatPercentFromTotal(row.qtyrjct || 0, row.qtyp || 0)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">{row.mKiln || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">{row.mJob || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">{row.ptDesc2 || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">{row.mLine || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">{row.cycle || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedGroup && (
                        <div className={modalOverlayClass} onClick={() => setSelectedGroup(null)}>
                            <div className={modalPanelClass} onClick={(event) => event.stopPropagation()}>
                                <div className={modalHeaderClass}>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-lg font-bold truncate">{selectedGroup.detail1}</div>
                                            <div className={`text-sm ${modalSubtleTextClass}`}>
                                                {`Cycle: ${selectedGroup.cycle || '-'} | ${selectedGroup.dateCount} dates | ${selectedGroup.rowCount} rows`}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedGroup(null)}
                                            className={`px-3 py-1.5 rounded-md border text-sm font-semibold ${isJapan
                                                ? 'border-[#8D6E63] bg-[#F3EAD3] hover:bg-[#E9C46A]/40'
                                                : (isDark
                                                    ? 'border-gray-600 bg-gray-800 hover:bg-gray-700'
                                                    : 'border-gray-300 bg-white hover:bg-gray-100')
                                                }`}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>

                                <div className={modalBodyClass}>
                                    <div className={`h-full overflow-auto ${modalTableWrapClass}`}>
                                        <table className={`w-max min-w-full table-auto text-sm ${tableBodyTextClass}`}>
                                            <thead className={`sticky top-0 ${tableHeadClass}`}>
                                                <tr>
                                                    <th className="px-3 py-2 text-left whitespace-nowrap min-w-[120px]">Date</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${processHeaderTextClass}`}>Process</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${completeHeaderTextClass}`}>Complete</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${scrapHeaderTextClass}`}>Scrap</th>
                                                    <th className={`px-3 py-2 text-right whitespace-nowrap min-w-[110px] font-bold ${rejectHeaderTextClass}`}>Reject</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[100px]">Kiln</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[140px]">Job</th>
                                                    <th className={`px-3 py-2 text-left whitespace-nowrap min-w-[300px] font-bold ${scrapHeaderTextClass}`}>Top 5 Scrap</th>
                                                    <th className={`px-3 py-2 text-left whitespace-nowrap min-w-[280px] font-bold ${rejectHeaderTextClass}`}>Top 5 Reject</th>
                                                    <th className="px-3 py-2 text-right whitespace-nowrap min-w-[90px]">CP</th>
                                                </tr>
                                            </thead>
                                                <tbody>
                                                {selectedGroupDetails.map((detailRow) => (
                                                    <tr key={detailRow.key} className={`border-b last:border-b-0 ${tableRowClass}`}>
                                                        <td className="px-3 py-2 whitespace-nowrap align-top text-left">{detailRow.date}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">
                                                            <span className={processMetricValueClass}>{numberFormatter.format(detailRow.qtyp || 0)}</span>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">
                                                            <div className={stackedMetricCellClass}>
                                                                <span className={completeMetricQtyClass}>{numberFormatter.format(detailRow.qtycomp || 0)}</span>
                                                                <span className={`${stackedMetricPercentClass} ${completeMetricPercentClass}`}>{formatPercentFromTotal(detailRow.qtycomp || 0, detailRow.qtyp || 0)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">
                                                            <div className={stackedMetricCellClass}>
                                                                <span className={scrapMetricQtyClass}>{numberFormatter.format(detailRow.qtyscrp || 0)}</span>
                                                                <span className={`${stackedMetricPercentClass} ${scrapMetricPercentClass}`}>{formatPercentFromTotal(detailRow.qtyscrp || 0, detailRow.qtyp || 0)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">
                                                            <div className={stackedMetricCellClass}>
                                                                <span className={rejectMetricQtyClass}>{numberFormatter.format(detailRow.qtyrjct || 0)}</span>
                                                                <span className={`${stackedMetricPercentClass} ${rejectMetricPercentClass}`}>{formatPercentFromTotal(detailRow.qtyrjct || 0, detailRow.qtyp || 0)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">{detailRow.mKiln}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">{detailRow.mJob}</td>
                                                        <td className="px-3 py-2 leading-snug align-top">
                                                            <div className="flex flex-col gap-1">
                                                                {detailRow.topScrapReasons.length > 0 ? detailRow.topScrapReasons.map((item, reasonIdx) => (
                                                                    <span key={`${detailRow.key}-scrap-${reasonIdx}`} className={scrapReasonItemClass}>
                                                                        <span className={scrapReasonLabelClass}>{item.reason}</span>
                                                                        <span className={scrapMetricClass}>
                                                                            <span className={scrapQtyTextClass}>{numberFormatter.format(item.qty)}</span>
                                                                            <span className={scrapPercentTextClass}>{`(${item.percent.toFixed(0)}%)`}</span>
                                                                        </span>
                                                                    </span>
                                                                )) : (
                                                                    <span className={scrapReasonItemClass}>-</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 leading-snug align-top">
                                                            <div className="flex flex-col gap-1">
                                                                {detailRow.topRejectReasons.length > 0 ? detailRow.topRejectReasons.map((item, reasonIdx) => (
                                                                    <span key={`${detailRow.key}-reject-${reasonIdx}`} className={rejectReasonItemClass}>
                                                                        <span className={rejectReasonLabelClass}>{item.reason}</span>
                                                                        <span className={rejectMetricClass}>
                                                                            <span className={rejectQtyTextClass}>{numberFormatter.format(item.qty)}</span>
                                                                            <span className={rejectPercentTextClass}>{`(${item.percent.toFixed(0)}%)`}</span>
                                                                        </span>
                                                                    </span>
                                                                )) : (
                                                                    <span className={rejectReasonItemClass}>-</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right align-top">{detailRow.cycle}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`whiteware-bottom-tabs-bar ${sortdetailsTheme.bottomTabsBar}`}>
                        <div className="max-w-7xl mx-auto whiteware-bottom-tabs-wrap">
                            {CYCLE_FILTER_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelectedCycleFilter(option.value)}
                                    className={`whiteware-filter-chip ${selectedCycleFilter === option.value
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

export default SortColour;
