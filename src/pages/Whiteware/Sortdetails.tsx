import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LabelList
} from 'recharts';
import {
    Search, Calendar as CalendarIcon, Users, Layers, RotateCcw, Moon, Sun, Palette, ChevronDown, Maximize2, Minimize2, FileDown, Check
} from 'lucide-react';

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";

import { buildTokenIndex, searchByTokens, filterByMDoc } from '../../utils/searchUtils';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
    ProductionReport, DefectModal, generateChartData,
    DbItem, AggregatedData, DisplayInfo, CycleData, DefectData,
    formatDate, getUniqueCustomers, COLORS, JAPAN_COLORS
} from './components/ProductionReport';
import { getSortdetailsThemeClasses } from './components/themeStyles';
import {
    CYCLE_TABS,
    INITIAL_DATA,
    type ExpandedChartType,
    type SortingMode
} from './components/sortdetailsConstants';
import {
    applyPrefixAndUnitPrefixFilters,
    applySortingModeFilter,
    buildExportCsvContent,
    buildExportFileName,
    formatDisplayDate,
    getDynamicSpecOptions,
    getSortedPrefixes
} from './components/sortdetailsHelpers';
import {
    formatLocalDateToIso,
    getDatePickerClassNames,
    getDatePickerPanelClass,
    getTodayDateRange,
    parseIsoDateToLocal,
    type IsoDateRange
} from './sharedDateRange';
import './components/whitewareShared.css';

type ItemSearchSuggestion = {
    key: string;
    displayText: string;
    subText: string;
    queryText: string;
    matchCount: number;
};

const isReworkKiln = (item: DbItem): boolean =>
    String(item.kiln || '').trim().toUpperCase() === 'REWORK';

const excludeReworkRows = (rows: DbItem[]): DbItem[] =>
    rows.filter((item) => !isReworkKiln(item));

const normalizeSearchValue = (value?: string): string =>
    String(value || '').trim().toLowerCase();

const matchesCustomerSearch = (item: DbItem, normalizedQuery: string): boolean => {
    if (!normalizedQuery) return true;
    return [
        normalizeSearchValue(item.detail2),
        normalizeSearchValue(item.kiln),
        normalizeSearchValue(item.line)
    ].some((value) => value.includes(normalizedQuery));
};

const normalizeCycleKeyForSummary = (item: DbItem): string => {
    const cycle = String(item.cycle || '').trim().toUpperCase();
    if (!cycle) return 'Unknown';
    if (isReworkKiln(item) && cycle === 'CP') return 'C';
    return cycle;
};

const Sortdetails = () => {
    // --- State Variables ---
    const [dbData, setDbData] = useState<DbItem[]>(INITIAL_DATA);
    const [searchInput, setSearchInput] = useState<string>('');
    const [filteredDbData, setRawFilteredData] = useState<DbItem[]>([]);
    const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<ItemSearchSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [dateRange, setDateRange] = useState<IsoDateRange>(() => getTodayDateRange());
    const [dateRangeDraft, setDateRangeDraft] = useState<IsoDateRange>(() => getTodayDateRange());
    const [startCalendarOpen, setStartCalendarOpen] = useState<boolean>(false);
    const [endCalendarOpen, setEndCalendarOpen] = useState<boolean>(false);
    const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
    const [activePage, setActivePage] = useState<number>(1);
    const [showDefectModal, setShowDefectModal] = useState<boolean>(false);

    // Filter States
    const [selectedPrefix, setSelectedPrefix] = useState<string>('142');
    const [selectedUnitPrefix, setSelectedUnitPrefix] = useState<string>('ALL');
    const [sortingMode, setSortingMode] = useState<SortingMode>('normal');

    // Advanced Search States
    const [allTokens, setAllTokens] = useState<string[]>([]);
    const [tokenIndex, setTokenIndex] = useState<Map<string, Set<number>>>(new Map());
    const [tokenQuery, setTokenQuery] = useState<string>('');
    const [mDocQuery, setMDocQuery] = useState<string>('');
    const [advancedSearchActive, setAdvancedSearchActive] = useState<boolean>(false);
    const [advancedResultCount, setAdvancedResultCount] = useState<number | null>(null);
    const [isSumAllView, setIsSumAllView] = useState<boolean>(true);

    // Customer Search States
    const [customerInput, setCustomerInput] = useState<string>('');
    const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState<boolean>(false);
    const [uniqueCustomers, setUniqueCustomers] = useState<string[]>([]);

    // System Selection State
    const [selectedSystemFilter, setSelectedSystemFilter] = useState<string>('ALL');
    const [selectedKilnFilter, setSelectedKilnFilter] = useState<string>('ALL');
    const [selectedModelFilter, setSelectedModelFilter] = useState<string>('ALL');
    const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
    const [selectedJobFilter, setSelectedJobFilter] = useState<string>('ALL');
    const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');
    const [selectedSpecUnitFilter, setSelectedSpecUnitFilter] = useState<string>('ALL');
    const [availableSystemIds, setAvailableSystemIds] = useState<string[]>([]);
    const [availableKilnIds, setAvailableKilnIds] = useState<string[]>([]);
    const [availableUnits, setAvailableUnits] = useState<string[]>([]);

    // Theme State
    const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light');
    const isDark = theme === 'dark';
    const isJapan = theme === 'japan';
    const sortdetailsTheme = getSortdetailsThemeClasses(theme);

    // Chart View Mode
    const [chartViewMode, setChartViewMode] = useState<'year' | 'all'>('year');
    const [trendYear, setTrendYear] = useState<string>(new Date().getFullYear().toString());
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    // Raw Data Ref (to keep original fetched data)
    const [allRawData, setAllRawData] = useState<DbItem[]>([]);

    const tabs = CYCLE_TABS;

    const [expandedChart, setExpandedChart] = useState<ExpandedChartType>(null);
    const dashboardData = useMemo(
        () => (aggregatedData ? generateChartData(activePage, aggregatedData, trendYear, theme) : null),
        [aggregatedData, activePage, trendYear, theme]
    );

    // --- Effects ---

    // Theme Toggle
    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : (prev === 'dark' ? 'japan' : 'light');
            localStorage.setItem('theme', next);
            return next;
        });
    };

    const isMonthlyExpanded = expandedChart === 'monthly';
    const isKilnExpanded = expandedChart === 'kiln';
    const isDateRangeDirty = dateRangeDraft.start !== dateRange.start || dateRangeDraft.end !== dateRange.end;
    const isDateRangeComplete = Boolean(dateRangeDraft.start && dateRangeDraft.end);
    const isDateRangeValid = isDateRangeComplete && dateRangeDraft.start <= dateRangeDraft.end;
    const canApplyDateRange = isDateRangeDirty && isDateRangeValid && !loading;
    const monthlyTickStroke = isDark ? '#111827' : '#ffffff';
    const kilnTickStroke = isDark ? '#111827' : '#ffffff';
    const monthlyLabelStroke = isDark ? '#0f172a' : '#1f2937';
    const kilnLabelStroke = isDark ? '#0f172a' : '#1f2937';
    const kilnRowCount = dashboardData?.horizontalData?.length || 0;
    const kilnCompactChartHeight = Math.max(160, kilnRowCount * 40);

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

    const applyDateRange = useCallback(() => {
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

    // 1. Fetch Data on Date Range Change
    useEffect(() => {
        if (!dateRange.start || !dateRange.end) return;

        const controller = new AbortController();
        let isCancelled = false;

        const fetchData = async () => {
            setLoading(true);
            setFetchError(null);

            try {
                const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const res = await fetch(
                    `${API_BASE_URL}/api/production-report/summary?startDate=${dateRange.start}&endDate=${dateRange.end}`,
                    { signal: controller.signal }
                );

                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const data: DbItem[] = await res.json();
                if (isCancelled) return;

                setDisplayInfo(null);
                setAggregatedData(null);
                const baseRows = excludeReworkRows(data);
                setRawFilteredData([]);
                setDbData(baseRows);
                setAllRawData(data);
                setIsSumAllView(true);

                // Initialize Search Index
                const { allTokens: tokens, tokenToRows: index } = buildTokenIndex(baseRows);
                setAllTokens(tokens);
                setTokenIndex(index);
                setUniqueCustomers(getUniqueCustomers(data));

            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error("Fetch error:", err);
                if (!isCancelled) {
                    setFetchError('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า API ทำงานอยู่และช่วงวันที่ถูกต้อง');
                    setDbData([]);
                    setAllRawData([]);
                    setRawFilteredData([]);
                    setDisplayInfo(null);
                    setAggregatedData(null);
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        const timeoutId = setTimeout(() => fetchData(), 500); // Debounce fetch
        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [dateRange.start, dateRange.end]);

    // 2. Initial Prefix Filter Logic
    const [uniquePrefixes, setUniquePrefixes] = useState<string[]>([]);

    useEffect(() => {
        const sortedPrefixes = getSortedPrefixes(allRawData);
        setUniquePrefixes(sortedPrefixes);

        // Default select '142' if available, otherwise first one, or 'ALL'
        if (sortedPrefixes.includes('142')) {
            setSelectedPrefix('142');
        } else if (sortedPrefixes.length > 0) {
            setSelectedPrefix(sortedPrefixes[0]);
        } else {
            setSelectedPrefix('ALL');
        }
    }, [allRawData]);

    // 3. Apply Filters (Sorting Mode & Prefix)
    useEffect(() => {
        let filtered = applySortingModeFilter(allRawData, sortingMode);
        filtered = applyPrefixAndUnitPrefixFilters(filtered, selectedPrefix, selectedUnitPrefix);
        const customerSearchRows = filtered;
        filtered = excludeReworkRows(filtered);

        setDbData(filtered); // Update visible data

        // Re-build search index for filtered data
        const { allTokens: tokens, tokenToRows: index } = buildTokenIndex(filtered);
        setAllTokens(tokens);
        setTokenIndex(index);
        setUniqueCustomers(getUniqueCustomers(customerSearchRows));

    }, [allRawData, sortingMode, selectedPrefix, selectedUnitPrefix]);

    // Keep Sum All view in sync when base filters (mode/prefix/clay) change.
    useEffect(() => {
        if (!isSumAllView) return;

        const filtered = [...dbData];
        if (filtered.length === 0) {
            setDisplayInfo(null);
            setAggregatedData(null);
            setRawFilteredData([]);
            setAvailableSystemIds([]);
            setAvailableKilnIds([]);
            setAvailableUnits([]);
            return;
        }

        const firstItem = filtered[0];
        const displayDetails: DisplayInfo = { ...firstItem };

        const foundSystemIds = Array.from(new Set(filtered.map(item => item.mDoc || ""))).sort().filter(id => id !== "");
        setAvailableSystemIds(foundSystemIds);
        setSelectedSystemFilter('ALL');
        const foundKilnIds = Array.from(new Set(filtered.map(item => item.kiln || "")))
            .sort()
            .filter(id => id !== "" && id.trim().toUpperCase() !== 'REWORK');
        setAvailableKilnIds(foundKilnIds);
        setSelectedKilnFilter('ALL');
        setSelectedModelFilter('ALL');
        setSelectedCustomerFilter('ALL');
        setSelectedJobFilter('ALL');
        setSelectedLineFilter('ALL');
        setSelectedSpecUnitFilter('ALL');

        const units = Array.from(new Set(filtered.map(item => item.unit || ""))).sort().filter(u => u !== "");
        setAvailableUnits(units);

        setRawFilteredData(filtered);
        setDisplayInfo(displayDetails);

        const yearsSet = new Set<string>();
        filtered.forEach(row => { if (row.date) yearsSet.add(row.date.substring(0, 4)); });
        const sortedYears = Array.from(yearsSet).sort();
        setAvailableYears(sortedYears);
        if (sortedYears.length > 0) setTrendYear(sortedYears[sortedYears.length - 1]);
    }, [dbData, isSumAllView]);

    // 4. Update Search Suggestions
    useEffect(() => {
        if (!searchInput.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const lowerInput = searchInput.toLowerCase();
        const matched = dbData.filter(item =>
            (item.detail1 && item.detail1.toLowerCase().includes(lowerInput)) ||
            (item.job && item.job.toLowerCase().includes(lowerInput)) ||
            (item.itemId && item.itemId.toLowerCase().includes(lowerInput))
        );

        const grouped = new Map<string, {
            displayText: string;
            cycles: Set<string>;
            jobs: Set<string>;
            parts: Set<string>;
            queryText: string;
            matchCount: number;
        }>();

        const addIfPresent = (target: Set<string>, value?: string) => {
            const normalized = String(value || '').trim();
            if (normalized) target.add(normalized);
        };

        matched.forEach((item) => {
            const model = String(item.detail1 || '').trim();
            const cycle = String(item.cycle || '-').trim() || '-';
            const fallback = String(item.job || item.itemId || '(No pt_desc1)').trim() || '(No pt_desc1)';
            const displayText = model || fallback;
            const queryText = model || fallback;
            const key = displayText.toUpperCase();

            if (!grouped.has(key)) {
                grouped.set(key, {
                    displayText,
                    cycles: new Set<string>(),
                    jobs: new Set<string>(),
                    parts: new Set<string>(),
                    queryText,
                    matchCount: 0
                });
            }

            const current = grouped.get(key)!;
            current.matchCount += 1;
            addIfPresent(current.cycles, cycle === '-' ? '' : cycle);
            addIfPresent(current.jobs, item.job);
            addIfPresent(current.parts, item.itemId);
        });

        const summarize = (values: Set<string>, pluralLabel: string): string => {
            const list = Array.from(values);
            if (list.length === 0) return '-';
            if (list.length === 1) return list[0];
            return `${list.length} ${pluralLabel}`;
        };

        const groupedSuggestions = Array.from(grouped.entries())
            .map(([key, value]) => ({
                key,
                displayText: value.displayText,
                subText: `รอบเผา: ${value.cycles.size} รอบ | งาน: ${summarize(value.jobs, 'งาน')} | พาร์ท: ${summarize(value.parts, 'พาร์ท')}`,
                queryText: value.queryText,
                matchCount: value.matchCount
            }))
            .sort((a, b) =>
                b.matchCount - a.matchCount || a.displayText.localeCompare(b.displayText)
            )
            .slice(0, 10);

        setSuggestions(groupedSuggestions);
        setShowSuggestions((prev) => prev && groupedSuggestions.length > 0);
    }, [searchInput, dbData]);

    // 5. Update Customer Suggestions
    useEffect(() => {
        if (!customerInput) { setCustomerSuggestions([]); return; }
        const lower = normalizeSearchValue(customerInput);
        const matched = uniqueCustomers
            .filter((c) => normalizeSearchValue(c).includes(lower))
            .slice(0, 10);
        setCustomerSuggestions(matched);
        setShowCustomerSuggestions(true);
    }, [customerInput, uniqueCustomers]);

    const performSearch = (type: 'ITEM' | 'CUSTOMER' | 'ALL', query: string) => {
        if (type === 'ITEM') setShowSuggestions(false);
        if (type === 'CUSTOMER') setShowCustomerSuggestions(false);
        setIsSumAllView(type === 'ALL');
        setLoading(true);
        setTimeout(() => {
            let filtered: DbItem[] = [];
            if (type === 'ALL') {
                filtered = [...dbData]; // Use currently filtered dbData
                setSearchInput('');
                setCustomerInput('');
            } else if (type === 'ITEM') {
                const lowerQuery = query.toLowerCase();
                filtered = dbData.filter(item =>
                    (item.detail1 && item.detail1.toLowerCase().includes(lowerQuery)) ||
                    (item.job && item.job.toLowerCase().includes(lowerQuery)) ||
                    (item.itemId && item.itemId.toLowerCase().includes(lowerQuery))
                );
            } else if (type === 'CUSTOMER') {
                const lowerQuery = normalizeSearchValue(query);
                const includeReworkForCustomerSearch = lowerQuery.includes('rework');
                const customerSearchSource = includeReworkForCustomerSearch
                    ? applyPrefixAndUnitPrefixFilters(
                        allRawData,
                        selectedPrefix,
                        selectedUnitPrefix
                    )
                    : dbData;
                filtered = customerSearchSource.filter((item) =>
                    matchesCustomerSearch(item, lowerQuery)
                );
            }

            if (filtered.length === 0) {
                setDisplayInfo(null);
                setAggregatedData(null);
                setRawFilteredData([]);
                setLoading(false);
                return;
            }

            // Grouping logic for multiple batches
            const firstItem = filtered[0];
            const displayDetails: DisplayInfo = { ...firstItem };

            // Find all unique system IDs in the result
            const foundSystemIds = Array.from(new Set(filtered.map(item => item.mDoc || ""))).sort().filter(id => id !== "");
            setAvailableSystemIds(foundSystemIds);
            setSelectedSystemFilter('ALL');
            const foundKilnIds = Array.from(new Set(filtered.map(item => item.kiln || "")))
                .sort()
                .filter(id => id !== "" && id.trim().toUpperCase() !== 'REWORK');
            setAvailableKilnIds(foundKilnIds);
            setSelectedKilnFilter('ALL');
            setSelectedModelFilter('ALL');
            setSelectedCustomerFilter('ALL');
            setSelectedJobFilter('ALL');
            setSelectedLineFilter('ALL');
            setSelectedSpecUnitFilter('ALL');

            // Find all unique units for debug
            const units = Array.from(new Set(filtered.map(item => item.unit || ""))).sort().filter(u => u !== "");
            setAvailableUnits(units);

            setRawFilteredData(filtered);
            setDisplayInfo(displayDetails);

            const yearsSet = new Set<string>();
            filtered.forEach(row => { if (row.date) yearsSet.add(row.date.substring(0, 4)); });
            const sortedYears = Array.from(yearsSet).sort();
            setAvailableYears(sortedYears);
            if (sortedYears.length > 0) setTrendYear(sortedYears[sortedYears.length - 1]);
            setLoading(false);
        }, 300);
    };

    const getDataBySpecFilters = useCallback((
        data: DbItem[],
        ignore: 'system' | 'kiln' | 'model' | 'customer' | 'job' | 'line' | 'unit' | null = null
    ) => {
        let next = data;
        if (selectedSystemFilter !== 'ALL' && ignore !== 'system') {
            next = next.filter(item => (item.mDoc || '') === selectedSystemFilter);
        }
        if (selectedKilnFilter !== 'ALL' && ignore !== 'kiln') {
            next = next.filter(item => (item.kiln || '') === selectedKilnFilter);
        }
        if (selectedModelFilter !== 'ALL' && ignore !== 'model') {
            next = next.filter(item => (item.detail1 || '') === selectedModelFilter);
        }
        if (selectedCustomerFilter !== 'ALL' && ignore !== 'customer') {
            next = next.filter(item => (item.detail2 || '') === selectedCustomerFilter);
        }
        if (selectedJobFilter !== 'ALL' && ignore !== 'job') {
            next = next.filter(item => (item.job || '') === selectedJobFilter);
        }
        if (selectedLineFilter !== 'ALL' && ignore !== 'line') {
            next = next.filter(item => (item.line || '') === selectedLineFilter);
        }
        if (selectedSpecUnitFilter !== 'ALL' && ignore !== 'unit') {
            next = next.filter(item => (item.unit || '') === selectedSpecUnitFilter);
        }
        return next;
    }, [
        selectedSystemFilter,
        selectedKilnFilter,
        selectedModelFilter,
        selectedCustomerFilter,
        selectedJobFilter,
        selectedLineFilter,
        selectedSpecUnitFilter
    ]);

    useEffect(() => {
        if (!filteredDbData || filteredDbData.length === 0) return;
        const effectiveData = getDataBySpecFilters(filteredDbData);
        const summaryData = excludeReworkRows(effectiveData);
        const summarySourceData = summaryData.length > 0 ? summaryData : effectiveData;

        // Aggregation Logic
        const cyclesAgg: Record<string, CycleData> = {};
        const monthlyAgg: Record<string, CycleData> = {};
        const kilnsAgg: Record<string, CycleData> = {};
        const monthlyByCycleAgg: Record<string, Record<string, CycleData>> = {};
        const kilnsByCycleAgg: Record<string, Record<string, CycleData>> = {};
        const defectsByCycle: Record<string, { scrapMap: any; rejectMap: any }> = {};
        const allKilnsSet = new Set<string>();
        const allDefectsByCycle: Record<string, DefectData[]> = {};
        const defectAggregationMap: Record<string, Record<string, { type: string; reason: string; qty: number }>> = {};

        summarySourceData.forEach(row => {
            const cycle = normalizeCycleKeyForSummary(row);
            if (!cyclesAgg[cycle]) cyclesAgg[cycle] = { process: 0, complete: 0, scrap: 0, reject: 0 };
            cyclesAgg[cycle].process += (row.process || 0);
            cyclesAgg[cycle].complete += (row.complete || 0);
            cyclesAgg[cycle].scrap += (row.scrap || 0);
            cyclesAgg[cycle].reject += (row.reject || 0);

            const monthKey = row.date ? row.date.substring(0, 7) : 'Unknown';
            if (!monthlyAgg[monthKey]) monthlyAgg[monthKey] = { process: 0, complete: 0, scrap: 0, reject: 0 };
            monthlyAgg[monthKey].process += (row.process || 0);
            monthlyAgg[monthKey].complete += (row.complete || 0);
            monthlyAgg[monthKey].scrap += (row.scrap || 0);
            monthlyAgg[monthKey].reject += (row.reject || 0);
            if (!monthlyByCycleAgg[cycle]) monthlyByCycleAgg[cycle] = {};
            if (!monthlyByCycleAgg[cycle][monthKey]) {
                monthlyByCycleAgg[cycle][monthKey] = { process: 0, complete: 0, scrap: 0, reject: 0 };
            }
            monthlyByCycleAgg[cycle][monthKey].process += (row.process || 0);
            monthlyByCycleAgg[cycle][monthKey].complete += (row.complete || 0);
            monthlyByCycleAgg[cycle][monthKey].scrap += (row.scrap || 0);
            monthlyByCycleAgg[cycle][monthKey].reject += (row.reject || 0);

            const kilnKey = row.kiln || 'Unknown';
            if (!kilnsAgg[kilnKey]) kilnsAgg[kilnKey] = { process: 0, complete: 0, scrap: 0, reject: 0 };
            kilnsAgg[kilnKey].process += (row.process || 0);
            kilnsAgg[kilnKey].complete += (row.complete || 0);
            kilnsAgg[kilnKey].scrap += (row.scrap || 0);
            kilnsAgg[kilnKey].reject += (row.reject || 0);
            if (!kilnsByCycleAgg[cycle]) kilnsByCycleAgg[cycle] = {};
            if (!kilnsByCycleAgg[cycle][kilnKey]) {
                kilnsByCycleAgg[cycle][kilnKey] = { process: 0, complete: 0, scrap: 0, reject: 0 };
            }
            kilnsByCycleAgg[cycle][kilnKey].process += (row.process || 0);
            kilnsByCycleAgg[cycle][kilnKey].complete += (row.complete || 0);
            kilnsByCycleAgg[cycle][kilnKey].scrap += (row.scrap || 0);
            kilnsByCycleAgg[cycle][kilnKey].reject += (row.reject || 0);
            allKilnsSet.add(kilnKey);

            if (!defectsByCycle[cycle]) defectsByCycle[cycle] = { scrapMap: {}, rejectMap: {} };
            if (!defectAggregationMap[cycle]) defectAggregationMap[cycle] = {};

            if (row.defects) {
                row.defects.forEach(d => {
                    const type = d.type.toUpperCase();
                    const reason = d.reason;
                    const defectQty = Number(d.qty || 0);
                    const updateDefectMap = (map: any) => {
                        if (!map[reason]) map[reason] = { total: 0, kilns: {} };
                        map[reason].total += defectQty;
                        map[reason].kilns[kilnKey] = (map[reason].kilns[kilnKey] || 0) + defectQty;
                    };
                    if (type.startsWith('C') || type.startsWith('D')) updateDefectMap(defectsByCycle[cycle].scrapMap);
                    else updateDefectMap(defectsByCycle[cycle].rejectMap);

                    const key = `${d.type}|${d.reason}`;
                    if (!defectAggregationMap[cycle][key]) defectAggregationMap[cycle][key] = { type: d.type, reason: d.reason, qty: 0 };
                    defectAggregationMap[cycle][key].qty += defectQty;
                });
            }
        });

        const getTop5Simple = (map: any, totalProcess: number) => Object.entries(map).map(([reason, data]: [string, any]) => ({ reason, qty: data.total, percent: totalProcess > 0 ? (data.total / totalProcess) * 100 : 0 })).sort((a: any, b: any) => b.qty - a.qty).slice(0, 5);
        const getTop5ChartData = (map: any) => Object.entries(map).sort((a: any, b: any) => b[1].total - a[1].total).slice(0, 5).map(([reason, data]: [string, any]) => ({ name: reason, total: data.total, ...data.kilns }));

        // Recalculate pD for all aggregated defects and fill missing gaps
        Object.keys(defectAggregationMap).forEach(c => {
            const totalProcess = cyclesAgg[c]?.process || 0;
            const defectsList = Object.values(defectAggregationMap[c]).map(defect => {
                const recalculatedPd = totalProcess > 0
                    ? ((defect.qty / totalProcess) * 100).toFixed(2) + '%'
                    : '0.00%';
                return { ...defect, pd: recalculatedPd };
            }).sort((a, b) => b.qty - a.qty);

            // Check if Total Scrap + Reject > Sum of Defects (Missing info)
            const sumDefects = defectsList.reduce((acc, d) => acc + d.qty, 0);
            const totalScrapReject = (cyclesAgg[c]?.scrap || 0) + (cyclesAgg[c]?.reject || 0);

            if (totalScrapReject > sumDefects) {
                const diff = totalScrapReject - sumDefects;
                const diffPd = totalProcess > 0
                    ? ((diff / totalProcess) * 100).toFixed(2) + '%'
                    : '0.00%';
                defectsList.push({
                    type: 'Unknown',
                    pd: diffPd,
                    reason: 'Unspecified / Other',
                    qty: diff
                });
            }

            allDefectsByCycle[c] = defectsList;
        });
        const finalTopDefectsByCycle: Record<string, any> = {};
        Object.keys(defectsByCycle).forEach(cycleKey => {
            const cycleData = defectsByCycle[cycleKey];
            const totalProcess = cyclesAgg[cycleKey]?.process || 0;
            finalTopDefectsByCycle[cycleKey] = {
                scrap: getTop5Simple(cycleData.scrapMap, totalProcess),
                reject: getTop5Simple(cycleData.rejectMap, totalProcess),
                scrapChart: getTop5ChartData(cycleData.scrapMap),
                rejectChart: getTop5ChartData(cycleData.rejectMap),
                kilns: Array.from(allKilnsSet).sort()
            };
        });

        const uniqueSystemsInView = Array.from(new Set(effectiveData.map(row => row.mDoc || '').filter(Boolean)));
        const uniqueKilnsInView = Array.from(new Set(effectiveData.map(row => row.kiln || '').filter(Boolean)));
        const uniqueModelsInView = Array.from(new Set(effectiveData.map(row => row.detail1 || '').filter(Boolean)));
        const uniqueCustomersInView = Array.from(new Set(effectiveData.map(row => row.detail2 || '').filter(Boolean)));
        const uniqueJobsInView = Array.from(new Set(effectiveData.map(row => row.job || '').filter(Boolean)));
        const uniqueLinesInView = Array.from(new Set(effectiveData.map(row => row.line || '').filter(Boolean)));
        const uniqueUnitsInView = Array.from(new Set(effectiveData.map(row => row.unit || '').filter(Boolean)));

        const isAllDataScope = isSumAllView
            && selectedSystemFilter === 'ALL'
            && selectedKilnFilter === 'ALL'
            && selectedModelFilter === 'ALL'
            && selectedCustomerFilter === 'ALL'
            && selectedJobFilter === 'ALL'
            && selectedLineFilter === 'ALL'
            && selectedSpecUnitFilter === 'ALL';

        const getDisplayLabel = (
            selectedValue: string,
            values: string[],
            multipleLabel: string
        ) => {
            if (selectedValue !== 'ALL') return selectedValue;
            if (values.length === 1) return values[0];
            if (isAllDataScope) return 'All Data';
            return multipleLabel;
        };

        const aggResult: AggregatedData = {
            cycles: cyclesAgg,
            monthly: monthlyAgg,
            kilns: kilnsAgg,
            monthlyByCycle: monthlyByCycleAgg,
            kilnsByCycle: kilnsByCycleAgg
        };
        setDisplayInfo((prev: any) => ({
            ...prev,
            detail1: getDisplayLabel(selectedModelFilter, uniqueModelsInView, 'Multiple Models'),
            detail2: getDisplayLabel(selectedCustomerFilter, uniqueCustomersInView, 'Multiple Customers'),
            job: getDisplayLabel(selectedJobFilter, uniqueJobsInView, 'Multiple Jobs'),
            line: getDisplayLabel(selectedLineFilter, uniqueLinesInView, 'Multiple Lines'),
            mDoc: getDisplayLabel(selectedSystemFilter, uniqueSystemsInView, 'Multiple Batches'),
            kiln: getDisplayLabel(selectedKilnFilter, uniqueKilnsInView, 'Multiple Kilns'),
            unit: getDisplayLabel(selectedSpecUnitFilter, uniqueUnitsInView, 'Multiple Units'),
            topDefectsByCycle: finalTopDefectsByCycle,
            allDefectsByCycle
        }));
        setAggregatedData(aggResult);
    }, [
        filteredDbData,
        isSumAllView,
        selectedSystemFilter,
        selectedKilnFilter,
        selectedModelFilter,
        selectedCustomerFilter,
        selectedJobFilter,
        selectedLineFilter,
        selectedSpecUnitFilter,
        getDataBySpecFilters
    ]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        performSearch('ITEM', searchInput);
    };
    const handleCustomerSubmit = (e: React.FormEvent) => { e.preventDefault(); performSearch('CUSTOMER', customerInput); };
    const handleSumAll = () => performSearch('ALL', '');
    const handleExportExcel = () => {
        const exportData = getDataBySpecFilters(filteredDbData || []);
        if (exportData.length === 0) return;
        const csvContent = buildExportCsvContent(exportData);
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = buildExportFileName(sortingMode, dateRange);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    const handleClearSearch = () => {
        setSearchInput('');
        setCustomerInput('');
        setSuggestions([]);
        setShowSuggestions(false);
        setCustomerSuggestions([]);
        setShowCustomerSuggestions(false);
        setMDocQuery('');
        setTokenQuery('');
        setAdvancedSearchActive(false);
        setAdvancedResultCount(null);
        setIsSumAllView(true);
        setSelectedSystemFilter('ALL');
        setSelectedKilnFilter('ALL');
        setSelectedModelFilter('ALL');
        setSelectedCustomerFilter('ALL');
        setSelectedJobFilter('ALL');
        setSelectedLineFilter('ALL');
        setSelectedSpecUnitFilter('ALL');
        setAvailableSystemIds([]);
        setAvailableKilnIds([]);
        setAvailableUnits([]);
        setDisplayInfo(null);
        setAggregatedData(null);
        setRawFilteredData([]);
    };

    // --- Advanced Search Handlers ---
    const handleAdvancedTokenSearch = useCallback((query: string) => {
        setIsSumAllView(false);
        // Apply both m_doc filter and token search together
        let filtered = dbData;

        // Step 1: m_doc partial filter
        if (mDocQuery.trim()) {
            filtered = filterByMDoc(filtered, mDocQuery);
        }

        // Step 2: token exact AND search
        if (query && query.trim()) {
            filtered = searchByTokens(query, tokenIndex, filtered);
        }

        // Only show results if at least one filter is active
        if (!mDocQuery.trim() && (!query || !query.trim())) {
            setAdvancedSearchActive(false);
            setAdvancedResultCount(null);
            return;
        }

        setAdvancedSearchActive(true);
        setAdvancedResultCount(filtered.length);

        if (filtered.length === 0) {
            setDisplayInfo(null);
            setAggregatedData(null);
            setRawFilteredData([]);
            return;
        }

        // Use the first match for display header
        const displayDetails = { ...filtered[0] };
        const foundSystemIds = Array.from(new Set(filtered.map(item => item.mDoc || ""))).sort().filter(id => id !== "");
        setAvailableSystemIds(foundSystemIds);
        setSelectedSystemFilter('ALL');
        const foundKilnIds = Array.from(new Set(filtered.map(item => item.kiln || "")))
            .sort()
            .filter(id => id !== "" && id.trim().toUpperCase() !== 'REWORK');
        setAvailableKilnIds(foundKilnIds);
        setSelectedKilnFilter('ALL');
        setSelectedModelFilter('ALL');
        setSelectedCustomerFilter('ALL');
        setSelectedJobFilter('ALL');
        setSelectedLineFilter('ALL');
        setSelectedSpecUnitFilter('ALL');
        setRawFilteredData(filtered);
        setDisplayInfo(displayDetails);

        const yearsSet = new Set<string>();
        filtered.forEach(row => { if (row.date) yearsSet.add(row.date.substring(0, 4)); });
        const sortedYears = Array.from(yearsSet).sort();
        setAvailableYears(sortedYears);
        if (sortedYears.length > 0) setTrendYear(sortedYears[sortedYears.length - 1]);
    }, [dbData, mDocQuery, tokenIndex]);

    // Re-run advanced filter when mDocQuery changes (live filtering)
    useEffect(() => {
        if (mDocQuery.trim() || tokenQuery.trim()) {
            handleAdvancedTokenSearch(tokenQuery);
        } else if (advancedSearchActive) {
            setAdvancedSearchActive(false);
            setAdvancedResultCount(null);
        }
    }, [mDocQuery, tokenQuery, handleAdvancedTokenSearch, advancedSearchActive]);

    // Updated activeCycleKey logic for P3-P5
    const activeCycleKey = useMemo(() => {
        if (activePage === 3) return 'P1';
        if (activePage === 4) return 'P2';
        if (activePage === 5) return 'P3';
        if (activePage === 6) return 'P4';
        if (activePage === 7) return 'P5';
        return 'C';
    }, [activePage]);

    const modalData = useMemo(() => displayInfo ? { ...displayInfo, cycleName: tabs.find(t => t.id === activePage)?.label, defects: displayInfo.allDefectsByCycle?.[activeCycleKey] || [] } : null, [displayInfo, activeCycleKey, activePage]);
    const dynamicSpecOptions = useMemo(
        () => getDynamicSpecOptions(filteredDbData || [], getDataBySpecFilters),
        [filteredDbData, getDataBySpecFilters]
    );
    const dynamicSystemIds = dynamicSpecOptions.systemIds;
    const dynamicKilnIds = dynamicSpecOptions.kilnIds;
    const dynamicModelNames = dynamicSpecOptions.modelNames;
    const dynamicCustomers = dynamicSpecOptions.customers;
    const dynamicJobs = dynamicSpecOptions.jobs;
    const dynamicLines = dynamicSpecOptions.lines;
    const dynamicUnits = dynamicSpecOptions.units;

    useEffect(() => {
        if (selectedSystemFilter !== 'ALL' && !dynamicSystemIds.includes(selectedSystemFilter)) {
            setSelectedSystemFilter('ALL');
        }
        if (selectedKilnFilter !== 'ALL' && !dynamicKilnIds.includes(selectedKilnFilter)) {
            setSelectedKilnFilter('ALL');
        }
        if (selectedModelFilter !== 'ALL' && !dynamicModelNames.includes(selectedModelFilter)) {
            setSelectedModelFilter('ALL');
        }
        if (selectedCustomerFilter !== 'ALL' && !dynamicCustomers.includes(selectedCustomerFilter)) {
            setSelectedCustomerFilter('ALL');
        }
        if (selectedJobFilter !== 'ALL' && !dynamicJobs.includes(selectedJobFilter)) {
            setSelectedJobFilter('ALL');
        }
        if (selectedLineFilter !== 'ALL' && !dynamicLines.includes(selectedLineFilter)) {
            setSelectedLineFilter('ALL');
        }
        if (selectedSpecUnitFilter !== 'ALL' && !dynamicUnits.includes(selectedSpecUnitFilter)) {
            setSelectedSpecUnitFilter('ALL');
        }
    }, [
        selectedSystemFilter,
        selectedKilnFilter,
        selectedModelFilter,
        selectedCustomerFilter,
        selectedJobFilter,
        selectedLineFilter,
        selectedSpecUnitFilter,
        dynamicSystemIds,
        dynamicKilnIds,
        dynamicModelNames,
        dynamicCustomers,
        dynamicJobs,
        dynamicLines,
        dynamicUnits
    ]);

    return (
        <div className="flex min-h-screen bg-background">
            <DashboardSidebar />
            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                <DashboardHeader />
                <main className={`flex-1 min-w-0 overflow-hidden flex flex-col relative font-sans transition-colors duration-500 ${sortdetailsTheme.mainSurface}`}>
                    <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }`}</style>

                    <DefectModal isOpen={showDefectModal} onClose={() => setShowDefectModal(false)} data={modalData} theme={theme} />
                    {loading && (
                        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                            <div className={`rounded-xl border px-6 py-5 shadow-xl flex flex-col items-center gap-3 ${isJapan
                                ? 'bg-[#F3EAD3] border-[#8D6E63] text-[#3E2723]'
                                : (isDark ? 'bg-gray-900/95 border-gray-700 text-gray-100' : 'bg-white/95 border-gray-200 text-gray-700')
                                }`}>
                                <div className={`animate-spin rounded-full h-12 w-12 border-4 border-transparent ${isJapan
                                    ? 'border-t-[#D64045] border-r-[#D64045]'
                                    : (isDark ? 'border-t-blue-400 border-r-blue-400' : 'border-t-blue-600 border-r-blue-600')
                                    }`}></div>
                                <p className="text-sm md:text-base font-semibold">กำลังรวบรวมข้อมูล...</p>
                            </div>
                        </div>
                    )}

                    <div className={`px-4 py-3 shadow-md z-10 w-full shrink-0 transition-colors ${sortdetailsTheme.topBar}`}>
                        <div className="max-w-7xl mx-auto w-full flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                            <h1 className="text-white text-[21px] font-bold text-center xl:text-left flex items-center gap-2 justify-center xl:justify-start">
                                คัดเกรด - {sortingMode === 'frit' ? 'Frit Sorting' : 'Normal Sorting'}
                                {/* Theme Toggle Button Mobile */}
                                <button onClick={toggleTheme} className="xl:hidden p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                    {isJapan ? <Palette className="w-5 h-5 text-[#D64045]" /> : (isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />)}
                                </button>
                            </h1>

                            <div className="flex flex-wrap gap-2 items-center justify-center xl:justify-end w-full xl:flex-1 xl:min-w-0 relative">
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

                                    <button
                                        type="button"
                                        onClick={applyDateRange}
                                        disabled={!canApplyDateRange}
                                        className={`px-1.5 py-1 rounded-md border transition-colors ${canApplyDateRange
                                            ? (isJapan
                                                ? 'bg-[#D64045] hover:bg-[#bf373c] border-[#D64045] text-[#F3EAD3]'
                                                : (isDark
                                                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-red-600 hover:bg-red-700 border-red-600 text-white'))
                                            : (isJapan
                                                ? 'bg-[#E6D7B5] border-[#C9B992] text-[#8D6E63] cursor-not-allowed'
                                                : (isDark
                                                    ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white cursor-not-allowed'))
                                            }`}
                                        title="Apply date range"
                                        aria-label="Apply date range"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Customer Search */}
                                <div className="relative w-full sm:w-56 md:w-52 xl:w-48">
                                    <form onSubmit={handleCustomerSubmit} className="relative w-full flex items-center">
                                        <input
                                            type="text"
                                            placeholder="ค้นหาลูกค้า..."
                                            className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border-none focus:ring-2 shadow-sm outline-none transition-colors 
                                                ${isJapan ? 'bg-[#F3EAD3] text-[#3E2723] placeholder-[#8D6E63] focus:ring-[#D64045]' : (isDark ? 'bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-blue-500' : 'bg-blue-100 text-gray-700 placeholder-blue-400 focus:bg-white focus:ring-orange-300')}
                                            `}
                                            value={customerInput}
                                            onChange={(e) => setCustomerInput(e.target.value)}
                                            onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                                        />
                                        <div className={`absolute left-2.5 top-2.5 ${isJapan ? 'text-[#8D6E63]' : (isDark ? 'text-gray-500' : 'text-blue-500')}`}><Users className="w-4 h-4" /></div>
                                    </form>
                                    {showCustomerSuggestions && customerSuggestions.length > 0 && (
                                        <div className={`absolute top-full left-0 w-full mt-1 rounded-lg shadow-lg border max-h-48 overflow-y-auto z-50 ${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63]' : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')}`}>
                                            {customerSuggestions.map((name, index) => (
                                                <div key={index} className={`px-4 py-2 cursor-pointer border-b last:border-none text-sm font-medium ${isJapan ? 'text-[#3E2723] border-[#8D6E63] hover:bg-[#E6D7B5]' : (isDark ? 'text-gray-300 border-gray-700 hover:bg-gray-700' : 'text-gray-700 border-gray-50 hover:bg-blue-50')}`} onClick={() => { setCustomerInput(name); performSearch('CUSTOMER', name); }}>{name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Main Search */}
                                <div className="relative w-full sm:w-72 md:w-80 xl:w-64">
                                    <form onSubmit={handleSearchSubmit} className="relative w-full">
                                        <input
                                            type="text"
                                            placeholder="ค้นหา (pt_desc1, m_job, m_part)"
                                            className={`w-full pl-10 pr-4 py-1.5 text-sm rounded-lg border-none focus:ring-2 shadow-sm outline-none transition-colors 
                                                ${isJapan ? 'bg-[#F3EAD3] text-[#3E2723] placeholder-[#8D6E63] focus:ring-[#D64045]' : (isDark ? 'bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-blue-500' : 'bg-blue-100 text-gray-700 placeholder-blue-400 focus:bg-white focus:ring-blue-300')}
                                            `}
                                            value={searchInput}
                                            onChange={(e) => {
                                                setSearchInput(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(suggestions.length > 0)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        />
                                        <div className={`absolute left-3 top-2.5 ${isJapan ? 'text-[#8D6E63]' : (isDark ? 'text-gray-500' : 'text-blue-500')}`}><Search className="w-5 h-5" /></div>
                                    </form>
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className={`absolute top-full left-0 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto z-50 ${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63]' : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')}`}>
                                            {suggestions.map((item) => (
                                                <div key={item.key} className={`px-3 py-2.5 cursor-pointer border-b last:border-none flex flex-col ${isJapan ? 'hover:bg-[#E6D7B5] border-[#8D6E63]' : (isDark ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-blue-50 border-gray-50')}`} onClick={() => { setShowSuggestions(false); setSearchInput(item.queryText || item.displayText); performSearch('ITEM', item.queryText || item.displayText); }}>
                                                    <span className={`text-sm font-bold ${isJapan ? 'text-[#3E2723]' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>
                                                        <span className="flex-1 min-w-0 whitespace-normal break-words leading-snug">{item.displayText}</span>
                                                    </span>
                                                    <span className={`text-xs whitespace-normal break-words leading-tight ${isJapan ? 'text-[#5D4037]' : (isDark ? 'text-gray-500' : 'text-gray-500')}`}>{item.subText}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleSumAll} className={`px-3 py-1.5 rounded-lg transition-colors font-medium text-sm shadow-sm flex items-center gap-1 ${isJapan ? 'bg-[#E9C46A] hover:bg-[#D4A017] text-[#3E2723]' : (isDark ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white')}`}><Layers className="w-4 h-4" /> Sum All</button>
                                <button
                                    onClick={handleClearSearch}
                                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium text-sm shadow-sm flex items-center gap-1 ${isJapan
                                        ? 'bg-[#8D6E63] hover:bg-[#5D4037] text-[#F3EAD3]' // Japan Theme Clear Button
                                        : (isDark ? 'bg-red-900 hover:bg-red-800 text-red-100 border border-red-800' : 'bg-red-800 hover:bg-red-900 text-white')
                                        }`}
                                >
                                    <RotateCcw className="w-4 h-4" /> Clear
                                </button>

                                {/* Theme Toggle Button Desktop */}
                                <button onClick={toggleTheme} className="hidden xl:flex p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors ml-1" title="Toggle Theme: Light -> Dark -> Japan">
                                    {isJapan ? <Palette className="w-5 h-5 text-[#D64045]" /> : (isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />)}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- Sorting Mode & Prefix Filter Buttons --- */}
                    <div className={`whiteware-filter-bar ${sortdetailsTheme.filterBar}`}>
                        <div className="max-w-7xl mx-auto whiteware-filter-row">
                            {/* Sorting Mode Toggle */}
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

                            {/* Divider */}
                            <div className={`whiteware-filter-divider ${sortdetailsTheme.filterDivider}`}></div>

                            {/* Prefix Filter */}
                            {uniquePrefixes.length > 0 && (
                                <div className="whiteware-filter-group">
                                    <span className={`text-xs font-semibold ${sortdetailsTheme.filterLabel}`}>Prefix:</span>
                                    {uniquePrefixes.map(prefix => (
                                        <button
                                            key={prefix}
                                            onClick={() => setSelectedPrefix(prefix)}
                                            className={`whiteware-filter-chip ${selectedPrefix === prefix
                                                ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] border-[#D64045] shadow-md' : (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-blue-600 text-white border-blue-600 shadow-md'))
                                                : (isJapan ? 'bg-transparent text-[#F3EAD3] border-[#F3EAD3]/40 hover:bg-[#D64045]/30' : (isDark ? 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'))
                                                }`}
                                        >{prefix}</button>
                                    ))}
                                    <span className={`text-xs ml-2 ${isJapan ? 'text-[#F3EAD3]/70' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>({dbData.length} records)</span>
                                </div>
                            )}

                            {/* Divider */}
                            <div className={`whiteware-filter-divider ${sortdetailsTheme.filterDivider}`}></div>

                            {/* Clay Type Prefix (from unit) */}
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

                            <div className="ml-auto">
                                <button
                                    onClick={handleExportExcel}
                                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium text-sm shadow-sm flex items-center gap-1 ${isJapan
                                        ? 'bg-[#F3EAD3] hover:bg-[#E6D7B5] text-[#3E2723] border border-[#8D6E63]'
                                        : (isDark ? 'bg-sky-800 hover:bg-sky-700 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white')
                                        }`}
                                >
                                    <FileDown className="w-4 h-4" /> Export Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto p-4 md:p-6 transition-colors ${sortdetailsTheme.contentArea}`}>
                        <div className="max-w-7xl mx-auto h-full">
                            {!displayInfo ? (
                                <div className={`flex flex-col items-center justify-center h-full ${sortdetailsTheme.emptyStateText}`}>
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${sortdetailsTheme.emptyStateIconBg}`}><Search className="w-12 h-12" /></div>
                                    <p className="text-xl text-center">
                                        {loading
                                            ? 'กำลังโหลดข้อมูล...'
                                            : (fetchError || 'กรอกข้อมูลหรือเลือกวันที่ เพื่อดูรายงานคุณภาพการผลิต')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in pb-16">
                                    <ProductionReport
                                        displayInfo={displayInfo} activePage={activePage} aggregatedData={aggregatedData}
                                        dateRange={dateRange} onShowDefects={() => setShowDefectModal(true)}
                                        activeCycleName={tabs.find(t => t.id === activePage)?.label} activeCycleKey={activeCycleKey}
                                        availableSystemIds={dynamicSystemIds} selectedSystemFilter={selectedSystemFilter}
                                        onSystemFilterChange={setSelectedSystemFilter}
                                        availableKilnIds={dynamicKilnIds}
                                        selectedKilnFilter={selectedKilnFilter}
                                        onKilnFilterChange={setSelectedKilnFilter}
                                        availableModelNames={dynamicModelNames}
                                        selectedModelFilter={selectedModelFilter}
                                        onModelFilterChange={setSelectedModelFilter}
                                        availableCustomers={dynamicCustomers}
                                        selectedCustomerFilter={selectedCustomerFilter}
                                        onCustomerFilterChange={setSelectedCustomerFilter}
                                        availableJobs={dynamicJobs}
                                        selectedJobFilter={selectedJobFilter}
                                        onJobFilterChange={setSelectedJobFilter}
                                        availableLines={dynamicLines}
                                        selectedLineFilter={selectedLineFilter}
                                        onLineFilterChange={setSelectedLineFilter}
                                        selectedUnitFilter={selectedSpecUnitFilter}
                                        onUnitFilterChange={setSelectedSpecUnitFilter}
                                        theme={theme}
                                        availableUnits={dynamicUnits}
                                    />

                                    {/* Charts Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {dashboardData?.circles.map((item: any, index: number) => (
                                            <div key={index} className={`${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63]' : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')} p-4 rounded-xl shadow-sm flex flex-col items-center justify-center border`}>
                                                <div className="relative w-full h-32 md:h-40">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={[{ value: item.value }, { value: 100 - item.value }]} cx="50%" cy="50%" innerRadius={40} outerRadius={55} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                                                                <Cell key={`cell-0`} fill={item.color} />
                                                                <Cell key={`cell-1`} fill={isJapan ? '#D3C6A0' : (isDark ? '#374151' : '#f3f4f6')} />
                                                            </Pie>
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-bold" style={{ color: item.color }}>{item.value}%</span></div>
                                                </div>
                                                <span className={`text-sm font-semibold mt-2 truncate w-full text-center ${isJapan ? 'text-[#3E2723]' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>{item.name}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Monthly Trend Chart */}
                                        <div className={`${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63]' : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')} p-6 shadow-sm border ${isMonthlyExpanded ? 'fixed inset-0 z-[70] rounded-none flex flex-col' : 'rounded-xl'}`}>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <h3 className={`text-lg font-bold ${isJapan ? 'text-[#3E2723]' : (isDark ? 'text-gray-200' : 'text-gray-700')}`}>Monthly Trend ({tabs.find(t => t.id === activePage)?.label})</h3>
                                                    <div className={`flex rounded-lg p-1 text-xs font-medium ${isJapan ? 'bg-[#E6D7B5]' : (isDark ? 'bg-gray-700' : 'bg-gray-100')}`}>
                                                        <button onClick={() => setChartViewMode('year')} className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'year' ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] shadow-sm' : (isDark ? 'bg-gray-600 text-blue-300 shadow-sm' : 'bg-white text-blue-600 shadow-sm')) : (isJapan ? 'text-[#5D4037] hover:text-[#3E2723]' : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'))}`}>รายปี</button>
                                                        <button onClick={() => setChartViewMode('all')} className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'all' ? (isJapan ? 'bg-[#D64045] text-[#F3EAD3] shadow-sm' : (isDark ? 'bg-gray-600 text-blue-300 shadow-sm' : 'bg-white text-blue-600 shadow-sm')) : (isJapan ? 'text-[#5D4037] hover:text-[#3E2723]' : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'))}`}>ภาพรวมทุกปี</button>
                                                    </div>
                                                    {chartViewMode === 'year' && availableYears.length > 0 && (
                                                        <div className="relative">
                                                            <select
                                                                className={`appearance-none border text-xs rounded-lg py-1 pl-3 pr-8 focus:outline-none focus:ring-2 font-medium cursor-pointer ${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63] text-[#3E2723] focus:ring-[#D64045]' : (isDark ? 'bg-gray-700 border-gray-600 text-blue-300 focus:ring-blue-500' : 'bg-blue-50 border-blue-200 text-blue-800 focus:ring-blue-300')}`}
                                                                value={trendYear}
                                                                onChange={(e) => setTrendYear(e.target.value)}
                                                            >
                                                                {availableYears.map(year => (
                                                                    <option key={year} value={year}>{year}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="w-3 h-3 absolute right-2.5 top-2 pointer-events-none text-gray-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex gap-3 font-medium ${isMonthlyExpanded ? 'text-sm' : 'text-xs'}`}>
                                                        <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : ''}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: dashboardData?.colors?.[0] }}></span>Complete</span>
                                                        <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : ''}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: dashboardData?.colors?.[1] }}></span>Reject</span>
                                                        <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : ''}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: dashboardData?.colors?.[2] }}></span>Scrap</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedChart(prev => prev === 'monthly' ? null : 'monthly')}
                                                        title={isMonthlyExpanded ? 'Exit full screen' : 'Full screen'}
                                                        aria-label={isMonthlyExpanded ? 'Exit full screen' : 'Full screen'}
                                                        className={`p-2 rounded-lg border transition-colors ${isJapan
                                                            ? 'bg-[#F3EAD3] hover:bg-[#E6D7B5] border-[#8D6E63] text-[#3E2723]'
                                                            : (isDark
                                                                ? 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-200'
                                                                : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700')}`}
                                                    >
                                                        {isMonthlyExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={`${isMonthlyExpanded ? 'flex-1 min-h-0' : 'h-64'} w-full`}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={chartViewMode === 'year' ? dashboardData?.verticalData : dashboardData?.aggregateData} barSize={isMonthlyExpanded ? 42 : 30}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isJapan ? "#D3C6A0" : (isDark ? "#374151" : "#f0f0f0")} strokeWidth={isMonthlyExpanded ? 1.4 : 1} />
                                                        <XAxis
                                                            dataKey="name"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{
                                                                fontSize: isMonthlyExpanded ? 15 : 12,
                                                                fontWeight: isMonthlyExpanded ? 700 : 500,
                                                                fill: isJapan ? '#5D4037' : (isDark ? '#9CA3AF' : '#666'),
                                                                stroke: isMonthlyExpanded ? monthlyTickStroke : 'none',
                                                                strokeWidth: isMonthlyExpanded ? 1.6 : 0,
                                                                paintOrder: 'stroke'
                                                            }}
                                                            interval={0}
                                                        />
                                                        <Tooltip cursor={{ fill: isJapan ? '#E6D7B5' : (isDark ? '#1F2937' : '#f9fafb') }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backgroundColor: isJapan ? '#F3EAD3' : (isDark ? '#1F2937' : '#fff'), color: isJapan ? '#3E2723' : (isDark ? '#fff' : '#000') }}
                                                            formatter={(value: any, name: any, props: any) => {
                                                                const { payload } = props;
                                                                const realVal = name === "Complete" ? payload.part1 : (name === "Reject" ? payload.part2 : payload.part3);
                                                                return [`${realVal}%`, name];
                                                            }}
                                                        />
                                                        <Bar dataKey="vPart1" stackId="a" fill={dashboardData?.colors?.[0] || COLORS[0]} radius={[0, 0, 0, 0]} name="Complete" strokeWidth={isMonthlyExpanded ? 2 : 1}> <LabelList dataKey="part1" position="center" fill="white" fontSize={isMonthlyExpanded ? 13 : 10} fontWeight={isMonthlyExpanded ? 800 : "bold"} stroke={isMonthlyExpanded ? monthlyLabelStroke : 'none'} strokeWidth={isMonthlyExpanded ? 1.8 : 0} paintOrder="stroke" formatter={(val: any) => val > 0 ? `${val}%` : ''} /> </Bar>
                                                        <Bar dataKey="vPart2" stackId="a" fill={dashboardData?.colors?.[1] || COLORS[1]} radius={[0, 0, 0, 0]} name="Reject" strokeWidth={isMonthlyExpanded ? 2 : 1}> <LabelList dataKey="part2" position="center" fill="white" fontSize={isMonthlyExpanded ? 13 : 10} fontWeight={isMonthlyExpanded ? 800 : "bold"} stroke={isMonthlyExpanded ? monthlyLabelStroke : 'none'} strokeWidth={isMonthlyExpanded ? 1.8 : 0} paintOrder="stroke" formatter={(val: any) => val > 0 ? `${val}%` : ''} /> </Bar>
                                                        <Bar dataKey="vPart3" stackId="a" fill={dashboardData?.colors?.[2] || COLORS[2]} radius={[4, 4, 0, 0]} name="Scrap" strokeWidth={isMonthlyExpanded ? 2 : 1}> <LabelList dataKey="part3" position="center" fill="white" fontSize={isMonthlyExpanded ? 13 : 10} fontWeight={isMonthlyExpanded ? 800 : "bold"} stroke={isMonthlyExpanded ? monthlyLabelStroke : 'none'} strokeWidth={isMonthlyExpanded ? 1.8 : 0} paintOrder="stroke" formatter={(val: any) => val > 0 ? `${val}%` : ''} /> </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        {/* Kiln Performance Chart */}
                                        <div className={`${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63]' : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')} p-6 shadow-sm border ${isKilnExpanded ? 'fixed inset-0 z-[70] rounded-none flex flex-col' : 'rounded-xl'}`}>
                                            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                                                <h3 className={`text-lg font-bold ${isJapan ? 'text-[#3E2723]' : (isDark ? 'text-gray-200' : 'text-gray-700')}`}>Kiln Performance</h3>
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex gap-3 font-medium ${isKilnExpanded ? 'text-sm' : 'text-xs'}`}>
                                                        <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : ''}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: dashboardData?.colors?.[0] }}></span>Complete</span>
                                                        <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : ''}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: dashboardData?.colors?.[1] }}></span>Reject</span>
                                                        <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : ''}`}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: dashboardData?.colors?.[2] }}></span>Scrap</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedChart(prev => prev === 'kiln' ? null : 'kiln')}
                                                        title={isKilnExpanded ? 'Exit full screen' : 'Full screen'}
                                                        aria-label={isKilnExpanded ? 'Exit full screen' : 'Full screen'}
                                                        className={`p-2 rounded-lg border transition-colors ${isJapan
                                                            ? 'bg-[#F3EAD3] hover:bg-[#E6D7B5] border-[#8D6E63] text-[#3E2723]'
                                                            : (isDark
                                                                ? 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-200'
                                                                : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700')}`}
                                                    >
                                                        {isKilnExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div
                                                className={`w-full ${isKilnExpanded ? 'flex-1 min-h-0' : 'overflow-y-auto'}`}
                                                style={isKilnExpanded ? undefined : { maxHeight: '250px' }}
                                            >
                                                <div
                                                    className={isKilnExpanded ? 'h-full' : ''}
                                                    style={isKilnExpanded ? undefined : { height: `${kilnCompactChartHeight}px` }}
                                                >
                                                    {dashboardData?.horizontalData?.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart
                                                                layout="vertical"
                                                                data={dashboardData?.horizontalData}
                                                                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                                                                barCategoryGap={isKilnExpanded ? '10%' : '14%'}
                                                                {...(isKilnExpanded ? {} : { barSize: 40 })}
                                                            >
                                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isJapan ? "#D3C6A0" : (isDark ? "#374151" : "#f0f0f0")} strokeWidth={isKilnExpanded ? 1.4 : 1} />
                                                                <XAxis type="number" hide domain={[0, 100]} />
                                                                <YAxis
                                                                    dataKey="name"
                                                                    type="category"
                                                                    width={isKilnExpanded ? 110 : 80}
                                                                    axisLine={false}
                                                                    tickLine={false}
                                                                    tick={{
                                                                        fontSize: isKilnExpanded ? 15 : 12,
                                                                        fontWeight: isKilnExpanded ? 700 : 500,
                                                                        fill: isJapan ? '#5D4037' : (isDark ? '#9CA3AF' : '#6b7280'),
                                                                        stroke: isKilnExpanded ? kilnTickStroke : 'none',
                                                                        strokeWidth: isKilnExpanded ? 1.6 : 0,
                                                                        paintOrder: 'stroke'
                                                                    }}
                                                                />
                                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backgroundColor: isJapan ? '#F3EAD3' : (isDark ? '#1F2937' : '#fff'), color: isJapan ? '#3E2723' : (isDark ? '#fff' : '#000') }}
                                                                    formatter={(value: any, name: any, props: any) => {
                                                                        const { payload } = props;
                                                                        const realVal = name === "Complete" ? payload.part1 : (name === "Reject" ? payload.part2 : payload.part3);
                                                                        return [`${realVal}%`, name];
                                                                    }}
                                                                />
                                                                <Bar dataKey="vPart1" stackId="a" fill={dashboardData?.colors?.[0] || COLORS[0]} name="Complete" strokeWidth={isKilnExpanded ? 2 : 1}> <LabelList dataKey="part1" position="center" fill="white" fontSize={isKilnExpanded ? 13 : 10} fontWeight={isKilnExpanded ? 800 : 500} stroke={isKilnExpanded ? kilnLabelStroke : 'none'} strokeWidth={isKilnExpanded ? 1.8 : 0} paintOrder="stroke" formatter={(val: any) => val > 0 ? `${val}%` : ''} /> </Bar>
                                                                <Bar dataKey="vPart2" stackId="a" fill={dashboardData?.colors?.[1] || COLORS[1]} name="Reject" strokeWidth={isKilnExpanded ? 2 : 1}> <LabelList dataKey="part2" position="center" fill="white" fontSize={isKilnExpanded ? 13 : 10} fontWeight={isKilnExpanded ? 800 : 500} stroke={isKilnExpanded ? kilnLabelStroke : 'none'} strokeWidth={isKilnExpanded ? 1.8 : 0} paintOrder="stroke" formatter={(val: any) => val > 0 ? `${val}%` : ''} /> </Bar>
                                                                <Bar dataKey="vPart3" stackId="a" fill={dashboardData?.colors?.[2] || COLORS[2]} name="Scrap" strokeWidth={isKilnExpanded ? 2 : 1}> <LabelList dataKey="part3" position="center" fill="white" fontSize={isKilnExpanded ? 13 : 10} fontWeight={isKilnExpanded ? 800 : 500} stroke={isKilnExpanded ? kilnLabelStroke : 'none'} strokeWidth={isKilnExpanded ? 1.8 : 0} paintOrder="stroke" formatter={(val: any) => val > 0 ? `${val}%` : ''} /> </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className={`h-full flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No Kiln Data</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`${sortdetailsTheme.bottomTabsBar} whiteware-bottom-tabs-bar`}>
                        <div className="max-w-7xl mx-auto whiteware-bottom-tabs-wrap">
                            {tabs.map((tab) => {
                                const isActive = activePage === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActivePage(tab.id)}
                                        className={`whiteware-filter-chip ${isActive
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
                                        {tab.shortLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Sortdetails;

