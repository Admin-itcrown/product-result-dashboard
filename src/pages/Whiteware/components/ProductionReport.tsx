import React from 'react';
import {
    FileText, Factory, AlertCircle, Calendar,
    ChevronDown, X, List, TrendingUp
} from 'lucide-react';
import { getProductionReportThemeClasses } from './themeStyles';

// --- Types ---
export interface DefectData {
    type: string;
    reason: string;
    qty: number;
    pd?: string;
    [key: string]: any;
}

export interface CycleData {
    process: number;
    complete: number;
    scrap: number;
    reject: number;
}

export interface AggregatedData {
    cycles: Record<string, CycleData>;
    monthly: Record<string, CycleData>;
    kilns: Record<string, CycleData>;
    monthlyByCycle?: Record<string, Record<string, CycleData>>;
    kilnsByCycle?: Record<string, Record<string, CycleData>>;
}

export interface DisplayInfo {
    itemId?: string;
    detail1?: string;
    detail2?: string;
    job?: string;
    mDoc?: string;
    line?: string;
    kiln?: string;
    topDefectsByCycle?: Record<string, any>;
    allDefectsByCycle?: Record<string, DefectData[]>;
    [key: string]: any;
}

export interface DbItem {
    itemId: string;
    detail1?: string;
    detail2?: string;
    job?: string;
    mDoc?: string;
    line?: string;
    kiln?: string;
    unit?: string;
    userlog?: string;
    cycle?: string;
    date?: string;
    process?: number;
    complete?: number;
    scrap?: number;
    reject?: number;
    defects?: DefectData[];
    [key: string]: any;
}

// --- HELPER FUNCTIONS ---
export const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return dateStr;
};

export const getUniqueCustomers = (db: DbItem[]) => {
    const customers = new Set<string>();
    db.forEach(item => {
        if (item.detail2) customers.add(item.detail2);
        if (item.kiln) customers.add(item.kiln);
        if (item.line) customers.add(item.line);
    });
    return Array.from(customers).sort();
};

export const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
export const JAPAN_COLORS = ['#2F4F4F', '#E9C46A', '#D64045']; // Green, gold, red accent

const CYCLE_KEY_ALIASES: Record<string, string[]> = {
    C: ['C', '1ST', '1', 'FIRST', 'CP'],
    P1: ['P1'],
    P2: ['P2'],
    P3: ['P3'],
    P4: ['P4'],
    P5: ['P5']
};

const getCycleScopedValue = <T,>(source: Record<string, T> | undefined, cycleKey: string): T | undefined => {
    if (!source) return undefined;
    const candidates = CYCLE_KEY_ALIASES[cycleKey] || [cycleKey];

    for (const candidate of candidates) {
        const directMatch = source[candidate];
        if (directMatch !== undefined) return directMatch;
    }

    const normalizedSourceKeys = Object.keys(source);
    for (const candidate of candidates) {
        const normalizedCandidate = candidate.trim().toUpperCase();
        const foundKey = normalizedSourceKeys.find((key) => key.trim().toUpperCase() === normalizedCandidate);
        if (foundKey) return source[foundKey];
    }

    return undefined;
};

// --- Helper: Apply minimum visual bar width (6%) to all segments > 0 ---
export const applyMinVisual = (p1: number, p2: number, p3: number) => {
    const MIN = 6;
    const parts = [p1, p2, p3];
    const visual = [...parts];

    // Find segments that need boosting (> 0 but < MIN)
    let deficit = 0;
    const needsBoost: number[] = [];
    const canShrink: number[] = [];
    parts.forEach((v, i) => {
        if (v > 0 && v < MIN) {
            deficit += (MIN - v);
            visual[i] = MIN;
            needsBoost.push(i);
        } else if (v >= MIN) {
            canShrink.push(i);
        }
    });

    // Distribute the deficit by shrinking the larger segments proportionally
    if (deficit > 0 && canShrink.length > 0) {
        const shrinkTotal = canShrink.reduce((sum, i) => sum + parts[i], 0);
        canShrink.forEach(i => {
            const ratio = parts[i] / shrinkTotal;
            visual[i] = Math.max(0, Math.round(parts[i] - deficit * ratio));
        });
    }

    return { vPart1: visual[0], vPart2: visual[1], vPart3: visual[2] };
};

// --- Chart Data Generator ---
export const generateChartData = (pageId: number, aggregatedData: AggregatedData | null, selectedYear: string, theme: string) => {
    let cycleKey = 'C';
    if (pageId === 3) cycleKey = 'P1';
    if (pageId === 4) cycleKey = 'P2';
    // Added P3-P5 keys
    if (pageId === 5) cycleKey = 'P3';
    if (pageId === 6) cycleKey = 'P4';
    if (pageId === 7) cycleKey = 'P5';

    const cycleData = getCycleScopedValue(aggregatedData?.cycles, cycleKey) || { process: 0, complete: 0, reject: 0, scrap: 0 };
    const total = cycleData.process || 0;

    const pComplete = total > 0 ? Math.round((cycleData.complete / total) * 100) : 0;
    const pReject = total > 0 ? Math.round((cycleData.reject / total) * 100) : 0;
    const pScrap = total > 0 ? Math.max(0, 100 - pComplete - pReject) : 0;

    // Theme color palette selection
    const currentColors = theme === 'japan' ? JAPAN_COLORS : COLORS;
    const monthlySource = getCycleScopedValue(aggregatedData?.monthlyByCycle, cycleKey) || aggregatedData?.monthly || {};
    const kilnSource = getCycleScopedValue(aggregatedData?.kilnsByCycle, cycleKey) || aggregatedData?.kilns || {};

    const monthlyData: any[] = [];
    if (monthlySource) {
        Object.keys(monthlySource).sort().forEach(key => {
            const [year, month] = key.split('-');
            if (year !== selectedYear) return;
            const mData = monthlySource[key];
            const mTotal = mData.process || 1;
            const part1 = Math.round((mData.complete / mTotal) * 100);
            const part2 = Math.round((mData.reject / mTotal) * 100);
            const part3 = 100 - part1 - part2;
            const { vPart1, vPart2, vPart3 } = applyMinVisual(part1, part2, part3);

            const dateObj = new Date(parseInt(year), parseInt(month) - 1);
            const monthName = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            monthlyData.push({ name: monthName, part1, part2, part3, vPart1, vPart2, vPart3, total: 100 });
        });
    }

    // Sort monthlyData by month index to ensure Jan-Dec order if keys are not sorted
    // (Though 'yyyy-mm' keys sort correctly lexicographically, re-parsing ensures safety)
    // Actually the keys object.keys sort is usually sufficient for 'yyyy-mm'

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const aggTotals = Array(12).fill(0).map(() => ({ process: 0, complete: 0, reject: 0, scrap: 0 }));

    if (monthlySource) {
        Object.keys(monthlySource).forEach(key => {
            const [_, m] = key.split('-');
            const mIdx = parseInt(m, 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
                const d = monthlySource[key];
                aggTotals[mIdx].process += d.process;
                aggTotals[mIdx].complete += d.complete;
                aggTotals[mIdx].reject += d.reject;
                aggTotals[mIdx].scrap += d.scrap;
            }
        });
    }

    const aggregateMonthlyData = aggTotals.map((t, i) => {
        const total = t.process || 1;
        const part1 = Math.round((t.complete / total) * 100);
        const part2 = Math.round((t.reject / total) * 100);
        let part3 = 0; if (t.process > 0) part3 = 100 - part1 - part2;
        const { vPart1, vPart2, vPart3 } = applyMinVisual(
            t.process > 0 ? part1 : 0,
            t.process > 0 ? part2 : 0,
            t.process > 0 ? part3 : 0
        );

        return {
            name: monthNames[i],
            part1: t.process > 0 ? part1 : 0,
            part2: t.process > 0 ? part2 : 0,
            part3: t.process > 0 ? part3 : 0,
            vPart1, vPart2, vPart3,
            total: 100
        };
    });

    const kilnData: any[] = [];
    if (kilnSource) {
        Object.keys(kilnSource).forEach(key => {
            const kData = kilnSource[key];
            const kTotal = kData.process || 1;
            const part1 = Math.round((kData.complete / kTotal) * 100);
            const part2 = Math.round((kData.reject / kTotal) * 100);
            const part3 = 100 - part1 - part2;
            const { vPart1, vPart2, vPart3 } = applyMinVisual(part1, part2, part3);

            kilnData.push({ name: key, part1, part2, part3, vPart1, vPart2, vPart3, total: 100, qty: kData.process });
        });
        kilnData.sort((a, b) => b.qty - a.qty);
    }

    return {
        circles: [
            { name: 'Oven Efficiency (Complete)', value: pComplete, color: currentColors[0] },
            { name: 'Melting Rate (Reject)', value: pReject, color: currentColors[1] },
            { name: 'Cooling (Scrap)', value: pScrap, color: currentColors[2] },
        ],
        verticalData: monthlyData,
        aggregateData: aggregateMonthlyData,
        horizontalData: kilnData,
        colors: currentColors
    };
};

export interface DefectModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    theme: string;
}

export const DefectModal: React.FC<DefectModalProps> = ({ isOpen, onClose, data, theme }) => {
    if (!isOpen || !data) return null;

    const isDark = theme === 'dark';
    const isJapan = theme === 'japan';

    // Theme Variables for Modal
    let bgClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white';
    if (isJapan) bgClass = 'bg-[#F3EAD3] border-[#8D6E63]'; // Cream paper background

    let headerClass = isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200';
    if (isJapan) headerClass = 'bg-[#E6D7B5] border-[#8D6E63]';

    let textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    if (isJapan) textClass = 'text-[#3E2723]'; // Dark brown text

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`${bgClass} w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border`}>
                <div className={`${headerClass} px-6 py-4 border-b flex justify-between items-center`}>
                    <div>
                        <h3 className={`${textClass} text-lg font-bold flex items-center gap-2`}>
                            <List className={`w-5 h-5 ${isJapan ? 'text-[#D64045]' : 'text-blue-500'}`} />
                            รายละเอียดความเสียหาย (Defect Breakdown)
                        </h3>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className={`${isDark ? 'text-gray-400' : (isJapan ? 'text-[#5D4037]' : 'text-gray-500')} text-sm`}>
                                Item: <span className="font-medium">{data.itemId}</span> |
                                Job: <span className="font-medium">{data.job}</span>
                            </p>
                            {data.cycleName && (
                                <span className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isJapan ? 'bg-[#2F4F4F] text-[#F3EAD3]' : (isDark ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800')}`}>
                                    {data.cycleName}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isJapan ? 'hover:bg-[#D64045]/10 text-[#3E2723]' : (isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500')}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-0 flex-1">
                    {data.defects && data.defects.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className={`${isJapan ? 'bg-[#556B2F] text-[#F3EAD3]' : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')} font-semibold sticky top-0 z-10 shadow-sm`}>
                                <tr>
                                    <th className="px-6 py-3 w-1/4">ประเภทข้อมูล</th>
                                    <th className="px-6 py-3 w-1/4 text-center">จำนวน</th>
                                    <th className="px-6 py-3 w-1/3">สาเหตุ</th>
                                    <th className="px-6 py-3 w-1/6 text-center">pD</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isJapan ? 'divide-[#8D6E63]/30' : (isDark ? 'divide-gray-700' : 'divide-gray-100')}`}>
                                {data.defects.map((defect: any, idx: number) => (
                                    <tr key={idx} className={`${isJapan ? 'hover:bg-[#E6D7B5]' : (isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')} transition-colors ${textClass}`}>
                                        <td className="px-6 py-3 font-medium">{defect.type}</td>
                                        <td className="px-6 py-3 text-center font-bold">{defect.qty.toLocaleString()}</td>
                                        <td className="px-6 py-3">{defect.reason}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`inline-block px-2 py-1 rounded font-bold text-xs ${isJapan ? 'bg-[#D64045] text-white' : (isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700')}`}>
                                                {defect.pd}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className={`${isJapan ? 'bg-[#E6D7B5] border-[#8D6E63] text-[#3E2723]' : (isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-50 text-gray-700 border-gray-200')} font-semibold border-t`}>
                                <tr>
                                    <td className="px-6 py-3">Total</td>
                                    <td className="px-6 py-3 text-center">
                                        {data.defects.reduce((sum: number, d: any) => sum + Number(d.qty || 0), 0).toLocaleString()}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                            <p>ไม่พบข้อมูลรายละเอียดความเสียหายสำหรับ {data.cycleName || 'รายการนี้'}</p>
                        </div>
                    )}
                </div>
                <div className={`${headerClass} px-6 py-4 border-t text-right`}>
                    <button onClick={onClose} className={`${isJapan ? 'bg-[#D64045] hover:bg-[#B71C1C] text-white border-[#B71C1C]' : (isDark ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')} border px-4 py-2 rounded-lg font-medium transition-colors`}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export interface ProductionReportProps {
    displayInfo: DisplayInfo;
    activePage: number;
    aggregatedData: AggregatedData | null;
    dateRange: { start: string; end: string };
    onShowDefects: () => void;
    activeCycleName?: string;
    activeCycleKey: string;
    availableSystemIds: string[];
    selectedSystemFilter: string;
    onSystemFilterChange: (id: string) => void;
    availableKilnIds: string[];
    selectedKilnFilter: string;
    onKilnFilterChange: (id: string) => void;
    availableModelNames: string[];
    selectedModelFilter: string;
    onModelFilterChange: (id: string) => void;
    availableCustomers: string[];
    selectedCustomerFilter: string;
    onCustomerFilterChange: (id: string) => void;
    availableJobs: string[];
    selectedJobFilter: string;
    onJobFilterChange: (id: string) => void;
    availableLines: string[];
    selectedLineFilter: string;
    onLineFilterChange: (id: string) => void;
    selectedUnitFilter: string;
    onUnitFilterChange: (id: string) => void;
    theme: string;
    availableUnits?: string[];
}

export const ProductionReport: React.FC<ProductionReportProps> = ({
    displayInfo, activePage, aggregatedData, dateRange, onShowDefects,
    activeCycleName, activeCycleKey, availableSystemIds, selectedSystemFilter, onSystemFilterChange,
    availableKilnIds, selectedKilnFilter, onKilnFilterChange,
    availableModelNames, selectedModelFilter, onModelFilterChange,
    availableCustomers, selectedCustomerFilter, onCustomerFilterChange,
    availableJobs, selectedJobFilter, onJobFilterChange,
    availableLines, selectedLineFilter, onLineFilterChange,
    selectedUnitFilter, onUnitFilterChange,
    theme, availableUnits
}) => {
    const isDark = theme === 'dark';
    const isJapan = theme === 'japan';

    // Centralized theme styles keep color mappings consistent across Whiteware pages.
    const { textColor, subTextColor, cardBg, headerBg, accentColor, tagBg } = getProductionReportThemeClasses(theme);

    const headerInfo = {
        itemNumber: displayInfo.itemId || "-",
        detail1: displayInfo.detail1 || "-",
        detail2: displayInfo.detail2 || "-",
        job: displayInfo.job || "-",
        mDoc: displayInfo.mDoc || "-",
        line: displayInfo.line || "-",
        kiln: displayInfo.kiln || "-",
        unit: (displayInfo as any).unit || "-",
        date: `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    };

    const calculatePercent = (qty: number, total: number) => total > 0 ? Math.round((qty / total) * 100) : 0;

    // Updated Cycle Names
    const getCycleName = (code: string) => {
        if (code === 'C') return '1st Firing';
        if (code === 'P1') return 'P1 Firing';
        if (code === 'P2') return 'P2 Firing';
        if (code === 'P3') return 'P3 Firing';
        if (code === 'P4') return 'P4 Firing';
        if (code === 'P5') return 'P5 Firing';
        return code;
    };

    const formatTableData = (cycleCode: string, id: number) => {
        const data = aggregatedData?.cycles?.[cycleCode] || { process: 0, complete: 0, reject: 0, scrap: 0 };
        const pComplete = calculatePercent(data.complete, data.process);
        const pReject = calculatePercent(data.reject, data.process);
        const pScrap = data.process > 0 ? Math.max(0, 100 - pComplete - pReject) : 0;
        return {
            id: id,
            cycle: getCycleName(cycleCode),
            qtyProcess: data.process,
            gradeA: { qty: data.complete, percent: pComplete },
            gradeB: { qty: data.scrap, percent: pScrap },
            gradeP: { qty: data.reject, percent: pReject },
        };
    };

    // Updated Table Data to include P3-P5
    const tableData = [
        formatTableData('C', 1),
        formatTableData('P1', 3),
        formatTableData('P2', 4),
        formatTableData('P3', 5),
        formatTableData('P4', 6),
        formatTableData('P5', 7),
    ];

    const currentCycleData = tableData.find(row => row.id === activePage) || tableData[0];
    const formatNumber = (num: number) => num.toLocaleString();
    const formatPercent = (percent: number) => `${percent}%`;

    const currentTopDefects = displayInfo.topDefectsByCycle?.[activeCycleKey] || {
        scrap: [], reject: [], scrapChart: [], rejectChart: [], kilns: []
    };

    const hasDefectsForCycle = (displayInfo.allDefectsByCycle?.[activeCycleKey]?.length || 0) > 0;

    // Helper to get color for Summary box
    const getSummaryColorClass = (page: number) => {
        if (isJapan) {
            if (page === 1) return 'bg-[#2F4F4F] text-[#F3EAD3]';
            if (page === 3) return 'bg-[#E9C46A] text-[#3E2723]';
            if (page === 4) return 'bg-[#556B2F] text-[#F3EAD3]';
            return 'bg-[#8D6E63] text-[#F3EAD3]'; // Default brown for others
        }
        // Dark/Light
        const colors = [
            { light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-900 text-blue-300' },     // 1
            { light: 'bg-orange-100 text-orange-700', dark: 'bg-orange-900 text-orange-300' }, // 2
            { light: 'bg-cyan-100 text-cyan-700', dark: 'bg-cyan-900 text-cyan-300' },       // 3
            { light: 'bg-purple-100 text-purple-700', dark: 'bg-purple-900 text-purple-300' }, // 4
            { light: 'bg-pink-100 text-pink-700', dark: 'bg-pink-900 text-pink-300' },       // 5
            { light: 'bg-indigo-100 text-indigo-700', dark: 'bg-indigo-900 text-indigo-300' }, // 6
            { light: 'bg-teal-100 text-teal-700', dark: 'bg-teal-900 text-teal-300' },       // 7
        ];
        const idx = page - 1;
        if (idx >= 0 && idx < colors.length) {
            return isDark ? colors[idx].dark : colors[idx].light;
        }
        return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
    };

    const specSelectClass = `appearance-none w-full border py-1.5 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 font-bold text-base cursor-pointer transition-colors shadow-sm ${isJapan ? 'bg-[#F3EAD3] border-[#8D6E63] text-[#3E2723] focus:ring-[#D64045]' : (isDark ? 'bg-gray-700 border-gray-600 text-blue-300 focus:ring-blue-500' : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100')}`;
    const getFieldDisplayValue = (selected: string, fallback: string) => selected !== 'ALL' ? selected : fallback;
    const hasActiveSpecFilters =
        selectedModelFilter !== 'ALL' ||
        selectedSystemFilter !== 'ALL' ||
        selectedCustomerFilter !== 'ALL' ||
        selectedJobFilter !== 'ALL' ||
        selectedKilnFilter !== 'ALL' ||
        selectedLineFilter !== 'ALL' ||
        selectedUnitFilter !== 'ALL';

    const resetSpecFilters = () => {
        onModelFilterChange('ALL');
        onSystemFilterChange('ALL');
        onCustomerFilterChange('ALL');
        onJobFilterChange('ALL');
        onKilnFilterChange('ALL');
        onLineFilterChange('ALL');
        onUnitFilterChange('ALL');
    };

    return (
        <div className="space-y-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${textColor} flex items-center gap-2`}>
                        <Factory className={`w-6 h-6 ${accentColor}`} />
                        Production Quality Report
                        <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold border shadow-sm ${tagBg}`}>
                            {activeCycleName}
                        </span>
                    </h1>
                    <p className={`${subTextColor} text-sm mt-1`}>รายงานสรุปคุณภาพการผลิตตามช่วงเวลา</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`${isJapan ? 'bg-[#E6D7B5] border-[#8D6E63] text-[#3E2723]' : (isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600')} px-4 py-2 rounded-lg shadow-sm border text-sm flex items-center gap-2`}>
                        <Calendar className="w-4 h-4" />
                        <span>Range: {headerInfo.date}</span>
                    </div>
                    {hasDefectsForCycle && (
                        <button onClick={onShowDefects} className={`${isJapan ? 'bg-[#D64045] hover:bg-[#B71C1C]' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-lg shadow-sm font-medium text-sm flex items-center gap-2 transition-all active:scale-95`}>
                            <List className="w-4 h-4" />
                            View Defects ({activeCycleName})
                        </button>
                    )}
                </div>
            </div>

            <div className={`${cardBg} rounded-xl shadow-sm border overflow-hidden`}>
                <div className={`${headerBg} px-6 py-3 border-b flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${subTextColor}`} />
                        <h3 className={`font-semibold ${isJapan ? 'text-[#3E2723]' : (isDark ? 'text-gray-200' : 'text-gray-700')}`}>Specification Info</h3>
                    </div>
                    <button
                        type="button"
                        onClick={resetSpecFilters}
                        disabled={!hasActiveSpecFilters}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${hasActiveSpecFilters
                            ? (isJapan
                                ? 'bg-[#D64045] hover:bg-[#B71C1C] border-[#B71C1C] text-[#F3EAD3]'
                                : (isDark
                                    ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200'
                                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'))
                            : (isJapan
                                ? 'bg-[#E6D7B5] border-[#8D6E63]/40 text-[#8D6E63] cursor-not-allowed'
                                : (isDark
                                    ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'))}`}
                    >
                        Reset All Filters
                    </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>รายละเอียด 1 (Model Name)</span>
                        {availableModelNames.length > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedModelFilter} onChange={(e) => onModelFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Models</option>
                                    {availableModelNames.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${textColor}`}>{getFieldDisplayValue(selectedModelFilter, headerInfo.detail1)}</span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>เลขที่ระบบ (System ID)</span>
                        {availableSystemIds.length > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedSystemFilter} onChange={(e) => onSystemFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Batches (รวมทุก Lot)</option>
                                    {availableSystemIds.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${textColor}`}>{getFieldDisplayValue(selectedSystemFilter, headerInfo.mDoc)}</span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>รายละเอียด 2 (Customer)</span>
                        {availableCustomers.length > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedCustomerFilter} onChange={(e) => onCustomerFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Customers</option>
                                    {availableCustomers.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${isJapan ? 'text-[#D64045]' : 'text-blue-600'}`}>{getFieldDisplayValue(selectedCustomerFilter, headerInfo.detail2)}</span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>Job ID</span>
                        {availableJobs.length > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedJobFilter} onChange={(e) => onJobFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Jobs</option>
                                    {availableJobs.map(job => <option key={job} value={job}>{job}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${textColor}`}>{getFieldDisplayValue(selectedJobFilter, headerInfo.job)}</span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>Kiln (เตาเผา)</span>
                        {availableKilnIds.length > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedKilnFilter} onChange={(e) => onKilnFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Kilns (รวมทุกเตา)</option>
                                    {availableKilnIds.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${textColor}`}>{getFieldDisplayValue(selectedKilnFilter, headerInfo.kiln)}</span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>สายการผลิต (Line)</span>
                        {availableLines.length > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedLineFilter} onChange={(e) => onLineFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Lines</option>
                                    {availableLines.map(line => <option key={line} value={line}>{line}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${textColor}`}>{getFieldDisplayValue(selectedLineFilter, headerInfo.line)}</span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>Unit (Debug Data)</span>
                        {(availableUnits?.length || 0) > 1 ? (
                            <div className="relative mt-1">
                                <select value={selectedUnitFilter} onChange={(e) => onUnitFilterChange(e.target.value)} className={specSelectClass}>
                                    <option value="ALL">All Units</option>
                                    {availableUnits && availableUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 top-2 w-4 h-4 text-gray-500" />
                            </div>
                        ) : (
                            <span className={`text-lg font-medium break-words ${textColor}`}>{getFieldDisplayValue(selectedUnitFilter, headerInfo.unit)}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className={`${cardBg} rounded-xl shadow-sm border overflow-hidden`}>
                <div className={`${headerBg} px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
                    <h3 className={`font-semibold ${textColor}`}>Percentage Overall</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center min-w-[800px]">
                        <thead>
                            <tr className={isJapan ? 'bg-[#556B2F] text-[#F3EAD3] border-[#8D6E63]' : (isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200')}>
                                <th rowSpan={2} colSpan={2} className={`p-3 border-r font-semibold w-1/3 ${isJapan ? 'border-[#F3EAD3]/30' : (isDark ? 'border-gray-600' : 'border-gray-200')}`}>Firing Cycle</th>
                                <th colSpan={2} className={`p-2 border-r font-semibold ${isJapan ? 'border-[#F3EAD3]/30' : (isDark ? 'bg-emerald-900/30 text-emerald-400 border-gray-600' : 'bg-emerald-50 text-emerald-800 border-gray-200')}`}>Complete</th>
                                <th colSpan={2} className={`p-2 border-r font-semibold ${isJapan ? 'border-[#F3EAD3]/30' : (isDark ? 'bg-red-900/30 text-red-400 border-gray-600' : 'bg-red-50 text-red-800 border-gray-200')}`}>Scrap</th>
                                <th colSpan={2} className={`p-2 font-semibold ${isJapan ? '' : (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-800')}`}>Reject</th>
                            </tr>
                            <tr className={isJapan ? 'bg-[#6B8E23] text-[#F3EAD3]' : (isDark ? 'bg-gray-800 text-gray-400 border-gray-600' : 'bg-gray-5 text-gray-500 border-gray-200')}>
                                {['Qty', '%', 'Qty', '%', 'Qty', '%'].map((h, i) => (
                                    <th key={i} className={`p-2 ${i < 5 ? 'border-r' : ''} w-24 ${isJapan ? 'border-[#F3EAD3]/30' : (isDark ? 'border-gray-600' : 'border-gray-200')}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isJapan ? 'divide-[#8D6E63]/30' : (isDark ? 'divide-gray-700' : 'divide-gray-100')}`}>
                            {tableData.map((row) => {
                                const isActiveRow = row.id === activePage;
                                let activeClass = '';
                                if (isActiveRow) {
                                    activeClass = isJapan ? 'bg-[#E6D7B5] border-l-4 border-[#D64045]' : (isDark ? 'bg-blue-900/20 border-l-4 border-blue-500' : 'bg-blue-50 border-l-4 border-blue-500');
                                } else {
                                    activeClass = isJapan ? 'hover:bg-[#E6D7B5]/50' : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50');
                                }

                                return (
                                    <tr key={row.id} className={`transition-colors ${activeClass} ${textColor}`}>
                                        <td className={`p-4 font-medium text-left border-r flex items-center gap-2 ${isJapan ? 'border-[#8D6E63]/20' : (isDark ? 'border-gray-700' : 'border-gray-100')}`}>
                                            {row.cycle}
                                            {isActiveRow && <span className={`w-2 h-2 rounded-full animate-pulse ${isJapan ? 'bg-[#D64045]' : 'bg-blue-500'}`}></span>}
                                        </td>
                                        <td className={`p-4 font-medium border-r ${isJapan ? 'border-[#8D6E63]/20' : (isDark ? 'border-gray-700' : 'border-gray-100')}`}>{formatNumber(row.qtyProcess)}</td>
                                        <td className={`p-4 border-r ${isJapan ? 'border-[#8D6E63]/20 text-[#2F4F4F]' : (isDark ? 'text-emerald-400 border-gray-700' : 'text-emerald-700 border-gray-100')}`}>{formatNumber(row.gradeA.qty)}</td>
                                        <td className={`p-4 border-r relative group ${isJapan ? 'border-[#8D6E63]/20' : (isDark ? 'border-gray-700' : 'border-gray-100')}`}>
                                            {row.gradeA.percent > 0 && <div className={`absolute bottom-0 left-0 h-1 opacity-20 ${isJapan ? 'bg-[#2F4F4F]' : 'bg-emerald-500'}`} style={{ width: `${row.gradeA.percent}%` }}></div>}
                                            <span className={`font-bold ${isJapan ? 'text-[#2F4F4F]' : (row.gradeA.percent > 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-gray-300')}`}>{formatPercent(row.gradeA.percent)}</span>
                                        </td>
                                        <td className={`p-4 border-r ${isJapan ? 'border-[#8D6E63]/20 text-[#D64045]' : (isDark ? 'text-red-400 border-gray-700' : 'text-red-700 border-gray-100')}`}>{formatNumber(row.gradeB.qty)}</td>
                                        <td className={`p-4 border-r relative ${isJapan ? 'border-[#8D6E63]/20' : (isDark ? 'border-gray-700' : 'border-gray-100')}`}>
                                            {row.gradeB.percent > 0 && <div className={`absolute bottom-0 left-0 h-1 opacity-20 ${isJapan ? 'bg-[#D64045]' : 'bg-red-500'}`} style={{ width: `${row.gradeB.percent}%` }}></div>}
                                            <span className={`font-bold ${isJapan ? 'text-[#D64045]' : (row.gradeB.percent > 0 ? (isDark ? 'text-red-400' : 'text-red-600') : 'text-gray-300')}`}>{formatPercent(row.gradeB.percent)}</span>
                                        </td>
                                        <td className={`p-4 border-r ${isJapan ? 'border-[#8D6E63]/20 text-[#E9C46A]' : (isDark ? 'text-amber-400 border-gray-700' : 'text-amber-700 border-gray-100')}`}>{formatNumber(row.gradeP.qty)}</td>
                                        <td className="p-4 relative">
                                            {row.gradeP.percent > 0 && <div className={`absolute bottom-0 left-0 h-1 opacity-20 ${isJapan ? 'bg-[#E9C46A]' : 'bg-amber-500'}`} style={{ width: `${row.gradeP.percent}%` }}></div>}
                                            <span className={`font-bold ${isJapan ? 'text-[#E9C46A]' : (row.gradeP.percent > 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-gray-300')}`}>{formatPercent(row.gradeP.percent)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2 mt-2">
                <div className={`p-1.5 rounded-lg ${getSummaryColorClass(activePage)}`}>
                    <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className={`text-lg font-bold ${textColor}`}>สรุปยอดผลิต (Summary): <span className={isJapan ? 'text-[#D64045] underline' : 'text-blue-500 underline'}>{currentCycleData.cycle}</span></h3>
            </div>

            {displayInfo.topDefectsByCycle && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in mt-6">
                    <div className={`${cardBg} rounded-xl shadow-sm border overflow-hidden`}>
                        <div className={`px-6 py-3 border-b flex items-center gap-2 ${isJapan ? 'bg-[#D64045]/10 border-[#8D6E63]' : (isDark ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50/50 border-red-100')}`}>
                            <TrendingUp className={`w-5 h-5 ${isJapan ? 'text-[#D64045]' : 'text-red-500'}`} />
                            <h3 className={`font-bold ${isJapan ? 'text-[#D64045]' : (isDark ? 'text-red-300' : 'text-red-800')}`}>Top 5 Scrap (Grade C)</h3>
                        </div>
                        <div className="p-0">
                            {currentTopDefects.scrap.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className={isJapan ? 'bg-[#E6D7B5] text-[#3E2723]' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500')}>
                                        <tr>
                                            <th className="px-4 py-2 text-left w-12">#</th>
                                            <th className="px-4 py-2 text-left">สาเหตุ (Reason)</th>
                                            <th className="px-4 py-2 text-right">จำนวน</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isJapan ? 'divide-[#8D6E63]/30' : (isDark ? 'divide-gray-700' : 'divide-gray-100')}`}>
                                        {currentTopDefects.scrap.map((d: any, i: number) => (
                                            <tr key={i} className={`${isJapan ? 'hover:bg-[#E6D7B5]/50' : (isDark ? 'hover:bg-red-900/10' : 'hover:bg-red-50/30')} transition-colors ${textColor}`}>
                                                <td className="px-4 py-3 font-medium opacity-60">{i + 1}</td>
                                                <td className="px-4 py-3 font-medium">{d.reason}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${isJapan ? 'text-[#D64045]' : 'text-red-500'}`}>{formatNumber(d.qty)} <span className="text-xs opacity-60">({d.percent?.toFixed(1) ?? 0}%)</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <div className="p-6 text-center opacity-50 text-sm">No Scrap Data for {activeCycleName}</div>}
                        </div>
                    </div>
                    <div className={`${cardBg} rounded-xl shadow-sm border overflow-hidden`}>
                        <div className={`px-6 py-3 border-b flex items-center gap-2 ${isJapan ? 'bg-[#E9C46A]/20 border-[#8D6E63]' : (isDark ? 'bg-amber-900/20 border-amber-900/50' : 'bg-amber-50/50 border-amber-100')}`}>
                            <TrendingUp className={`w-5 h-5 ${isJapan ? 'text-[#E9C46A]' : 'text-amber-500'}`} />
                            <h3 className={`font-bold ${isJapan ? 'text-[#B8860B]' : (isDark ? 'text-amber-300' : 'text-amber-800')}`}>Top 5 Reject (Grade P, J)</h3>
                        </div>
                        <div className="p-0">
                            {currentTopDefects.reject.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className={isJapan ? 'bg-[#E6D7B5] text-[#3E2723]' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500')}>
                                        <tr>
                                            <th className="px-4 py-2 text-left w-12">#</th>
                                            <th className="px-4 py-2 text-left">สาเหตุ (Reason)</th>
                                            <th className="px-4 py-2 text-right">จำนวน</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isJapan ? 'divide-[#8D6E63]/30' : (isDark ? 'divide-gray-700' : 'divide-gray-100')}`}>
                                        {currentTopDefects.reject.map((d: any, i: number) => (
                                            <tr key={i} className={`${isJapan ? 'hover:bg-[#E6D7B5]/50' : (isDark ? 'hover:bg-amber-900/10' : 'hover:bg-amber-50/30')} transition-colors ${textColor}`}>
                                                <td className="px-4 py-3 font-medium opacity-60">{i + 1}</td>
                                                <td className="px-4 py-3 font-medium">{d.reason}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${isJapan ? 'text-[#E9C46A]' : 'text-amber-500'}`}>{formatNumber(d.qty)} <span className="text-xs opacity-60">({d.percent?.toFixed(1) ?? 0}%)</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <div className="p-6 text-center opacity-50 text-sm">No Reject Data for {activeCycleName}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
